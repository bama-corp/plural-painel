import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, type AuthPayload } from '../middleware/auth.js'
import { panelLoginRateLimit } from '../middleware/rateLimits.js'
import { ensureUserStatusColumn, ensureUserWhatsappColumn } from '../lib/userColumns.js'
import { getUserPublicProfile } from '../lib/userProfile.js'
import { setUserPasswordPlainInDb } from '../lib/userPasswordPlain.js'
import { normalizeEmail, normalizeNome, normalizeWhatsappOptional } from '../lib/validate.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 dias

router.post('/login', panelLoginRateLimit, async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  const password = req.body?.password != null ? String(req.body.password) : ''
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha obrigatórios' })
  }
  try {
    await ensureUserWhatsappColumn().catch(() => {})
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, nome: true, email: true, role: true, whatsapp: true, password: true },
    })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }
    let status = 'ativo'
    try {
      await ensureUserStatusColumn()
      const rows = await prisma.$queryRawUnsafe<Array<{ status: string }>>(
        'SELECT status FROM "User" WHERE id = $1',
        user.id
      )
      status = rows[0]?.status ?? 'ativo'
    } catch {
      // coluna status pode não existir na BD; assumir ativo
    }
    if (status === 'suspenso') {
      return res.status(403).json({ error: 'Conta suspensa. Contacte o administrador.' })
    }
    const payload: AuthPayload = { userId: user.id, email: user.email, role: user.role }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
    res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        whatsapp: user.whatsapp ?? null,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    if (/DATABASE_URL|Environment variable not found|PrismaClientInit/i.test(msg)) {
      return res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente mais tarde.' })
    }
    if (/connect|ECONNREFUSED|timeout|Connection|P1001|P1002|P1017/i.test(msg)) {
      return res.status(503).json({ error: 'Sem ligação à base de dados. Tente novamente dentro de momentos.' })
    }
    return res.status(500).json({ error: 'Erro ao iniciar sessão. Tente novamente.' })
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  res.json({ ok: true })
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as unknown as { user: AuthPayload }).user
    const user = await getUserPublicProfile(userId)
    if (!user) return res.status(401).json({ error: 'Utilizador não encontrado' })
    res.json(user)
  } catch (err) {
    console.error('GET /api/auth/me:', err)
    const msg = err instanceof Error ? err.message : String(err)
    if (/connect|ECONNREFUSED|timeout|Connection|P1001|P1002|P1017/i.test(msg)) {
      return res.status(503).json({ error: 'Sem ligação à base de dados' })
    }
    return res.status(500).json({ error: 'Erro ao carregar perfil', detail: msg })
  }
})

/** Atualizar o próprio perfil (nome, email, WhatsApp, senha). Não altera perfil/role. */
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as unknown as { user: AuthPayload }).user
    const { nome, email, whatsapp, currentPassword, newPassword } = req.body as Record<string, unknown>

    await ensureUserWhatsappColumn().catch(() => {})
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    })
    if (!existing) return res.status(401).json({ error: 'Utilizador não encontrado' })

    const wantsPasswordChange = newPassword != null && String(newPassword).length > 0
    if (wantsPasswordChange) {
      if (!currentPassword || !(await bcrypt.compare(String(currentPassword), existing.password))) {
        return res.status(400).json({ error: 'Senha atual incorreta' })
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' })
      }
    }

    const data: { nome?: string; email?: string; whatsapp?: string | null; password?: string } = {}

    if (nome !== undefined) {
      const nomeNorm = normalizeNome(nome)
      if (!nomeNorm) return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' })
      data.nome = nomeNorm
    }
    if (email !== undefined) {
      const emailNorm = normalizeEmail(email)
      if (!emailNorm) return res.status(400).json({ error: 'Email inválido' })
      const dup = await prisma.user.findFirst({ where: { email: emailNorm, NOT: { id: userId } } })
      if (dup) return res.status(400).json({ error: 'Email já utilizado' })
      data.email = emailNorm
    }
    if (whatsapp !== undefined) {
      const waNorm = normalizeWhatsappOptional(whatsapp)
      if (waNorm === null && whatsapp != null && String(whatsapp).trim() !== '') {
        return res.status(400).json({ error: 'WhatsApp inválido (mínimo 8 dígitos)' })
      }
      if (waNorm !== undefined) data.whatsapp = waNorm
    }
    if (wantsPasswordChange) {
      data.password = await bcrypt.hash(String(newPassword), 10)
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, nome: true, email: true, role: true, whatsapp: true },
    })
    if (wantsPasswordChange) {
      await setUserPasswordPlainInDb(userId, String(newPassword)).catch(() => {})
    }
    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      whatsapp: user.whatsapp ?? null,
    })
  } catch (err) {
    console.error('PATCH /api/auth/me:', err)
    const msg = err instanceof Error ? err.message : String(err)
    if (/connect|ECONNREFUSED|timeout|Connection|P1001|P1002|P1017/i.test(msg)) {
      return res.status(503).json({ error: 'Sem ligação à base de dados' })
    }
    return res.status(500).json({ error: 'Erro ao guardar perfil', detail: msg })
  }
})

export default router
