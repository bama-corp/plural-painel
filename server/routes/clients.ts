import { Router } from 'express'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, getRoleServicoFilter, canAccessServico, canManageClients } from '../middleware/auth.js'
import type { AuthPayload } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { sendWhatsAppMessage, templates } from '../services/whatsapp.js'
import {
  notifyPanelUsers,
  notifyClientVencimento,
  markExpiredClientsStatus,
  notifyPendingVencidosWhatsApp,
  clientAreaUrl,
  formatDateBr,
  sameCalendarDay,
} from '../lib/whatsappNotify.js'
import {
  ensurePortalPinPlainColumn,
  getPortalPinPlainMap,
  setPortalPinPlainInDb,
} from '../lib/portalPinPlain.js'
import { ensureClientTableColumns, ensureClientIptvAccountsTable, syncClientIptvAccounts, loadClientIptvAccounts, loadIptvAccountsForClients } from '../lib/clientSchema.js'
import { ensureClientRoveId, ensureRoveIdsForClients } from '../lib/roveId.js'
import { decryptField, encryptField } from '../lib/fieldCrypto.js'
import { notifyPhPanel } from '../lib/notifyPh.js'

const router = Router()

router.use(authMiddleware)

function stripPortalPinHash<T extends Record<string, unknown>>(c: T) {
  const { portalPinHash: _p, portalPinPlain: _pp, ...rest } = c
  return rest
}

/** Lista: sem iptvPass/pin/senha da sala. */
function sanitizeClientListItem(c: Record<string, unknown>) {
  const {
    portalPinHash: _h,
    portalPinPlain: _pp,
    iptvPass: _pass,
    pin: _pin,
    ...rest
  } = c
  const sala = rest.sala as Record<string, unknown> | null | undefined
  if (sala && typeof sala === 'object') {
    const { senha: _s, ...salaRest } = sala
    rest.sala = { ...salaRest, senhaSet: !!_s }
  }
  return {
    ...rest,
    iptvPassSet: !!_pass,
    pinSet: !!_pin,
  }
}

