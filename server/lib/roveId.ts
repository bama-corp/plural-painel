import { prisma } from './prisma.js'

let roveIdSchemaReady = false

export async function ensureRoveIdColumn(): Promise<void> {
  if (roveIdSchemaReady) return
  await prisma.$executeRawUnsafe(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS rove_id TEXT
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS clients_rove_id_unique_idx
    ON clients (rove_id)
    WHERE rove_id IS NOT NULL
  `)
  roveIdSchemaReady = true
}

function buildRoveIdCandidate(): string {
  const year = new Date().getFullYear()
  const random4 = Math.floor(1000 + Math.random() * 9000)
  return `RV${year}${String(random4)}`
}

export async function getRoveIdsMap(clientIds: number[]): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>()
  const clean = [...new Set(clientIds.map((i) => Number(i)).filter((i) => Number.isFinite(i) && i > 0))]
  if (clean.length === 0) return map
  await ensureRoveIdColumn().catch(() => {})
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; rove_id: string | null }>>(
    `SELECT id, rove_id FROM clients WHERE id = ANY($1::int[])`,
    clean
  )
  for (const r of rows) {
    map.set(Number(r.id), r.rove_id ?? null)
  }
  return map
}

async function assignRoveId(clientId: number): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const candidate = buildRoveIdCandidate()
    const used = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      'SELECT id FROM clients WHERE rove_id = $1 LIMIT 1',
      candidate
    )
    if (used.length > 0) continue
    await prisma.$executeRawUnsafe(
      'UPDATE clients SET rove_id = $1 WHERE id = $2 AND rove_id IS NULL',
      candidate,
      clientId
    )
    const rows = await prisma.$queryRawUnsafe<Array<{ rove_id: string | null }>>(
      'SELECT rove_id FROM clients WHERE id = $1 LIMIT 1',
      clientId
    )
    const assigned = rows[0]?.rove_id
    if (assigned) return assigned
  }
  throw new Error('Não foi possível gerar ID ROVE único')
}

/** Garante IDs ROVE em lote — uma query + backfill só para os em falta (sequencial). */
export async function ensureRoveIdsForClients(clientIds: number[]): Promise<Map<number, string>> {
  const result = new Map<number, string>()
  const existing = await getRoveIdsMap(clientIds)
  for (const id of clientIds) {
    const current = existing.get(id)
    if (current) {
      result.set(id, current)
      continue
    }
    const assigned = await assignRoveId(id)
    result.set(id, assigned)
  }
  return result
}

export async function ensureClientRoveId(clientId: number): Promise<string> {
  const map = await ensureRoveIdsForClients([clientId])
  const id = map.get(clientId)
  if (!id) throw new Error('Não foi possível gerar ID ROVE único')
  return id
}
