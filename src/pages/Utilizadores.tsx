import { useEffect, useMemo, useState } from 'react'
import { RoveModalOverlay } from '../components/RoveModalOverlay'
import { RoveWhatsappLink } from '../components/RoveWhatsappLink'
import { Link, Navigate } from 'react-router-dom'
import {
  Edit2,
  Trash2,
  KeyRound,
  UserCog,
  AlertTriangle,
  CheckCircle,
  Check,
  Smartphone,
  ExternalLink,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Bell,
} from 'lucide-react'
import { RoveSelect } from '../components/RoveSelect'
import { WhatsappAoInput } from '../components/WhatsappAoInput'
import { ROVE_FORM_INPUT_SM, RoveFormLabel } from '../components/roveFormUi'
import { emptyWhatsapp, formatWhatsapp, isWhatsappValid, nationalDigitsFromWhatsapp } from '../utils/whatsapp'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { api } from '../api/client'
import { TablePagination, ROWS_PER_PAGE } from '../components/TablePagination'
import { PluralTableShell } from '../components/PluralTableShell'
import {
  PANEL_ALERT_CATEGORIES,
  PANEL_ALERT_META,
  defaultAlertScopesForRole,
  formatAlertScopesSummary,
  type PanelAlertCategory,
} from '../lib/panelAlertPrefs'

export interface UserRow {
  id: number
  nome: string
  email: string
  whatsapp?: string | null
  role: string
  status?: string
  createdAt: string
  /** Última senha definida no painel (texto plano, só admin) */
  passwordPlain?: string | null
  /** null = padrão do perfil */
  alertScopes?: PanelAlertCategory[] | null
  alertScopesEffective?: PanelAlertCategory[]
}

interface ClientAccessRow {
  id: number
  nome: string
  whatsapp: string
  servico: string
  status: string
  areaClienteAtiva?: boolean
  /** Só com ?includePortalPin=1: último PIN em texto (painel, recuperação ou troca em /cliente) */
  portalPinPlain?: string | null
}

const ROLES_OPERADORES = [
  { value: 'geral', label: 'Geral' },
  { value: 'netflix', label: 'Netflix' },
  { value: 'iptv', label: 'IPTV' },
  { value: 'financeiro', label: 'Financeiro' },
]

const ROLE_STYLES: Record<
  string,
  { label: string; chip: string; pill: string }
> = {
  admin: {
    label: 'Administrador',
    chip: 'bg-amber-100 text-amber-900',
    pill: 'bg-amber-500/20 text-amber-200 border border-amber-400/40',
  },
  geral: {
    label: 'Geral',
    chip: 'bg-sky-500/15 text-sky-200',
    pill: 'bg-sky-500/15 text-sky-200 border border-sky-400/40',
  },
  netflix: {
    label: 'Netflix',
    chip: 'bg-red-500/20 text-red-200',
    pill: 'bg-red-500/15 text-red-200 border border-red-400/40',
  },
  iptv: {
    label: 'IPTV',
    chip: 'bg-violet-500/20 text-violet-200',
    pill: 'bg-violet-500/15 text-violet-200 border border-violet-400/40',
  },
  suporte: {
    label: 'Suporte',
    chip: 'bg-emerald-500/15 text-emerald-200',
    pill: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40',
  },
  financeiro: {
    label: 'Financeiro',
    chip: 'bg-lime-500/15 text-lime-200',
    pill: 'bg-lime-500/15 text-lime-200 border border-lime-400/40',
  },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR')
}

const SERVICO_LABEL: Record<string, string> = {
  iptv: 'IPTV',
  netflix: 'Netflix',
}

function renderClientPortalPin(c: ClientAccessRow, showPins: boolean) {
  if (!c.areaClienteAtiva) return '—'
  if (!showPins) return '••••'
  if (c.portalPinPlain) return c.portalPinPlain
  return (
    <span className="text-xs text-gray-400 font-sans font-normal">
      Sem PIN em texto — use «PIN» para redefinir
    </span>
  )
}

function renderOperadorPassword(u: UserRow, showPins: boolean) {
  if (!showPins) return '••••'
  if (u.passwordPlain) return u.passwordPlain
  return (
    <span className="text-xs text-gray-400 font-sans font-normal">
      Sem senha em texto — use «Redefinir senha» para voltar a ver
    </span>
  )
}

type AlertFormState = {
  mode: 'role_default' | 'custom'
  scopes: PanelAlertCategory[]
}

