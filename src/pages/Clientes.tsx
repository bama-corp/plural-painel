import { useEffect, useState } from 'react'
import { RoveModalOverlay } from '../components/RoveModalOverlay'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  Tv,
  Film,
  CheckCircle,
  Users,
  Lock,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react'
import { RoveDatePicker } from '../components/RoveDatePicker'
import { RoveSelect } from '../components/RoveSelect'
import { WhatsappAoInput } from '../components/WhatsappAoInput'
import { RoveWhatsappLink } from '../components/RoveWhatsappLink'
import { mesesPagamentoLabel, RoveFormLabel } from '../components/roveFormUi'
import { emptyWhatsapp, formatWhatsapp, isWhatsappValid } from '../utils/whatsapp'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { TablePagination, ROWS_PER_PAGE } from '../components/TablePagination'

interface Client {
  id: number
  roveId?: string | null
  nome: string
  whatsapp: string
  localizacao: string | null
  servico: string
  plano: string
  servidorId: number | null
  revendedorId: number | null
  perfil: string | null
  pin?: string | null
  dataInicio: string
  dataFim: string
  valor: number
  inscricaoPaga?: boolean | null
  salaId?: number | null
  sala?: { id: number; nome: string } | null
  status: string
  indicacoes: number
  servidor?: { id: number; nome: string } | null
  revendedor?: { id: number; nome: string } | null
  areaClienteAtiva?: boolean
}

interface Servidor {
  id: number
  nome: string
  tipo?: string
  totalClientes: number
  servidor?: { id: number; nome: string } | null
}

interface Revendedor {
  id: number
  nome: string
}

interface Sala {
  id: number
  nome: string
  dataFim?: string | null
  totalClientes?: number
}

const statusColors: Record<string, string> = {
  ativo: 'bg-green-900/50 text-green-300',
  vencido: 'bg-red-900/50 text-red-300',
  cancelado: 'bg-gray-700 text-gray-300',
}

/** Planos IPTV (só o nome no select; valor = mensalidade) */
const PLANOS_IPTV = [
  { id: 'Pacote Premium', label: 'Pacote Premium', valor: 9500 },
  { id: 'Pacote Ultimate', label: 'Pacote Ultimate', valor: 12500 },
] as const

/** Planos Netflix (só o nome no select; valor = mensalidade; inscricao = valor da inscrição) */
const PLANOS_NETFLIX = [
  { id: 'Plano Room', label: 'Plano Room', valor: 4500, inscricao: 2000 },
  { id: 'Plano Solo', label: 'Plano Solo', valor: 18500, inscricao: 4000 },
] as const

function planoPredefinido(servico: 'iptv' | 'netflix'): { plano: string; valor: number } {
  const lista = servico === 'netflix' ? PLANOS_NETFLIX : PLANOS_IPTV
  const p = lista[0]
  return { plano: p.id, valor: p.valor }
}

const NEW_CLIENT_INPUT =
  'w-full px-3 py-2.5 bg-netflix-panel border border-netflix-border rounded-md text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 outline-none transition-colors'

const NEW_CLIENT_INPUT_SM =
  'w-full px-2.5 py-1.5 bg-netflix-panel border border-netflix-border rounded-md text-xs text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 outline-none transition-colors'

const NEW_CLIENT_LOCKED =
  'flex min-h-[42px] w-full items-center justify-between gap-2 rounded-md border border-primary-500/35 bg-gradient-to-r from-primary-950/55 via-primary-900/20 to-netflix-panel px-3 py-2.5 text-sm text-primary-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-primary-500/20'

const NEW_CLIENT_LOCKED_SM =
  'flex min-h-[32px] w-full items-center justify-between gap-1.5 rounded-md border border-primary-500/35 bg-gradient-to-r from-primary-950/55 via-primary-900/20 to-netflix-panel px-2.5 py-1.5 text-xs text-primary-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-primary-500/20'

function LockedFieldBadge({ label = 'Automático' }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary-500/35 bg-primary-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-200">
      <Lock className="h-3 w-3" />
      {label}
    </span>
  )
}

function RequiredMark() {
  return (
    <span className="text-primary-400 font-normal" aria-hidden>
      {' '}
      *
    </span>
  )
}

