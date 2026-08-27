import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, canAccessServidores } from '../middleware/auth.js'
import type { AuthPayload } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { notifyPanelUsers } from '../lib/whatsappNotify.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a revendedores' })
  const list = await prisma.revendedor.findMany({
    orderBy: { nome: 'asc' },
    include: {
      servidor: true,
      _count: { select: { clients: true } },
    },
  })
  res.json(
    list.map((r) => {
      const { _count, ...rest } = r
      return { ...rest, totalClientes: _count.clients }
    })
  )
})

router.post('/', auditLog('create_revendedor', 'revendedor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a revendedores' })
  const { nome, contacto, servidorId, observacoes } = req.body
  if (!nome || !contacto) return res.status(400).json({ error: 'Nome e contacto obrigatórios' })
  const servidorIdNum = servidorId ? Number(servidorId) : null
  if (!servidorIdNum) return res.status(400).json({ error: 'Servidor principal é obrigatório.' })
  const servidor = await prisma.servidor.findUnique({
    where: { id: servidorIdNum },
    select: { id: true, tipo: true },
  })
  if (!servidor) return res.status(404).json({ error: 'Servidor não encontrado' })
  if (servidor.tipo !== 'principal') {
    return res.status(400).json({ error: 'Revendedor só pode ser associado a servidor principal.' })
  }
  const revendedor = await prisma.revendedor.create({
    data: {
      nome: String(nome),
      contacto: String(contacto),
      servidorId: servidorIdNum,
      observacoes: observacoes ? String(observacoes) : null,
      status: 'ativo',
    },
    include: { servidor: true },
  })
  res.status(201).json({ ...revendedor, totalClientes: 0 })
  void notifyPanelUsers('servidores', `Novo revendedor: ${revendedor.nome} — servidor ${servidor.id}.`)
})

// Rotas com path específico primeiro (/:id/suspender, /:id/ativar)
router.post('/:id/suspender', auditLog('suspend_revendedor', 'revendedor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a revendedores' })
  const id = Number(req.params.id)
  const existing = await prisma.revendedor.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Revendedor não encontrado' })
  try {
    const revendedor = await prisma.revendedor.update({
      where: { id },
      data: { status: 'suspenso' },
      include: { servidor: true, _count: { select: { clients: true } } },
    })
    const { _count, ...rest } = revendedor
    void notifyPanelUsers('servidores', `Revendedor suspenso: ${revendedor.nome} (${_count.clients} cliente(s)).`)
    res.json({ ...rest, totalClientes: _count.clients })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao suspender'
    res.status(500).json({ error: message })
  }
})

router.post('/:id/ativar', auditLog('activate_revendedor', 'revendedor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a revendedores' })
  const id = Number(req.params.id)
  const existing = await prisma.revendedor.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Revendedor não encontrado' })
  try {
    const revendedor = await prisma.revendedor.update({
      where: { id },
      data: { status: 'ativo' },
      include: { servidor: true, _count: { select: { clients: true } } },
    })
    const { _count, ...rest } = revendedor
    void notifyPanelUsers('servidores', `Revendedor reativado: ${revendedor.nome}.`)
    res.json({ ...rest, totalClientes: _count.clients })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao ativar'
    res.status(500).json({ error: message })
  }
})

router.patch('/:id', auditLog('update_revendedor', 'revendedor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a revendedores' })
  const id = Number(req.params.id)
  const existing = await prisma.revendedor.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Revendedor não encontrado' })
  const { nome, contacto, servidorId, observacoes, status } = req.body
  const update: Record<string, unknown> = {}
  if (nome != null) update.nome = nome
  if (contacto != null) update.contacto = contacto
  const nextServidorRaw = servidorId !== undefined ? servidorId : existing.servidorId
  const servidorIdNum = nextServidorRaw ? Number(nextServidorRaw) : null
  if (!servidorIdNum) return res.status(400).json({ error: 'Servidor principal é obrigatório.' })
  const servidor = await prisma.servidor.findUnique({
    where: { id: servidorIdNum },
    select: { id: true, tipo: true },
  })
  if (!servidor) return res.status(404).json({ error: 'Servidor não encontrado' })
  if (servidor.tipo !== 'principal') {
    return res.status(400).json({ error: 'Revendedor só pode ser associado a servidor principal.' })
  }
  update.servidorId = servidorIdNum
  if (observacoes !== undefined) update.observacoes = observacoes ? String(observacoes) : null
  if (status != null) update.status = status
  const revendedor = await prisma.revendedor.update({
    where: { id },
    data: update,
    include: { servidor: true, _count: { select: { clients: true } } },
  })
  const { _count, ...rest } = revendedor
  res.json({ ...rest, totalClientes: _count.clients })
})

router.delete('/:id', auditLog('delete_revendedor', 'revendedor'), async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessServidores(user.role)) return res.status(403).json({ error: 'Sem acesso a revendedores' })
  const id = Number(req.params.id)
  const existing = await prisma.revendedor.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Revendedor não encontrado' })
  await prisma.revendedor.delete({ where: { id } })
  res.status(204).send()
})

export default router
