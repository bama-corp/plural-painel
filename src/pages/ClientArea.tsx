import { useEffect, useState, useMemo, useCallback } from 'react'
import { RoveModalOverlay } from '../components/RoveModalOverlay'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut,
  Calendar,
  Tv,
  Film,
  Server,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  MapPin,
  Clock,
  Gift,
  UserPlus,
  Phone,
  User,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
  Bot,
  Globe,
  KeyRound,
  CreditCard,
  ChevronRight,
  Shield,
  Sun,
  Moon,
} from 'lucide-react'
import { clientPortalApi } from '../api/clientPortal'
import { useClientPortal } from '../contexts/ClientPortalContext'
import { useAlert } from '../contexts/AlertContext'
import { ClientThemeProvider, useClientTheme } from '../contexts/ClientThemeContext'
import { ROVE_PUBLIC_SITE_URL } from '../lib/roveSite'
import { NETFLIX_LOGIN_URL } from '../lib/netflix'
import { ClientAssistantBot, type ClientTab } from '../components/cliente/ClientAssistantBot'

const WA_BUSINESS = '244933623143'

export interface ClientPortalMe {
  id: number
  nome: string
  whatsapp: string
  servico: string
  plano: string
  status: string
  dataInicio: string
  dataFim: string
  valor: number
  perfil: string | null
  pin: string | null
  localizacao: string | null
  sala: { id: number; nome: string; dataFim: string | null } | null
  servidor: { id: number; nome: string; status: string } | null
  revendedor: { nome: string } | null
  iptvUser: string | null
  iptvPassSet: boolean
  iptvPass: string | null
  iptvMac: string | null
  iptvM3u: string | null
  inscricaoPaga: boolean | null
  indicacoes: number
  portalFirstLogin: boolean
  roveId: string | null
}

export interface PortalIndicacaoRow {
  id: number
  indicadoNome: string
  indicadoWhatsapp: string
  status: string
  createdAt: string
}

export interface PortalNotificacaoItem {
  id: string
  tipo: 'info' | 'warning' | 'success' | 'danger'
  titulo: string
  mensagem: string
  em?: string
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

function daysUntil(dateStr: string) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? '?'
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (a + b).toUpperCase()
}

function buildRenewWaText(me: ClientPortalMe) {
  const lines = [
    'Olá plural, quero renovar o meu plano.',
    `Cliente: ${me.nome}`,
    `Plano: ${me.plano} (${me.servico === 'netflix' ? 'Netflix' : 'IPTV'})`,
    `Vencimento: ${formatDate(me.dataFim)}`,
    `Valor mensal: ${Number(me.valor).toLocaleString('pt-BR')} kz`,
  ]
  if (me.roveId) lines.push(`ID ROVE: ${me.roveId}`)
  return encodeURIComponent(lines.join('\n'))
}

function NotificacaoTipoIcon({ tipo }: { tipo: PortalNotificacaoItem['tipo'] }) {
  switch (tipo) {
    case 'danger':
      return <AlertTriangle className="w-5 h-5 ca-fg-icon shrink-0" aria-hidden />
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-neutral-500 shrink-0" aria-hidden />
    case 'success':
      return <CheckCircle2 className="w-5 h-5 ca-fg-icon shrink-0" aria-hidden />
    default:
      return <Info className="w-5 h-5 text-neutral-400 shrink-0" aria-hidden />
  }
}