function AlertScopesEditor({
  role,
  value,
  onChange,
  compactHeader = false,
}: {
  role: string
  value: AlertFormState
  onChange: (next: AlertFormState) => void
  compactHeader?: boolean
}) {
  const roleDefaults = defaultAlertScopesForRole(role)

  const groups: Array<{
    key: string
    title: string
    items: PanelAlertCategory[]
  }> = [
    {
      key: 'clientes',
      title: 'Clientes',
      items: ['clientes_netflix', 'clientes_iptv'],
    },
    {
      key: 'infra',
      title: 'Infraestrutura',
      items: ['salas', 'servidores'],
    },
    {
      key: 'operacao',
      title: 'Operação',
      items: ['financeiro', 'indicacoes'],
    },
    {
      key: 'sistema',
      title: 'Sistema',
      items: ['utilizadores', 'resumo'],
    },
  ]

  const toggleScope = (cat: PanelAlertCategory) => {
    const set = new Set(value.scopes)
    if (set.has(cat)) set.delete(cat)
    else set.add(cat)
    onChange({ mode: 'custom', scopes: PANEL_ALERT_CATEGORIES.filter((c) => set.has(c)) })
  }

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap items-center justify-between gap-2 ${compactHeader ? '' : ''}`}>
        {!compactHeader && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Alertas WhatsApp
            </p>
            <p className="mt-0.5 text-[10px] text-gray-600">
              Notificações que este operador recebe no WhatsApp.
            </p>
          </div>
        )}
        <div className={`flex flex-wrap gap-1.5 ${compactHeader ? 'w-full justify-end' : ''}`}>
          <button
            type="button"
            onClick={() => onChange({ mode: 'role_default', scopes: roleDefaults })}
            className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
              value.mode === 'role_default'
                ? 'border-primary-500/50 bg-primary-500/15 text-primary-200'
                : 'border-netflix-border/60 text-gray-400 hover:text-gray-200'
            }`}
          >
            Padrão do perfil
          </button>
          <button
            type="button"
            onClick={() => onChange({ mode: 'custom', scopes: [...PANEL_ALERT_CATEGORIES] })}
            className="rounded border border-netflix-border/60 px-2 py-1 text-[10px] font-medium text-gray-400 transition-colors hover:text-gray-200"
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onChange({ mode: 'custom', scopes: [] })}
            className="rounded border border-netflix-border/60 px-2 py-1 text-[10px] font-medium text-gray-400 transition-colors hover:text-gray-200"
          >
            Nenhum
          </button>
        </div>
      </div>

      {value.mode === 'role_default' ? (
        <p className="rounded-md border border-netflix-border/50 bg-netflix-panel/40 px-3 py-2 text-xs text-gray-400">
          Usa o padrão do perfil{' '}
          <span className="text-gray-300">{ROLE_STYLES[role]?.label ?? role}</span>:{' '}
          {roleDefaults.map((c) => PANEL_ALERT_META[c].label).join(', ')}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                {g.title}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {g.items.map((cat) => {
                  const meta = PANEL_ALERT_META[cat]
                  const checked = value.scopes.includes(cat)
                  return (
                    <label
                      key={cat}
                      className={`group flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-all ${
                        checked
                          ? 'border-white/25 bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'
                          : 'border-netflix-border/50 bg-black/20 hover:border-white/15 hover:bg-netflix-hover/40'
                      }`}
                    >
                      <span className="relative mt-0.5 inline-flex shrink-0">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={checked}
                          onChange={() => toggleScope(cat)}
                        />
                        <span
                          aria-hidden
                          className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition-all ${
                            checked
                              ? 'border-white bg-white text-black shadow-sm shadow-black/40'
                              : 'border-white/25 bg-transparent group-hover:border-white/45'
                          }`}
                        >
                          <Check
                            className={`h-3 w-3 transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}
                            strokeWidth={3}
                          />
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-xs font-medium transition-colors ${
                            checked ? 'text-white' : 'text-gray-200'
                          }`}
                        >
                          {meta.label}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-gray-500">
                          {meta.description}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {value.mode === 'custom' && value.scopes.length === 0 && (
        <p className="text-xs text-amber-400/90">Seleccione pelo menos uma categoria.</p>
      )}
    </div>
  )
}

export default function Utilizadores() {
  const { user } = useAuth()
  const { showError, showWarning, showSuccess } = useAlert()
  const [section, setSection] = useState<'operadores' | 'clientes'>('operadores')
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState<{
    nome: string
    email: string
    whatsapp: string
    password: string
    role: string
    alerts: AlertFormState
  }>({
    nome: '',
    email: '',
    whatsapp: emptyWhatsapp(),
    password: '',
    role: 'geral',
    alerts: { mode: 'role_default', scopes: defaultAlertScopesForRole('geral') },
  })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)
  const [userForAlerts, setUserForAlerts] = useState<UserRow | null>(null)
  const [alertsForm, setAlertsForm] = useState<AlertFormState>({
    mode: 'role_default',
    scopes: defaultAlertScopesForRole('geral'),
  })
  const [userToSuspender, setUserToSuspender] = useState<UserRow | null>(null)
  const [userToAtivar, setUserToAtivar] = useState<UserRow | null>(null)
  const [userToResetPassword, setUserToResetPassword] = useState<UserRow | null>(null)
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: '', confirm: '' })
  const [tablePage, setTablePage] = useState(1)
  const [operadorFilter, setOperadorFilter] = useState({ role: '', status: '' })
  const [operadorSearch, setOperadorSearch] = useState('')
  const [operadorSearchDebounced, setOperadorSearchDebounced] = useState('')

  const [clients, setClients] = useState<ClientAccessRow[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientSearchDebounced, setClientSearchDebounced] = useState('')
  const [serviceFilter, setServiceFilter] = useState<'todos' | 'iptv' | 'netflix'>('todos')
  const [portalFilter, setPortalFilter] = useState<'todos' | 'com' | 'sem'>('todos')
  const [clientTablePage, setClientTablePage] = useState(1)
  const [clientForPin, setClientForPin] = useState<ClientAccessRow | null>(null)
  const [pinForm, setPinForm] = useState({ pin: '', confirm: '' })
  const [clientToRevoke, setClientToRevoke] = useState<ClientAccessRow | null>(null)
  const [showPins, setShowPins] = useState(false)

  const filteredUsers = useMemo(() => {
    const q = operadorSearchDebounced.trim().toLowerCase()
    return users.filter((u) => {
      if (operadorFilter.role) {
        const role = u.role === 'suporte' ? 'geral' : u.role
        if (role !== operadorFilter.role) return false
      }
      if (operadorFilter.status && (u.status || 'ativo') !== operadorFilter.status) return false
      if (!q) return true
      const hay = [u.nome, u.email, u.whatsapp].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [users, operadorFilter, operadorSearchDebounced])

  const totalOperadorPages = Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE))
  const operadorPageClamped = Math.min(tablePage, totalOperadorPages)
  const pagedUsers = filteredUsers.slice(
    (operadorPageClamped - 1) * ROWS_PER_PAGE,
    operadorPageClamped * ROWS_PER_PAGE
  )

  const load = () => {
    setLoading(true)
    api
      .get<UserRow[]>('/api/users')
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setOperadorSearchDebounced(operadorSearch), 300)
    return () => window.clearTimeout(t)
  }, [operadorSearch])

  useEffect(() => {
    const t = window.setTimeout(() => setClientSearchDebounced(clientSearch), 300)
    return () => window.clearTimeout(t)
  }, [clientSearch])

  useEffect(() => {
    setTablePage(1)
  }, [operadorFilter, operadorSearchDebounced])

  useEffect(() => {
    setClientTablePage(1)
  }, [clientSearchDebounced, serviceFilter, portalFilter])

  useEffect(() => {
    if (section !== 'clientes') return
    let cancelled = false

    const loadClients = (opts: { withLoading: boolean }) => {
      if (opts.withLoading) setClientsLoading(true)
      return api
        .get<ClientAccessRow[]>('/api/clients?includePortalPin=1')
        .then((data) => {
          if (cancelled) return
          setClients(data)
        })
        .catch((e) => {
          if (!cancelled) showError(e instanceof Error ? e.message : 'Erro ao carregar clientes')
        })
        .finally(() => {
          if (!cancelled && opts.withLoading) setClientsLoading(false)
        })
    }

    void loadClients({ withLoading: true })

    const refetch = () => {
      if (document.visibilityState !== 'visible') return
      void loadClients({ withLoading: false })
    }
    const onWindowFocus = () => {
      void loadClients({ withLoading: false })
    }
    const poll = window.setInterval(() => {
      void loadClients({ withLoading: false })
    }, 20_000)

    document.addEventListener('visibilitychange', refetch)
    window.addEventListener('focus', onWindowFocus)

    return () => {
      cancelled = true
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', refetch)
      window.removeEventListener('focus', onWindowFocus)
    }
  }, [section, showError])

  const filteredClients = useMemo(() => {
    const q = clientSearchDebounced.trim().toLowerCase()
    return clients.filter((c) => {
      if (serviceFilter !== 'todos' && c.servico !== serviceFilter) return false
      if (portalFilter === 'com' && !c.areaClienteAtiva) return false
      if (portalFilter === 'sem' && c.areaClienteAtiva) return false
      if (!q) return true
      return (
        c.nome.toLowerCase().includes(q) ||
        String(c.whatsapp).toLowerCase().includes(q)
      )
    })
  }, [clients, clientSearchDebounced, serviceFilter, portalFilter])

  const totalClientPages = Math.max(1, Math.ceil(filteredClients.length / ROWS_PER_PAGE))
  const clientPageClamped = Math.min(clientTablePage, totalClientPages)
  const pagedClients = filteredClients.slice(
    (clientPageClamped - 1) * ROWS_PER_PAGE,
    clientPageClamped * ROWS_PER_PAGE
  )

  async function confirmarPinCliente() {
    if (!clientForPin) return
    const p = pinForm.pin.trim()
    const c = pinForm.confirm.trim()
    if (p.length < 4) {
      showWarning('O PIN da área cliente deve ter pelo menos 4 caracteres.')
      return
    }
    if (p !== c) {
      showWarning('Os PINs não coincidem.')
      return
    }
    setSubmitLoading(true)
    try {
      await api.patch(`/api/clients/${clientForPin.id}`, { portalPin: p })
      setClients((prev) =>
        prev.map((x) =>
          x.id === clientForPin.id ? { ...x, areaClienteAtiva: true, portalPinPlain: p } : x
        )
      )
      setClientForPin(null)
      setPinForm({ pin: '', confirm: '' })
      showSuccess('PIN da área cliente actualizado.')
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao guardar PIN')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function confirmarRevogarPortal() {
    if (!clientToRevoke) return
    setSubmitLoading(true)
    try {
      await api.patch(`/api/clients/${clientToRevoke.id}`, { portalPin: '' })
      setClients((prev) =>
        prev.map((x) =>
          x.id === clientToRevoke.id
            ? { ...x, areaClienteAtiva: false, portalPinPlain: null }
            : x
        )
      )
      setClientToRevoke(null)
      showSuccess('Acesso à área cliente revogado.')
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao revogar')
    } finally {
      setSubmitLoading(false)
    }
  }

  const openCreate = () => {
    setForm({
      nome: '',
      email: '',
      whatsapp: emptyWhatsapp(),
      password: '',
      role: 'geral',
      alerts: { mode: 'role_default', scopes: defaultAlertScopesForRole('geral') },
    })
    setEditing(null)
    setModal('create')
  }

  const openEdit = (u: UserRow) => {
    const role = u.role === 'admin' ? 'geral' : u.role
    const hasCustom = Array.isArray(u.alertScopes) && u.alertScopes.length > 0
    setForm({
      nome: u.nome,
      email: u.email,
      whatsapp: u.whatsapp ? formatWhatsapp(u.whatsapp) : emptyWhatsapp(),
      password: '',
      role: u.role === 'admin' ? 'geral' : u.role,
      alerts: hasCustom
        ? { mode: 'custom', scopes: u.alertScopes! }
        : { mode: 'role_default', scopes: defaultAlertScopesForRole(role) },
    })
    setEditing(u)
    setModal('edit')
  }

  const openAlertsModal = (u: UserRow) => {
    const hasCustom = Array.isArray(u.alertScopes) && u.alertScopes.length > 0
    setAlertsForm(
      hasCustom
        ? { mode: 'custom', scopes: u.alertScopes! }
        : { mode: 'role_default', scopes: defaultAlertScopesForRole(u.role) }
    )
    setUserForAlerts(u)
  }

  const closeModal = () => {
    setModal(null)
    setEditing(null)
    setForm({
      nome: '',
      email: '',
      whatsapp: emptyWhatsapp(),
      password: '',
      role: 'geral',
      alerts: { mode: 'role_default', scopes: defaultAlertScopesForRole('geral') },
    })
  }

  function buildAlertPayload(alerts: AlertFormState, forCreate = false) {
    if (alerts.mode === 'role_default') {
      return forCreate ? {} : { useRoleAlertDefaults: true }
    }
    if (alerts.scopes.length === 0) return null
    return { alertScopes: alerts.scopes }
  }

  function validateWhatsappOptional(whatsapp: string): boolean {
    const wa = whatsapp.trim()
    const filled = nationalDigitsFromWhatsapp(wa).length > 0
    if (filled && !isWhatsappValid(wa)) {
      showWarning('WhatsApp inválido (+244, +351 ou +55 com número completo).')
      return false
    }
    return true
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim() || !form.email.trim() || !form.password) {
      setError('Preencha nome, email e senha.')
      return
    }
    if (!validateWhatsappOptional(form.whatsapp)) return
    const alertPayload = buildAlertPayload(form.alerts, true)
    if (alertPayload === null) {
      showWarning('Seleccione pelo menos uma categoria de alerta WhatsApp.')
      return
    }
    setSubmitLoading(true)
    setError(null)
    api
      .post<UserRow>('/api/users', {
        ...form,
        whatsapp: form.whatsapp?.trim() || undefined,
        nome: form.nome.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        ...alertPayload,
      })
      .then(() => {
        showSuccess(`Utilizador «${form.nome.trim()}» criado com sucesso.`)
        closeModal()
        load()
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao criar'))
      .finally(() => setSubmitLoading(false))
  }

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing || !form.nome.trim() || !form.email.trim()) return
    if (!validateWhatsappOptional(form.whatsapp)) return
    const alertPayload = buildAlertPayload(form.alerts)
    if (alertPayload === null) {
      showWarning('Seleccione pelo menos uma categoria de alerta WhatsApp.')
      return
    }
    setSubmitLoading(true)
    setError(null)
    api
      .patch<UserRow>(`/api/users/${editing.id}`, {
        nome: form.nome.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp?.trim() || null,
        role: form.role,
        ...alertPayload,
      })
      .then(() => {
        showSuccess(`Utilizador «${form.nome.trim()}» actualizado.`)
        closeModal()
        load()
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao guardar'))
      .finally(() => setSubmitLoading(false))
  }

  async function confirmarAlertas() {
    if (!userForAlerts) return
    const alertPayload = buildAlertPayload(alertsForm)
    if (alertPayload === null) {
      showWarning('Seleccione pelo menos uma categoria de alerta WhatsApp.')
      return
    }
    setSubmitLoading(true)
    try {
      await api.patch(`/api/users/${userForAlerts.id}`, alertPayload)
      setUserForAlerts(null)
      load()
      showSuccess('Preferências de alerta actualizadas.')
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao guardar alertas')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function confirmarExcluir() {
    if (!userToDelete) return
    setSubmitLoading(true)
    setError(null)
    try {
      await api.delete(`/api/users/${userToDelete.id}`)
      showSuccess(`Utilizador «${userToDelete.nome}» eliminado.`)
      setUserToDelete(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao eliminar')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function confirmarSuspender() {
    if (!userToSuspender) return
    setSubmitLoading(true)
    setError(null)
    try {
      await api.post(`/api/users/${userToSuspender.id}/suspender`, {})
      showSuccess(`Utilizador «${userToSuspender.nome}» suspenso.`)
      setUserToSuspender(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao suspender')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function confirmarAtivar() {
    if (!userToAtivar) return
    setSubmitLoading(true)
    setError(null)
    try {
      await api.post(`/api/users/${userToAtivar.id}/ativar`, {})
      showSuccess(`Utilizador «${userToAtivar.nome}» activado.`)
      setUserToAtivar(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao ativar')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function confirmarRedefinirSenha() {
    if (!userToResetPassword) return
    const pwd = resetPasswordForm.password.trim()
    const conf = resetPasswordForm.confirm.trim()
    if (!pwd) {
      showWarning('Introduza a nova senha.')
      return
    }
    if (pwd !== conf) {
      showWarning('As senhas não coincidem.')
      return
    }
    if (pwd.length < 6) {
      showWarning('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setSubmitLoading(true)
    setError(null)
    try {
      await api.patch(`/api/users/${userToResetPassword.id}`, { password: pwd })
      showSuccess(`Senha de «${userToResetPassword.nome}» redefinida.`)
      setUserToResetPassword(null)
      setResetPasswordForm({ password: '', confirm: '' })
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao redefinir senha')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (user && user.role !== 'admin') {
    return <Navigate to="/clientes" replace />
  }

  const isLastAdmin = (u: UserRow) => {
    if (u.role !== 'admin') return false
    return users.filter((x) => x.role === 'admin').length <= 1
  }

  const stats = {
    total: filteredUsers.length,
    administradores: filteredUsers.filter((u) => u.role === 'admin').length,
    operadores: filteredUsers.filter((u) => u.role !== 'admin').length,
    ativos: filteredUsers.filter((u) => (u.status || 'ativo') === 'ativo').length,
    suspensos: filteredUsers.filter((u) => u.status === 'suspenso').length,
  }

  const clientPortalStats = {
    total: filteredClients.length,
    comPortal: filteredClients.filter((c) => c.areaClienteAtiva).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="plural-page-title flex items-center gap-2">
            <UserCog className="w-6 h-6" />
            Utilizadores
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {section === 'operadores'
              ? 'Gestão dos acessos ao painel interno e da área do cliente final (/cliente). Apenas o administrador pode alterar estas definições.'
              : 'Quem pode entrar em /cliente com WhatsApp + PIN. O PIN é definido aqui ou na ficha do cliente em Clientes.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-netflix-border/60 pb-3">
          <button
            type="button"
            onClick={() => setSection('operadores')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              section === 'operadores'
                ? 'bg-white text-black shadow-lg shadow-primary-900/30'
                : 'bg-netflix-panel/80 text-gray-300 border border-netflix-border/60 hover:bg-netflix-hover'
            }`}
          >
            <UserCog className="w-4 h-4 shrink-0" />
            Operadores do painel
          </button>
          <button
            type="button"
            onClick={() => setSection('clientes')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              section === 'clientes'
                ? 'bg-white text-black shadow-lg shadow-primary-900/30'
                : 'bg-netflix-panel/80 text-gray-300 border border-netflix-border/60 hover:bg-netflix-hover'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            Acesso clientes
          </button>
        </div>

        {section === 'operadores' ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-netflix-panel/80 border border-netflix-border/60 text-gray-300 text-sm">
                <span className="font-semibold text-white">{stats.total}</span> total
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-900/30 border border-amber-700/40 text-amber-300 text-sm">
                <span className="font-semibold">{stats.administradores}</span> administradores
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-900/30 border border-sky-700/40 text-sky-300 text-sm">
                <span className="font-semibold">{stats.operadores}</span> operadores
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-900/30 border border-green-700/40 text-green-300 text-sm">
                <span className="font-semibold">{stats.ativos}</span> ativos
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-900/30 border border-amber-700/40 text-amber-300 text-sm">
                <span className="font-semibold">{stats.suspensos}</span> suspensos
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPins((v) => !v)}
                className={`flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                  showPins
                    ? 'border-primary-500/45 bg-primary-500/15 text-primary-200 hover:bg-primary-500/25'
                    : 'border-netflix-border/60 bg-netflix-panel/80 text-gray-300 hover:bg-netflix-hover hover:text-white'
                }`}
                title={showPins ? 'Ocultar PIN na tabela' : 'Mostrar PIN na tabela'}
              >
                {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPins ? 'Ocultar PIN' : 'Mostrar PIN'}
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 py-2 px-4 bg-white text-black rounded-md hover:bg-primary-700 text-sm font-medium shadow-lg shadow-primary-900/30 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Novo utilizador
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-netflix-panel/80 border border-netflix-border/60 text-gray-300 text-sm">
                <span className="font-semibold text-white">{clientPortalStats.total}</span> clientes
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 text-sm">
                <span className="font-semibold">{clientPortalStats.comPortal}</span> com área /cliente ativa
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPins((v) => !v)}
                className={`flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                  showPins
                    ? 'border-primary-500/45 bg-primary-500/15 text-primary-200 hover:bg-primary-500/25'
                    : 'border-netflix-border/60 bg-netflix-panel/80 text-gray-300 hover:bg-netflix-hover hover:text-white'
                }`}
                title={showPins ? 'Ocultar PIN na tabela' : 'Mostrar PIN na tabela'}
              >
                {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPins ? 'Ocultar PIN' : 'Mostrar PIN'}
              </button>
              <Link
                to="/clientes"
                className="inline-flex items-center gap-2 py-2 px-4 rounded-md border border-netflix-border/60 bg-netflix-panel/80 text-gray-200 text-sm hover:bg-netflix-hover transition-colors"
              >
                Abrir CRM Clientes
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {error && section === 'operadores' && (
        <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800" role="alert">
          {error}
        </div>
      )}

      {section === 'operadores' && (
        <div className="plural-filter-bar">
          <div className="plural-filter-field">
            <RoveSelect
              compact
              value={operadorFilter.role}
              onChange={(e) => setOperadorFilter((f) => ({ ...f, role: e.target.value }))}
              placeholder="Todos os perfis"
              title="Filtrar por perfil"
            >
              <option value="">Todos os perfis</option>
              <option value="admin">Administrador</option>
              {ROLES_OPERADORES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </RoveSelect>
          </div>
          <div className="plural-filter-field-sm">
            <RoveSelect
              compact
              value={operadorFilter.status}
              onChange={(e) => setOperadorFilter((f) => ({ ...f, status: e.target.value }))}
              placeholder="Todos os estados"
              title="Filtrar por estado"
            >
              <option value="">Todos os estados</option>
              <option value="ativo">Ativo</option>
              <option value="suspenso">Suspenso</option>
            </RoveSelect>
          </div>
          <div className="plural-filter-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Nome, email ou WhatsApp..."
              value={operadorSearch}
              onChange={(e) => setOperadorSearch(e.target.value)}
              className="w-full min-h-[32px] pl-10 pr-3 py-1.5 rounded-md border border-netflix-border bg-netflix-panel text-white placeholder-gray-500 text-xs focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 outline-none transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="p-2 rounded-md border border-netflix-border bg-netflix-panel hover:bg-netflix-hover text-gray-300 hover:text-white transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {section === 'operadores' &&
        (loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <PluralTableShell>
            <table className="plural-table plural-table--cards-md">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide w-12">
                    Nº
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Utilizador
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    WhatsApp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Perfil
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Alertas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Senha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Criado em
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-netflix-border/80">
                {pagedUsers.map((u, idx) => {
                  const roleStyle = ROLE_STYLES[u.role] ?? ROLE_STYLES.geral
                  return (
                    <tr key={u.id} className="hover:bg-netflix-hover/80 transition-colors">
                      <td className="plural-table-cell-num px-4 py-3 text-center text-gray-400 text-sm" data-label="Nº">
                        {(operadorPageClamped - 1) * ROWS_PER_PAGE + idx + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-white" data-label="Utilizador">
                        <div className="flex flex-col">
                          <span className="font-medium">{u.nome}</span>
                          <span className="text-xs text-gray-400">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" data-label="WhatsApp">
                        <RoveWhatsappLink value={u.whatsapp} />
                      </td>
                      <td className="px-4 py-3" data-label="Perfil">
                        <span
                          className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full ${roleStyle.pill}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" data-label="Estado">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            (u.status || 'ativo') === 'ativo'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-amber-900/50 text-amber-300'
                          }`}
                        >
                          {(u.status || 'ativo') === 'ativo' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                      <td className="px-4 py-3" data-label="Alertas">
                        <button
                          type="button"
                          onClick={() => openAlertsModal(u)}
                          className="text-left text-xs text-gray-300 hover:text-primary-300 transition-colors"
                          title="Configurar alertas WhatsApp"
                        >
                          {formatAlertScopesSummary(u.alertScopes, u.role)}
                          {u.alertScopes?.length ? (
                            <span className="block text-[10px] text-gray-500 mt-0.5">Personalizado</span>
                          ) : (
                            <span className="block text-[10px] text-gray-500 mt-0.5">Padrão do perfil</span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-mono" data-label="Senha">
                        {renderOperadorPassword(u, showPins)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400" data-label="Criado em">{formatDate(u.createdAt)}</td>
                      <td className="plural-table-cell-actions px-4 py-3" data-label="Ações">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openAlertsModal(u)}
                            title="Alertas WhatsApp"
                            className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-violet-500/50 bg-violet-500/10 text-violet-300 hover:bg-violet-500/30 hover:text-white shadow-sm shadow-violet-900/40 transition-colors"
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                          {(u.status || 'ativo') === 'ativo' && u.role !== 'admin' && !isLastAdmin(u) && (
                            <button
                              type="button"
                              onClick={() => setUserToSuspender(u)}
                              title="Suspender"
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/30 hover:text-white shadow-sm shadow-amber-900/40 transition-colors"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          {(u.status || 'ativo') === 'suspenso' && (
                            <button
                              type="button"
                              onClick={() => setUserToAtivar(u)}
                              title="Ativar"
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-green-500/50 bg-green-500/10 text-green-300 hover:bg-green-500/30 hover:text-white shadow-sm shadow-green-900/40 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(u)}
                                title="Editar"
                                className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-primary-500/50 bg-primary-500/10 text-primary-300 hover:bg-primary-500/30 hover:text-white hover:border-primary-400 shadow-sm shadow-primary-900/40 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUserToResetPassword(u)
                                  setResetPasswordForm({ password: '', confirm: '' })
                                }}
                                title="Redefinir senha"
                                className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-sky-500/50 bg-sky-500/10 text-sky-300 hover:bg-sky-500/30 hover:text-white shadow-sm shadow-sky-900/40 transition-colors"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {u.role === 'admin' && (
                            <span className="text-gray-500 text-xs italic px-2">(único admin)</span>
                          )}
                          {!isLastAdmin(u) && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              title="Eliminar"
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-red-500/60 bg-red-500/15 text-red-300 hover:bg-red-500/30 hover:text-white shadow-sm shadow-red-900/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <TablePagination
              totalItems={filteredUsers.length}
              currentPage={operadorPageClamped}
              onPageChange={setTablePage}
            />
          </PluralTableShell>
        ))}

      {section === 'clientes' &&
        (clientsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="plural-filter-bar">
              <div className="plural-filter-field-sm">
                <RoveSelect
                  compact
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value as 'todos' | 'iptv' | 'netflix')}
                  placeholder="Todos os serviços"
                  title="Filtrar por serviço"
                >
                  <option value="todos">Todos os serviços</option>
                  <option value="iptv">Clientes IPTV</option>
                  <option value="netflix">Clientes Netflix</option>
                </RoveSelect>
              </div>
              <div className="plural-filter-field">
                <RoveSelect
                  compact
                  value={portalFilter}
                  onChange={(e) => setPortalFilter(e.target.value as 'todos' | 'com' | 'sem')}
                  placeholder="Área cliente"
                  title="Filtrar por área cliente"
                >
                  <option value="todos">Área cliente: todos</option>
                  <option value="com">Com acesso ativo</option>
                  <option value="sem">Sem acesso</option>
                </RoveSelect>
              </div>
              <div className="plural-filter-search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Nome ou WhatsApp..."
                  className="w-full min-h-[32px] pl-10 pr-3 py-1.5 rounded-md border border-netflix-border bg-netflix-panel text-white placeholder-gray-500 text-xs focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 outline-none transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setClientsLoading(true)
                  api
                    .get<ClientAccessRow[]>('/api/clients?includePortalPin=1')
                    .then(setClients)
                    .catch((e) => showError(e instanceof Error ? e.message : 'Erro ao carregar clientes'))
                    .finally(() => setClientsLoading(false))
                }}
                className="p-2 rounded-md border border-netflix-border bg-netflix-panel hover:bg-netflix-hover text-gray-300 hover:text-white transition-colors"
                title="Atualizar lista"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <PluralTableShell>
              <table className="plural-table plural-table--cards-md">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">WhatsApp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Serviço</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Área /cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">PIN /cliente</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-netflix-border/80">
                  {pagedClients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                        Nenhum cliente corresponde aos filtros.
                      </td>
                    </tr>
                  ) : (
                    pagedClients.map((c) => (
                      <tr key={c.id} className="hover:bg-netflix-hover/80 transition-colors">
                        <td className="px-4 py-3 text-sm text-white font-medium" data-label="Cliente">{c.nome}</td>
                        <td className="px-4 py-3" data-label="WhatsApp">
                          <RoveWhatsappLink value={c.whatsapp} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300" data-label="Serviço">{SERVICO_LABEL[c.servico] ?? c.servico}</td>
                        <td className="px-4 py-3" data-label="Estado">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              c.status === 'ativo'
                                ? 'bg-green-900/50 text-green-300'
                                : c.status === 'vencido'
                                  ? 'bg-red-900/50 text-red-300'
                                  : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3" data-label="Área /cliente">
                          {c.areaClienteAtiva ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                              <span className="h-2 w-2 rounded-full bg-gray-500" />
                              Desativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 font-mono" data-label="PIN /cliente">
                          {renderClientPortalPin(c, showPins)}
                        </td>
                        <td className="plural-table-cell-actions px-4 py-3" data-label="Ações">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setClientForPin(c)
                                setPinForm({ pin: '', confirm: '' })
                              }}
                              className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-primary-500/50 bg-primary-500/10 text-primary-300 hover:bg-primary-500/30 text-xs font-medium"
                            >
                              <KeyRound className="w-3.5 h-3.5 mr-1" />
                              PIN
                            </button>
                            {c.areaClienteAtiva && (
                              <button
                                type="button"
                                onClick={() => setClientToRevoke(c)}
                                className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/30 text-xs font-medium"
                              >
                                Revogar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <TablePagination
                totalItems={filteredClients.length}
                currentPage={clientPageClamped}
                onPageChange={setClientTablePage}
              />
            </PluralTableShell>
          </div>
        ))}

      {/* Modal confirmar suspender utilizador */}
      {userToSuspender && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-amber-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Suspender utilizador</h3>
                  <div className="h-1 w-12 bg-amber-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja suspender <span className="font-medium text-white">{userToSuspender.nome}</span>?
              </p>
              <p className="text-xs text-gray-500">O utilizador ficará com estado &quot;Suspenso&quot; e não poderá fazer login até ser ativado novamente.</p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setUserToSuspender(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarSuspender}
                disabled={submitLoading}
                className="flex-1 py-2.5 px-4 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-lg shadow-amber-900/30"
              >
                {submitLoading ? 'A suspender…' : 'Suspender'}
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal confirmar ativar utilizador */}
      {userToAtivar && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-green-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-green-500/20 text-green-400 ring-1 ring-green-500/30">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Ativar utilizador</h3>
                  <div className="h-1 w-12 bg-green-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja ativar <span className="font-medium text-white">{userToAtivar.nome}</span>?
              </p>
              <p className="text-xs text-gray-500">O utilizador ficará com estado &quot;Ativo&quot; e poderá fazer login novamente.</p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setUserToAtivar(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAtivar}
                disabled={submitLoading}
                className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-lg shadow-green-900/30"
              >
                {submitLoading ? 'A ativar…' : 'Ativar'}
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal confirmar eliminar utilizador */}
      {userToDelete && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-red-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-red-500/20 text-red-400 ring-1 ring-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Eliminar utilizador</h3>
                  <div className="h-1 w-12 bg-red-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja eliminar <span className="font-medium text-white">{userToDelete.nome}</span>?
              </p>
              <p className="text-xs text-gray-500">O utilizador deixará de ter acesso ao painel. Esta ação não pode ser revertida.</p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExcluir}
                disabled={submitLoading}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-900/30"
              >
                {submitLoading ? 'A eliminar…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal redefinir senha */}
      {userToResetPassword && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-netflix-border max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Redefinir senha</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{userToResetPassword.nome}</p>
                  <div className="h-1 w-12 bg-sky-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-0.5">Nova senha</label>
                <input
                  type="password"
                  value={resetPasswordForm.password}
                  onChange={(e) => setResetPasswordForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mín. 6 caracteres"
                  className="w-full px-3 py-2 bg-netflix-panel border border-netflix-border rounded-md text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-0.5">Confirmar senha</label>
                <input
                  type="password"
                  value={resetPasswordForm.confirm}
                  onChange={(e) => setResetPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repita a senha"
                  className="w-full px-3 py-2 bg-netflix-panel border border-netflix-border rounded-md text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80 bg-netflix-panel/30">
              <button
                type="button"
                onClick={() => { setUserToResetPassword(null); setResetPasswordForm({ password: '', confirm: '' }) }}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRedefinirSenha}
                disabled={submitLoading}
                className="flex-1 py-2.5 px-4 bg-white text-black rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg shadow-primary-900/30"
              >
                {submitLoading ? 'A guardar…' : 'Redefinir'}
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {clientForPin && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-primary-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">PIN área /cliente</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{clientForPin.nome}</p>
                  <div className="h-1 w-12 bg-primary-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                O cliente entra com este WhatsApp no login e o PIN que definir (mín. 4 caracteres). O PIN anterior deixa de ser válido.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-0.5">Novo PIN</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pinForm.pin}
                  onChange={(e) => setPinForm((f) => ({ ...f, pin: e.target.value }))}
                  placeholder="Mín. 4 caracteres"
                  className="w-full px-3 py-2 bg-netflix-panel border border-netflix-border rounded-md text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-0.5">Confirmar PIN</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pinForm.confirm}
                  onChange={(e) => setPinForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repita o PIN"
                  className="w-full px-3 py-2 bg-netflix-panel border border-netflix-border rounded-md text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80 bg-netflix-panel/30">
              <button
                type="button"
                onClick={() => {
                  setClientForPin(null)
                  setPinForm({ pin: '', confirm: '' })
                }}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarPinCliente}
                disabled={submitLoading}
                className="flex-1 py-2.5 px-4 bg-white text-black rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg shadow-primary-900/30"
              >
                {submitLoading ? 'A guardar…' : 'Guardar PIN'}
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {clientToRevoke && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-amber-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Revogar acesso /cliente</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{clientToRevoke.nome}</p>
                  <div className="h-1 w-12 bg-amber-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Remover o PIN impede o login na área do cliente até ser definido um novo PIN.
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setClientToRevoke(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRevogarPortal}
                disabled={submitLoading}
                className="flex-1 py-2.5 px-4 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-lg shadow-amber-900/30"
              >
                {submitLoading ? 'A revogar…' : 'Revogar'}
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {userForAlerts && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-violet-500/30 max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="border-b border-netflix-border/80 shrink-0 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-violet-500/20 text-violet-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Alertas WhatsApp</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{userForAlerts.nome}</p>
                </div>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <AlertScopesEditor
                role={userForAlerts.role}
                value={alertsForm}
                onChange={setAlertsForm}
              />
            </div>
            <div className="flex gap-2 p-4 border-t border-netflix-border/80 shrink-0">
              <button
                type="button"
                onClick={() => setUserForAlerts(null)}
                className="py-1.5 px-3 border border-netflix-border rounded-md text-xs font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAlertas}
                disabled={submitLoading}
                className="flex-1 py-1.5 px-3 bg-violet-600 text-white rounded-md text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {submitLoading ? 'A guardar…' : 'Guardar alertas'}
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {modal && (
        <RoveModalOverlay dimClassName="bg-black/55 backdrop-blur-md">
          <div className="flex w-full max-w-4xl max-h-[90dvh] flex-col gap-3 overflow-hidden overflow-y-auto">
            <div className="flex shrink-0 items-end justify-between gap-3 px-0.5">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">
                  {modal === 'create' ? 'Novo utilizador' : 'Editar utilizador'}
                </h3>
                <div className="mt-2 h-0.5 w-10 rounded-full bg-primary-500" />
              </div>
              <p className="shrink-0 pb-0.5 text-[10px] text-gray-500">
                Campos com <span className="text-primary-400">*</span> são obrigatórios.
              </p>
            </div>

            <form
              onSubmit={modal === 'create' ? handleCreate : handleEdit}
              className="flex min-h-0 flex-1 flex-col gap-3"
            >
              <div className="grid min-h-0 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-2">
                {/* Card 1 — dados do utilizador */}
                <div className="space-y-3 self-start rounded-md bg-netflix-card p-4 plural-edge">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Dados do utilizador
                  </p>

                  <div>
                    <RoveFormLabel required>Nome</RoveFormLabel>
                    <input
                      type="text"
                      required
                      value={form.nome}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                      placeholder="Nome completo"
                      className={ROVE_FORM_INPUT_SM}
                    />
                  </div>

                  <div>
                    <RoveFormLabel required>Email</RoveFormLabel>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                      className={ROVE_FORM_INPUT_SM}
                    />
                  </div>

                  <div>
                    <RoveFormLabel>WhatsApp</RoveFormLabel>
                    <WhatsappAoInput
                      compact
                      value={form.whatsapp}
                      onChange={(whatsapp) => setForm((f) => ({ ...f, whatsapp }))}
                    />
                    <p className="mt-1 text-[10px] text-gray-600">
                      Necessário para receber alertas no telemóvel.
                    </p>
                  </div>

                  <div>
                    <RoveFormLabel required>Perfil</RoveFormLabel>
                    <RoveSelect
                      compact
                      required
                      value={form.role}
                      onChange={(e) => {
                        const role = e.target.value
                        setForm((f) => ({
                          ...f,
                          role,
                          alerts:
                            f.alerts.mode === 'role_default'
                              ? { mode: 'role_default', scopes: defaultAlertScopesForRole(role) }
                              : f.alerts,
                        }))
                      }}
                    >
                      {ROLES_OPERADORES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </RoveSelect>
                  </div>

                  {modal === 'create' ? (
                    <div className="border-t border-netflix-border/60 pt-3">
                      <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        Acesso ao painel
                      </p>
                      <div>
                        <RoveFormLabel required>Senha</RoveFormLabel>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={form.password}
                          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder="Mín. 6 caracteres"
                          className={ROVE_FORM_INPUT_SM}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="border-t border-netflix-border/60 pt-3 text-[10px] text-gray-500">
                      Para alterar a senha, use a ação &quot;Redefinir senha&quot; na tabela.
                    </p>
                  )}
                </div>

                {/* Card 2 — alertas WhatsApp */}
                <div className="space-y-3 self-start rounded-md bg-netflix-card p-4 plural-edge">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      Alertas WhatsApp
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-600">
                      Notificações que este operador recebe no telemóvel.
                    </p>
                  </div>
                  <AlertScopesEditor
                    compactHeader
                    role={form.role}
                    value={form.alerts}
                    onChange={(alerts) => setForm((f) => ({ ...f, alerts }))}
                  />
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 px-0.5 pb-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-netflix-border bg-netflix-panel px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-netflix-hover"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black shadow-lg shadow-primary-900/30 transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitLoading ? 'A guardar…' : modal === 'create' ? 'Criar utilizador' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </RoveModalOverlay>
      )}
    </div>
  )
}
