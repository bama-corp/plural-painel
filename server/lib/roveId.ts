import { prisma } from './prisma.js'
import { ensureClientTableColumns } from './clientSchema.js'

let roveIdSchemaReady = false

export async function ensureRoveIdColumn(): Promise<void> {
  if (roveIdSchemaReady) return
  await ensureClientTableColumns()
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
  const rows = await prisma.client.findMany({
    where: { id: { in: clean } },
    select: { id: true, roveId: true },
  })
  for (const r of rows) {
    map.set(r.id, r.roveId ?? null)
  }
  return map
}

async function assignRoveId(clientId: number): Promise<string> {
  await ensureRoveIdColumn().catch(() => {})
  for (let i = 0; i < 30; i++) {
    const candidate = buildRoveIdCandidate()
    const used = await prisma.client.findFirst({
      where: { roveId: candidate },
      select: { id: true },
    })
    if (used) continue
    try {
      const updated = await prisma.client.updateMany({
        where: { id: clientId, roveId: null },
        data: { roveId: candidate },
      })
      if (updated.count === 0) {
        const existing = await prisma.client.findUnique({
          where: { id: clientId },
          select: { roveId: true },
        })
        if (existing?.roveId) return existing.roveId
        continue
      }
      return candidate
    } catch {
      continue
    }
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
