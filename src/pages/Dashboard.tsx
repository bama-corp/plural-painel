import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Users,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Gift,
  Server,
  ChevronRight,
  UserPlus,
  Store,
  CalendarClock,
  LayoutDashboard,
  LayoutGrid,
} from 'lucide-react'
import { api } from '../api/client'
import { useAlert } from '../contexts/AlertContext'
import { TablePagination, ROWS_PER_PAGE } from '../components/TablePagination'

interface DashboardData {
  totalNetflix: number
  totalIptv: number
  totalClientes: number
  clientesVencidos?: number
  clientesCancelados?: number
  clientesVencidosNetflix?: number
  clientesVencidosIptv?: number
  clientesCanceladosNetflix?: number
  clientesCanceladosIptv?: number
  clientsByServidor: { id: number; nome: string; totalClientes: number; status: string }[]
  clientsBySala?: { id: number; nome: string; totalClientes: number }[]
  vencendoHoje: number
  vencendoEm7Dias?: number
  clientesNovosEsteMes?: number
  receitaMes: number
  receitaMesAnterior?: number
  variacaoReceita?: number
  indicacoesTotal: number
  indicacoesPendentes?: number
  indicacoesConfirmadas?: number
  indicacoesEsteMes?: number
  totalRevendedores?: number
  clientesComRevendedor?: number
  receitaUltimosMeses?: { mes: string; valor: number }[]
  salasVencendo?: number
  salasVencidas?: number
}

const CHART = {
  white: '#ffffff',
  soft: '#a3a3a3',
  muted: '#525252',
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: '#737373',
  tooltipBg: '#0a0a0a',
  tooltipBorder: 'rgba(255,255,255,0.12)',
}

const tooltipStyle = {
  backgroundColor: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: '6px',
  color: '#f5f5f5',
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
}

const shell = 'rounded-md bg-netflix-card plural-edge'
const chip =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white/[0.04] text-gray-300 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
const chipWarn =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)]'
const chipDanger =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white text-black font-medium'
const chipOk =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white/[0.08] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'