function isPlanoValorManual(servico: string | undefined, plano: string | undefined): boolean {
  if (!plano || plano === 'Outro') return true
  const lista = servico === 'netflix' ? PLANOS_NETFLIX : PLANOS_IPTV
  return !lista.some((p) => p.id === plano)
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

function daysUntil(date: string) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

export default function Clientes() {
  const { user } = useAuth()
  const { showError, showWarning } = useAlert()
  const role = user?.role
  const operadorNetflix = role === 'netflix'
  const operadorIptv = role === 'iptv'
  const servicoFixo = operadorNetflix ? 'netflix' : operadorIptv ? 'iptv' : null

  const [clients, setClients] = useState<Client[]>([])
  const [servidores, setServidores] = useState<Servidor[]>([])
  const [revendedores, setRevendedores] = useState<Revendedor[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'iptv' | 'netflix'>(servicoFixo ?? 'iptv')
  const [filter, setFilter] = useState({
    servico: servicoFixo ?? 'iptv',
    servidorId: '',
    revendedorId: '',
    salaId: '' as string,
    status: '',
    vencendo: '',
  })
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [showNetflixPins, setShowNetflixPins] = useState(false)
  const [modal, setModal] = useState<'new' | 'edit' | 'sala' | null>(null)
  const [clientSala, setClientSala] = useState<Client | null>(null)
  const [salaIdSelect, setSalaIdSelect] = useState<number | ''>('')
  const [clientSuspender, setClientSuspender] = useState<Client | null>(null)
  const [clientAtivar, setClientAtivar] = useState<Client | null>(null)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [clientRenovar, setClientRenovar] = useState<Client | null>(null)
  const [renovarMeses, setRenovarMeses] = useState<number | ''>('')
  const [tablePage, setTablePage] = useState(1)
  const servicoInicial = (servicoFixo ?? 'iptv') as 'iptv' | 'netflix'
  const planoInicial = planoPredefinido(servicoInicial)
  const [form, setForm] = useState<
    Partial<Client> & { portalPin?: string; removerPinPortal?: boolean }
  >({
    nome: '',
    whatsapp: emptyWhatsapp(),
    localizacao: '',
    servico: servicoInicial,
    plano: planoInicial.plano,
    valor: planoInicial.valor,
    dataFim: '',
    portalPin: '',
    removerPinPortal: false,
  })

  function load(searchQuery = searchDebounced) {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.servico) params.set('servico', filter.servico)
    if (filter.servidorId) params.set('servidorId', filter.servidorId)
    if (filter.revendedorId) params.set('revendedorId', filter.revendedorId)
    if (filter.salaId) params.set('salaId', filter.salaId)
    if (filter.status) params.set('status', filter.status)
    if (filter.vencendo) params.set('vencendo', filter.vencendo)
    const q = searchQuery.trim()
    if (q) params.set('q', q)
    api
      .get<Client[]>(`/api/clients?${params}`)
      .then(setClients)
      .catch((e) => {
        setClients([])
        showError(e instanceof Error ? e.message : 'Erro ao carregar clientes')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    load()
  }, [filter.servico, filter.servidorId, filter.revendedorId, filter.salaId, filter.status, filter.vencendo, searchDebounced])

  useEffect(() => {
    setTablePage(1)
  }, [filter, searchDebounced, tab])

  useEffect(() => {
    if (operadorNetflix) return
    api.get<Servidor[]>('/api/servidores').then(setServidores).catch(() => setServidores([]))
    api.get<Revendedor[]>('/api/revendedores').then(setRevendedores).catch(() => setRevendedores([]))
  }, [operadorNetflix])

  useEffect(() => {
    if (operadorIptv) return
    api.get<Sala[]>('/api/salas').then(setSalas).catch(() => setSalas([]))
  }, [operadorIptv])

  const totalTablePages = Math.max(1, Math.ceil(clients.length / ROWS_PER_PAGE))
  const tablePageClamped = Math.min(tablePage, totalTablePages)
  const pagedClientes = clients.slice((tablePageClamped - 1) * ROWS_PER_PAGE, tablePageClamped * ROWS_PER_PAGE)

  const showIptvTab = !operadorNetflix
  const showNetflixTab = !operadorIptv

  function switchTab(newTab: 'iptv' | 'netflix') {
    setTab(newTab)
    setFilter((f) => ({ ...f, servico: newTab }))
    if (newTab !== 'netflix') setShowNetflixPins(false)
  }

  const stats = {
    total: clients.length,
    ativos: clients.filter((c) => c.status === 'ativo').length,
    vencidos: clients.filter((c) => c.status === 'vencido').length,
    vencendo: clients.filter((c) => {
      const d = daysUntil(c.dataFim)
      return c.status === 'ativo' && d >= 0 && d <= 7
    }).length,
  }

  function validateNewClient(): string | null {
    if (!(form.nome ?? '').trim()) return 'Nome é obrigatório.'
    if (!isWhatsappValid(form.whatsapp ?? '')) {
      return 'WhatsApp inválido (+244, +351 ou +55 com número completo).'
    }
    if (!(form.portalPin ?? '').trim()) return 'PIN da área cliente é obrigatório.'
    if (String(form.portalPin).trim().length < 4) return 'PIN da área cliente deve ter pelo menos 4 caracteres.'
    if (!form.plano || !String(form.plano).trim()) {
      return form.servico === 'iptv' ? 'Selecione o plano IPTV.' : 'Selecione o plano Netflix.'
    }
    if (isPlanoValorManual(form.servico, form.plano) && (!form.valor || Number(form.valor) <= 0)) {
      return 'Valor mensal é obrigatório.'
    }
    if (form.servico === 'iptv') {
      if (!(form.perfil ?? '').trim()) return 'Nome de utilizador é obrigatório.'
      if (!form.dataFim || !String(form.dataFim).trim()) return 'Data fim é obrigatória.'
    }
    if (form.servico === 'netflix') {
      if (!(form.perfil ?? '').trim()) return 'Perfil é obrigatório.'
      if (!(form.pin ?? '').trim()) return 'PIN Netflix é obrigatório.'
      if (form.plano === 'Plano Room' && !form.salaId) return 'Selecione a sala (conta) Netflix.'
    }
    return null
  }

  function validateEditClient(): string | null {
    if (!(form.nome ?? '').trim()) return 'Nome é obrigatório.'
    if (!isWhatsappValid(form.whatsapp ?? '')) {
      return 'WhatsApp inválido (+244, +351 ou +55 com número completo).'
    }
    if ((form.portalPin ?? '').trim() && String(form.portalPin).trim().length < 4) {
      return 'PIN da área cliente deve ter pelo menos 4 caracteres.'
    }
    if (!form.plano || !String(form.plano).trim()) {
      return form.servico === 'iptv' ? 'Selecione o plano IPTV.' : 'Selecione o plano Netflix.'
    }
    if (isPlanoValorManual(form.servico, form.plano) && (!form.valor || Number(form.valor) <= 0)) {
      return 'Valor mensal é obrigatório.'
    }
    if (form.servico === 'iptv') {
      if (!(form.perfil ?? '').trim()) return 'Nome de utilizador é obrigatório.'
      if (!form.dataFim || !String(form.dataFim).trim()) return 'Data fim é obrigatória.'
    }
    if (form.servico === 'netflix') {
      if (!(form.perfil ?? '').trim()) return 'Perfil é obrigatório.'
      if (!(form.pin ?? '').trim()) return 'PIN Netflix é obrigatório.'
      if (form.plano === 'Plano Room' && !form.salaId) return 'Selecione a sala (conta) Netflix.'
    }
    return null
  }

  async function saveClient() {
    if (modal === 'new') {
      const err = validateNewClient()
      if (err) {
        showWarning(err)
        return
      }
    } else {
      const err = validateEditClient()
      if (err) {
        showWarning(err)
        return
      }
    }
    try {
      if (modal === 'new') {
        const body: Record<string, unknown> = {
          ...form,
          dataFim: form.dataFim || undefined,
          servidorId: form.servidorId || null,
          revendedorId: form.revendedorId || null,
          localizacao: form.localizacao || null,
          salaId: form.salaId ?? null,
        }
        delete body.areaClienteAtiva
        delete body.removerPinPortal
        body.portalPin = String(form.portalPin).trim()
        await api.post<Client>('/api/clients', body)
      } else if (form.id) {
        const patch: Record<string, unknown> = { ...form, salaId: form.salaId ?? null }
        delete patch.areaClienteAtiva
        delete patch.removerPinPortal
        delete patch.portalPin
        if (form.removerPinPortal) patch.portalPin = ''
        else if (form.portalPin?.trim() && form.portalPin.trim().length >= 4) patch.portalPin = form.portalPin.trim()
        await api.patch(`/api/clients/${form.id}`, patch)
      }
      setModal(null)
      {
        const serv = (servicoFixo ?? tab) as 'iptv' | 'netflix'
        const defs = planoPredefinido(serv)
        setForm({
          nome: '',
          whatsapp: emptyWhatsapp(),
          localizacao: '',
          servico: serv,
          plano: defs.plano,
          valor: defs.valor,
          dataFim: '',
          revendedorId: null,
          portalPin: '',
          removerPinPortal: false,
        })
      }
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao guardar')
    }
  }

  async function confirmarRenovar() {
    if (!clientRenovar) return
    if (renovarMeses === '') {
      showWarning('Selecione quantos meses estão a ser pagos.')
      return
    }
    const meses = Math.min(24, Math.max(1, renovarMeses))
    try {
      await api.post(`/api/clients/${clientRenovar.id}/renovar`, { meses })
      setClientRenovar(null)
      setRenovarMeses('')
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao renovar cliente')
    }
  }

  async function confirmarSuspender() {
    if (!clientSuspender) return
    try {
      await api.post(`/api/clients/${clientSuspender.id}/suspender`)
      setClientSuspender(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function confirmarAtivar() {
    if (!clientAtivar) return
    try {
      await api.post(`/api/clients/${clientAtivar.id}/ativar`)
      setClientAtivar(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function atribuirSala() {
    if (!clientSala) return
    try {
      await api.patch(`/api/clients/${clientSala.id}`, { salaId: salaIdSelect === '' ? null : salaIdSelect })
      setModal(null)
      setClientSala(null)
      setSalaIdSelect('')
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao guardar sala')
    }
  }

  async function confirmarExcluir() {
    if (!clientToDelete) return
    try {
      await api.delete(`/api/clients/${clientToDelete.id}`)
      setClientToDelete(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro')
    }
  }

  const compactClientForm = modal === 'new' || modal === 'edit'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header: título, descrição, chips e botão */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6" />
              Clientes
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Alterna entre IPTV e Netflix. Filtre por servidor ou revendedor (IPTV), sala (Netflix) e estado.
            </p>
          </div>
        </div>
      </div>

      {/* Abas IPTV | NETFLIX + stats + Novo cliente */}
      <div className="flex flex-wrap items-center gap-3">
        {(showIptvTab || showNetflixTab) && (
          <div className="flex gap-1 p-1 rounded-md bg-netflix-panel/60 border border-netflix-border/80">
            {showIptvTab && (
              <button
                type="button"
                onClick={() => switchTab('iptv')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'iptv'
                    ? 'bg-white text-black shadow-lg shadow-primary-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-netflix-hover/80'
                }`}
              >
                <Tv className="w-4 h-4" />
                IPTV
              </button>
            )}
            {showNetflixTab && (
              <button
                type="button"
                onClick={() => switchTab('netflix')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'netflix'
                    ? 'bg-white text-black shadow-lg shadow-primary-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-netflix-hover/80'
                }`}
              >
                <Film className="w-4 h-4" />
                NETFLIX
              </button>
            )}
          </div>
        )}
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-netflix-panel/80 border border-netflix-border/60 text-gray-300 text-sm">
            <span className="font-semibold text-white">{stats.total}</span> total
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-900/30 border border-green-700/40 text-green-300 text-sm">
            <span className="font-semibold">{stats.ativos}</span> ativos
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-900/30 border border-amber-700/40 text-amber-300 text-sm">
            <span className="font-semibold">{stats.vencendo}</span> a vencer (7 dias)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
            <span className="font-semibold">{stats.vencidos}</span> vencidos
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {tab === 'netflix' && (
            <button
              type="button"
              onClick={() => setShowNetflixPins((v) => !v)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium border transition-colors ${
                showNetflixPins
                  ? 'border-primary-500/45 bg-primary-500/15 text-primary-200 hover:bg-primary-500/25'
                  : 'border-netflix-border/80 bg-netflix-panel text-gray-300 hover:bg-netflix-hover hover:text-white hover:border-netflix-hover'
              }`}
              title={showNetflixPins ? 'Ocultar PIN Netflix na tabela' : 'Mostrar PIN Netflix na tabela'}
            >
              {showNetflixPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showNetflixPins ? 'Ocultar PIN' : 'Mostrar PIN'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const defs = planoPredefinido(tab)
              setForm({
                nome: '',
                whatsapp: emptyWhatsapp(),
                localizacao: '',
                servico: tab,
                plano: defs.plano,
                valor: defs.valor,
                dataFim: '',
                revendedorId: null,
                portalPin: '',
                removerPinPortal: false,
              })
              setModal('new')
            }}
            className="flex items-center gap-2 py-2.5 px-5 rounded-md border border-white bg-white text-black hover:bg-neutral-200 hover:border-neutral-200 text-sm font-medium shadow-md shadow-black/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo cliente
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2 p-4 rounded-md bg-netflix-card/60 border border-netflix-border/80">
        {tab === 'iptv' && (
          <>
            <div className="w-44 min-w-[11rem] sm:w-48">
              <RoveSelect
                compact
                value={filter.servidorId}
                onChange={(e) => setFilter((f) => ({ ...f, servidorId: e.target.value }))}
                placeholder="Todos os servidores"
                title="Filtrar por servidor"
              >
                <option value="">Todos os servidores</option>
                {servidores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.tipo === 'secundario' && s.servidor
                      ? `${s.nome} (Secundário → ${s.servidor.nome})`
                      : s.nome}
                  </option>
                ))}
              </RoveSelect>
            </div>
            <div className="w-44 min-w-[11rem] sm:w-48">
              <RoveSelect
                compact
                value={filter.revendedorId}
                onChange={(e) => setFilter((f) => ({ ...f, revendedorId: e.target.value }))}
                placeholder="Todos os revendedores"
                title="Filtrar por revendedor"
              >
                <option value="">Todos os revendedores</option>
                {revendedores.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </RoveSelect>
            </div>
          </>
        )}
        {tab === 'netflix' && (
          <div className="w-44 min-w-[11rem] sm:w-48">
            <RoveSelect
              compact
              value={filter.salaId ?? ''}
              onChange={(e) => setFilter((f) => ({ ...f, salaId: e.target.value }))}
              placeholder="Todas as salas"
              title="Filtrar por sala"
            >
              <option value="">Todas as salas</option>
              {salas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </RoveSelect>
          </div>
        )}
        <div className="w-40 min-w-[10rem]">
          <RoveSelect
            compact
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            placeholder="Todos os estados"
            title="Filtrar por estado"
          >
            <option value="">Todos os estados</option>
            <option value="ativo">Ativo</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </RoveSelect>
        </div>
        <div className="w-44 min-w-[11rem]">
          <RoveSelect
            compact
            value={filter.vencendo}
            onChange={(e) => setFilter((f) => ({ ...f, vencendo: e.target.value }))}
            placeholder="Qualquer vencimento"
            title="Filtrar por vencimento"
          >
            <option value="">Qualquer vencimento</option>
            <option value="hoje">Vence hoje</option>
            <option value="3dias">Vence em 3 dias</option>
            <option value="7dias">Vence em 7 dias</option>
          </RoveSelect>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Nome, WhatsApp, ID ROVE, plano..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[32px] pl-10 pr-3 py-1.5 rounded-md border border-netflix-border bg-netflix-panel text-white placeholder-gray-500 text-xs focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 outline-none transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => load(search)}
          className="p-2.5 rounded-md border border-netflix-border bg-netflix-panel hover:bg-netflix-hover text-gray-300 hover:text-white transition-colors"
          title="Atualizar lista"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabela */}
      <div className="plural-table-shell">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            <span className="text-sm">A carregar clientes...</span>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="plural-table">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 font-medium w-12 text-center">Nº</th>
                  <th className="px-4 py-3.5 font-medium">Cliente</th>
                  <th className="px-4 py-3.5 font-medium">Contacto</th>
                  {tab === 'netflix' && <th className="px-4 py-3.5 font-medium">Perfil</th>}
                  {tab === 'netflix' && <th className="px-4 py-3.5 font-medium">PIN</th>}
                  <th className="px-4 py-3.5 font-medium">Localização</th>
                  {tab === 'iptv' && (
                    <>
                      <th className="px-4 py-3.5 font-medium">Servidor</th>
                      <th className="px-4 py-3.5 font-medium">Revendedor</th>
                    </>
                  )}
                  {tab === 'netflix' && <th className="px-4 py-3.5 font-medium">Sala</th>}
                  <th className="px-4 py-3.5 font-medium">Plano</th>
                  {tab === 'iptv' && <th className="px-4 py-3.5 font-medium">Data fim</th>}
                  {tab === 'netflix' && <th className="px-4 py-3.5 font-medium">Data renovação</th>}
                  <th className="px-4 py-3.5 font-medium">Valor</th>
                  <th className="px-4 py-3.5 font-medium">Estado</th>
                  <th className="px-4 py-3.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-netflix-border/80 text-gray-200">
                {pagedClientes.map((c, idx) => {
                  const days = daysUntil(c.dataFim)
                  const alert = c.status === 'ativo' && days <= 7 && days >= 0
                  const urgent = c.status === 'ativo' && days <= 3 && days >= 0
                  const expired = c.status === 'ativo' && days < 0
                  const rowNum = (tablePageClamped - 1) * ROWS_PER_PAGE + idx + 1
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-netflix-hover/80 transition-colors ${
                        urgent ? 'bg-amber-900/25' : alert ? 'bg-amber-900/15' : expired ? 'bg-red-900/15' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center text-gray-400 text-sm">{rowNum}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{c.nome}</div>
                        <div className="text-xs text-primary-300 mt-0.5">
                          {c.roveId || 'A gerar ID ROVE...'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoveWhatsappLink value={c.whatsapp} />
                      </td>
                      {tab === 'netflix' && (
                        <td className="px-4 py-3 text-sm text-gray-300">{c.perfil || '—'}</td>
                      )}
                      {tab === 'netflix' && (
                        <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                          {!c.pin ? '—' : showNetflixPins ? c.pin : '••••'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-400">{c.localizacao || '—'}</td>
                      {tab === 'iptv' && (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-400">{c.servidor?.nome ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{c.revendedor?.nome ?? '—'}</td>
                        </>
                      )}
                      {tab === 'netflix' && (
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {c.plano === 'Plano Room' ? (c.sala?.nome ?? '—') : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm">{c.plano}</td>
                      {tab === 'iptv' && (
                        <td className="px-4 py-3">
                          <span className={`text-sm ${urgent ? 'text-amber-300 font-semibold' : alert ? 'text-amber-400 font-medium' : expired ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
                            {formatDate(c.dataFim)}
                            {c.status === 'ativo' && (
                              <span className="text-gray-500 text-xs ml-1">
                                ({days > 0 ? `${days}d` : days === 0 ? 'hoje' : 'vencido'})
                              </span>
                            )}
                          </span>
                        </td>
                      )}
                      {tab === 'netflix' && (
                        <td className="px-4 py-3">
                          <span className={`text-sm ${urgent ? 'text-amber-300 font-semibold' : alert ? 'text-amber-400 font-medium' : expired ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
                            {formatDate(c.dataFim)}
                            {c.status === 'ativo' && (
                              <span className="text-gray-500 text-xs ml-1">
                                ({days > 0 ? `${days}d` : days === 0 ? 'hoje' : 'vencido'})
                              </span>
                            )}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm font-medium text-white">{Number(c.valor).toFixed(2)} kz</td>
                      <td className="px-4 py-3">
                        <span className={`plural-badge ${statusColors[c.status] || 'bg-gray-700 text-gray-300'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 relative">
                        <div className="flex justify-end gap-1">
                          {c.status === 'ativo' && c.servico === 'netflix' && c.plano === 'Plano Room' && (
                            <button
                              type="button"
                              onClick={() => {
                                setClientSala(c)
                                setSalaIdSelect(c.salaId ?? '')
                                setModal('sala')
                              }}
                              title="Atribuir sala"
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-sky-500/50 bg-sky-500/10 text-sky-300 hover:bg-sky-500/30 hover:text-white transition-colors"
                            >
                              <LayoutGrid className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === 'ativo' && (
                            <button
                              type="button"
                              onClick={() => {
                                setForm({
                                  ...c,
                                  whatsapp: formatWhatsapp(c.whatsapp || ''),
                                  portalPin: '',
                                  removerPinPortal: false,
                                })
                                setModal('edit')
                              }}
                              title="Editar"
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-primary-500/50 bg-primary-500/10 text-primary-300 hover:bg-primary-500/30 hover:text-white hover:border-primary-400 shadow-sm shadow-primary-900/40 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === 'ativo' && (
                            <button
                              type="button"
                              onClick={() => {
                                setClientRenovar(c)
                                setRenovarMeses('')
                              }}
                              title="Renovar (vencimento dia 11)"
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-green-500/50 bg-green-500/10 text-green-300 hover:bg-green-500/30 hover:text-white transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === 'ativo' && (
                            <button
                              type="button"
                              onClick={() => setClientSuspender(c)}
                              title="Suspender"
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/30 hover:text-white transition-colors"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === 'vencido' && (
                            <button
                              type="button"
                              onClick={() => setClientAtivar(c)}
                              title="Ativar"
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-green-500/50 bg-green-500/10 text-green-300 hover:bg-green-500/30 hover:text-white transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setClientToDelete(c)}
                            title="Excluir"
                            className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-red-500/60 bg-red-500/15 text-red-300 hover:bg-red-500/30 hover:text-white shadow-sm shadow-red-900/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            totalItems={clients.length}
            currentPage={tablePageClamped}
            onPageChange={setTablePage}
          />
          </>
        )}
        {!loading && clients.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            {tab === 'iptv' ? 'Nenhum cliente IPTV encontrado.' : 'Nenhum cliente Netflix encontrado.'} Ajuste os filtros ou adicione um novo cliente.
          </div>
        )}
      </div>

      {/* Modal confirmar suspender */}
      {clientSuspender && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-amber-500/30 max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Suspender cliente</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    O cliente <span className="text-white font-medium">{clientSuspender.nome}</span> passará a estado <span className="text-amber-400 font-medium">vencido</span>.
                  </p>
                </div>
              </div>
              <div className="h-1 w-12 bg-amber-500 rounded-full mt-4" />
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-300">Tem a certeza que deseja suspender este cliente?</p>
            </div>
            <div className="flex gap-3 p-6 pt-0 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setClientSuspender(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarSuspender}
                className="flex-1 py-2.5 px-4 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors shadow-lg shadow-amber-900/30"
              >
                Suspender
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal confirmar excluir cliente */}
      {clientToDelete && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-red-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-red-500/20 text-red-400 ring-1 ring-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Excluir cliente</h3>
                  <div className="h-1 w-12 bg-red-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja excluir{' '}
                <span className="font-medium text-white">{clientToDelete.nome}</span>
                {clientToDelete.roveId ? (
                  <span className="text-gray-400"> ({clientToDelete.roveId})</span>
                ) : null}
                ?
              </p>
              <p className="text-xs text-gray-500">
                Todos os dados do cliente serão removidos permanentemente. Esta ação não pode ser desfeita.
              </p>
              {clientToDelete.indicacoes > 0 && (
                <p className="text-xs text-amber-400/90">
                  Atenção: este cliente tem <span className="font-semibold">{clientToDelete.indicacoes}</span>{' '}
                  {clientToDelete.indicacoes === 1 ? 'indicação registada' : 'indicações registadas'}.
                </p>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExcluir}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-900/30"
              >
                Excluir
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal confirmar ativar cliente */}
      {clientAtivar && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-green-500/30 max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-green-500/20 text-green-400">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Ativar cliente</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    O cliente <span className="text-white font-medium">{clientAtivar.nome}</span> passará a estado <span className="text-green-400 font-medium">ativo</span>.
                  </p>
                </div>
              </div>
              <div className="h-1 w-12 bg-green-500 rounded-full mt-4" />
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-300">Tem a certeza que deseja ativar este cliente?</p>
            </div>
            <div className="flex gap-3 p-6 pt-0 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setClientAtivar(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAtivar}
                className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-900/30"
              >
                Ativar
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal Renovar cliente (meses de pagamento, vencimento dia 11) */}
      {clientRenovar && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-green-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-green-500/20 text-green-400 ring-1 ring-green-500/30">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Renovar cliente</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    <span className="text-white font-medium">{clientRenovar.nome}</span>
                  </p>
                  <div className="h-1 w-12 bg-green-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                O vencimento será no dia <span className="text-gray-300 font-medium">11</span> de cada mês. Escolha quantos meses atribuir.
              </p>
              <div>
                <RoveFormLabel required>Meses de pagamento</RoveFormLabel>
                <RoveSelect
                  compact
                  required
                  value={renovarMeses === '' ? '' : String(renovarMeses)}
                  onChange={(e) => setRenovarMeses(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Selecione os meses"
                  title="Quantos meses de pagamento atribuir"
                >
                  <option value="">Selecione os meses</option>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {mesesPagamentoLabel(n)}
                    </option>
                  ))}
                </RoveSelect>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => { setClientRenovar(null); setRenovarMeses('') }}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRenovar}
                disabled={renovarMeses === ''}
                title={renovarMeses === '' ? 'Selecione os meses' : 'Confirmar renovação'}
                className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-colors shadow-lg shadow-green-900/30"
              >
                Renovar
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal Atribuir sala (Netflix Plano Room) */}
      {modal === 'sala' && clientSala && (
        <RoveModalOverlay dimClassName="bg-black/70">
          <div className="bg-netflix-card rounded-md shadow-2xl shadow-black/50 border border-netflix-border/80 max-w-md w-full overflow-hidden ring-1 ring-primary-500/10">
            <div className="p-6 pb-5 border-b border-netflix-border/80 bg-gradient-to-b from-primary-950/20 to-transparent">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-md bg-primary-500/25 text-primary-400 shadow-lg shadow-primary-900/20">
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white tracking-tight">Atribuir sala</h3>
                  <p className="text-sm text-gray-400 mt-1.5">
                    Cliente: <span className="text-white font-semibold">{clientSala.nome}</span>
                  </p>
                  <div className="h-1 w-14 bg-primary-500 rounded-full mt-4 opacity-90" />
                </div>
              </div>
            </div>
            <div className="p-6 bg-netflix-panel/30 space-y-3">
              <div>
                <RoveFormLabel>Sala (conta)</RoveFormLabel>
                <p className="text-[10px] text-gray-500 mb-2">
                  Selecione a conta em que este cliente está no Plano Room.
                </p>
                <RoveSelect
                  compact
                  value={salaIdSelect === '' ? '' : String(salaIdSelect)}
                  onChange={(e) => setSalaIdSelect(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Selecione a sala"
                  title="Sala Netflix (Plano Room)"
                >
                  <option value="">— Nenhuma —</option>
                  {salas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </RoveSelect>
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-netflix-border/80 bg-netflix-card">
              <button
                type="button"
                onClick={() => { setModal(null); setClientSala(null); setSalaIdSelect('') }}
                className="flex-1 py-3 px-4 rounded-md border border-netflix-border/80 bg-netflix-panel text-sm font-medium text-gray-300 hover:bg-netflix-hover hover:text-white hover:border-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={atribuirSala}
                className="flex-1 py-3 px-4 rounded-md border border-white bg-white text-black text-sm font-semibold hover:bg-neutral-200 hover:border-neutral-200 active:bg-neutral-300 transition-colors shadow-md shadow-black/25"
              >
                Guardar
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal novo/editar — dois cards alinhados */}
      {modal && modal !== 'sala' && (
        <RoveModalOverlay dimClassName="bg-black/55 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-4xl flex flex-col gap-3 max-h-[90vh]"
          >
            <div className="flex items-end justify-between gap-3 shrink-0 px-0.5">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">
                  {modal === 'new' ? 'Novo cliente' : 'Editar cliente'}
                </h3>
                <div className="h-0.5 w-10 bg-primary-500 rounded-full mt-2" />
              </div>
              <p className="text-[10px] text-gray-500 shrink-0 pb-0.5">
                Campos com <span className="text-primary-400">*</span> são obrigatórios.
              </p>
            </div>

            {(modal === 'new' || modal === 'edit') &&
            (form.servico === 'iptv' || form.servico === 'netflix') ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0 overflow-y-auto">
                {/* Card 1 — dados do cliente */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-netflix-card rounded-md plural-edge p-4 space-y-3 self-start"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Dados do cliente
                  </p>
                  <div>
                    <label className="block font-medium text-gray-300 text-xs mb-1">
                      Nome
                      <RequiredMark />
                    </label>
                    <input
                      type="text"
                      required
                      value={form.nome || ''}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                      className={NEW_CLIENT_INPUT_SM}
                      placeholder="Ex: Maria António"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-gray-300 text-xs mb-1">
                        WhatsApp
                        <RequiredMark />
                      </label>
                      <WhatsappAoInput
                        compact
                        value={form.whatsapp || ''}
                        onChange={(whatsapp) => setForm((f) => ({ ...f, whatsapp }))}
                        required
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-300 text-xs mb-1">
                        PIN área cliente
                        {modal === 'new' ? (
                          <RequiredMark />
                        ) : (
                          <span className="text-gray-500 font-normal text-xs"> (opcional)</span>
                        )}
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        required={modal === 'new'}
                        value={form.portalPin || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            portalPin: e.target.value,
                            ...(modal === 'edit' ? { removerPinPortal: false } : {}),
                          }))
                        }
                        className={NEW_CLIENT_INPUT_SM}
                        placeholder={
                          modal === 'edit'
                            ? 'Novo PIN (mín. 4) ou vazio para manter'
                            : 'Mín. 4 caracteres — /cliente'
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-gray-300 text-xs mb-1">
                      Localização
                    </label>
                    <input
                      type="text"
                      value={form.localizacao ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
                      className={NEW_CLIENT_INPUT_SM}
                      placeholder="Ex: Luanda, Benguela..."
                    />
                  </div>
                  {modal === 'edit' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-300">
                        Estado
                        <RequiredMark />
                      </label>
                      <RoveSelect
                        compact
                        required
                        value={form.status || 'ativo'}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="vencido">Vencido</option>
                        <option value="cancelado">Cancelado</option>
                      </RoveSelect>
                    </div>
                  )}
                  {modal === 'edit' && form.areaClienteAtiva && (
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.removerPinPortal}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            removerPinPortal: e.target.checked,
                            portalPin: e.target.checked ? '' : f.portalPin,
                          }))
                        }
                      />
                      Remover acesso à área cliente
                    </label>
                  )}
                </motion.div>

                {/* Card 2 — plano, acesso e pagamento */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-netflix-card rounded-md plural-edge p-4 space-y-3 self-start"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    {form.servico === 'iptv' ? 'Plano, servidor & pagamento' : 'Plano, sala & pagamento'}
                  </p>
                  <div
                    className={
                      form.servico === 'netflix' ? 'grid grid-cols-2 gap-2' : 'space-y-3'
                    }
                  >
                    <div>
                      <label
                        className={`block font-medium text-gray-300 ${compactClientForm ? 'text-xs mb-1' : 'text-sm mb-0.5'}`}
                      >
                        Plano
                        <RequiredMark />
                      </label>
                      {form.servico === 'iptv' ? (
                        <RoveSelect
                          compact={compactClientForm}
                          required
                          value={
                            PLANOS_IPTV.some((p) => p.id === form.plano)
                              ? form.plano!
                              : form.plano
                                ? 'outro'
                                : ''
                          }
                          onChange={(e) => {
                            const v = e.target.value
                            if (v === 'outro') {
                              setForm((f) => ({ ...f, plano: 'Outro', valor: f.valor || 0 }))
                            } else {
                              const p = PLANOS_IPTV.find((x) => x.id === v)
                              if (p) setForm((f) => ({ ...f, plano: p.id, valor: p.valor }))
                            }
                          }}
                        >
                          <option value="" disabled>
                            Selecione o plano IPTV
                          </option>
                          {PLANOS_IPTV.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                          <option value="outro">Outro (a especificar)</option>
                        </RoveSelect>
                      ) : (
                        <RoveSelect
                          compact={compactClientForm}
                          required
                          value={
                            PLANOS_NETFLIX.some((p) => p.id === form.plano)
                              ? form.plano!
                              : form.plano
                                ? 'outro'
                                : ''
                          }
                          onChange={(e) => {
                            const v = e.target.value
                            if (v === 'outro') {
                              setForm((f) => ({ ...f, plano: 'Outro', valor: f.valor || 0 }))
                            } else {
                              const p = PLANOS_NETFLIX.find((x) => x.id === v)
                              if (p) setForm((f) => ({ ...f, plano: p.id, valor: p.valor }))
                            }
                          }}
                        >
                          <option value="" disabled>
                            Selecione o plano Netflix
                          </option>
                          {PLANOS_NETFLIX.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                          <option value="outro">Outro (a especificar)</option>
                        </RoveSelect>
                      )}
                    </div>
                    {form.servico === 'netflix' && (
                      <div>
                        <label
                          className={`block font-medium text-gray-300 ${compactClientForm ? 'text-xs mb-1' : 'text-sm mb-0.5'}`}
                        >
                          Sala (conta)
                          {form.plano === 'Plano Room' && <RequiredMark />}
                        </label>
                        {form.plano === 'Plano Room' ? (
                          <RoveSelect
                            compact={compactClientForm}
                            required
                            value={form.salaId ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              const id = v === '' ? null : Number(v)
                              const sala = id ? salas.find((s) => s.id === id) : null
                              setForm((f) => ({
                                ...f,
                                salaId: id,
                                dataFim: sala?.dataFim ? String(sala.dataFim).slice(0, 10) : f.dataFim,
                              }))
                            }}
                          >
                            <option value="">Selecione a sala Netflix</option>
                            {salas.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nome}
                              </option>
                            ))}
                          </RoveSelect>
                        ) : (
                          <div className={compactClientForm ? NEW_CLIENT_LOCKED_SM : NEW_CLIENT_LOCKED}>
                            <span className="text-gray-400">Disponível apenas no Plano Room</span>
                            <LockedFieldBadge label="Bloqueado" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {form.servico === 'iptv' && (
                    <div className={`grid grid-cols-2 ${compactClientForm ? 'gap-2 mt-2.5' : 'gap-3 mt-4'}`}>
                      <div>
                        <label
                          className={`block font-medium text-gray-300 ${compactClientForm ? 'text-xs mb-1' : 'text-sm mb-0.5'}`}
                        >
                          Servidor
                        </label>
                        <RoveSelect
                          compact={compactClientForm}
                          value={form.servidorId ?? ''}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, servidorId: e.target.value ? Number(e.target.value) : null }))
                          }
                        >
                          <option value="">Selecione o servidor (opcional)</option>
                          {servidores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.tipo === 'secundario' && s.servidor
                                ? `${s.nome} (Secundário → ${s.servidor.nome})`
                                : s.nome}
                            </option>
                          ))}
                        </RoveSelect>
                      </div>
                      <div>
                        <label
                          className={`block font-medium text-gray-300 ${compactClientForm ? 'text-xs mb-1' : 'text-sm mb-0.5'}`}
                        >
                          Revendedor
                        </label>
                        <RoveSelect
                          compact={compactClientForm}
                          value={form.revendedorId ?? ''}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, revendedorId: e.target.value ? Number(e.target.value) : null }))
                          }
                        >
                          <option value="">Selecione o revendedor (opcional)</option>
                          {revendedores.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nome}
                            </option>
                          ))}
                        </RoveSelect>
                      </div>
                    </div>
                  )}

                <div className="border-t border-netflix-border/60 pt-3 space-y-3">
                    {form.servico === 'netflix' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-medium text-gray-300 text-xs mb-1">
                            Perfil
                            <RequiredMark />
                          </label>
                          <input
                            type="text"
                            required
                            value={form.perfil || ''}
                            onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
                            className={NEW_CLIENT_INPUT_SM}
                            placeholder="Ex: nome do perfil Netflix"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-gray-300 text-xs mb-1">
                            PIN
                            <RequiredMark />
                          </label>
                          <input
                            type="text"
                            required
                            value={form.pin || ''}
                            onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
                            className={NEW_CLIENT_INPUT_SM}
                            placeholder="Ex: 1234"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block font-medium text-gray-300 text-xs mb-1">
                          Nome de utilizador
                          <RequiredMark />
                        </label>
                        <input
                          type="text"
                          required
                          value={form.perfil || ''}
                          onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
                          className={NEW_CLIENT_INPUT_SM}
                          placeholder="Ex: nome de utilizador da linha"
                        />
                      </div>
                    )}
                    {(() => {
                      const valorBloqueado =
                        (form.servico === 'iptv' && PLANOS_IPTV.some((p) => p.id === form.plano)) ||
                        (form.servico === 'netflix' && PLANOS_NETFLIX.some((p) => p.id === form.plano))
                      const valorObrigatorio = isPlanoValorManual(form.servico, form.plano)
                      const dataFimBloqueada = form.servico === 'netflix'
                      const dataFimTexto = form.dataFim
                        ? new Date(String(form.dataFim).slice(0, 10)).toLocaleDateString('pt-PT')
                        : '—'

                      return (
                    <div className={`grid grid-cols-2 ${compactClientForm ? 'gap-2' : 'gap-3'}`}>
                      <div>
                        <label
                          className={`block font-medium text-gray-300 ${compactClientForm ? 'text-xs mb-1' : 'text-sm mb-0.5'}`}
                        >
                          Valor mensal (kz)
                          {valorObrigatorio && <RequiredMark />}
                        </label>
                        {valorBloqueado ? (
                          <div className={compactClientForm ? NEW_CLIENT_LOCKED_SM : NEW_CLIENT_LOCKED}>
                            <span className="font-semibold tabular-nums">
                              {Number(form.valor ?? 0).toLocaleString('pt-PT')} kz
                            </span>
                            <LockedFieldBadge label="Plano" />
                          </div>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            required={valorObrigatorio}
                            min={valorObrigatorio ? 0.01 : undefined}
                            value={form.valor ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, valor: Number(e.target.value) || 0 }))}
                            placeholder="Indique o valor em kz"
                            className={compactClientForm ? NEW_CLIENT_INPUT_SM : NEW_CLIENT_INPUT}
                          />
                        )}
                      </div>
                      {form.servico === 'iptv' ? (
                        <div>
                          <label
                            className={`block font-medium text-gray-300 ${compactClientForm ? 'text-xs mb-1' : 'text-sm mb-0.5'}`}
                          >
                            Data fim
                            <RequiredMark />
                          </label>
                          <RoveDatePicker
                            compact={compactClientForm}
                            value={form.dataFim ? String(form.dataFim).slice(0, 10) : ''}
                            onChange={(dataFim) => setForm((f) => ({ ...f, dataFim }))}
                            title="Selecione a data de renovação"
                            placeholder="Selecionar data"
                          />
                        </div>
                      ) : (
                        <div>
                          <label
                            className={`block font-medium text-gray-300 ${compactClientForm ? 'text-xs mb-1' : 'text-sm mb-0.5'}`}
                          >
                            {form.salaId ? 'Data fim (da sala)' : 'Data fim'}
                          </label>
                          {dataFimBloqueada ? (
                            <div className={compactClientForm ? NEW_CLIENT_LOCKED_SM : NEW_CLIENT_LOCKED}>
                              <span className="font-medium">{dataFimTexto}</span>
                              <LockedFieldBadge label={form.salaId ? 'Da sala' : 'Aguarda sala'} />
                            </div>
                          ) : (
                            <RoveDatePicker
                              compact={compactClientForm}
                              value={form.dataFim ? String(form.dataFim).slice(0, 10) : ''}
                              onChange={(dataFim) => setForm((f) => ({ ...f, dataFim }))}
                              placeholder="Selecionar data"
                            />
                          )}
                        </div>
                      )}
                    </div>
                      )
                    })()}
                    {form.servico === 'netflix' && (() => {
                      const planoNetflix = PLANOS_NETFLIX.find((p) => p.id === form.plano)
                      const valorInscricao = planoNetflix?.inscricao
                      const inscricaoPaga = form.inscricaoPaga === true
                      return (
                        <div>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={inscricaoPaga}
                            onClick={() => setForm((f) => ({ ...f, inscricaoPaga: !inscricaoPaga }))}
                            className={`flex w-full items-center text-left transition-all ${
                              compactClientForm ? 'gap-2 rounded-md border px-2.5 py-2' : 'gap-3 rounded-md border px-3 py-3'
                            } ${
                              inscricaoPaga
                                ? 'border-primary-500/55 bg-primary-950/45 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]'
                                : 'border-netflix-border/80 bg-netflix-panel/30 hover:border-primary-600/35 hover:bg-netflix-panel/50'
                            }`}
                          >
                            <span
                              className={`flex shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                                compactClientForm ? 'h-4 w-4' : 'h-5 w-5'
                              } ${
                                inscricaoPaga
                                  ? 'border-primary-500 bg-white text-black'
                                  : 'border-gray-500 bg-transparent'
                              }`}
                            >
                              {inscricaoPaga && (
                                <Check className={compactClientForm ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={3} />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block font-medium text-white ${compactClientForm ? 'text-xs' : 'text-sm'}`}>
                                Inscrição já paga?
                              </span>
                              {valorInscricao != null && (
                                <span
                                  className={`mt-0.5 block text-gray-400 ${compactClientForm ? 'text-[10px]' : 'text-xs'}`}
                                >
                                  Valor da inscrição: {valorInscricao.toLocaleString('pt-PT')} Kz
                                </span>
                              )}
                            </span>
                            {inscricaoPaga && (
                              <span className="shrink-0 rounded-full bg-primary-600/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-200">
                                Sim
                              </span>
                            )}
                          </button>
                        </div>
                      )
                    })()}
                </div>
                </motion.div>
              </div>
            ) : null}
            <div className="flex gap-2 shrink-0 justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="py-1.5 px-3 rounded-md border border-netflix-border text-xs font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveClient}
                className="py-1.5 px-5 rounded-md bg-white text-black text-xs font-medium hover:bg-neutral-200 transition-colors shadow-lg shadow-black/30"
              >
                Guardar
              </button>
            </div>
          </motion.div>
        </RoveModalOverlay>
      )}
    </motion.div>
  )
}
