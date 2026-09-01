import { prisma } from './prisma.js'
import { decryptField, encryptField } from './fieldCrypto.js'
import { ensureClientTableColumns } from './clientSchema.js'

let portalPinPlainColumnReady = false

export async function ensurePortalPinPlainColumn(): Promise<void> {
  if (portalPinPlainColumnReady) return
  await ensureClientTableColumns()
  portalPinPlainColumnReady = true
}

export async function setPortalPinPlainInDb(clientId: number, plain: string | null): Promise<void> {
  const id = Number(clientId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('ID de cliente inválido')
  await ensurePortalPinPlainColumn()
  if (plain == null || String(plain) === '') {
    await prisma.$executeRawUnsafe('UPDATE clients SET portal_pin_plain = NULL WHERE id = $1', id)
  } else {
    const stored = encryptField(String(plain))
    await prisma.$executeRawUnsafe('UPDATE clients SET portal_pin_plain = $1 WHERE id = $2', stored, id)
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
    return map
  }
  const rows = await prisma.client.findMany({
    where: { id: { in: clean } },
    select: { id: true, portalPinPlain: true },
  })
  for (const r of rows) {
    map.set(r.id, decryptField(r.portalPinPlain))
  }
  return map
}