function SummaryCard({
  title,
  href,
  children,
}: {
  title: string
  href?: string
  children: React.ReactNode
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{title}</p>
        {href && <ChevronRight className="h-4 w-4 shrink-0 text-gray-600 group-hover:text-white transition-colors" />}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </>
  )

  const className = `${shell} p-4 h-full transition-colors ${
    href ? 'hover:bg-white/[0.03] group' : ''
  }`

  if (href) {
    return (
      <Link to={href} className={className}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  delay = 0,
}: {
  label: string
  value: string | number
  hint?: string
  icon: React.ElementType
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`${shell} p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-black shadow-sm shadow-black/30">
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
    </motion.div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`${shell} p-5 sm:p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const { showError } = useAlert()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [servidorTablePage, setServidorTablePage] = useState(1)
  const [salaTablePage, setSalaTablePage] = useState(1)
  const [suspendingServidorId, setSuspendingServidorId] = useState<number | null>(null)

  const loadDashboard = () => {
    setLoading(true)
    api
      .get<DashboardData>('/api/dashboard')
      .then(setData)
      .catch((e) => {
        setData(null)
        showError(e instanceof Error ? e.message : 'Não foi possível carregar o dashboard.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDashboard()
  }, [showError])

  async function suspenderServidor(id: number, nome: string) {
    if (!confirm(`Suspender servidor "${nome}"? O estado ficará Offline.`)) return
    setSuspendingServidorId(id)
    try {
      await api.post(`/api/servidores/${id}/suspender`, {})
      loadDashboard()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Não foi possível suspender o servidor.')
    } finally {
      setSuspendingServidorId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span className="text-sm">A carregar overview…</span>
        </div>
      </div>
    )
  }

  const receita = data ? Number(data.receitaMes).toFixed(2) : '0.00'
  const pendentes = data?.indicacoesPendentes ?? 0
  const variacaoReceita = data?.variacaoReceita ?? 0
  const receitaMeses = data?.receitaUltimosMeses ?? []
  const pieData = [
    { name: 'Netflix', value: data?.totalNetflix ?? 0, color: CHART.white },
    { name: 'IPTV', value: data?.totalIptv ?? 0, color: CHART.soft },
  ].filter((d) => d.value > 0)
  const barData = (data?.clientsByServidor ?? []).map((s) => ({ nome: s.nome, clientes: s.totalClientes }))
  const salaBarData = (data?.clientsBySala ?? []).map((s) => ({ nome: s.nome, clientes: s.totalClientes }))
  const totalNonActive =
    (data?.clientesVencidosNetflix ?? 0) +
    (data?.clientesVencidosIptv ?? 0) +
    (data?.clientesCanceladosNetflix ?? 0) +
    (data?.clientesCanceladosIptv ?? 0)
  const nonActivePieData = [
    {
      name: 'Netflix',
      value: (data?.clientesVencidosNetflix ?? 0) + (data?.clientesCanceladosNetflix ?? 0),
      color: CHART.white,
    },
    {
      name: 'IPTV',
      value: (data?.clientesVencidosIptv ?? 0) + (data?.clientesCanceladosIptv ?? 0),
      color: CHART.muted,
    },
  ].filter((d) => d.value > 0)

  const receitaHint =
    data?.receitaMesAnterior != null && data.receitaMesAnterior > 0
      ? `${variacaoReceita >= 0 ? '+' : ''}${variacaoReceita}% vs mês anterior`
      : undefined

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-2">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
          <LayoutDashboard className="h-6 w-6" />
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral do painel Plural</p>
        <div className="mt-2 h-0.5 w-10 rounded-full bg-white" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total clientes" value={data?.totalClientes ?? 0} icon={Users} delay={0.02} />
        <KpiCard
          label="Receita do mês (est.)"
          value={`${receita} kz`}
          hint={receitaHint}
          icon={DollarSign}
          delay={0.06}
        />
        <KpiCard label="Vencem hoje" value={data?.vencendoHoje ?? 0} icon={AlertCircle} delay={0.1} />
        <KpiCard label="Indicações pendentes" value={pendentes} icon={Gift} delay={0.14} />
      </div>

      {/* Resumos — grelha uniforme */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title="Clientes por estado" href="/clientes">
          <span className={chipOk}>
            <span className="font-semibold tabular-nums">{data?.totalClientes ?? 0}</span> ativos
          </span>
          <span className={chipDanger}>
            <span className="font-semibold tabular-nums">{data?.clientesVencidos ?? 0}</span> vencidos
          </span>
          <span className={chip}>
            <span className="font-semibold tabular-nums">{data?.clientesCancelados ?? 0}</span> cancelados
          </span>
        </SummaryCard>

        <SummaryCard title="Vencimentos" href="/clientes">
          <span className={chipWarn}>
            <CalendarClock className="h-3.5 w-3.5" />
            <span className="font-semibold tabular-nums">{data?.vencendoHoje ?? 0}</span> hoje
          </span>
          <span className={chip}>
            <span className="font-semibold tabular-nums">{data?.vencendoEm7Dias ?? 0}</span> em 7 dias
          </span>
        </SummaryCard>

        <SummaryCard title="Salas Netflix" href="/salas">
          <span className={chipWarn}>
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="font-semibold tabular-nums">{data?.salasVencendo ?? 0}</span> a vencer
          </span>
          <span className={chipDanger}>
            <span className="font-semibold tabular-nums">{data?.salasVencidas ?? 0}</span> vencidas
          </span>
        </SummaryCard>

        <SummaryCard title="Este mês">
          <span className={chipOk}>
            <UserPlus className="h-3.5 w-3.5" />
            <span className="font-semibold tabular-nums">{data?.clientesNovosEsteMes ?? 0}</span> novos
          </span>
          <span className={chip}>
            <Gift className="h-3.5 w-3.5" />
            <span className="font-semibold tabular-nums">{data?.indicacoesEsteMes ?? 0}</span> indicações
          </span>
        </SummaryCard>

        <SummaryCard title="Indicações" href="/indicacoes">
          <span className={chip}>
            <span className="font-semibold tabular-nums">{data?.indicacoesTotal ?? 0}</span> total
          </span>
          <span className={chipOk}>
            <span className="font-semibold tabular-nums">{data?.indicacoesConfirmadas ?? 0}</span> confirmadas
          </span>
          <span className={chipWarn}>
            <span className="font-semibold tabular-nums">{pendentes}</span> pendentes
          </span>
        </SummaryCard>

        {(data?.totalRevendedores ?? 0) > 0 ? (
          <SummaryCard title="Revendedores" href="/revendedores">
            <span className={chipOk}>
              <Store className="h-3.5 w-3.5" />
              <span className="font-semibold tabular-nums">{data?.totalRevendedores ?? 0}</span> activos
            </span>
            <span className={chip}>
              <span className="font-semibold tabular-nums">{data?.clientesComRevendedor ?? 0}</span> clientes
            </span>
          </SummaryCard>
        ) : (
          <SummaryCard title="Revendedores">
            <span className={chip}>Sem revendedores</span>
          </SummaryCard>
        )}
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Receita por mês"
          subtitle="Últimos 6 meses · estimativa pelas datas de vencimento"
        >
          <div className="h-[240px]">
            {receitaMeses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={receitaMeses} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pluralReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.white} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={CHART.white} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: CHART.axis, fontSize: 11 }}
                    axisLine={{ stroke: CHART.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: CHART.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#a3a3a3' }}
                    formatter={((value: number | undefined) => [
                      `${Number(value ?? 0).toFixed(2)} kz`,
                      'Receita',
                    ]) as never}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke={CHART.white}
                    strokeWidth={2}
                    fill="url(#pluralReceita)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-600">
                Sem dados de receita nos últimos 6 meses.
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Distribuição de clientes" subtitle="Netflix vs IPTV · ativos">
          <div className="flex h-[240px] items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: CHART.axis }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0a0a0a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={((value: number | undefined) => [value ?? 0, 'Clientes']) as never}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => <span className="text-gray-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-600">Sem clientes para exibir.</div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Não ativos por serviço" subtitle="Vencidos + cancelados">
          <div className="flex h-[240px] items-center justify-center">
            {totalNonActive > 0 && nonActivePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nonActivePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: CHART.axis }}
                  >
                    {nonActivePieData.map((entry, index) => (
                      <Cell key={`na-${index}`} fill={entry.color} stroke="#0a0a0a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={((value: number | undefined) => [value ?? 0, 'Clientes']) as never}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => <span className="text-gray-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-600">Nenhum cliente não ativo no momento.</div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Barras servidor / sala */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="Clientes por servidor">
          <div className="h-[220px]">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={80}
                    tick={{ fill: CHART.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={((value: number | undefined) => [value ?? 0, 'Clientes']) as never}
                  />
                  <Bar dataKey="clientes" fill={CHART.white} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-600">
                Sem dados de servidores.
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Clientes por sala">
          <div className="h-[220px]">
            {salaBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaBarData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={80}
                    tick={{ fill: CHART.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={((value: number | undefined) => [value ?? 0, 'Clientes']) as never}
                  />
                  <Bar dataKey="clientes" fill={CHART.soft} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-600">
                Sem dados de salas.
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Tabelas */}
      {(data?.clientsByServidor?.length || data?.clientsBySala?.length) ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {data?.clientsByServidor && data.clientsByServidor.length > 0 && (
            <div className="plural-table-shell">
              <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)]">
                <h3 className="text-base font-semibold text-white">Clientes por servidor</h3>
                <Link
                  to="/servidores"
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Ver servidores
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="plural-table">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">Nº</th>
                      <th>Servidor</th>
                      <th>Clientes</th>
                      <th>Estado</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {(() => {
                      const servidorList = data.clientsByServidor ?? []
                      const totalPages = Math.max(1, Math.ceil(servidorList.length / ROWS_PER_PAGE))
                      const page = Math.min(servidorTablePage, totalPages)
                      const paged = servidorList.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)
                      return paged.map((s, idx) => (
                        <tr key={s.id}>
                          <td className="text-center text-gray-500 text-sm">
                            {(page - 1) * ROWS_PER_PAGE + idx + 1}
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-black">
                                <Server className="h-3.5 w-3.5" />
                              </div>
                              <span className="font-medium text-white">{s.nome}</span>
                            </div>
                          </td>
                          <td className="font-medium text-white tabular-nums">{s.totalClientes}</td>
                          <td>
                            <span
                              className={`plural-badge ${
                                s.status === 'online'
                                  ? 'bg-white text-black'
                                  : s.status === 'instável'
                                    ? 'bg-white/15 text-white'
                                    : 'bg-black text-gray-300 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td>
                            <div className="flex justify-end">
                              {s.status !== 'offline' ? (
                                <button
                                  type="button"
                                  onClick={() => suspenderServidor(s.id, s.nome)}
                                  disabled={suspendingServidorId === s.id}
                                  className="inline-flex h-8 items-center justify-center rounded-md bg-white/10 px-3 text-white hover:bg-white hover:text-black disabled:opacity-50 transition-colors"
                                  title="Suspender servidor"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
              {data.clientsByServidor.length > ROWS_PER_PAGE && (
                <TablePagination
                  totalItems={data.clientsByServidor.length}
                  currentPage={Math.min(
                    servidorTablePage,
                    Math.max(1, Math.ceil(data.clientsByServidor.length / ROWS_PER_PAGE))
                  )}
                  onPageChange={setServidorTablePage}
                />
              )}
            </div>
          )}

          {data?.clientsBySala && data.clientsBySala.length > 0 && (
            <div className="plural-table-shell">
              <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)]">
                <h3 className="text-base font-semibold text-white">Clientes por sala</h3>
                <Link
                  to="/salas"
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Ver salas
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="plural-table">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">Nº</th>
                      <th>Sala</th>
                      <th>Clientes</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {(() => {
                      const salaList = data.clientsBySala ?? []
                      const totalPages = Math.max(1, Math.ceil(salaList.length / ROWS_PER_PAGE))
                      const page = Math.min(salaTablePage, totalPages)
                      const paged = salaList.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)
                      return paged.map((s, idx) => (
                        <tr key={s.id}>
                          <td className="text-center text-gray-500 text-sm">
                            {(page - 1) * ROWS_PER_PAGE + idx + 1}
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
                                <LayoutGrid className="h-3.5 w-3.5" />
                              </div>
                              <span className="font-medium text-white">{s.nome}</span>
                            </div>
                          </td>
                          <td className="font-medium text-white tabular-nums">{s.totalClientes}</td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
              {data.clientsBySala.length > ROWS_PER_PAGE && (
                <TablePagination
                  totalItems={data.clientsBySala.length}
                  currentPage={Math.min(
                    salaTablePage,
                    Math.max(1, Math.ceil(data.clientsBySala.length / ROWS_PER_PAGE))
                  )}
                  onPageChange={setSalaTablePage}
                />
              )}
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  )
}
