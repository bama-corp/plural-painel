import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ensureRoveIdColumn, getRoveIdsMap } from '../lib/roveId.js'
import { authMiddleware } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { notifyIndicacaoCreated, notifyIndicacaoConfirmed } from '../lib/whatsappNotify.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  const { status } = req.query
  const where = status ? { status: String(status) } : {}
  await ensureRoveIdColumn().catch(() => {})
  const list = await prisma.indicacao.findMany({
    where,
    include: { indicador: { select: { id: true, nome: true, whatsapp: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const ids = Array.from(new Set(list.map((i) => i.indicadorId)))
  const roveMap = ids.length ? await getRoveIdsMap(ids).catch(() => new Map<number, string | null>()) : new Map()
  res.json(
    list.map((i) => ({
      ...i,
      indicador: { ...i.indicador, roveId: roveMap.get(i.indicadorId) ?? null },
    }))
  )
})

router.post('/', auditLog('create_indicacao', 'indicacao'), async (req, res) => {
  const { indicadorId, indicadorRoveId, indicadoNome, indicadoWhatsapp } = req.body
  const nome = String(indicadoNome ?? '').trim()
  if (nome.length < 2) {
    return res.status(400).json({ error: 'Nome do indicado deve ter pelo menos 2 caracteres' })
  }
  await ensureRoveIdColumn().catch(() => {})
  let idIndicador: number | null = null

  const roveRaw = String(indicadorRoveId ?? '').trim().toUpperCase()
  if (roveRaw) {
    const byRove = await prisma
      .$queryRawUnsafe<Array<{ id: number }>>(
        'SELECT id FROM clients WHERE rove_id = $1 LIMIT 1',
        roveRaw
      )
      .then((r) => r[0] ?? null)
      .catch(() => null)
    if (!byRove) {
      return res.status(404).json({ error: 'Cliente indicador não encontrado para o ID ROVE informado' })
    }
    idIndicador = byRove.id
  } else {
    const parsedId = Number(indicadorId)
    if (!Number.isFinite(parsedId) || parsedId < 1) {
      return res.status(400).json({ error: 'Cliente indicador inválido' })
    }
    idIndicador = parsedId
  }

  const existe = await prisma.client.findUnique({ where: { id: idIndicador }, select: { id: true } })
  if (!existe) {
    return res.status(404).json({ error: 'Cliente indicador não encontrado' })
  }
  const indicacao = await prisma.indicacao.create({
    data: {
      indicadorId: idIndicador,
      indicadoNome: nome,
      indicadoWhatsapp: String(indicadoWhatsapp ?? '').trim(),
      status: 'pendente',
    },
  })
  await prisma.client.update({
    where: { id: idIndicador },
    data: { indicacoes: { increment: 1 } },
  })
  void notifyIndicacaoCreated(idIndicador, nome, String(indicadoWhatsapp ?? '').trim())
  res.status(201).json(indicacao)
})

router.patch('/:id', auditLog('update_indicacao', 'indicacao'), async (req, res) => {
  const id = Number(req.params.id)
  const before = await prisma.indicacao.findUnique({ where: { id } })
  const { status, indicadoNome, indicadoWhatsapp } = req.body
  const data: { status?: string; indicadoNome?: string; indicadoWhatsapp?: string } = {}
  if (status != null) data.status = String(status)
  if (indicadoNome != null) data.indicadoNome = String(indicadoNome).trim()
  if (indicadoWhatsapp != null) data.indicadoWhatsapp = String(indicadoWhatsapp).trim()
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' })
  const indicacao = await prisma.indicacao.update({
    where: { id },
    data,
  })
  if (status === 'confirmada' && before?.status !== 'confirmada') {
    void notifyIndicacaoConfirmed(id)
  }
  res.json(indicacao)
})

router.delete('/:id', auditLog('delete_indicacao', 'indicacao'), async (req, res) => {
  const ind = await prisma.indicacao.findUnique({ where: { id: Number(req.params.id) } })
  if (ind) {
    await prisma.client.update({
      where: { id: ind.indicadorId },
      data: { indicacoes: { decrement: 1 } },
    })
  }
  await prisma.indicacao.delete({ where: { id: Number(req.params.id) } })
  res.status(204).send()
})

export default router
