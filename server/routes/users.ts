import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { ensureUserStatusColumn, ensureUserWhatsappColumn, ensureUserAlertScopesColumn } from '../lib/userColumns.js'
import {
  backfillPasswordPlainFromHash,
  ensureUserPasswordPlainColumn,
  getUserPasswordPlainMap,
  setUserPasswordPlainInDb,
} from '../lib/userPasswordPlain.js'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import type { AuthPayload } from '../middleware/auth.js'
import { notifyPanelUsers } from '../lib/whatsappNotify.js'
import {
  parseStoredAlertScopes,
  normalizeAlertScopesInput,
  serializeAlertScopes,
  effectiveAlertScopes,
  type PanelAlertCategory,
} from '../lib/panelAlertPrefs.js'

const router = Router()
const ROLES_OPERADORES = ['geral', 'netflix', 'iptv', 'financeiro']

async function loadUserAlertScopesMap(): Promise<Record<number, PanelAlertCategory[] | null>> {
  await ensureUserAlertScopesColumn().catch(() => {})
  const map: Record<number, PanelAlertCategory[] | null> = {}
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number; alert_scopes: string | null }>>(
      'SELECT id, alert_scopes FROM "User" ORDER BY id ASC'
    )
    for (const r of rows) {
      map[r.id] = parseStoredAlertScopes(r.alert_scopes)
    }
  } catch {
    /* coluna opcional */
  }
  return map
}

async function saveUserAlertScopes(userId: number, scopes: PanelAlertCategory[] | null): Promise<void> {
  await ensureUserAlertScopesColumn()
  if (scopes == null) {
    await prisma.$executeRawUnsafe('UPDATE "User" SET alert_scopes = NULL WHERE id = $1', userId)
    return
  }
  await prisma.$executeRawUnsafe(
    'UPDATE "User" SET alert_scopes = $1 WHERE id = $2',
    serializeAlertScopes(scopes),
    userId
  )
}

router.use(authMiddleware)
router.use(requireAdmin)

/** Listar utilizadores (sem hash de password) */
router.get('/', async (req, res) => {
  await ensureUserStatusColumn().catch(() => {})
  await ensureUserWhatsappColumn().catch(() => {})
  await ensureUserPasswordPlainColumn().catch(() => {})
  const alertScopesMap = await loadUserAlertScopesMap()
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      nome: true,
      email: true,
      whatsapp: true,
      role: true,
      createdAt: true,
      password: true,
    },
  })
  let statusMap: Record<number, string> = {}
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number; status: string }>>(
      'SELECT id, status FROM "User" ORDER BY id ASC'
    )
    statusMap = Object.fromEntries((rows ?? []).map((r) => [r.id, r.status]))
  } catch {
    // coluna status pode não existir
  }
  const storedPlainById = await getUserPasswordPlainMap(users.map((u) => u.id))
  const passwordPlainById = new Map<number, string | null>()
  for (const u of users) {
    const stored = storedPlainById.get(u.id) ?? null
    const plain =
      (await backfillPasswordPlainFromHash(u.id, u.password, stored).catch(() => null)) ?? stored
    passwordPlainById.set(
      u.id,
      plain != null && String(plain) !== '' ? plain : null
    )
  }
  res.json(
    users.map(({ password: _password, ...u }) => ({
      ...u,
      status: statusMap[u.id] ?? 'ativo',
      passwordPlain: passwordPlainById.get(u.id) ?? null,
      alertScopes: alertScopesMap[u.id] ?? null,
      alertScopesEffective: effectiveAlertScopes(alertScopesMap[u.id], u.role),
    }))
  )
})

/** Criar utilizador (apenas roles operador; nunca criar segundo admin) */
router.post('/', auditLog('create_user', 'user'), async (req, res) => {
  await ensureUserWhatsappColumn().catch(() => {})
  const { nome, email, whatsapp, password, role, alertScopes } = req.body
  if (!nome || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha obrigatórios' })
  }
  const r = String(role || 'geral').toLowerCase()
  if (!ROLES_OPERADORES.includes(r)) {
    return res.status(400).json({ error: 'Role deve ser geral, netflix, iptv ou financeiro. Só pode existir um admin no sistema.' })
  }
  const emailNorm = String(email).trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: emailNorm } })
  if (existing) return res.status(400).json({ error: 'Email já utilizado' })
  let normalizedAlertScopes: PanelAlertCategory[] | null = null
  try {
    if (alertScopes !== undefined && alertScopes !== null) {
      normalizedAlertScopes = normalizeAlertScopesInput(alertScopes, r)
    }
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'alertScopes inválido' })
  }
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      nome: String(nome),
      email: emailNorm,
      whatsapp: whatsapp != null && String(whatsapp).trim() !== '' ? String(whatsapp).trim() : null,
      password: hash,
      role: r,
    },
    select: { id: true, nome: true, email: true, whatsapp: true, role: true, createdAt: true },
  })
  await setUserPasswordPlainInDb(user.id, String(password)).catch(() => {})
  if (normalizedAlertScopes) {
    await saveUserAlertScopes(user.id, normalizedAlertScopes).catch(() => {})
  }
  void notifyPanelUsers('utilizadores', `Novo utilizador: ${user.nome} (${user.email}) — perfil ${user.role}.`)
  res.status(201).json({
    ...user,
    alertScopes: normalizedAlertScopes,
    alertScopesEffective: effectiveAlertScopes(normalizedAlertScopes, user.role),
  })
})

