import { prisma } from './prisma.js'

let clientTableReady = false

/** Garante colunas adicionadas após deploys antigos (Neon/Vercel sem migrate). */
export async function ensureClientTableColumns(): Promise<void> {
  if (clientTableReady) return
  await prisma.$executeRawUnsafe(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS rove_id TEXT
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS clients_rove_id_unique_idx
    ON clients (rove_id)
    WHERE rove_id IS NOT NULL
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS portal_pin_plain TEXT
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS portal_first_login BOOLEAN NOT NULL DEFAULT false
  `)
  clientTableReady = true
}
