import { Router, type NextFunction, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

export type PhClientStatus = 'ativo' | 'vencido' | 'suspenso' | 'cancelado'

/** Auth only via PH_API_KEY (Bearer), not staff JWT. */
function requirePhKey(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.PH_API_KEY
  if (!secret) {
    return res.status(503).json({ error: 'PH API nao configurada. Defina PH_API_KEY.' })
  }
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  if (token !== secret) {
    return res.status(401).json({ error: 'Nao autorizado' })
  }
  next()
}

router.use(requirePhKey)

/**
 * GET /api/ph/health
 * Confirma que a chave e a BD respondem (sem dados sensiveis).
 */
router.get('/health', async (_req, res) => {
  await prisma.$queryRawUnsafe('SELECT 1')
  res.json({
    ok: true,
    service: 'ph-api',
    asOf: new Date().toISOString().slice(0, 10),
  })
})

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

  const statuses: PhClientStatus[] = ['ativo', 'vencido', 'suspenso', 'cancelado']

  const [clients, salasAtivas, custoServidoresIptv] = await Promise.all([
    prisma.client.findMany({
      where: { status: { in: statuses } },
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
    prisma.sala.count({ where: { status: 'ativo' } }),
    prisma
      .$queryRawUnsafe<Array<{ total: number | string }>>(
        `SELECT COALESCE(SUM(mensalidade), 0) as total FROM servidores WHERE tipo = 'principal'`
      )
      .then((r) => Number(r[0]?.total ?? 0))
      .catch(() => 0),
  ])

  const round2 = (n: number) => Math.round(n * 100) / 100
  const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

  const mapped = clients.map((c) => ({
    id: String(c.id),
    nome: c.nome,
    servico: String(c.servico).toLowerCase() === 'iptv' ? ('iptv' as const) : ('netflix' as const),
    valor: Number(c.valor),
    dataFim: isoDate(c.dataFim),
    status: normalizeStatus(c.status),
  }))

  /** MRR estrito: so activos (como no dashboard Plural). */
  const mrrAtivos = mapped
    .filter((c) => c.status === 'ativo')
    .reduce((s, c) => s + c.valor, 0)

  /** MRR alinhado ao PH: activos + vencidos + suspensos (exclui cancelado). */
  const mrrPainel = mapped
    .filter((c) => c.status !== 'cancelado')
    .reduce((s, c) => s + c.valor, 0)

  const mrrNetflix = mapped
    .filter((c) => c.status === 'ativo' && c.servico === 'netflix')
    .reduce((s, c) => s + c.valor, 0)
  const mrrIptv = mapped
    .filter((c) => c.status === 'ativo' && c.servico === 'iptv')
    .reduce((s, c) => s + c.valor, 0)

  const salaCustoUnit = Number(process.env.SALA_NETFLIX_CUSTO_MENSAL || 0)
  const custoSalas = salasAtivas * salaCustoUnit
  const custoServidores = Number(custoServidoresIptv || 0)
  const lucroEstimado = round2(mrrAtivos - custoServidores - custoSalas)

  const counts = {
    ativo: mapped.filter((c) => c.status === 'ativo').length,
    vencido: mapped.filter((c) => c.status === 'vencido').length,
    suspenso: mapped.filter((c) => c.status === 'suspenso').length,
    cancelado: mapped.filter((c) => c.status === 'cancelado').length,
  }

  res.json({
    asOf: today.toISOString().slice(0, 10),
    /** Compat: mrr = activos (legado / docs iniciais). */
    mrr: round2(mrrAtivos),
    /** Preferir no PH para alinhar alertas e Stat MRR. */
    mrrPainel: round2(mrrPainel),
    lucroEstimado,
    byServico: {
      netflix: round2(mrrNetflix),
      iptv: round2(mrrIptv),
    },
    counts,
    custos: {
      servidores: round2(custoServidores),
      salas: round2(custoSalas),
      salaUnit: round2(salaCustoUnit),
      salasAtivas,
    },
    clients: mapped,
  })
})

function normalizeStatus(raw: string): PhClientStatus {
  const s = String(raw || '').toLowerCase()
  if (s === 'cancelado') return 'cancelado'
  if (s === 'vencido') return 'vencido'
  if (s === 'suspenso') return 'suspenso'
  return 'ativo'
}

export default router
