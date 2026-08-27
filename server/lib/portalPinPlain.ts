import { prisma } from './prisma.js'

let portalPinPlainColumnReady = false

export async function ensurePortalPinPlainColumn(): Promise<void> {
  if (portalPinPlainColumnReady) return
  await prisma.$executeRawUnsafe(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS portal_pin_plain TEXT
  `)
  portalPinPlainColumnReady = true
}

export async function setPortalPinPlainInDb(clientId: number, plain: string | null): Promise<void> {
  const id = Number(clientId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('ID de cliente inválido')
  await ensurePortalPinPlainColumn()
  if (plain == null || String(plain) === '') {
    await prisma.$executeRawUnsafe('UPDATE clients SET portal_pin_plain = NULL WHERE id = $1', id)
  } else {
    await prisma.$executeRawUnsafe('UPDATE clients SET portal_pin_plain = $1 WHERE id = $2', String(plain), id)
  }
}

export async function getPortalPinPlainMap(ids: number[]): Promise<Map<number, string | null>> {
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
    await ensurePortalPinPlainColumn()
  } catch {
    // coluna inacessível
  }
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; portal_pin_plain: string | null }>>(
    `SELECT id, portal_pin_plain FROM clients WHERE id IN (${clean.join(',')})`
  )
  for (const r of rows) {
    const id = Number(r.id)
    map.set(id, r.portal_pin_plain ?? null)
  }
  return map
}
