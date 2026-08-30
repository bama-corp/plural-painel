import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Filter, RefreshCw, Search, CalendarClock, Activity } from 'lucide-react'
import { api } from '../api/client'
import { tratamentoNome } from '../utils/tratamento'
import { formatRoveDateTime, formatRoveWhen } from '../utils/roveDates'
import { TablePagination, ROWS_PER_PAGE } from '../components/TablePagination'
import { RoveDatePicker } from '../components/RoveDatePicker'
import { RoveSelect } from '../components/RoveSelect'
import {
  AUDIT_ACTION_GROUPS,
  AUDIT_ENTITY_LABELS,
  auditActionLabel,
  auditActionTone,
  auditEntityLabel,
} from '../lib/auditLabels'

interface LogEntry {
  id: number
  action: string
  entity: string
  entityId: number | null
  details: string | null
  createdAt: string
  user: { id: number; nome: string; email: string; role?: string }
}

interface UserOption {
  id: number
  nome: string
  email: string
}

interface AuditResponse {
  items: LogEntry[]
  total: number
  todayCount: number
  limit: number
  offset: number
}

const ENTIDADES = [
  { value: '', label: 'Todas as entidades' },
  ...Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => ({ value, label })),
]

export default function Audit() {
  const [list, setList] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    userId: '',
    from: '',
    to: '',
  })
  const [tablePage, setTablePage] = useState(1)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setTablePage(1)
  }, [filters, searchDebounced])

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', '300')
    if (filters.entity) params.set('entity', filters.entity)
    if (filters.action) params.set('action', filters.action)
    if (filters.userId) params.set('userId', filters.userId)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (searchDebounced) params.set('q', searchDebounced)
    api
      .get<AuditResponse>(`/api/audit?${params.toString()}`)
      .then((data) => {
        setList(Array.isArray(data.items) ? data.items : [])
        setTotal(data.total ?? 0)
        setTodayCount(data.todayCount ?? 0)
      })
      .catch(() => {
        setList([])
        setTotal(0)
        setTodayCount(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [filters, searchDebounced])

  useEffect(() => {
    api.get<UserOption[]>('/api/users').then(setUsers).catch(() => setUsers([]))
  }, [])

  const totalTablePages = Math.max(1, Math.ceil(list.length / ROWS_PER_PAGE))
  const tablePageClamped = Math.min(tablePage, totalTablePages)
  const pagedList = list.slice((tablePageClamped - 1) * ROWS_PER_PAGE, tablePageClamped * ROWS_PER_PAGE)

  const actionOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: '', label: 'Todas as ações' }]
    for (const g of AUDIT_ACTION_GROUPS) {
      for (const a of g.actions) {
        opts.push({ value: a, label: auditActionLabel(a) })
      }
    }
    return opts
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="plural-page-title flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Log de alterações
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Histórico de ações no painel: clientes, cobranças, servidores, salas e utilizadores.
            Só são registadas operações concluídas com sucesso.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-md border border-netflix-border bg-netflix-panel text-gray-200 text-sm hover:bg-netflix-hover disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-netflix-border/80 bg-netflix-card/80 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Registos (filtro)</p>
          <p className="text-2xl font-bold text-white mt-1">{total}</p>
        </div>
        <div className="rounded-md border border-sky-600/40 bg-sky-900/20 p-4">
          <p className="text-xs text-sky-300 uppercase tracking-wide flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            Hoje
          </p>
          <p className="text-2xl font-bold text-white mt-1">{todayCount}</p>
        </div>
        <div className="rounded-md border border-violet-600/40 bg-violet-900/20 p-4">
          <p className="text-xs text-violet-300 uppercase tracking-wide flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            A mostrar
          </p>
          <p className="text-2xl font-bold text-white mt-1">{list.length}</p>
        </div>
      </div>

      <div className="plural-filter-bar">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="plural-filter-field">
          <RoveSelect
            compact
            value={filters.entity}
            onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}
            placeholder="Entidade"
          >
            {ENTIDADES.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </RoveSelect>
        </div>
        <div className="plural-filter-field-lg">
          <RoveSelect
            compact
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            placeholder="Ação"
          >
            {actionOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </RoveSelect>
        </div>
        <div className="plural-filter-field">
          <RoveSelect
            compact
            value={filters.userId}
            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
            placeholder="Utilizador"
          >
            <option value="">Todos os utilizadores</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </RoveSelect>
        </div>
        <div className="plural-filter-field-sm">
          <RoveDatePicker
            compact
            allowPastDates
            value={filters.from}
            onChange={(from) => setFilters((f) => ({ ...f, from }))}
            placeholder="Data de"
            title="Filtrar a partir de"
          />
        </div>
        <span className="text-gray-500 text-sm shrink-0">até</span>
        <div className="plural-filter-field-sm">
          <RoveDatePicker
            compact
            allowPastDates
            value={filters.to}
            onChange={(to) => setFilters((f) => ({ ...f, to }))}
            placeholder="Data até"
            title="Filtrar até"
          />
        </div>
        <div className="plural-filter-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar ação, detalhe, utilizador, ID…"
            className="w-full min-h-[36px] pl-10 pr-3 py-2 rounded-md border border-netflix-border bg-netflix-panel text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setFilters({ entity: '', action: '', userId: '', from: '', to: '' })
            setSearch('')
          }}
          className="py-2 px-3 rounded-md border border-netflix-border text-gray-300 text-sm hover:bg-netflix-hover transition-colors shrink-0"
        >
          Limpar
        </button>
      </div>

      <div className="bg-netflix-card rounded-md shadow border border-netflix-border overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center gap-3 text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            <span className="text-sm">A carregar registos…</span>
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Nenhum registo corresponde aos filtros.
          </div>
        ) : (
          <>
              <table className="plural-table plural-table--cards-md">
                <thead>
                  <tr className="bg-netflix-panel text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium w-12 text-center">Nº</th>
                    <th className="px-4 py-3 font-medium">Quando</th>
                    <th className="px-4 py-3 font-medium">Utilizador</th>
                    <th className="px-4 py-3 font-medium">Ação</th>
                    <th className="px-4 py-3 font-medium">Entidade</th>
                    <th className="px-4 py-3 font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.map((entry, idx) => (
                    <tr key={entry.id} className="border-t border-netflix-border hover:bg-netflix-hover/80">
                      <td className="plural-table-cell-num px-4 py-3 text-center text-gray-500" data-label="Nº">
                        {(tablePageClamped - 1) * ROWS_PER_PAGE + idx + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" data-label="Quando">
                        <span className="text-white text-sm" title={formatRoveDateTime(entry.createdAt)}>
                          {formatRoveWhen(entry.createdAt)}
                        </span>
                        <span className="text-gray-500 text-xs block">
                          {formatRoveDateTime(entry.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3" data-label="Utilizador">
                        <span className="font-medium text-white">{tratamentoNome(entry.user.nome)}</span>
                        <span className="text-gray-500 text-xs block">{entry.user.email}</span>
                        {entry.user.role && (
                          <span className="text-[10px] text-gray-500 uppercase">{entry.user.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3" data-label="Ação">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${auditActionTone(entry.action)}`}
                        >
                          {auditActionLabel(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300" data-label="Entidade">
                        <span>{auditEntityLabel(entry.entity)}</span>
                        {entry.entityId != null && (
                          <span className="text-gray-500 text-xs block">#{entry.entityId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-200 max-w-md sm:min-w-[12rem]" data-label="Detalhes">
                        {entry.details ? (
                          <p className="text-sm leading-relaxed whitespace-normal" title={entry.details}>
                            {entry.details}
                          </p>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            <TablePagination
              totalItems={list.length}
              currentPage={tablePageClamped}
              onPageChange={setTablePage}
            />
          </>
        )}
      </div>
    </motion.div>
  )
}
