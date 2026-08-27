import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'

let userPasswordPlainColumnReady = false

export async function ensureUserPasswordPlainColumn(): Promise<void> {
  if (userPasswordPlainColumnReady) return
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS password_plain TEXT
  `)
  userPasswordPlainColumnReady = true
}

export async function setUserPasswordPlainInDb(userId: number, plain: string | null): Promise<void> {
  const id = Number(userId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('ID de utilizador inválido')
  await ensureUserPasswordPlainColumn()
  if (plain == null || String(plain) === '') {
    await prisma.$executeRawUnsafe('UPDATE "User" SET password_plain = NULL WHERE id = $1', id)
  } else {
    await prisma.$executeRawUnsafe('UPDATE "User" SET password_plain = $1 WHERE id = $2', String(plain), id)
  }
}

export async function getUserPasswordPlainMap(ids: number[]): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>()
  const clean = [
    ...new Set(
      ids
        .map((i) => Number(i))
        .filter((i) => Number.isFinite(i) && i > 0)
    ),
  ]
  if (clean.length === 0) return map
  try {
    await ensureUserPasswordPlainColumn()
  } catch {
    return map
  }
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; password_plain: string | null }>>(
    `SELECT id, password_plain FROM "User" WHERE id IN (${clean.join(',')})`
  )
  for (const r of rows) {
    map.set(Number(r.id), r.password_plain ?? null)
  }
  return map
}

export function passwordBackfillCandidates(): string[] {
  const fromList = (process.env.PASSWORD_BACKFILL_CANDIDATES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const defaults = [process.env.ADMIN_PASSWORD, process.env.OPERATOR_DEFAULT_PASSWORD, 'admin123', '123456']
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
  return [...new Set([...defaults, ...fromList])]
}

/** Tenta recuperar senha em texto comparando o hash com candidatos conhecidos (utilizadores antigos). */
export async function backfillPasswordPlainFromHash(
  userId: number,
  passwordHash: string,
  existingPlain: string | null | undefined
): Promise<string | null> {
  if (existingPlain != null && String(existingPlain) !== '') return existingPlain
  for (const candidate of passwordBackfillCandidates()) {
    try {
      if (await bcrypt.compare(candidate, passwordHash)) {
        await setUserPasswordPlainInDb(userId, candidate)
        return candidate
      }
    } catch {
      // candidato inválido ou hash corrompido
    }
  }
  return null
}
