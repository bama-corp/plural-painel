import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from '../lib/auditLog.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)
router.use(requireAdmin)

router.get('/meta', (_req, res) => {
  res.json({
    actions: AUDIT_ACTION_LABELS,
    entities: AUDIT_ENTITY_LABELS,
  })
})

router.get('/', async (req, res) => {
  const { entity, action, userId, from, to, q, limit = '200', offset = '0' } = req.query
  const where: Prisma.AuditLogWhereInput = {}

  if (entity && String(entity).trim()) where.entity = String(entity).trim()
  if (action && String(action).trim()) where.action = String(action).trim()
  if (userId != null && String(userId).trim()) where.userId = Number(userId)

  const createdAt: Prisma.DateTimeFilter = {}
  if (from != null && String(from).trim()) {
    const d = new Date(String(from))
    if (!isNaN(d.getTime())) createdAt.gte = d
  }
  if (to != null && String(to).trim()) {
    const d = new Date(String(to))
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999)
      createdAt.lte = d
    }
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt

  const qTerm = typeof q === 'string' ? q.trim() : ''
  if (qTerm) {
    where.OR = [
      { action: { contains: qTerm, mode: 'insensitive' } },
      { entity: { contains: qTerm, mode: 'insensitive' } },
      { details: { contains: qTerm, mode: 'insensitive' } },
      { user: { nome: { contains: qTerm, mode: 'insensitive' } } },
      { user: { email: { contains: qTerm, mode: 'insensitive' } } },
    ]
    const asNum = Number(qTerm)
    if (Number.isFinite(asNum) && asNum > 0) {
      where.OR.push({ entityId: asNum })
    }
  }

  const take = Math.min(Math.max(Number(limit) || 200, 1), 500)
  const skip = Math.max(Number(offset) || 0, 0)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [list, total, todayCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, nome: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({
      where: {
        AND: [where, { createdAt: { gte: startOfToday } }],
      },
    }),
  ])

  res.json({ items: list, total, todayCount, limit: take, offset: skip })
})

export default router
