import { prisma } from './prisma.js'
import { encryptField } from './fieldCrypto.js'

let clientTableReady = false
let iptvAccountsReady = false

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

/** Tabela de contas IPTV + migração a partir de perfil/iptvUser legados. */
export async function ensureClientIptvAccountsTable(): Promise<void> {
  if (iptvAccountsReady) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS client_iptv_accounts (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      label TEXT,
      username TEXT NOT NULL,
      password TEXT,
      mac TEXT,
      m3u TEXT,
      servidor_id INTEGER REFERENCES servidores(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS client_iptv_accounts_client_id_idx
    ON client_iptv_accounts (client_id)
  `)

  // Migrar clientes IPTV com dados legados e ainda sem contas
  const legacy = await prisma.$queryRawUnsafe<
    Array<{
      id: number
      perfil: string | null
      iptvUser: string | null
      iptvPass: string | null
      iptvMac: string | null
      iptvM3u: string | null
      servidorId: number | null
    }>
  >(`
    SELECT c.id, c.perfil, c."iptvUser", c."iptvPass", c."iptvMac", c."iptvM3u", c."servidorId"
    FROM clients c
    WHERE c.servico = 'iptv'
      AND NOT EXISTS (SELECT 1 FROM client_iptv_accounts a WHERE a.client_id = c.id)
      AND (
        (c.perfil IS NOT NULL AND TRIM(c.perfil) <> '')
        OR (c."iptvUser" IS NOT NULL AND TRIM(c."iptvUser") <> '')
      )
  `).catch(() => [])

  for (const row of legacy) {
    const username = (row.perfil || row.iptvUser || '').trim()
    if (!username) continue
    await prisma.$executeRawUnsafe(
      `INSERT INTO client_iptv_accounts
        (client_id, label, username, password, mac, m3u, servidor_id, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW(), NOW())`,
      row.id,
      null,
      username,
      row.iptvPass,
      row.iptvMac,
      row.iptvM3u,
      row.servidorId
    ).catch((err) => {
      console.error('[iptvAccounts] migrate client', row.id, err)
    })
  }

  iptvAccountsReady = true
}

export type IptvAccountInput = {
  id?: number | null
  label?: string | null
  username?: string | null
  password?: string | null
  mac?: string | null
  m3u?: string | null
  servidorId?: number | null
  sortOrder?: number | null
}

export type IptvAccountPublic = {
  id: number
  label: string | null
  username: string
  password: string | null
  passwordSet: boolean
  mac: string | null
  m3u: string | null
  servidorId: number | null
  sortOrder: number
  servidor?: { id: number; nome: string; status?: string } | null
}

function normalizeAccountInput(raw: unknown): IptvAccountInput[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, idx) => {
    const r = (item ?? {}) as Record<string, unknown>
    return {
      id: r.id != null && r.id !== '' ? Number(r.id) : null,
      label: r.label != null && String(r.label).trim() !== '' ? String(r.label).trim() : null,
      username: r.username != null ? String(r.username).trim() : '',
      password: r.password != null ? String(r.password) : null,
      mac: r.mac != null && String(r.mac).trim() !== '' ? String(r.mac).trim() : null,
      m3u: r.m3u != null && String(r.m3u).trim() !== '' ? String(r.m3u).trim() : null,
      servidorId:
        r.servidorId != null && r.servidorId !== '' ? Number(r.servidorId) : null,
      sortOrder: r.sortOrder != null ? Number(r.sortOrder) : idx,
    }
  })
}

/** Grava a lista de contas IPTV do cliente (replace controlado). */
export async function syncClientIptvAccounts(
  clientId: number,
  rawAccounts: unknown
): Promise<{ changed: boolean; firstServidorId: number | null; firstUsername: string | null }> {
  await ensureClientIptvAccountsTable()
  const inputs = normalizeAccountInput(rawAccounts).filter((a) => a.username)
  if (inputs.length === 0) {
    await prisma.clientIptvAccount.deleteMany({ where: { clientId } })
    return { changed: true, firstServidorId: null, firstUsername: null }
  }

  const existing = await prisma.clientIptvAccount.findMany({ where: { clientId } })
  const existingById = new Map(existing.map((e) => [e.id, e]))
  const keepIds = new Set<number>()
  let changed = false

  for (let i = 0; i < inputs.length; i++) {
    const a = inputs[i]
    const sortOrder = a.sortOrder ?? i
    if (a.id && existingById.has(a.id)) {
      keepIds.add(a.id)
      const prev = existingById.get(a.id)!
      const passwordUpdate =
        a.password != null && String(a.password).trim() !== ''
          ? encryptField(String(a.password).trim())
          : undefined
      const nextPass = passwordUpdate !== undefined ? passwordUpdate : prev.password
      const same =
        (prev.label ?? null) === (a.label ?? null) &&
        prev.username === a.username &&
        (prev.mac ?? null) === (a.mac ?? null) &&
        (prev.m3u ?? null) === (a.m3u ?? null) &&
        (prev.servidorId ?? null) === (a.servidorId ?? null) &&
        prev.sortOrder === sortOrder &&
        passwordUpdate === undefined
      if (!same) {
        changed = true
        await prisma.clientIptvAccount.update({
          where: { id: a.id },
          data: {
            label: a.label ?? null,
            username: a.username!,
            ...(passwordUpdate !== undefined ? { password: nextPass } : {}),
            mac: a.mac ?? null,
            m3u: a.m3u ?? null,
            servidorId: a.servidorId ?? null,
            sortOrder,
          },
        })
      }
    } else {
      changed = true
      const created = await prisma.clientIptvAccount.create({
        data: {
          clientId,
          label: a.label ?? null,
          username: a.username!,
          password:
            a.password != null && String(a.password).trim() !== ''
              ? encryptField(String(a.password).trim())
              : null,
          mac: a.mac ?? null,
          m3u: a.m3u ?? null,
          servidorId: a.servidorId ?? null,
          sortOrder,
        },
      })
      keepIds.add(created.id)
    }
  }

  const toDelete = existing.filter((e) => !keepIds.has(e.id))
  if (toDelete.length) {
    changed = true
    await prisma.clientIptvAccount.deleteMany({
      where: { id: { in: toDelete.map((e) => e.id) } },
    })
  }

  const first = inputs[0]
  return {
    changed,
    firstServidorId: first?.servidorId ?? null,
    firstUsername: first?.username ?? null,
  }
}

export async function loadClientIptvAccounts(
  clientId: number,
  opts?: { decryptPasswords?: boolean }
): Promise<IptvAccountPublic[]> {
  await ensureClientIptvAccountsTable()
  const rows = await prisma.clientIptvAccount.findMany({
    where: { clientId },
    include: { servidor: { select: { id: true, nome: true, status: true } } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  if (rows.length === 0) {
    // Fallback legado (antes da migração ter corrido neste processo)
    const c = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        servico: true,
        perfil: true,
        iptvUser: true,
        iptvPass: true,
        iptvMac: true,
        iptvM3u: true,
        servidorId: true,
        servidor: { select: { id: true, nome: true, status: true } },
      },
    })
    if (c?.servico === 'iptv') {
      const username = (c.perfil || c.iptvUser || '').trim()
      if (username) {
        const { decryptField } = await import('./fieldCrypto.js')
        return [
          {
            id: 0,
            label: null,
            username,
            password: opts?.decryptPasswords ? decryptField(c.iptvPass) : null,
            passwordSet: !!(c.iptvPass && String(c.iptvPass).length > 0),
            mac: c.iptvMac,
            m3u: c.iptvM3u,
            servidorId: c.servidorId,
            sortOrder: 0,
            servidor: c.servidor,
          },
        ]
      }
    }
    return []
  }

  const { decryptField } = await import('./fieldCrypto.js')
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    username: r.username,
    password: opts?.decryptPasswords ? decryptField(r.password) : null,
    passwordSet: !!(r.password && String(r.password).length > 0),
    mac: r.mac,
    m3u: r.m3u,
    servidorId: r.servidorId,
    sortOrder: r.sortOrder,
    servidor: r.servidor,
  }))
}

export async function loadIptvAccountsForClients(
  clientIds: number[],
  opts?: { decryptPasswords?: boolean }
): Promise<Map<number, IptvAccountPublic[]>> {
  const map = new Map<number, IptvAccountPublic[]>()
  if (clientIds.length === 0) return map
  await ensureClientIptvAccountsTable()
  const rows = await prisma.clientIptvAccount.findMany({
    where: { clientId: { in: clientIds } },
    include: { servidor: { select: { id: true, nome: true, status: true } } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  const { decryptField } = await import('./fieldCrypto.js')
  for (const r of rows) {
    const list = map.get(r.clientId) ?? []
    list.push({
      id: r.id,
      label: r.label,
      username: r.username,
      password: opts?.decryptPasswords ? decryptField(r.password) : null,
      passwordSet: !!(r.password && String(r.password).length > 0),
      mac: r.mac,
      m3u: r.m3u,
      servidorId: r.servidorId,
      sortOrder: r.sortOrder,
      servidor: r.servidor,
    })
    map.set(r.clientId, list)
  }
  return map
}