/** Detalhe: credenciais decifradas; sem hashes. */
function sanitizeClientDetail(c: Record<string, unknown>, opts?: { portalPinPlain?: string | null }) {
  const base = stripPortalPinHash(c)
  const sala = base.sala as Record<string, unknown> | null | undefined
  if (sala && typeof sala === 'object') {
    const { senha: _s, ...salaRest } = sala
    base.sala = { ...salaRest, senhaSet: !!_s }
  }
  return {
    ...base,
    pin: decryptField(c.pin as string | null),
    iptvPass: decryptField(c.iptvPass as string | null),
    iptvPassSet: !!(c.iptvPass && String(c.iptvPass).length > 0),
    ...(opts?.portalPinPlain !== undefined ? { portalPinPlain: opts.portalPinPlain } : {}),
  }
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
  const includeCredenciais =
    canManageClients(user.role) && String(req.query.includeCredenciais) === '1'
  const roleFilter = getRoleServicoFilter(user.role)
  await Promise.all([
    ensureClientTableColumns().catch(() => {}),
    ensurePortalPinPlainColumn().catch(() => {}),
    ensureClientIptvAccountsTable().catch(() => {}),
  ])

  await markExpiredClientsStatus()
  void notifyPendingVencidosWhatsApp().catch((e) => {
    console.error('[clients] notifyPendingVencidosWhatsApp:', e)
  })

  const where: Prisma.ClientWhereInput = {}
  if (roleFilter) where.servico = roleFilter
  else if (servico) where.servico = String(servico)
  if (servidorId) {
    const sid = Number(servidorId)
    const servidorClause: Prisma.ClientWhereInput = {
      OR: [{ servidorId: sid }, { iptvAccounts: { some: { servidorId: sid } } }],
    }
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      servidorClause,
    ]
  }
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
      { iptvAccounts: { some: { username: { contains: qTerm, mode: 'insensitive' } } } },
      { iptvAccounts: { some: { label: { contains: qTerm, mode: 'insensitive' } } } },
    ]
    if (digits && digits !== qTerm) {
      or.push({ whatsapp: { contains: digits } })
    }
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: or }]
  }

  const clients = await prisma.client.findMany({
    where,
    include: { servidor: true, revendedor: true, sala: true },
    orderBy: { dataFim: 'asc' },
  })
  const clientIds = clients.map((c) => c.id)
  const [pinPlainById, roveById, accountsById] = await Promise.all([
    includePortalPin
      ? getPortalPinPlainMap(clientIds).catch((err) => {
          console.error('[clients] portal PIN map:', err)
          return null
        })
      : Promise.resolve(null),
    ensureRoveIdsForClients(clientIds).catch((err) => {
      console.error('[clients] ROVE IDs:', err)
      return new Map<number, string>()
    }),
    loadIptvAccountsForClients(clientIds, { decryptPasswords: includeCredenciais }).catch((err) => {
      console.error('[clients] iptv accounts:', err)
      return new Map()
    }),
  ])
  const enriched = clients.map((c) => {
    const areaClienteAtiva = !!c.portalPinHash
    const raw = { ...c, valor: Number(c.valor) } as Record<string, unknown>
    const base = includeCredenciais
      ? sanitizeClientDetail(raw)
      : sanitizeClientListItem(raw)
    const fromDb = pinPlainById?.get(Number(c.id))
    const iptvAccounts = accountsById.get(c.id) ?? []
    return {
      ...base,
      iptvAccounts,
      iptvAccountsCount: iptvAccounts.length,
      roveId: roveById.get(c.id) ?? c.roveId ?? null,
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
  await ensureClientIptvAccountsTable().catch(() => {})
  const client = await prisma.client.findUnique({
    where: { id: Number(req.params.id) },
    include: { servidor: true, revendedor: true, sala: true },
  })
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (!canAccessServico(user.role, client.servico)) return res.status(403).json({ error: 'Sem acesso a este cliente' })
  const roveId = await ensureClientRoveId(client.id)
  const iptvAccounts = await loadClientIptvAccounts(client.id, { decryptPasswords: true })
  res.json({
    ...sanitizeClientDetail({ ...client, valor: Number(client.valor) } as Record<string, unknown>),
    iptvAccounts,
    iptvAccountsCount: iptvAccounts.length,
    roveId,
    areaClienteAtiva: !!client.portalPinHash,
  })
})

router.post('/', auditLog('create_client', 'client'), async (req, res) => {
  await Promise.all([
    ensureClientTableColumns().catch(() => {}),
    ensurePortalPinPlainColumn().catch(() => {}),
    ensureClientIptvAccountsTable().catch(() => {}),
  ])
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canManageClients(user.role)) return res.status(403).json({ error: 'Sem permissão para criar clientes' })
  const body = req.body
  const servico = body.servico || 'iptv'
  if (!canAccessServico(user.role, servico)) return res.status(403).json({ error: 'Sem permissão para criar cliente deste serviço' })
  // Netflix: dataFim é sempre do cliente (não da sala)
  let dataFim = body.dataFim ? new Date(body.dataFim) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const salaId = body.salaId != null && body.salaId !== '' ? Number(body.salaId) : null
  let portalPinHash: string | undefined
  if (body.portalPin != null && String(body.portalPin).trim() !== '') {
    if (String(body.portalPin).trim().length < 4) {
      return res.status(400).json({ error: 'PIN da área cliente deve ter pelo menos 4 caracteres' })
    }
    portalPinHash = await bcrypt.hash(String(body.portalPin).trim(), 10)
  }
  const portalPlain =
    body.portalPin != null && String(body.portalPin).trim() !== '' ? String(body.portalPin).trim() : null

  // Contas IPTV: se vierem no body, usam-se; senão legado perfil/iptvUser
  const hasAccountsPayload = Array.isArray(body.iptvAccounts)
  let firstUsername: string | null = body.perfil || body.iptvUser || null
  let firstServidorId: number | null = body.servidorId ? Number(body.servidorId) : null
  if (servico === 'iptv' && hasAccountsPayload) {
    const accounts = body.iptvAccounts as Array<{ username?: string; servidorId?: number | null }>
    const valid = accounts.filter((a) => a?.username && String(a.username).trim())
    if (valid.length === 0) {
      return res.status(400).json({ error: 'Adicione pelo menos uma conta IPTV com nome de utilizador.' })
    }
    firstUsername = String(valid[0].username).trim()
    firstServidorId =
      valid[0].servidorId != null && Number.isFinite(Number(valid[0].servidorId))
        ? Number(valid[0].servidorId)
        : firstServidorId
  }

  const client = await prisma.client.create({
    data: {
      nome: body.nome,
      whatsapp: body.whatsapp,
      localizacao: body.localizacao || null,
      servico,
      plano: body.plano || 'mensal',
      servidorId: firstServidorId,
      revendedorId: body.revendedorId ? Number(body.revendedorId) : null,
      perfil: servico === 'iptv' ? firstUsername : body.perfil || null,
      pin: body.pin != null && String(body.pin) !== '' ? encryptField(String(body.pin)) : null,
      iptvUser: servico === 'iptv' ? firstUsername : body.iptvUser || null,
      iptvPass: body.iptvPass != null && String(body.iptvPass) !== '' ? encryptField(String(body.iptvPass)) : null,
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

  let iptvAccounts = [] as Awaited<ReturnType<typeof loadClientIptvAccounts>>
  if (servico === 'iptv') {
    const payload = hasAccountsPayload
      ? body.iptvAccounts
      : firstUsername
        ? [
            {
              username: firstUsername,
              password: body.iptvPass ?? null,
              mac: body.iptvMac ?? null,
              m3u: body.iptvM3u ?? null,
              servidorId: firstServidorId,
            },
          ]
        : []
    if (Array.isArray(payload) && payload.length > 0) {
      const synced = await syncClientIptvAccounts(client.id, payload)
      if (synced.firstServidorId != null || synced.firstUsername) {
        await prisma.client.update({
          where: { id: client.id },
          data: {
            ...(synced.firstServidorId != null ? { servidorId: synced.firstServidorId } : {}),
            ...(synced.firstUsername
              ? { perfil: synced.firstUsername, iptvUser: synced.firstUsername }
              : {}),
          },
        })
      }
      iptvAccounts = await loadClientIptvAccounts(client.id, { decryptPasswords: true })
    }
  }

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
  let roveId: string | null = null
  try {
    roveId = await ensureClientRoveId(client.id)
  } catch (err) {
    console.error('[clients] ROVE ID no create:', err)
  }
  const refreshed = await prisma.client.findUnique({ where: { id: client.id } })
  res.status(201).json({
    ...sanitizeClientDetail({
      ...(refreshed ?? client),
      valor: Number((refreshed ?? client).valor),
    } as Record<string, unknown>),
    iptvAccounts,
    iptvAccountsCount: iptvAccounts.length,
    roveId,
    areaClienteAtiva: !!client.portalPinHash,
  })
})

router.patch('/:id', auditLog('update_client', 'client'), async (req, res) => {
  await Promise.all([
    ensurePortalPinPlainColumn().catch(() => {}),
    ensureClientIptvAccountsTable().catch(() => {}),
  ])
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
  if (body.pin !== undefined) {
    data.pin = body.pin != null && String(body.pin) !== '' ? encryptField(String(body.pin)) : null
  }
  if (body.iptvUser != null) data.iptvUser = body.iptvUser
  if (body.iptvPass != null) {
    data.iptvPass = String(body.iptvPass) !== '' ? encryptField(String(body.iptvPass)) : null
  }
  if (body.iptvMac != null) data.iptvMac = body.iptvMac
  if (body.iptvM3u != null) data.iptvM3u = body.iptvM3u
  if (body.dataInicio != null) data.dataInicio = new Date(body.dataInicio)
  if (body.dataFim != null) {
    data.dataFim = new Date(body.dataFim)
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

  let iptvAccountsChanged = false
  const servicoFinal = body.servico != null ? String(body.servico) : existing.servico
  if (Array.isArray(body.iptvAccounts) && servicoFinal === 'iptv' && user.role !== 'financeiro') {
    const valid = (body.iptvAccounts as Array<{ username?: string }>).filter(
      (a) => a?.username && String(a.username).trim()
    )
    if (valid.length === 0) {
      return res.status(400).json({ error: 'Adicione pelo menos uma conta IPTV com nome de utilizador.' })
    }
    const synced = await syncClientIptvAccounts(id, body.iptvAccounts)
    iptvAccountsChanged = synced.changed
    if (synced.firstUsername) {
      data.perfil = synced.firstUsername
      data.iptvUser = synced.firstUsername
    }
    if (synced.firstServidorId !== undefined) {
      data.servidorId = synced.firstServidorId
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
    iptvAccountsChanged ||
    (body.iptvUser != null && body.iptvUser !== existing.iptvUser) ||
    (body.iptvPass != null && String(body.iptvPass) !== (decryptField(existing.iptvPass) ?? '')) ||
    (body.iptvMac != null && body.iptvMac !== existing.iptvMac) ||
    (body.iptvM3u != null && body.iptvM3u !== existing.iptvM3u)
  if (iptvChanged && client.servico === 'iptv') {
    void sendWhatsAppMessage(
      client.whatsapp,
      templates.credenciaisIptvAtualizadas(client.nome)
    ).catch(() => {})
  }
  const netflixChanged =
    (body.pin !== undefined && String(body.pin || '') !== (decryptField(existing.pin) ?? '')) ||
    (body.perfil != null && body.perfil !== existing.perfil)
  if (netflixChanged && client.servico === 'netflix') {
    void sendWhatsAppMessage(
      client.whatsapp,
      templates.credenciaisNetflixAtualizadas(client.nome, client.perfil)
    ).catch(() => {})
  }

  const roveId = await ensureClientRoveId(client.id)
  const iptvAccounts = await loadClientIptvAccounts(client.id, { decryptPasswords: true })
  res.json({
    ...sanitizeClientDetail({ ...client, valor: Number(client.valor) } as Record<string, unknown>),
    iptvAccounts,
    iptvAccountsCount: iptvAccounts.length,
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
  const base = new Date(client.dataFim)
  const dataFim = adicionarMesesADataFim(base, mesesAdd)
  await prisma.client.update({
    where: { id },
    data: {
      dataFim,
      valor: valor != null ? Number(valor) : client.valor,
      status: 'ativo',
      whatsappNotificadoVencimentoAt: null,
    },
  })
  const updated = await prisma.client.findUnique({ where: { id }, include: { sala: true } })
  if (!updated) return res.status(404).json({ error: 'Cliente não encontrado' })
  const fimStr = dataFim.toLocaleDateString('pt-BR')
  const msg = templates.renovado(client.nome, fimStr)
  void sendWhatsAppMessage(client.whatsapp, msg).catch(() => {})
  void notifyPhPanel({
    event: 'renovar',
    clientId: id,
    clientName: updated.nome,
    amount: Number(updated.valor),
    servico: String(updated.servico),
  })
  res.json({
    ...sanitizeClientDetail({ ...updated, valor: Number(updated.valor) } as Record<string, unknown>),
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
  void notifyPhPanel({
    event: 'marcar-pago',
    clientId: id,
    clientName: updated.nome,
    amount: Number(updated.valor),
    servico: String(updated.servico),
  })
  res.json({
    ...sanitizeClientDetail({ ...updated, valor: Number(updated.valor) } as Record<string, unknown>),
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
    data: { status: 'vencido', whatsappNotificadoVencimentoAt: null },
  })
  void notifyClientVencimento(
    { id: updated.id, nome: updated.nome, whatsapp: updated.whatsapp },
    'suspenso'
  ).catch((err) => {
    console.error('[WhatsApp] Falha ao notificar suspensão:', updated.whatsapp, err)
  })
  void notifyPanelUsers(
    updated.servico === 'netflix' ? 'clientes_netflix' : 'clientes_iptv',
    `Cliente suspenso: ${updated.nome} (${updated.whatsapp}).`
  )
  void notifyPhPanel({
    event: 'suspender',
    clientId: id,
    clientName: updated.nome,
    servico: String(updated.servico),
  })
  res.json({
    ...sanitizeClientDetail({ ...updated, valor: Number(updated.valor) } as Record<string, unknown>),
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
  void notifyPhPanel({
    event: 'ativar',
    clientId: id,
    clientName: updated.nome,
    amount: Number(updated.valor),
    servico: String(updated.servico),
  })
  res.json({
    ...sanitizeClientDetail({ ...updated, valor: Number(updated.valor) } as Record<string, unknown>),
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