/** Suspender utilizador (não permitir suspender o último admin) */
router.post('/:id/suspender', auditLog('suspend_user', 'user'), async (req, res) => {
  const id = Number(req.params.id)
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Utilizador não encontrado' })
  if (existing.role === 'admin') {
    const adminsCount = await prisma.user.count({ where: { role: 'admin' } })
    if (adminsCount <= 1) {
      return res.status(400).json({ error: 'Não pode suspender o único administrador do sistema.' })
    }
  }
  try {
    await ensureUserStatusColumn()
    await prisma.$executeRawUnsafe('UPDATE "User" SET status = $1 WHERE id = $2', 'suspenso', id)
    const [row] = await prisma.$queryRawUnsafe<Array<{ id: number; nome: string; email: string; role: string; status: string; createdAt: Date }>>(
      'SELECT id, nome, email, role, status, "createdAt" FROM "User" WHERE id = $1',
      id
    )
    if (!row) return res.status(500).json({ error: 'Erro ao obter utilizador' })
    void notifyPanelUsers('utilizadores', `Utilizador suspenso: ${row.nome} (${row.email}) — perfil ${row.role}.`)
    res.json({ id: row.id, nome: row.nome, email: row.email, role: row.role, status: row.status, createdAt: row.createdAt })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao suspender' })
  }
})

/** Ativar utilizador */
router.post('/:id/ativar', auditLog('activate_user', 'user'), async (req, res) => {
  const id = Number(req.params.id)
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Utilizador não encontrado' })
  try {
    await ensureUserStatusColumn()
    await prisma.$executeRawUnsafe('UPDATE "User" SET status = $1 WHERE id = $2', 'ativo', id)
    const [row] = await prisma.$queryRawUnsafe<Array<{ id: number; nome: string; email: string; role: string; status: string; createdAt: Date }>>(
      'SELECT id, nome, email, role, status, "createdAt" FROM "User" WHERE id = $1',
      id
    )
    if (!row) return res.status(500).json({ error: 'Erro ao obter utilizador' })
    res.json({ id: row.id, nome: row.nome, email: row.email, role: row.role, status: row.status, createdAt: row.createdAt })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao ativar' })
  }
})

/** Atualizar utilizador (não permitir alterar role para admin; não permitir retirar role admin ao único admin) */
router.patch('/:id', auditLog('update_user', 'user'), async (req, res) => {
  const id = Number(req.params.id)
  const { nome, email, whatsapp, role, password, alertScopes, useRoleAlertDefaults } = req.body
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Utilizador não encontrado' })
  const adminsCount = await prisma.user.count({ where: { role: 'admin' } })
  const newRole = role != null ? String(role).toLowerCase() : null
  if (newRole === 'admin') {
    return res.status(400).json({ error: 'Só pode existir um admin no sistema. Não é possível atribuir role admin.' })
  }
  if (existing.role === 'admin' && adminsCount <= 1 && newRole && newRole !== 'admin') {
    return res.status(400).json({ error: 'Não pode remover o único administrador do sistema.' })
  }
  const update: { nome?: string; email?: string; whatsapp?: string | null; password?: string; role?: string } = {}
  if (nome != null) update.nome = String(nome)
  if (email != null) {
    const emailNorm = String(email).trim().toLowerCase()
    const dup = await prisma.user.findFirst({ where: { email: emailNorm, NOT: { id } } })
    if (dup) return res.status(400).json({ error: 'Email já utilizado' })
    update.email = emailNorm
  }
  if (whatsapp !== undefined) update.whatsapp = whatsapp != null && String(whatsapp).trim() !== '' ? String(whatsapp).trim() : null
  if (newRole != null && ROLES_OPERADORES.includes(newRole)) update.role = newRole
  if (password != null && String(password).length > 0) {
    update.password = await bcrypt.hash(String(password), 10)
    await setUserPasswordPlainInDb(id, String(password)).catch(() => {})
  }

  const finalRole = newRole ?? existing.role
  let normalizedAlertScopes: PanelAlertCategory[] | null | undefined
  if (useRoleAlertDefaults === true) {
    normalizedAlertScopes = null
  } else if (alertScopes !== undefined) {
    try {
      normalizedAlertScopes =
        alertScopes === null ? null : normalizeAlertScopesInput(alertScopes, finalRole)
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'alertScopes inválido' })
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: update,
    select: { id: true, nome: true, email: true, whatsapp: true, role: true, createdAt: true },
  })
  if (normalizedAlertScopes !== undefined) {
    await saveUserAlertScopes(id, normalizedAlertScopes).catch(() => {})
  }
  const storedScopes =
    normalizedAlertScopes !== undefined
      ? normalizedAlertScopes
      : (await loadUserAlertScopesMap())[id] ?? null
  res.json({
    ...user,
    alertScopes: storedScopes,
    alertScopesEffective: effectiveAlertScopes(storedScopes, user.role),
  })
})

/** Eliminar utilizador (não permitir eliminar o último admin) */
router.delete('/:id', auditLog('delete_user', 'user'), async (req, res) => {
  const id = Number(req.params.id)
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Utilizador não encontrado' })
  if (existing.role === 'admin') {
    const adminsCount = await prisma.user.count({ where: { role: 'admin' } })
    if (adminsCount <= 1) {
      return res.status(400).json({ error: 'Não pode eliminar o único administrador do sistema.' })
    }
  }
  try {
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ])
    res.status(204).send()
  } catch (e) {
    console.error('Erro ao eliminar utilizador:', e)
    res.status(500).json({ error: 'Não foi possível eliminar o utilizador.' })
  }
})

export default router
