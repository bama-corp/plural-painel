/**
 * Testa GET /api/ph/summary com PH_API_KEY do .env.
 * Uso: npm run test:ph-api  (com API a correr em :3001)
 */
import 'dotenv/config'

const base = (process.env.PH_API_BASE || `http://localhost:${process.env.PORT || 3001}`).replace(
  /\/$/,
  ''
)
const key = process.env.PH_API_KEY || ''

async function main() {
  if (!key) {
    console.error('Defina PH_API_KEY no .env do plural-painel.')
    process.exit(1)
  }

  const headers = { Authorization: `Bearer ${key}` }

  const health = await fetch(`${base}/api/ph/health`, { headers })
  console.log('GET /api/ph/health', health.status, await health.text())

  const summary = await fetch(`${base}/api/ph/summary`, { headers })
  const body = await summary.json().catch(() => ({}))
  console.log('GET /api/ph/summary', summary.status)
  if (!summary.ok) {
    console.error(body)
    process.exit(1)
  }
  const data = body as {
    asOf?: string
    mrr?: number
    mrrPainel?: number
    lucroEstimado?: number
    counts?: Record<string, number>
    clients?: unknown[]
  }
  console.log({
    asOf: data.asOf,
    mrr: data.mrr,
    mrrPainel: data.mrrPainel,
    lucroEstimado: data.lucroEstimado,
    counts: data.counts,
    clients: data.clients?.length ?? 0,
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