function CopyField({
  label,
  value,
  fieldId,
  copiedField,
  onCopy,
  mono = true,
}: {
  label: string
  value: string
  fieldId: string
  copiedField: string | null
  onCopy: (text: string, id: string) => void
  mono?: boolean
}) {
  const { t } = useClientTheme()
  const copied = copiedField === fieldId
  return (
    <div className={`py-3 ${t.hairline} last:shadow-none`}>
      <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider block mb-1.5">{label}</span>
      <div className="flex items-start gap-2">
        <p className={`text-sm ca-fg flex-1 min-w-0 break-all ${mono ? 'font-mono text-[13px]' : ''}`}>
          {value}
        </p>
        <button
          type="button"
          onClick={() => onCopy(value, fieldId)}
          className={t.copyBtn}
          aria-label={`Copiar ${label}`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  const { t } = useClientTheme()
  return (
    <div className={`flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-3 ${t.hairline} last:shadow-none`}>
      <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider shrink-0 sm:w-36">{label}</span>
      <div className={`text-sm ca-fg ${mono ? 'font-mono text-[13px] break-all' : ''}`}>{children}</div>
    </div>
  )
}

function NotificacoesList({
  items,
  loading,
  compact,
}: {
  items: PortalNotificacaoItem[]
  loading: boolean
  compact?: boolean
}) {
  const { t } = useClientTheme()
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className={`h-8 w-8 ${t.spin}`} />
      </div>
    )
  }
  if (items.length === 0) {
    return <p className={t.emptyNotif}>Sem avisos de momento.</p>
  }
  const list = compact ? items.slice(0, 3) : items
  return (
    <ul className="space-y-2">
      {list.map((n) => {
        const emphasis = n.tipo === 'danger' || n.tipo === 'warning'
        return (
          <li
            key={n.id}
            className={`flex gap-3 p-3.5 rounded-md ${
              emphasis ? 'bg-neutral-900 text-white' : 'ca-notif-idle'
            }`}
          >
            <span className={emphasis ? 'text-white' : undefined}>
              <NotificacaoTipoIcon tipo={n.tipo} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold text-sm ${emphasis ? 'text-white' : 'ca-notif-title'}`}>{n.titulo}</p>
              <p className={`text-sm mt-0.5 leading-relaxed ${emphasis ? 'text-neutral-300' : 'text-neutral-500'}`}>
                {n.mensagem}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default function ClientArea() {
  return (
    <ClientThemeProvider>
      <ClientAreaInner />
    </ClientThemeProvider>
  )
}

function ClientAreaInner() {
  const { theme, t, toggleTheme } = useClientTheme()
  const { client, logout } = useClientPortal()
  const { showInfo, showError } = useAlert()
  const [tab, setTab] = useState<ClientTab>('inicio')
  const [me, setMe] = useState<ClientPortalMe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [minhasIndicacoes, setMinhasIndicacoes] = useState<PortalIndicacaoRow[]>([])
  const [indicacoesLoading, setIndicacoesLoading] = useState(false)
  const [indForm, setIndForm] = useState({ nome: '', whatsapp: '' })
  const [indSubmitting, setIndSubmitting] = useState(false)
  const [portalNotifs, setPortalNotifs] = useState<PortalNotificacaoItem[]>([])
  const [notifsLoading, setNotifsLoading] = useState(false)
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(true)
  const [changePinForm, setChangePinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' })
  const [changingPin, setChangingPin] = useState(false)

  useEffect(() => {
    if (!client) return
    clientPortalApi
      .get<ClientPortalMe>('/api/client-portal/me')
      .then(setMe)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar dados'))
  }, [client])

  useEffect(() => {
    if (!me) return
    setIndicacoesLoading(true)
    clientPortalApi
      .get<PortalIndicacaoRow[]>('/api/client-portal/indicacoes')
      .then(setMinhasIndicacoes)
      .catch(() => setMinhasIndicacoes([]))
      .finally(() => setIndicacoesLoading(false))
  }, [me?.id])

  useEffect(() => {
    if (!me) return
    setNotifsLoading(true)
    clientPortalApi
      .get<{ items: PortalNotificacaoItem[] }>('/api/client-portal/notificacoes')
      .then((r) => setPortalNotifs(r.items))
      .catch(() => setPortalNotifs([]))
      .finally(() => setNotifsLoading(false))
  }, [me?.id, me?.dataFim, me?.status])

  useEffect(() => {
    if (!me?.portalFirstLogin) return
    setShowChangePinModal(true)
  }, [me?.id, me?.portalFirstLogin])

  const copyText = useCallback(async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldId)
      window.setTimeout(() => setCopiedField(null), 2000)
    } catch {
      showError('Não foi possível copiar. Tente selecionar manualmente.')
    }
  }, [showError])

  const handleAssistantCopy = useCallback(
    async (text: string) => {
      await copyText(text, 'assistant')
      showInfo('Copiado para a área de transferência.')
    },
    [copyText, showInfo]
  )

  async function handleLogout() {
    await logout()
    window.location.href = '/'
  }

  async function handleSubmitIndicacao(e: React.FormEvent) {
    e.preventDefault()
    const nome = indForm.nome.trim()
    const wa = indForm.whatsapp.trim()
    if (nome.length < 2) {
      showError('Indique o nome completo da pessoa (mín. 2 caracteres).')
      return
    }
    if (!wa) {
      showError('Indique o WhatsApp de quem vai ser contactado.')
      return
    }
    setIndSubmitting(true)
    try {
      await clientPortalApi.post('/api/client-portal/indicacoes', {
        indicadoNome: nome,
        indicadoWhatsapp: wa,
      })
      setIndForm({ nome: '', whatsapp: '' })
      const [freshMe, list] = await Promise.all([
        clientPortalApi.get<ClientPortalMe>('/api/client-portal/me'),
        clientPortalApi.get<PortalIndicacaoRow[]>('/api/client-portal/indicacoes'),
      ])
      setMe(freshMe)
      setMinhasIndicacoes(list)
      clientPortalApi
        .get<{ items: PortalNotificacaoItem[] }>('/api/client-portal/notificacoes')
        .then((r) => setPortalNotifs(r.items))
        .catch(() => {})
      showInfo('Indicação registada. A equipa irá validar em breve.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Não foi possível registar a indicação.')
    } finally {
      setIndSubmitting(false)
    }
  }

  async function handleChangePortalPin(e: React.FormEvent) {
    e.preventDefault()
    const atual = changePinForm.currentPin.trim()
    const novo = changePinForm.newPin.trim()
    const conf = changePinForm.confirmPin.trim()
    if (!atual || !novo || !conf) {
      showError('Preencha PIN atual, novo PIN e confirmação.')
      return
    }
    if (novo.length < 6) {
      showError('O novo PIN deve ter pelo menos 6 caracteres.')
      return
    }
    if (novo !== conf) {
      showError('A confirmação do PIN não coincide.')
      return
    }
    setChangingPin(true)
    try {
      await clientPortalApi.post('/api/client-portal/change-pin', {
        currentPin: atual,
        newPin: novo,
      })
      const [freshMe, freshNotifs] = await Promise.all([
        clientPortalApi.get<ClientPortalMe>('/api/client-portal/me'),
        clientPortalApi.get<{ items: PortalNotificacaoItem[] }>('/api/client-portal/notificacoes'),
      ])
      setMe(freshMe)
      setPortalNotifs(freshNotifs.items)
      setShowChangePinModal(false)
      setChangePinForm({ currentPin: '', newPin: '', confirmPin: '' })
      showInfo('PIN alterado com sucesso.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Não foi possível alterar o PIN.')
    } finally {
      setChangingPin(false)
    }
  }

  const daysLeft = useMemo(() => (me ? daysUntil(me.dataFim) : 0), [me])
  const alertNotifCount = portalNotifs.filter((n) => n.tipo === 'warning' || n.tipo === 'danger').length
  const renewalProgress = useMemo(() => {
    if (!me || me.status !== 'ativo') return 0
    return Math.min(100, Math.max(0, (Math.max(0, daysLeft) / 30) * 100))
  }, [me, daysLeft])

  const needsUrgentRenewal =
    me && (me.status === 'vencido' || me.status === 'cancelado' || (me.status === 'ativo' && daysLeft <= 7))

  if (error) {
    return (
      <div className={`min-h-screen ${t.page} flex items-center justify-center p-6`} data-client-theme={theme}>
        <div className={`${t.card} max-w-md w-full p-8 text-center`}>
          <p className="text-neutral-500 text-sm">{error}</p>
          <Link to="/" className={`inline-block mt-6 ca-fg text-sm font-medium underline underline-offset-2`}>
            Voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  if (!me) {
    return (
      <div className={`min-h-screen ${t.page} flex flex-col items-center justify-center gap-4`} data-client-theme={theme}>
        <div className={`h-10 w-10 ${t.spin}`} />
        <p className="text-neutral-500 text-sm">A carregar a sua conta…</p>
      </div>
    )
  }

  const st = t.status(me.status)
  const mustChangePinNow = me.portalFirstLogin
  const clientMe = me
  const waBotText = encodeURIComponent(`Olá plural, quero falar com o bot de atendimento.\nCliente: ${clientMe.nome}`)
  const waRenewText = buildRenewWaText(clientMe)
  const firstName = clientMe.nome.split(/\s+/)[0]

  const tabItems: { id: ClientTab; label: string; Icon: typeof User; badge?: number }[] = [
    { id: 'inicio', label: 'Início', Icon: User },
    { id: 'servico', label: clientMe.servico === 'netflix' ? 'Netflix' : 'IPTV', Icon: clientMe.servico === 'netflix' ? Film : Tv },
    { id: 'renovar', label: 'Renovar', Icon: Calendar },
    { id: 'indicar', label: 'Indicar', Icon: Gift },
    { id: 'conta', label: 'Conta', Icon: Shield, badge: alertNotifCount > 0 ? alertNotifCount : undefined },
  ]

  function copyAllIptv() {
    const lines = [
      `Utilizador: ${clientMe.perfil || clientMe.iptvUser || '—'}`,
      clientMe.iptvPass ? `Senha: ${clientMe.iptvPass}` : null,
      clientMe.iptvMac ? `MAC: ${clientMe.iptvMac}` : null,
      clientMe.iptvM3u ? `M3U: ${clientMe.iptvM3u}` : null,
      clientMe.servidor ? `Servidor: ${clientMe.servidor.nome}` : null,
    ].filter(Boolean)
    copyText(lines.join('\n'), 'iptv-all')
  }

  return (
    <div
      className={`h-[100dvh] overflow-hidden ${t.page} relative font-sans`}
      data-client-theme={theme}
    >
      <div
        aria-hidden
        className={`plural-mark-mask pointer-events-none fixed left-[70%] top-[20%] z-0 h-[min(90vmin,640px)] w-[min(90vmin,640px)] -translate-x-1/2 -translate-y-1/2 ${t.mark}`}
      />

      <nav aria-label="Navegação da área cliente" className={t.nav}>
        {tabItems.map(({ id, label, Icon, badge }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              title={label}
              className={`relative flex w-[3.25rem] sm:w-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-3.5 text-[10px] sm:text-[11px] font-medium leading-tight transition-all ${t.navBtn(active)}`}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
              <span className="max-w-full truncate px-0.5">{label}</span>
              {badge != null && badge > 0 && (
                <span
                  className={`absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${t.navBadge(active)}`}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div
        className={`relative z-10 flex h-full min-h-0 transition-[padding] duration-300 pl-[4.5rem] sm:pl-[5.5rem] ${
          assistantOpen ? 'lg:pr-[23.5rem]' : 'pr-0'
        }`}
      >
        <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-5 sm:px-6">
          <header className="shrink-0 pt-3 pb-3">
            <div className={`flex items-center justify-between gap-4 px-4 py-3 sm:px-5 ${t.shell}`}>
              <Link
                to="/cliente"
                onClick={() => setTab('inicio')}
                className="min-w-0 shrink"
                aria-label="plural — início"
              >
                <span className={`plural-wordmark-mask block h-20 w-[22rem] sm:h-24 sm:w-[26rem] ${t.wordmark}`} />
              </Link>

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-medium ca-fg text-right">Olá, {firstName}</p>
                  <p className="text-[11px] text-neutral-500 text-right">Área cliente</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={t.themeToggle}
                  aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                  title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button type="button" onClick={handleLogout} className={t.logout}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain pt-1 pb-10 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="px-1 sm:px-2">
            <AnimatePresence mode="wait">
          {tab === 'inicio' && (
            <motion.div
              key="inicio"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {needsUrgentRenewal && (
                <div className={`${t.card} p-4 flex flex-col sm:flex-row sm:items-center gap-3`}>
                  <AlertTriangle className="w-5 h-5 ca-fg-icon shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium ca-fg text-sm">
                      {me.status === 'cancelado'
                        ? 'Conta cancelada'
                        : me.status === 'vencido'
                          ? 'Subscrição vencida'
                          : `Renovação em ${Math.max(0, daysLeft)} dia(s)`}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Vencimento: {formatDate(me.dataFim)} · {Number(me.valor).toLocaleString('pt-BR')} kz/mês
                    </p>
                  </div>
                  <a
                    href={`https://wa.me/${WA_BUSINESS}?text=${waRenewText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${t.btnPrimary} shrink-0 !bg-[#25D366] hover:!bg-[#1ebe57] !text-white`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Renovar agora
                  </a>
                </div>
              )}

              <section className={`${t.card} p-5 sm:p-6`}>
                <div className="flex items-center gap-4 mb-5">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-md text-lg font-semibold ${t.avatar}`}>
                    {initials(me.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-semibold ca-fg truncate">{me.nome}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={`plural-badge ${st.className}`}>{st.text}</span>
                      {me.roveId && (
                        <button
                          type="button"
                          onClick={() => copyText(me.roveId!, 'roveId')}
                          className="text-xs text-neutral-500 ca-hover-fg font-mono"
                        >
                          {me.roveId} · {copiedField === 'roveId' ? 'copiado' : 'copiar ID'}
                        </button>
                      )}
                      {me.localizacao && (
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                          <MapPin className="w-3 h-3" />
                          {me.localizacao}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      Icon: Clock,
                      label: 'Dias restantes',
                      value: me.status === 'ativo' ? String(Math.max(0, daysLeft)) : '—',
                      big: true,
                    },
                    { Icon: Calendar, label: 'Vencimento', value: formatDate(me.dataFim) },
                    {
                      Icon: CreditCard,
                      label: 'Valor/mês',
                      value: `${Number(me.valor).toLocaleString('pt-BR')} kz`,
                    },
                    {
                      Icon: me.servico === 'netflix' ? Film : Tv,
                      label: 'Plano',
                      value: me.plano,
                    },
                  ].map(({ Icon, label, value, big }) => (
                    <div key={label} className={`${t.panel} p-3`}>
                      <Icon className="w-4 h-4 text-neutral-400 mb-1.5" />
                      <p className="text-[10px] uppercase text-neutral-500 tracking-wide">{label}</p>
                      <p
                        className={`font-semibold ca-fg truncate ${big ? 'text-xl tabular-nums' : 'text-sm'}`}
                        title={value}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Ações rápidas</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <a
                    href={`https://wa.me/${WA_BUSINESS}?text=${waRenewText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-start gap-2 p-4 ${t.panel} ca-panel-hover transition-colors text-left`}
                  >
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    <span className="text-sm font-medium ca-fg">Pedir renovação</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setTab('servico')}
                    className={`flex flex-col items-start gap-2 p-4 ${t.panel} ca-panel-hover transition-colors text-left`}
                  >
                    {me.servico === 'netflix' ? (
                      <Film className="w-5 h-5 text-neutral-500" />
                    ) : (
                      <Tv className="w-5 h-5 text-neutral-500" />
                    )}
                    <span className="text-sm font-medium ca-fg">Ver credenciais</span>
                  </button>
                  {me.servico === 'netflix' ? (
                    <a
                      href={NETFLIX_LOGIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col items-start gap-2 p-4 ${t.panel} ca-panel-hover transition-colors text-left`}
                    >
                      <ExternalLink className="w-5 h-5 text-neutral-500" />
                      <span className="text-sm font-medium ca-fg">Abrir Netflix</span>
                    </a>
                  ) : (
                    <a
                      href={ROVE_PUBLIC_SITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col items-start gap-2 p-4 ${t.panel} ca-panel-hover transition-colors text-left`}
                    >
                      <Globe className="w-5 h-5 text-neutral-500" />
                      <span className="text-sm font-medium ca-fg">Site plural</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setTab('indicar')}
                    className={`flex flex-col items-start gap-2 p-4 ${t.panel} ca-panel-hover transition-colors text-left`}
                  >
                    <Gift className="w-5 h-5 text-neutral-500" />
                    <span className="text-sm font-medium ca-fg">Indicar amigo</span>
                  </button>
                </div>
              </section>

              <section className={`${t.card} p-5`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-neutral-400" />
                    <h2 className="font-medium ca-fg">Avisos recentes</h2>
                  </div>
                  {portalNotifs.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setTab('conta')}
                      className="text-xs text-neutral-400 ca-hover-fg inline-flex items-center gap-0.5"
                    >
                      Ver todos
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <NotificacoesList items={portalNotifs} loading={notifsLoading} compact />
              </section>
            </motion.div>
          )}

          {tab === 'servico' && (
            <motion.div
              key="servico"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {me.servico === 'netflix' ? (
                <section className={`${t.card} p-6`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <Film className="w-6 h-6 text-neutral-500" />
                      <div>
                        <h2 className="text-lg font-semibold ca-fg">Netflix</h2>
                        <p className="text-xs text-neutral-500">Credenciais do seu perfil</p>
                      </div>
                    </div>
                    <a
                      href={NETFLIX_LOGIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${t.btnPrimary} shrink-0`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir Netflix
                    </a>
                  </div>
                  <InfoRow label="Perfil">{me.perfil || '—'}</InfoRow>
                  {me.pin && (
                    <CopyField
                      label="PIN do perfil"
                      value={me.pin}
                      fieldId="netflix-pin"
                      copiedField={copiedField}
                      onCopy={copyText}
                    />
                  )}
                  {me.sala && <InfoRow label="Sala / conta">{me.sala.nome}</InfoRow>}
                  {me.inscricaoPaga != null && (
                    <InfoRow label="Inscrição paga">{me.inscricaoPaga ? 'Sim' : 'Pendente'}</InfoRow>
                  )}
                  {me.pin && (
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          [`Perfil: ${me.perfil || '—'}`, `PIN: ${me.pin}`, me.sala ? `Sala: ${me.sala.nome}` : null]
                            .filter(Boolean)
                            .join('\n'),
                          'netflix-all'
                        )
                      }
                      className={`${t.btnGhost} mt-4`}
                    >
                      <Copy className="w-4 h-4" />
                      {copiedField === 'netflix-all' ? 'Copiado!' : 'Copiar tudo'}
                    </button>
                  )}
                </section>
              ) : (
                <section className={`${t.card} p-6`}>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <Tv className="w-6 h-6 text-neutral-500" />
                      <div>
                        <h2 className="text-lg font-semibold ca-fg">IPTV</h2>
                        <p className="text-xs text-neutral-500">Linha, servidor e lista M3U</p>
                      </div>
                    </div>
                    <button type="button" onClick={copyAllIptv} className={t.btnGhost}>
                      <Copy className="w-3.5 h-3.5" />
                      {copiedField === 'iptv-all' ? 'Copiado!' : 'Copiar tudo'}
                    </button>
                  </div>
                  {(me.perfil || me.iptvUser) && (
                    <CopyField
                      label="Utilizador / linha"
                      value={me.perfil || me.iptvUser || ''}
                      fieldId="iptv-user"
                      copiedField={copiedField}
                      onCopy={copyText}
                    />
                  )}
                  {me.iptvPass && (
                    <CopyField
                      label="Palavra-passe"
                      value={me.iptvPass}
                      fieldId="iptv-pass"
                      copiedField={copiedField}
                      onCopy={copyText}
                    />
                  )}
                  {!me.iptvPass && me.iptvPassSet && (
                    <InfoRow label="Palavra-passe">Definida — contacte a plural se precisar</InfoRow>
                  )}
                  {me.iptvMac && (
                    <CopyField
                      label="MAC"
                      value={me.iptvMac}
                      fieldId="iptv-mac"
                      copiedField={copiedField}
                      onCopy={copyText}
                    />
                  )}
                  {me.iptvM3u && (
                    <CopyField
                      label="Lista M3U"
                      value={me.iptvM3u}
                      fieldId="iptv-m3u"
                      copiedField={copiedField}
                      onCopy={copyText}
                    />
                  )}
                  {me.servidor && (
                    <InfoRow label="Servidor">
                      <span className="inline-flex items-center gap-2">
                        <Server className="w-4 h-4 text-neutral-500" />
                        {me.servidor.nome}
                        <span className="text-xs text-neutral-500">({me.servidor.status})</span>
                      </span>
                    </InfoRow>
                  )}
                  {me.revendedor && <InfoRow label="Revendedor">{me.revendedor.nome}</InfoRow>}
                </section>
              )}
            </motion.div>
          )}

          {tab === 'renovar' && (
            <motion.div
              key="renovar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              <section className={`${t.card} p-6 text-center`}>
                {me.status === 'ativo' ? (
                  <>
                    <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Dias até renovação</p>
                    <p className="text-5xl font-semibold tabular-nums mb-4 ca-fg">{Math.max(0, daysLeft)}</p>
                    <div className="max-w-xs mx-auto mb-4">
                      <div className={`h-1.5 rounded-full ${t.progressTrack} overflow-hidden`}>
                        <div
                          className={`h-full rounded-full ${t.progressBar} transition-all`}
                          style={{ width: `${renewalProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-neutral-600 mt-1">Referência visual (30 dias)</p>
                    </div>
                  </>
                ) : (
                  <div className="py-4">
                    <AlertTriangle className="w-10 h-10 ca-fg-icon mx-auto mb-2" />
                    <p className="text-lg font-semibold ca-fg">
                      {me.status === 'vencido' ? 'Subscrição vencida' : 'Conta inactiva'}
                    </p>
                  </div>
                )}
                <p className="text-sm text-neutral-400">
                  Próxima data: <span className="ca-fg font-medium">{formatDate(me.dataFim)}</span>
                </p>
              </section>

              <section className={`${t.card} p-6`}>
                <h2 className="font-medium ca-fg mb-4">Detalhes do plano</h2>
                <InfoRow label="Plano">{me.plano}</InfoRow>
                <InfoRow label="Serviço">{me.servico === 'netflix' ? 'Netflix' : 'IPTV'}</InfoRow>
                <InfoRow label="Valor mensal">{Number(me.valor).toLocaleString('pt-BR')} kz</InfoRow>
                <InfoRow label="Início">{formatDate(me.dataInicio)}</InfoRow>
                <InfoRow label="Indicações">{me.indicacoes ?? 0}</InfoRow>
              </section>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/${WA_BUSINESS}?text=${waRenewText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-[#25D366] hover:bg-[#1ebe57] text-white font-medium transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Pedir renovação no WhatsApp
                </a>
                <a
                  href={ROVE_PUBLIC_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={t.btnGhost}
                >
                  <Globe className="w-5 h-5" />
                  Ver planos
                </a>
              </div>
            </motion.div>
          )}

          {tab === 'indicar' && (
            <motion.div
              key="indicar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              <section className={`${t.card} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <Gift className="w-6 h-6 text-neutral-500" />
                  <div>
                    <h2 className="text-lg font-semibold ca-fg">Indique amigos</h2>
                    <p className="text-xs text-neutral-500">A equipa valida cada indicação antes de contactar</p>
                  </div>
                </div>
                <form onSubmit={handleSubmitIndicacao} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ind-nome" className="block text-xs font-medium text-neutral-500 uppercase mb-1.5">
                        Nome completo
                      </label>
                      <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                        <input
                          id="ind-nome"
                          type="text"
                          value={indForm.nome}
                          onChange={(e) => setIndForm((f) => ({ ...f, nome: e.target.value }))}
                          className={t.input}
                          placeholder="Nome do indicado"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="ind-wa" className="block text-xs font-medium text-neutral-500 uppercase mb-1.5">
                        WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                        <input
                          id="ind-wa"
                          type="text"
                          inputMode="tel"
                          value={indForm.whatsapp}
                          onChange={(e) => setIndForm((f) => ({ ...f, whatsapp: e.target.value }))}
                          className={t.input}
                          placeholder="+244 9XX XXX XXX"
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={indSubmitting} className={`${t.btnPrimary} disabled:opacity-50`}>
                    <Gift className="w-4 h-4" />
                    {indSubmitting ? 'A registar…' : 'Registar indicação'}
                  </button>
                </form>
              </section>

              <section className={`${t.card} p-6`}>
                <h3 className="text-sm font-medium ca-fg mb-3">
                  As suas indicações ({indicacoesLoading ? '…' : minhasIndicacoes.length})
                </h3>
                {indicacoesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className={`h-8 w-8 ${t.spin}`} />
                  </div>
                ) : minhasIndicacoes.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-6">Ainda não tem indicações registadas.</p>
                ) : (
                  <ul className="space-y-2">
                    {minhasIndicacoes.map((row) => (
                      <li
                        key={row.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 ${t.panel}`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium ca-fg truncate">{row.indicadoNome}</p>
                          <p className="text-xs text-neutral-500 font-mono">{row.indicadoWhatsapp}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`plural-badge ${t.indBadge(row.status === 'confirmada')}`}>
                            {row.status === 'confirmada' ? 'Confirmada' : 'Pendente'}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(row.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </motion.div>
          )}

          {tab === 'conta' && (
            <motion.div
              key="conta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              <section className={`${t.card} p-6`}>
                <h2 className="font-medium ca-fg mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-neutral-400" />
                  Segurança
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm ca-fg">PIN da área cliente</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Use um PIN com pelo menos 6 caracteres</p>
                  </div>
                  <button type="button" onClick={() => setShowChangePinModal(true)} className={t.btnGhost}>
                    <KeyRound className="w-4 h-4" />
                    Alterar PIN
                  </button>
                </div>
                {me.roveId && (
                  <div className="mt-4 pt-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                    <CopyField
                      label="ID ROVE (referência de suporte)"
                      value={me.roveId}
                      fieldId="roveId-conta"
                      copiedField={copiedField}
                      onCopy={copyText}
                    />
                  </div>
                )}
              </section>

              <section className={`${t.card} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-neutral-400" />
                  <h2 className="font-medium ca-fg">Todos os avisos</h2>
                </div>
                <NotificacoesList items={portalNotifs} loading={notifsLoading} />
              </section>

              <section className={`${t.card} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-5 h-5 text-neutral-500" />
                  <h2 className="font-medium ca-fg">Contacto e suporte</h2>
                </div>
                <p className="text-sm text-neutral-400 mb-4">
                  Use o <strong className="ca-fg font-medium">POne</strong> à direita ou fale connosco no WhatsApp.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <a
                    href={`https://wa.me/${WA_BUSINESS}?text=${waRenewText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#25D366] hover:bg-[#1ebe57] text-white text-sm font-medium transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp plural
                  </a>
                  <a
                    href={`https://wa.me/${WA_BUSINESS}?text=${waBotText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={t.btnGhost}
                  >
                    <Bot className="w-4 h-4" />
                    Bot de atendimento
                  </a>
                  <a href={ROVE_PUBLIC_SITE_URL} target="_blank" rel="noopener noreferrer" className={t.btnGhost}>
                    <Globe className="w-4 h-4" />
                    Site da plural
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        <p className={`text-center text-xs ${t.footer} mt-8 leading-relaxed`}>
          Os dados refletem o registo na plural. Em caso de divergência, contacte o suporte.
        </p>
            </div>
          </main>
        </div>
      </div>

      <ClientAssistantBot
        theme={theme}
        onOpenTab={setTab}
        onOpenPinModal={() => setShowChangePinModal(true)}
        onOpenChange={setAssistantOpen}
        onCopy={handleAssistantCopy}
      />

      {(showChangePinModal || mustChangePinNow) && (
        <RoveModalOverlay>
          <div className={`${t.card} max-w-sm w-full overflow-hidden`}>
            <div className={`p-6 ${t.hairline}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-md ${t.avatar}`}>
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold ca-fg">Alterar PIN</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {mustChangePinNow
                      ? 'Primeiro acesso: altere o PIN agora'
                      : 'Escolha um PIN seguro (mín. 6 caracteres)'}
                  </p>
                </div>
              </div>
            </div>
            <form onSubmit={handleChangePortalPin}>
              <div className="p-6 space-y-3">
                {(
                  [
                    ['PIN atual', 'currentPin', 'PIN usado no login', undefined],
                    ['Novo PIN', 'newPin', 'Mínimo 6 caracteres', 6],
                    ['Confirmar novo PIN', 'confirmPin', 'Repita o novo PIN', 6],
                  ] as const
                ).map(([label, key, placeholder, minLength]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-neutral-500 mb-1">{label}</label>
                    <input
                      type="password"
                      value={changePinForm[key]}
                      onChange={(e) => setChangePinForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-md text-sm outline-none ca-input-plain"
                      placeholder={placeholder}
                      minLength={minLength}
                    />
                  </div>
                ))}
              </div>
              <div className={`flex gap-3 p-6 pt-4 ${t.hairlineTop}`}>
                {!mustChangePinNow && (
                  <button type="button" onClick={() => setShowChangePinModal(false)} className={`flex-1 ${t.btnGhost}`}>
                    Fechar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={changingPin}
                  className={`${mustChangePinNow ? 'w-full' : 'flex-1'} ${t.btnPrimary} disabled:opacity-50`}
                >
                  {changingPin ? 'A guardar…' : 'Alterar PIN'}
                </button>
              </div>
            </form>
          </div>
        </RoveModalOverlay>
      )}
    </div>
  )
}
