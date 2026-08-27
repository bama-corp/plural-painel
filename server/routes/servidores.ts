import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, canAccessServidores, canManageServidores } from '../middleware/auth.js'
import type { AuthPayload } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { templates } from '../services/whatsapp.js'
import {
  notifyPanelUsers,
  notifyServidorClients,
  formatDateBr,
} from '../lib/whatsappNotify.js'

const router = Router()

router.use(authMiddleware)

async function ensureServidorPagamentoColumns(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE servidores
    ADD COLUMN IF NOT EXISTS mensalidade DECIMAL(10,2)
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE servidores
    ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP
  `)
}

function addMonthsKeepingDay(base: Date, months: number): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  const billingDay = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(billingDay, lastDay))
  return d
}

router.get('/', async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a servidores' })
  await ensureServidorPagamentoColumns().catch(() => {})
  const list = await prisma.servidor.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { clients: true } },
      servidor: { select: { id: true, nome: true } },
    },
  })
  const pagamentos = await prisma.$queryRawUnsafe<Array<{ id: number; mensalidade: number | null; data_pagamento: Date | null }>>(
    'SELECT id, mensalidade, data_pagamento FROM servidores'
  ).catch(() => [])
  const pagamentosMap = new Map<number, { mensalidade: number | null; data_pagamento: Date | null }>(
    pagamentos.map((p) => [p.id, { mensalidade: p.mensalidade, data_pagamento: p.data_pagamento }])
  )
  res.json(
    list.map((s) => {
      const { _count, servidor, ...rest } = s
      const pay = pagamentosMap.get(s.id)
      return {
        ...rest,
        totalClientes: _count.clients,
        servidor,
        mensalidade: pay?.mensalidade != null ? Number(pay.mensalidade) : null,
        dataPagamento: pay?.data_pagamento ?? null,
      }
    })
  )
})

router.get('/:id', async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a servidores' })
  const s = await prisma.servidor.findUnique({
    where: { id: Number(req.params.id) },
    include: { clients: true },
  })
  if (!s) return res.status(404).json({ error: 'Servidor não encontrado' })
  res.json(s)
})

router.post('/', auditLog('create_servidor', 'servidor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canManageServidores(user.role)) return res.status(403).json({ error: 'Sem permissão para criar servidores' })
  const { nome, tipo, status, servidorId, mensalidade, dataPagamento } = req.body
  await ensureServidorPagamentoColumns().catch(() => {})
  const data: Record<string, unknown> = {
    nome: nome || 'Novo servidor',
    tipo: tipo || 'principal',
    status: status || 'online',
  }
  if (tipo === 'secundario' && servidorId) data.servidorId = Number(servidorId)
  else if (tipo !== 'secundario') data.servidorId = null
  const servidor = await prisma.servidor.create({ data: data as never })
  if (tipo === 'principal' && (mensalidade !== undefined || dataPagamento !== undefined)) {
    await prisma.$executeRawUnsafe(
      'UPDATE servidores SET mensalidade = $1, data_pagamento = $2 WHERE id = $3',
      mensalidade != null && mensalidade !== '' ? Number(mensalidade) : null,
      dataPagamento ? new Date(dataPagamento) : null,
      servidor.id
    ).catch(() => {})
  }
  const pay = await prisma.$queryRawUnsafe<Array<{ mensalidade: number | null; data_pagamento: Date | null }>>(
    'SELECT mensalidade, data_pagamento FROM servidores WHERE id = $1',
    servidor.id
  ).then((r) => r[0]).catch(() => ({ mensalidade: null, data_pagamento: null }))
  res.status(201).json({
    ...servidor,
    mensalidade: pay?.mensalidade != null ? Number(pay.mensalidade) : null,
    dataPagamento: pay?.data_pagamento ?? null,
  })
  void notifyPanelUsers('servidores', `Novo servidor IPTV: "${servidor.nome}" (${servidor.tipo}).`)
})

router.patch('/:id', auditLog('update_servidor', 'servidor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canManageServidores(user.role)) return res.status(403).json({ error: 'Sem permissão para editar servidores' })
  const id = Number(req.params.id)
  const existing = await prisma.servidor.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Servidor não encontrado' })
  const { nome, tipo, status, servidorId, mensalidade, dataPagamento } = req.body
  await ensureServidorPagamentoColumns().catch(() => {})
  const update: Record<string, unknown> = {}
  if (nome != null) update.nome = nome
  if (tipo != null) update.tipo = tipo
  if (status != null) update.status = status
  if (tipo === 'secundario' && servidorId != null) update.servidorId = Number(servidorId)
  else if (tipo !== 'secundario') update.servidorId = null
  const servidor = await prisma.servidor.update({ where: { id }, data: update })
  if (mensalidade !== undefined || dataPagamento !== undefined) {
    await prisma.$executeRawUnsafe(
      'UPDATE servidores SET mensalidade = $1, data_pagamento = $2 WHERE id = $3',
      mensalidade != null && mensalidade !== '' ? Number(mensalidade) : null,
      dataPagamento ? new Date(dataPagamento) : null,
      id
    ).catch(() => {})
  }
  const pay = await prisma.$queryRawUnsafe<Array<{ mensalidade: number | null; data_pagamento: Date | null }>>(
    'SELECT mensalidade, data_pagamento FROM servidores WHERE id = $1',
    id
  ).then((r) => r[0]).catch(() => ({ mensalidade: null, data_pagamento: null }))
  res.json({
    ...servidor,
    mensalidade: pay?.mensalidade != null ? Number(pay.mensalidade) : null,
    dataPagamento: pay?.data_pagamento ?? null,
  })
  if (status != null && status !== existing.status && (status === 'offline' || status === 'instável')) {
    void notifyPanelUsers(
      'servidores',
      `Servidor "${servidor.nome}" passou a ${status}.`
    )
    if (status === 'offline') {
      void notifyServidorClients(id, (nome) => templates.servidorManutencao(nome, servidor.nome))
    }
  }
})

router.post('/:id/pagar-mes-principal', auditLog('pay_servidor_month', 'servidor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a servidores' })
  const id = Number(req.params.id)
  const existing = await prisma.servidor.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Servidor não encontrado' })
  if (existing.tipo !== 'principal') {
    return res.status(400).json({ error: 'Pagamento disponível apenas para servidores principais.' })
  }
  await ensureServidorPagamentoColumns().catch(() => {})
  const pay = await prisma.$queryRawUnsafe<Array<{ data_pagamento: Date | null }>>(
    'SELECT data_pagamento FROM servidores WHERE id = $1',
    id
  ).then((r) => r[0]).catch(() => ({ data_pagamento: null }))
  const mesesRaw = Number(req.body?.meses)
  const mesesAdd = Number.isFinite(mesesRaw) ? Math.min(24, Math.max(1, Math.round(mesesRaw))) : 1
  const base = pay?.data_pagamento ? new Date(pay.data_pagamento) : new Date()
  const next = addMonthsKeepingDay(base, mesesAdd)
  await prisma.$executeRawUnsafe('UPDATE servidores SET data_pagamento = $1 WHERE id = $2', next, id)
  const updated = await prisma.$queryRawUnsafe<Array<{ mensalidade: number | null; data_pagamento: Date | null }>>(
    'SELECT mensalidade, data_pagamento FROM servidores WHERE id = $1',
    id
  ).then((r) => r[0]).catch(() => ({ mensalidade: null, data_pagamento: null }))
  res.json({
    id: existing.id,
    nome: existing.nome,
    tipo: existing.tipo,
    status: existing.status,
    mensalidade: updated?.mensalidade != null ? Number(updated.mensalidade) : null,
    dataPagamento: updated?.data_pagamento ?? null,
  })
  const fimStr = updated?.data_pagamento ? formatDateBr(updated.data_pagamento) : '—'
  void notifyPanelUsers(
    ['servidores', 'financeiro'],
    `Pagamento servidor registado: "${existing.nome}" — próximo pagamento ${fimStr}.`
  )
})

router.post('/:id/suspender', auditLog('suspend_servidor', 'servidor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canManageServidores(user.role)) return res.status(403).json({ error: 'Sem permissão para suspender servidores' })
  const id = Number(req.params.id)
  const existing = await prisma.servidor.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Servidor não encontrado' })
  if (existing.status === 'offline') {
    return res.status(400).json({ error: 'Servidor já está suspenso/offline.' })
  }
  const servidor = await prisma.servidor.update({
    where: { id },
    data: { status: 'offline' },
  })
  void notifyPanelUsers('servidores', `Servidor "${servidor.nome}" suspenso (offline).`)
  void notifyServidorClients(id, (nome) => templates.servidorManutencao(nome, servidor.nome))
  res.json(servidor)
})

router.delete('/:id', auditLog('delete_servidor', 'servidor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canManageServidores(user.role)) return res.status(403).json({ error: 'Sem permissão para eliminar servidores' })
  await prisma.servidor.delete({ where: { id: Number(req.params.id) } })
  res.status(204).send()
})

export default router
