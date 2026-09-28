import { useEffect, useMemo, useState } from 'react'
import {
  Headphones,
  Search,
  Send,
  Wifi,
  WifiOff,
  User,
  MessageSquare,
} from 'lucide-react'
import { api } from '../api/client'
import { useAlert } from '../contexts/AlertContext'
import { useAuth } from '../contexts/AuthContext'
import { RoveSelect } from '../components/RoveSelect'
import { RoveWhatsappLink } from '../components/RoveWhatsappLink'
import { ROVE_FORM_INPUT_SM, RoveFormLabel } from '../components/roveFormUi'
import { FinanceiroConfirmModal } from './financeiro/FinanceiroConfirmModal'
import { formatWhatsapp } from '../utils/whatsapp'

interface SupportClient {
  id: number
  nome: string
  whatsapp: string
  servico: string
  plano: string
  status: string
  dataFim: string
  valor?: number
  sala?: { id: number; nome: string } | null
  servidor?: { id: number; nome: string } | null
}

interface WhatsappStatus {
  configured: boolean
  connected: boolean
  awaitingQr?: boolean
  message?: string
}

const MAX_MESSAGE_LEN = 2000

const SHORTCUTS: { id: string; label: string; body: string }[] = [
  {
    id: 'saudacao',
    label: 'Saudação',
    body: 'Olá {{nome}}! Em que podemos ajudar?',
  },
  {
    id: 'renovacao',
    label: 'Lembrete renovação',
    body: 'Olá {{nome}}! Passamos para lembrar a renovação da sua subscrição Rove+. Quando puder, confirme o pagamento para manter o acesso sem interrupções.',
  },
  {
    id: 'pagamento',
    label: 'Pedido pagamento',
    body: 'Olá {{nome}}! Ainda não registámos o pagamento da renovação. Assim que pagar, diga-nos para reativarmos/confirmarmos o serviço.',
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    body: 'Olá {{nome}}! Estamos com uma manutenção temporária no serviço. Pedimos desculpa pelo inconveniente — assim que estiver resolvido avisamos.',
  },
  {
    id: 'credenciais',
    label: 'Credenciais',
    body: 'Olá {{nome}}! As suas credenciais de acesso foram actualizadas. Se precisar de ajuda para entrar, responda a esta mensagem.',
  },
  {
    id: 'contacto',
    label: 'Contactar suporte',
    body: 'Olá {{nome}}! Recebemos o seu pedido. A equipa de suporte vai analisar e responde o mais breve possível.',
  },
]

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('pt-BR')
  } catch {
    return s
  }
}

const statusColors: Record<string, string> = {
  ativo: 'bg-green-900/50 text-green-300',
  vencido: 'bg-red-900/50 text-red-300',
  cancelado: 'bg-gray-700 text-gray-300',
}

