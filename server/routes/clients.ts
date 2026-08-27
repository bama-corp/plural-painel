import { Router } from 'express'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, getRoleServicoFilter, canAccessServico, canManageClients } from '../middleware/auth.js'
import type { AuthPayload } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { sendWhatsAppMessage, templates, normalizeClientWhatsappKey } from '../services/whatsapp.js'
import {
  notifyPanelUsers,
  clientAreaUrl,
  formatDateBr,
  sameCalendarDay,
} from '../lib/whatsappNotify.js'
import {
  ensurePortalPinPlainColumn,
  getPortalPinPlainMap,
  setPortalPinPlainInDb,
} from '../lib/portalPinPlain.js'
import { ensureClientRoveId, getRoveIdsMap } from '../lib/roveId.js'

const router = Router()

router.use(authMiddleware)

function stripPortalPinHash<T extends Record<string, unknown>>(c: T) {
  const { portalPinHash: _p, portalPinPlain: _pp, ...rest } = c
  return rest
}

async function ensurePortalFirstLoginColumn(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS portal_first_login BOOLEAN NOT NULL DEFAULT false
  `)
}

/** Adiciona N meses à data fim atual (mantém o dia; renovar = +1 mês, +2 meses, etc.). */
function adicionarMesesADataFim(base: Date, meses: number): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() + meses)
  return d
}

router.get('/', async (req, res) => {
  const { servico, servidorId, status, vencendo, revendedorId, salaId, q, inscricaoPaga } = req.query
  const user = (req as unknown as { user: AuthPayload }).user
  const includePortalPin = user.role === 'admin' && String(req.query.includePortalPin) === '1'
  const roleFilter = getRoleServicoFilter(user.role)
  await ensurePortalPinPlainColumn().catch(() => {})

  // Atualizar automaticamente para vencido: clientes ativos cuja dataFim já passou
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  await prisma.client.updateMany({
    where: { status: 'ativo', dataFim: { lt: today } },
    data: { status: 'vencido' },
  })

  const where: Prisma.ClientWhereInput = {}
  if (roleFilter) where.servico = roleFilter
  else if (servico) where.servico = String(servico)
  if (servidorId) where.servidorId = Number(servidorId)
  if (salaId) where.salaId = Number(salaId)
  if (status) where.status = String(status)
  if (vencendo === 'hoje') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    where.dataFim = { gte: today, lt: tomorrow }
    where.status = 'ativo'
  }
  if (vencendo === '3dias') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in3 = new Date(today)
    in3.setDate(in3.getDate() + 3)
    where.dataFim = { gte: today, lt: in3 }
    where.status = 'ativo'
  }
  if (vencendo === '7dias') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7 = new Date(today)
    in7.setDate(in7.getDate() + 7)
    where.dataFim = { gte: today, lte: in7 }
    where.status = 'ativo'
  }
  if (revendedorId) where.revendedorId = Number(revendedorId)
  if (inscricaoPaga === 'true' || inscricaoPaga === '1') where.inscricaoPaga = true
  else if (inscricaoPaga === 'false' || inscricaoPaga === '0') where.inscricaoPaga = false
  else if (inscricaoPaga === 'pendente') {
    where.OR = [{ inscricaoPaga: false }, { inscricaoPaga: null }]
  }

  const qTerm = typeof q === 'string' ? q.trim() : ''
  if (qTerm) {
    const digits = qTerm.replace(/\D/g, '')
    const or: Prisma.ClientWhereInput[] = [
      { nome: { contains: qTerm, mode: 'insensitive' } },
      { whatsapp: { contains: qTerm } },
      { localizacao: { contains: qTerm, mode: 'insensitive' } },
      { plano: { contains: qTerm, mode: 'insensitive' } },
      { perfil: { contains: qTerm, mode: 'insensitive' } },
      { roveId: { contains: qTerm, mode: 'insensitive' } },
      { servidor: { nome: { contains: qTerm, mode: 'insensitive' } } },
      { revendedor: { nome: { contains: qTerm, mode: 'insensitive' } } },
      { sala: { nome: { contains: qTerm, mode: 'insensitive' } } },
    ]
    if (digits && digits !== qTerm) {
      or.push({ whatsapp: { contains: digits } })
    }
    where.AND = [{ OR: or }]
  }

  const clients = await prisma.client.findMany({
    where,
    include: { servidor: true, revendedor: true, sala: true },
    orderBy: { dataFim: 'asc' },
  })
  const [pinPlainById, roveById] = await Promise.all([
    includePortalPin ? getPortalPinPlainMap(clients.map((c) => c.id)) : Promise.resolve(null),
    getRoveIdsMap(clients.map((c) => c.id)),
  ])
  const enriched = clients.map((c) => {
    const areaClienteAtiva = !!c.portalPinHash
    const base = stripPortalPinHash({ ...c, valor: Number(c.valor) } as Record<string, unknown>)
    const fromDb = pinPlainById?.get(Number(c.id))
    return {
      ...base,
      roveId: roveById.get(c.id) ?? null,
      areaClienteAtiva,
      ...(includePortalPin
        ? {
            portalPinPlain: fromDb != null && String(fromDb) !== '' ? fromDb : null,
          }
        : {}),
    }
  })
  res.json(enriched)
})

router.get('/:id', async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  const client = await prisma.client.findUnique({
    where: { id: Number(req.params.id) },
    include: { servidor: true, revendedor: true, sala: true },
  })
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!canAccessServico(user.role, client.servico)) return res.status(403).json({ error: 'Sem acesso a este cliente' })
  const roveId = await ensureClientRoveId(client.id)
  res.json({
    ...stripPortalPinHash({ ...client, valor: Number(client.valor) } as Record<string, unknown>),
    roveId,
    areaClienteAtiva: !!client.portalPinHash,
  })
})

router.post('/', auditLog('create_client', 'client'), async (req, res) => {
  await ensurePortalPinPlainColumn().catch(() => {})
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canManageClients(user.role)) return res.status(403).json({ error: 'Sem permissão para criar clientes' })
  const body = req.body
  const servico = body.servico || 'iptv'
  if (!canAccessServico(user.role, servico)) return res.status(403).json({ error: 'Sem permissão para criar cliente deste serviço' })
  let dataFim = body.dataFim ? new Date(body.dataFim) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const salaId = body.salaId != null && body.salaId !== '' ? Number(body.salaId) : null
  if (servico === 'netflix' && salaId) {
    const sala = await prisma.sala.findUnique({ where: { id: salaId } })
    if (sala?.dataFim) dataFim = sala.dataFim
  }
  let portalPinHash: string | undefined
  if (body.portalPin != null && String(body.portalPin).trim() !== '') {
    if (String(body.portalPin).trim().length < 4) {
      return res.status(400).json({ error: 'PIN da área cliente deve ter pelo menos 4 caracteres' })
    }
    portalPinHash = await bcrypt.hash(String(body.portalPin).trim(), 10)
  }
  const portalPlain =
    body.portalPin != null && String(body.portalPin).trim() !== '' ? String(body.portalPin).trim() : null
  const client = await prisma.client.create({
    data: {
      nome: body.nome,
      whatsapp: body.whatsapp,
      localizacao: body.localizacao || null,
      servico,
      plano: body.plano || 'mensal',
      servidorId: body.servidorId ? Number(body.servidorId) : null,
      revendedorId: body.revendedorId ? Number(body.revendedorId) : null,
      perfil: body.perfil || null,
      pin: body.pin || null,
      iptvUser: body.iptvUser || null,
      iptvPass: body.iptvPass || null,
      iptvMac: body.iptvMac || null,
      iptvM3u: body.iptvM3u || null,
      dataInicio: body.dataInicio ? new Date(body.dataInicio) : new Date(),
      dataFim,
      valor: Number(body.valor) || 0,
      inscricaoPaga: body.inscricaoPaga === true || body.inscricaoPaga === 'true' ? true : body.inscricaoPaga === false || body.inscricaoPaga === 'false' ? false : null,
      salaId,
      status: 'ativo',
      ...(portalPinHash ? { portalPinHash } : {}),
    },
  })
  if (portalPinHash && portalPlain) {
    await setPortalPinPlainInDb(client.id, portalPlain)
  }
  if (portalPinHash) {
    await ensurePortalFirstLoginColumn().catch(() => {})
    await prisma.$executeRawUnsafe('UPDATE clients SET portal_first_login = true WHERE id = $1', client.id).catch(() => {})
    void sendWhatsAppMessage(
      client.whatsapp,
      templates.areaClienteAtivada(client.nome, clientAreaUrl())
    ).catch(() => {})
  }
  const msg = templates.clienteCadastrado(client.nome, dataFim.toLocaleDateString('pt-BR'))
  void sendWhatsAppMessage(client.whatsapp, msg).catch(() => {})
  const servicoLabel = servico === 'netflix' ? 'Netflix' : 'IPTV'
  void notifyPanelUsers(
    servico === 'netflix' ? 'clientes_netflix' : 'clientes_iptv',
    `Novo cliente: ${client.nome} (${servicoLabel})\nWhatsApp: ${client.whatsapp}\nRenovação: ${formatDateBr(dataFim)}`
  )
  if (servico === 'netflix' && client.inscricaoPaga === false) {
    void notifyPanelUsers(
      'financeiro',
      `Inscrição Netflix pendente: ${client.nome} — plano ${client.plano}.`
    )
  }
  const roveId = await ensureClientRoveId(client.id)
  res.status(201).json({
    ...stripPortalPinHash({ ...client, valor: Number(client.valor) } as Record<string, unknown>),
    roveId,
    areaClienteAtiva: !!client.portalPinHash,
  })
})

router.patch('/:id', auditLog('update_client', 'client'), async (req, res) => {
  await ensurePortalPinPlainColumn().catch(() => {})
  const user = (req as unknown as { user: AuthPayload }).user
  const id = Number(req.params.id)
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!canAccessServico(user.role, existing.servico)) return res.status(403).json({ error: 'Sem acesso a este cliente' })
  const body = req.body
  if (user.role === 'financeiro') {
    const keys = Object.keys(body).filter((k) => body[k] !== undefined)
    if (keys.length !== 1 || keys[0] !== 'inscricaoPaga') {
      return res.status(403).json({ error: 'Perfil financeiro só pode marcar inscrição como paga' })
    }
  } else if (!canManageClients(user.role)) {
    return res.status(403).json({ error: 'Sem permissão para alterar clientes' })
  }
  if (body.servico != null && !canAccessServico(user.role, body.servico)) return res.status(403).json({ error: 'Sem permissão para este serviço' })
  const data: Prisma.ClientUncheckedUpdateInput = {}
  if (body.nome != null) data.nome = body.nome
  if (body.whatsapp != null) data.whatsapp = body.whatsapp
  if (body.localizacao !== undefined) data.localizacao = body.localizacao || null
  if (body.servico != null) data.servico = body.servico
  if (body.plano != null) data.plano = body.plano
  if (body.servidorId != null) data.servidorId = body.servidorId ? Number(body.servidorId) : null
  if (body.revendedorId !== undefined) data.revendedorId = body.revendedorId ? Number(body.revendedorId) : null
  if (body.perfil != null) data.perfil = body.perfil
  if (body.pin !== undefined) data.pin = body.pin || null
  if (body.iptvUser != null) data.iptvUser = body.iptvUser
  if (body.iptvPass != null) data.iptvPass = body.iptvPass
  if (body.iptvMac != null) data.iptvMac = body.iptvMac
  if (body.iptvM3u != null) data.iptvM3u = body.iptvM3u
  if (body.dataInicio != null) data.dataInicio = new Date(body.dataInicio)
  if (body.dataFim != null) {
    const newDataFim = new Date(body.dataFim)
    data.dataFim = newDataFim
    if (existing.salaId && existing.servico === 'netflix') {
      await prisma.sala.update({ where: { id: existing.salaId }, data: { dataFim: newDataFim } })
      await prisma.client.updateMany({ where: { salaId: existing.salaId }, data: { dataFim: newDataFim } })
    }
  }
  if (body.valor != null) data.valor = Number(body.valor)
  if (body.inscricaoPaga !== undefined) data.inscricaoPaga = body.inscricaoPaga === true || body.inscricaoPaga === 'true'
  if (body.salaId !== undefined) data.salaId = body.salaId != null && body.salaId !== '' ? Number(body.salaId) : null
  if (body.status != null) data.status = body.status
  if (body.portalPin !== undefined) {
    if (body.portalPin === null || String(body.portalPin).trim() === '') {
      data.portalPinHash = null
    } else if (String(body.portalPin).trim().length < 4) {
      return res.status(400).json({ error: 'PIN da área cliente deve ter pelo menos 4 caracteres' })
    } else {
      const plain = String(body.portalPin).trim()
      data.portalPinHash = await bcrypt.hash(plain, 10)
    }
  }
  const client = await prisma.client.update({ where: { id }, data })
  if (body.portalPin !== undefined) {
    if (body.portalPin === null || String(body.portalPin).trim() === '') {
      await setPortalPinPlainInDb(id, null)
    } else {
      await setPortalPinPlainInDb(id, String(body.portalPin).trim())
    }
    await ensurePortalFirstLoginColumn().catch(() => {})
    const mustChange = !(body.portalPin === null || String(body.portalPin).trim() === '')
    await prisma.$executeRawUnsafe('UPDATE clients SET portal_first_login = $1 WHERE id = $2', mustChange, id).catch(() => {})
  }

  const fimStr = formatDateBr(client.dataFim)
  const hadPortalPin = !!existing.portalPinHash
  const hasPortalPin = !!client.portalPinHash
  if (!hadPortalPin && hasPortalPin && body.portalPin != null && String(body.portalPin).trim() !== '') {
    void sendWhatsAppMessage(
      client.whatsapp,
      templates.areaClienteAtivada(client.nome, clientAreaUrl())
    ).catch(() => {})
  }
  if (body.inscricaoPaga === true && existing.inscricaoPaga !== true) {
    void sendWhatsAppMessage(
      client.whatsapp,
      templates.inscricaoConfirmada(client.nome, client.plano)
    ).catch(() => {})
    void notifyPanelUsers('financeiro', `Inscrição paga: ${client.nome} — plano ${client.plano}.`)
  }
  if (body.status === 'cancelado' && existing.status !== 'cancelado') {
    void sendWhatsAppMessage(client.whatsapp, templates.contaCancelada(client.nome)).catch(() => {})
    void notifyPanelUsers(
      client.servico === 'netflix' ? 'clientes_netflix' : 'clientes_iptv',
      `Cliente cancelado: ${client.nome} (${client.whatsapp}).`
    )
  }
  if (body.dataFim != null && !sameCalendarDay(new Date(body.dataFim), existing.dataFim)) {
    void sendWhatsAppMessage(
      client.whatsapp,
      templates.dataRenovacaoAlterada(client.nome, fimStr)
    ).catch(() => {})
  }
  const iptvChanged =
    (body.iptvUser != null && body.iptvUser !== existing.iptvUser) ||
    (body.iptvPass != null && body.iptvPass !== existing.iptvPass) ||
    (body.iptvMac != null && body.iptvMac !== existing.iptvMac) ||
    (body.iptvM3u != null && body.iptvM3u !== existing.iptvM3u)
  if (iptvChanged && client.servico === 'iptv') {
    void sendWhatsAppMessage(
      client.whatsapp,
      templates.credenciaisIptvAtualizadas(client.nome)
    ).catch(() => {})
  }
  const netflixChanged =
    (body.pin !== undefined && body.pin !== existing.pin) ||
    (body.perfil != null && body.perfil !== existing.perfil)
  if (netflixChanged && client.servico === 'netflix') {
    void sendWhatsAppMessage(
      client.whatsapp,
      templates.credenciaisNetflixAtualizadas(client.nome, client.perfil)
    ).catch(() => {})
  }

  const roveId = await ensureClientRoveId(client.id)
  res.json({
    ...stripPortalPinHash({ ...client, valor: Number(client.valor) } as Record<string, unknown>),
    roveId,
    areaClienteAtiva: !!client.portalPinHash,
  })
})

router.post('/:id/renovar', auditLog('renew_client', 'client'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  const id = Number(req.params.id)
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!canAccessServico(user.role, client.servico)) return res.status(403).json({ error: 'Sem acesso a este cliente' })
  if (client.status === 'vencido') return res.status(400).json({ error: 'Cliente vencido. Use Ativar para reativar.' })
  const { dias, meses, valor } = req.body
  const mesesAdd = Number(meses) || (dias ? Math.max(1, Math.round(Number(dias) / 30)) : 1)
  let dataFim: Date
  if (client.salaId && client.servico === 'netflix') {
    const sala = await prisma.sala.findUnique({ where: { id: client.salaId } })
    const base = new Date(sala?.dataFim ?? client.dataFim)
    dataFim = adicionarMesesADataFim(base, mesesAdd)
    await prisma.sala.update({ where: { id: client.salaId }, data: { dataFim } })
    await prisma.client.updateMany({
      where: { salaId: client.salaId },
      data: { dataFim, status: 'ativo', whatsappNotificadoVencimentoAt: null },
    })
  } else {
    const base = new Date(client.dataFim)
    dataFim = adicionarMesesADataFim(base, mesesAdd)
    await prisma.client.update({
      where: { id },
      data: {
        dataFim,
        valor: valor != null ? Number(valor) : client.valor,
        status: 'ativo',
        whatsappNotificadoVencimentoAt: null,
      },
    })
  }
  const updated = await prisma.client.findUnique({ where: { id }, include: { sala: true } })
  if (!updated) return res.status(404).json({ error: 'Cliente não encontrado' })
  const fimStr = dataFim.toLocaleDateString('pt-BR')
  if (client.salaId && client.servico === 'netflix') {
    const naSala = await prisma.client.findMany({ where: { salaId: client.salaId } })
    const seen = new Set<string>()
    for (const c of naSala) {
      const key = normalizeClientWhatsappKey(c.whatsapp)
      if (seen.has(key)) continue
      seen.add(key)
      const msg = templates.renovado(c.nome, fimStr)
      void sendWhatsAppMessage(c.whatsapp, msg).catch(() => {})
    }
  } else {
    const msg = templates.renovado(client.nome, fimStr)
    void sendWhatsAppMessage(client.whatsapp, msg).catch(() => {})
  }
  res.json({
    ...stripPortalPinHash({ ...updated, valor: Number(updated.valor) } as Record<string, unknown>),
    areaClienteAtiva: !!updated.portalPinHash,
  })
})

router.post('/:id/marcar-pago', auditLog('mark_paid_client', 'client'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  const id = Number(req.params.id)
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!canAccessServico(user.role, client.servico)) return res.status(403).json({ error: 'Sem acesso a este cliente' })
  if (client.status === 'vencido') return res.status(400).json({ error: 'Cliente vencido. Use Ativar para reativar.' })
  const { dataFim } = req.body
  const updated = await prisma.client.update({
    where: { id },
    data: {
      dataFim: dataFim ? new Date(dataFim) : client.dataFim,
      status: 'ativo',
      whatsappNotificadoVencimentoAt: null,
    },
  })
  const fimStr = new Date(updated.dataFim).toLocaleDateString('pt-BR')
  const msgPago = templates.pagamentoRegistado(updated.nome, fimStr)
  void sendWhatsAppMessage(updated.whatsapp, msgPago).catch(() => {})
  res.json({
    ...stripPortalPinHash({ ...updated, valor: Number(updated.valor) } as Record<string, unknown>),
    areaClienteAtiva: !!updated.portalPinHash,
  })
})

router.post('/:id/suspender', auditLog('suspend_client', 'client'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canManageClients(user.role)) return res.status(403).json({ error: 'Sem permissão para suspender clientes' })
  const id = Number(req.params.id)
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!canAccessServico(user.role, existing.servico)) return res.status(403).json({ error: 'Sem acesso a este cliente' })
  if (existing.status === 'vencido') return res.status(400).json({ error: 'Cliente já está vencido.' })
  const updated = await prisma.client.update({
    where: { id },
    data: { status: 'vencido', whatsappNotificadoVencimentoAt: new Date() },
  })
  const msg = templates.servicoSuspenso(updated.nome)
  void sendWhatsAppMessage(updated.whatsapp, msg).catch((err) => {
    console.error('[WhatsApp] Falha ao notificar suspensão:', updated.whatsapp, err)
  })
  void notifyPanelUsers(
    updated.servico === 'netflix' ? 'clientes_netflix' : 'clientes_iptv',
    `Cliente suspenso: ${updated.nome} (${updated.whatsapp}).`
  )
  res.json({
    ...stripPortalPinHash({ ...updated, valor: Number(updated.valor) } as Record<string, unknown>),
    areaClienteAtiva: !!updated.portalPinHash,
  })
})

/** Próximo dia 11 a partir de hoje (para cliente ficar ativo após ativar). */
function proximoDia11(): Date {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dia11 = new Date(hoje.getFullYear(), hoje.getMonth(), 11)
  if (hoje <= dia11) return dia11
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 11)
}

router.post('/:id/ativar', auditLog('activate_client', 'client'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  const id = Number(req.params.id)
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!canAccessServico(user.role, existing.servico)) return res.status(403).json({ error: 'Sem acesso a este cliente' })
  const dataFim = proximoDia11()
  const updated = await prisma.client.update({
    where: { id },
    data: { status: 'ativo', dataFim, whatsappNotificadoVencimentoAt: null },
  })
  const fimStr = dataFim.toLocaleDateString('pt-BR')
  const msgAtiv = templates.reativado(updated.nome, fimStr)
  void sendWhatsAppMessage(updated.whatsapp, msgAtiv).catch(() => {})
  void notifyPanelUsers(
    updated.servico === 'netflix' ? 'clientes_netflix' : 'clientes_iptv',
    `Cliente reativado: ${updated.nome} — renovação ${fimStr}.`
  )
  res.json({
    ...stripPortalPinHash({ ...updated, valor: Number(updated.valor) } as Record<string, unknown>),
    areaClienteAtiva: !!updated.portalPinHash,
  })
})

router.delete('/:id', auditLog('delete_client', 'client'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canManageClients(user.role)) return res.status(403).json({ error: 'Sem permissão para eliminar clientes' })
  const id = Number(req.params.id)
  const existing = await prisma.client.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!canAccessServico(user.role, existing.servico)) return res.status(403).json({ error: 'Sem acesso a este cliente' })
  void sendWhatsAppMessage(existing.whatsapp, templates.contaEncerrada(existing.nome)).catch(() => {})
  void notifyPanelUsers(
    existing.servico === 'netflix' ? 'clientes_netflix' : 'clientes_iptv',
    `Cliente eliminado: ${existing.nome} (${existing.whatsapp}).`
  )
  await prisma.client.delete({ where: { id } })
  res.status(204).send()
})

export default router
