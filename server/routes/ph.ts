import { Router, type NextFunction, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

/** Auth only via PH_API_KEY (Bearer), not staff JWT. */
function requirePhKey(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.PH_API_KEY
  if (!secret) {
    return res.status(503).json({ error: 'PH API não configurada. Defina PH_API_KEY.' })
  }
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  if (token !== secret) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  next()
}

router.use(requirePhKey)

/**
 * GET /api/ph/summary
 * Snapshot enxuto para o painel PH (clientes + MRR). Sem credenciais/PINs.
 */
router.get('/summary', async (_req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.client.updateMany({
    where: { status: 'ativo', dataFim: { lt: today } },
    data: { status: 'vencido' },
  })

  const [clients, ativos, salasAtivas, custoServidoresIptv] = await Promise.all([
    prisma.client.findMany({
      where: { status: { in: ['ativo', 'vencido', 'cancelado'] } },
      select: {
        id: true,
        nome: true,
        servico: true,
        valor: true,
        dataFim: true,
        status: true,
      },
      orderBy: [{ servico: 'asc' }, { nome: 'asc' }],
    }),
    prisma.client.findMany({
      where: { status: 'ativo' },
      select: { valor: true, servico: true },
    }),
    prisma.sala.count({ where: { status: 'ativo' } }),
    prisma
      .$queryRawUnsafe<Array<{ total: number | string }>>(
        `SELECT COALESCE(SUM(mensalidade), 0) as total FROM servidores WHERE tipo = 'principal'`
      )
      .then((r) => Number(r[0]?.total ?? 0))
      .catch(() => 0),
  ])

  const round2 = (n: number) => Math.round(n * 100) / 100
  const mrrNetflix = ativos
    .filter((c) => String(c.servico).toLowerCase() === 'netflix')
    .reduce((s, c) => s + Number(c.valor), 0)
  const mrrIptv = ativos
    .filter((c) => String(c.servico).toLowerCase() === 'iptv')
    .reduce((s, c) => s + Number(c.valor), 0)
  const mrr = mrrNetflix + mrrIptv

  const salaCustoUnit = Number(process.env.SALA_NETFLIX_CUSTO_MENSAL || 0)
  const custoSalas = salasAtivas * salaCustoUnit
  const lucroEstimado = round2(mrr - Number(custoServidoresIptv || 0) - custoSalas)

  const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

  res.json({
    asOf: today.toISOString().slice(0, 10),
    mrr: round2(mrr),
    lucroEstimado,
    byServico: {
      netflix: round2(mrrNetflix),
      iptv: round2(mrrIptv),
    },
    clients: clients.map((c) => ({
      id: String(c.id),
      nome: c.nome,
      servico: String(c.servico).toLowerCase() === 'iptv' ? 'iptv' : 'netflix',
      valor: Number(c.valor),
      dataFim: isoDate(c.dataFim),
      status: normalizeStatus(c.status),
    })),
  })
})

function normalizeStatus(raw: string): 'ativo' | 'vencido' | 'cancelado' {
  const s = String(raw || '').toLowerCase()
  if (s === 'cancelado') return 'cancelado'
  if (s === 'vencido') return 'vencido'
  return 'ativo'
}

export default router