export default function Suporte() {
  const { user } = useAuth()
  const { showError, showSuccess, showWarning } = useAlert()
  const [clients, setClients] = useState<SupportClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filterServico, setFilterServico] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [waStatus, setWaStatus] = useState<WhatsappStatus | null>(null)

  const operadorNetflix = user?.role === 'netflix'
  const operadorIptv = user?.role === 'iptv'

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (searchDebounced.trim()) params.set('q', searchDebounced.trim())
    if (filterServico) params.set('servico', filterServico)
    if (filterStatus) params.set('status', filterStatus)
    api
      .get<SupportClient[]>(`/api/clients?${params}`)
      .then((rows) => setClients(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        setClients([])
        showError(e instanceof Error ? e.message : 'Erro ao carregar clientes')
      })
      .finally(() => setLoading(false))
  }, [searchDebounced, filterServico, filterStatus, showError])

  useEffect(() => {
    api
      .get<WhatsappStatus>('/api/whatsapp/status')
      .then(setWaStatus)
      .catch(() =>
        setWaStatus({
          configured: false,
          connected: false,
          message: 'Não foi possível verificar o WhatsApp.',
        })
      )
  }, [])

  const selected = useMemo(
    () => clients.find((c) => c.id === selectedId) ?? null,
    [clients, selectedId]
  )

  useEffect(() => {
    if (selectedId != null && !clients.some((c) => c.id === selectedId)) {
      setSelectedId(null)
    }
  }, [clients, selectedId])

  function applyShortcut(body: string) {
    const text = selected ? body.replace(/\{\{\s*nome\s*\}\}/gi, selected.nome) : body
    setMessage((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text))
  }

  function openConfirm() {
    if (!selected) {
      showWarning('Seleccione um cliente.')
      return
    }
    const trimmed = message.trim()
    if (!trimmed) {
      showWarning('Escreva a mensagem.')
      return
    }
    if (trimmed.length > MAX_MESSAGE_LEN) {
      showWarning(`Mensagem demasiado longa (máx. ${MAX_MESSAGE_LEN}).`)
      return
    }
    if (waStatus && !waStatus.connected) {
      showWarning(waStatus.message || 'WhatsApp não está ligado.')
    }
    setConfirmOpen(true)
  }

  async function confirmarEnvio() {
    if (!selected) return
    setSending(true)
    try {
      await api.post('/api/suporte/send', {
        clientId: selected.id,
        message: message.trim(),
      })
      showSuccess(`Mensagem enviada a ${selected.nome}.`)
      setMessage('')
      setConfirmOpen(false)
      const st = await api.get<WhatsappStatus>('/api/whatsapp/status').catch(() => null)
      if (st) setWaStatus(st)
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Falha ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Headphones className="w-7 h-7 text-primary-400" />
            Suporte
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Envio individual e exclusivo via WhatsApp — um cliente de cada vez.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
            waStatus?.connected
              ? 'border-green-500/40 bg-green-900/20 text-green-300'
              : 'border-amber-500/40 bg-amber-900/20 text-amber-200'
          }`}
        >
          {waStatus?.connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{waStatus?.message ?? 'A verificar WhatsApp…'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[28rem]">
        <div className="lg:col-span-2 rounded-md border border-netflix-border bg-netflix-card/80 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-netflix-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou WhatsApp…"
                className={`${ROVE_FORM_INPUT_SM} pl-8`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {!operadorNetflix && !operadorIptv && (
                <RoveSelect
                  compact
                  value={filterServico}
                  onChange={(e) => setFilterServico(e.target.value)}
                  title="Serviço"
                >
                  <option value="">Todos</option>
                  <option value="iptv">IPTV</option>
                  <option value="netflix">Netflix</option>
                </RoveSelect>
              )}
              <div className={!operadorNetflix && !operadorIptv ? undefined : 'col-span-2'}>
                <RoveSelect
                  compact
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  title="Estado"
                >
                  <option value="">Qualquer estado</option>
                  <option value="ativo">Ativo</option>
                  <option value="vencido">Vencido</option>
                  <option value="cancelado">Cancelado</option>
                </RoveSelect>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[32rem]">
            {loading ? (
              <p className="p-4 text-sm text-gray-500">A carregar…</p>
            ) : clients.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Nenhum cliente encontrado.</p>
            ) : (
              <ul className="divide-y divide-netflix-border/60">
                {clients.map((c) => {
                  const active = c.id === selectedId
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left px-3 py-2.5 transition-colors ${
                          active
                            ? 'bg-primary-600/20 border-l-2 border-primary-500'
                            : 'hover:bg-white/5 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white truncate">{c.nome}</span>
                          <span
                            className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              statusColors[c.status] ?? 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {c.servico === 'netflix' ? 'Netflix' : 'IPTV'} · {formatWhatsapp(c.whatsapp)}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 rounded-md border border-netflix-border bg-netflix-card/80 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-gray-500">
              <MessageSquare className="w-10 h-10 opacity-40" />
              <p className="text-sm">Seleccione um cliente à esquerda para escrever e enviar.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-netflix-border space-y-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary-600/20 p-2 text-primary-300">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-white truncate">{selected.nome}</h2>
                    <RoveWhatsappLink value={selected.whatsapp} compact />
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>
                        Serviço:{' '}
                        <span className="text-gray-300">
                          {selected.servico === 'netflix' ? 'Netflix' : 'IPTV'}
                        </span>
                      </span>
                      <span>
                        Plano: <span className="text-gray-300">{selected.plano || '—'}</span>
                      </span>
                      <span>
                        Vencimento:{' '}
                        <span className="text-gray-300">{formatDate(selected.dataFim)}</span>
                      </span>
                      {selected.servidor?.nome && (
                        <span>
                          Servidor: <span className="text-gray-300">{selected.servidor.nome}</span>
                        </span>
                      )}
                      {selected.sala?.nome && (
                        <span>
                          Sala: <span className="text-gray-300">{selected.sala.nome}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col gap-3">
                <div>
                  <RoveFormLabel>Atalhos (inserir no texto)</RoveFormLabel>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {SHORTCUTS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => applyShortcut(s.body)}
                        className="inline-flex items-center h-7 px-2.5 rounded-md border border-netflix-border text-[11px] text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5">
                    Use <code className="text-gray-500">{'{{nome}}'}</code> no texto — é substituído
                    pelo nome do cliente no envio.
                  </p>
                </div>

                <div className="flex-1 flex flex-col min-h-[10rem]">
                  <RoveFormLabel required>Mensagem</RoveFormLabel>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LEN))}
                    rows={8}
                    placeholder={`Olá ${selected.nome}, …`}
                    className={`${ROVE_FORM_INPUT_SM} flex-1 min-h-[10rem] resize-y`}
                  />
                  <p className="text-[10px] text-gray-600 mt-1 text-right">
                    {message.length}/{MAX_MESSAGE_LEN}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMessage('')}
                    disabled={!message.trim() || sending}
                    className="h-9 px-3 rounded-md border border-netflix-border text-sm text-gray-400 hover:text-white disabled:opacity-40"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={openConfirm}
                    disabled={!message.trim() || sending}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary-600 hover:bg-primary-700 text-sm font-medium text-white disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                    Enviar WhatsApp
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <FinanceiroConfirmModal
        open={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        onConfirm={confirmarEnvio}
        icon={Send}
        variant="primary"
        title="Enviar mensagem"
        subtitle={
          selected ? (
            <>
              Para <span className="text-white font-medium">{selected.nome}</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                {formatWhatsapp(selected.whatsapp)}
              </span>
            </>
          ) : undefined
        }
        description="A mensagem será enviada pelo WhatsApp da Rove+ (com cabeçalho e rodapé automáticos)."
        detail={
          message.trim()
            ? message.trim().length > 160
              ? `${message.trim().slice(0, 157)}…`
              : message.trim()
            : undefined
        }
        confirmLabel="Enviar"
        loading={sending}
        maxWidth="max-w-md"
      />
    </div>
  )
}
