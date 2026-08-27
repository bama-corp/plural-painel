/**
 * Diagnóstico completo – varre todos os passos do fluxo de dados
 * Executar: npx tsx scripts/diagnostico.ts
 */
import 'dotenv/config'
import { prisma } from '../server/lib/prisma'

const OK = '✓'
const FAIL = '✗'

async function passo(n: number, msg: string, fn: () => Promise<boolean>): Promise<boolean> {
  try {
    const ok = await fn()
    console.log(`${ok ? OK : FAIL} Passo ${n}: ${msg}`)
    return ok
  } catch (e) {
    console.log(`${FAIL} Passo ${n}: ${msg}`)
    console.log(`   Erro: ${e instanceof Error ? e.message : String(e)}`)
    return false
  }
}

async function main() {
  console.log('\n=== Diagnóstico Rove+ – fluxo de dados ===\n')

  // Passo 1: .env
  const envOk = !!process.env.DATABASE_URL
  console.log(`${envOk ? OK : FAIL} Passo 1: Ficheiro .env com DATABASE_URL`)
  if (!envOk) {
    console.log('   Criar .env a partir de .env.example e preencher DATABASE_URL')
    process.exit(1)
  }

  // Passo 2: Conexão à BD
  await passo(2, 'Conexão à base de dados', async () => {
    await prisma.$queryRawUnsafe('SELECT 1')
    return true
  })

  // Passo 3: Tabelas existem
  const tabelasOk = await passo(3, 'Tabelas criadas (clients, User)', async () => {
    const count = await prisma.client.count()
    const users = await prisma.user.count()
    console.log(`   → ${count} clientes, ${users} utilizadores na BD`)
    return count >= 0 && users >= 1
  })
  if (!tabelasOk) {
    console.log('   Executar: npm run db:push && npm run db:seed')
    process.exit(1)
  }

  // Passo 4: API responde (porta 3001)
  const apiOk = await passo(4, 'API a correr em localhost:3001', async () => {
    const res = await fetch('http://localhost:3001/api/health')
    const data = await res.json().catch(() => ({}))
    if (data?.ok && data?.db === 'connected') return true
    throw new Error(data?.message || `HTTP ${res.status} – executar: npm run dev:api`)
  })
  if (!apiOk) {
    console.log('\n   ⚠ Para testar passos 5–7, inicia a API: npm run dev:api')
    console.log('   Ou usa npm run dev:all para frontend + API.\n')
    process.exit(0)
  }

  // Passo 5: Login funciona
  const loginOk = await passo(5, 'Login (admin@roveplus.com)', async () => {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@roveplus.com', password: 'admin123' }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.user) return true
    throw new Error(data?.error || `HTTP ${res.status}`)
  })
  if (!loginOk) {
    console.log('   Verificar credenciais ou executar: npm run db:seed')
    process.exit(1)
  }

  // Passo 6: Obter token e chamar /api/clients
  await passo(6, 'GET /api/clients com sessão', async () => {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@roveplus.com', password: 'admin123' }),
    })
    const setCookie = loginRes.headers.get('set-cookie')
    if (!setCookie) throw new Error('Sem cookie de sessão')
    const cookie = setCookie.split(';')[0].trim()

    const clientsRes = await fetch('http://localhost:3001/api/clients', {
      headers: { Cookie: cookie },
    })
    if (clientsRes.status === 401) throw new Error('401 Não autorizado')
    if (!clientsRes.ok) {
      const errBody = await clientsRes.json().catch(() => ({})) as { detail?: string; error?: string }
      throw new Error(`HTTP ${clientsRes.status}: ${errBody.detail || errBody.error || clientsRes.statusText}`)
    }

    const clients = await clientsRes.json()
    const n = Array.isArray(clients) ? clients.length : 0
    console.log(`   → ${n} clientes devolvidos pela API`)
    return true
  })

  // Passo 7: Frontend (proxy Vite) – requer npm run dev:all
  await passo(7, 'Frontend (Vite) proxy /api → 3001', async () => {
    const res = await fetch('http://localhost:3000/api/health')
    const data = await res.json().catch(() => ({}))
    if (data?.ok) return true
    throw new Error('Executar npm run dev:all para ter Vite + API')
  })

  console.log('\n=== Diagnóstico completo ===')
  console.log('Se todos os passos passaram, o fluxo está OK.')
  console.log('No browser: http://localhost:3000 → login → Clientes\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('Erro fatal:', e)
  process.exit(1)
})
