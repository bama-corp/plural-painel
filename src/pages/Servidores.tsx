import { useEffect, useMemo, useState } from 'react'
import { RoveModalOverlay } from '../components/RoveModalOverlay'
import { motion } from 'framer-motion'
import { Plus, Edit2, Trash2, Server, AlertTriangle, RefreshCw, Search } from 'lucide-react'
import { RoveDatePicker } from '../components/RoveDatePicker'
import { RoveMensalidadeInput } from '../components/RoveMensalidadeInput'
import { RoveSelect } from '../components/RoveSelect'
import {
  ROVE_FORM_INPUT_SM,
  ROVE_FORM_LOCKED_SM,
  RoveFormLabel,
  RoveLockedBadge,
  mesesPagamentoLabel,
} from '../components/roveFormUi'
import { api } from '../api/client'
import { useAlert } from '../contexts/AlertContext'

interface Servidor {
  id: number
  nome: string
  tipo: string
  status: string
  totalClientes: number
  mensalidade?: number | null
  dataPagamento?: string | null
  servidorId?: number | null
  servidor?: { id: number; nome: string } | null
}

export default function Servidores() {
  const { showError, showWarning } = useAlert()
  const [list, setList] = useState<Servidor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)
  const [servidorToRenovar, setServidorToRenovar] = useState<Servidor | null>(null)
  const [renovarMeses, setRenovarMeses] = useState<number | ''>('')
  const [servidorToSuspender, setServidorToSuspender] = useState<Servidor | null>(null)
  const [servidorToDelete, setServidorToDelete] = useState<Servidor | null>(null)
  const [form, setForm] = useState<Partial<Servidor>>({
    nome: '',
    tipo: 'principal',
    status: 'online',
    servidorId: null,
    mensalidade: null,
    dataPagamento: null,
  })
  const [filter, setFilter] = useState({ tipo: '', status: '' })
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  function load() {
    setLoading(true)
    api
      .get<Servidor[]>('/api/servidores')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  function matchesTipo(s: Servidor, tipo: string): boolean {
    if (!tipo) return true
    if (tipo === 'secundario') return s.tipo === 'secundario' || s.tipo === 'backup'
    return s.tipo === tipo
  }

  const filteredList = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase()
    return list.filter((s) => {
      if (!matchesTipo(s, filter.tipo)) return false
      if (filter.status && s.status !== filter.status) return false
      if (!q) return true
      const hay = [s.nome, s.servidor?.nome].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [list, filter, searchDebounced])

  async function save() {
    const nome = (form.nome ?? '').trim()
    if (!nome) {
      showWarning('Nome do servidor é obrigatório.')
      return
    }
    if (form.tipo === 'secundario' && !form.servidorId) {
      showWarning('Selecione o servidor primário para um servidor secundário.')
      return
    }
    try {
      const payload = {
        ...form,
        nome,
        mensalidade: form.tipo === 'principal' ? (form.mensalidade ?? null) : null,
        dataPagamento: form.tipo === 'principal' ? (form.dataPagamento || null) : null,
      }
      if (modal === 'new') {
        await api.post('/api/servidores', payload)
      } else if (form.id) {
        await api.patch(`/api/servidores/${form.id}`, payload)
      }
      setModal(null)
      setForm({ nome: '', tipo: 'principal', status: 'online', servidorId: null, mensalidade: null, dataPagamento: null })
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao guardar')
    }
  }

  async function confirmarExcluir() {
    if (!servidorToDelete) return
    try {
      await api.delete(`/api/servidores/${servidorToDelete.id}`)
      setServidorToDelete(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function confirmarSuspender() {
    if (!servidorToSuspender) return
    try {
      await api.post(`/api/servidores/${servidorToSuspender.id}/suspender`, {})
      setServidorToSuspender(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao suspender servidor')
    }
  }

  async function confirmarRenovar() {
    if (!servidorToRenovar) return
    if (renovarMeses === '') {
      showWarning('Selecione quantos meses deseja renovar.')
      return
    }
    const meses = Math.min(24, Math.max(1, renovarMeses))
    try {
      await api.post(`/api/servidores/${servidorToRenovar.id}/pagar-mes-principal`, { meses })
      setServidorToRenovar(null)
      setRenovarMeses('')
      load()
    } catch (e) {
      showError(
        e instanceof Error ? e.message : `Erro ao registar pagamento do servidor "${servidorToRenovar.nome}"`
      )
    }
  }

  const statusClass: Record<string, string> = {
    online: 'bg-green-900/50 text-green-300',
    instável: 'bg-amber-900/50 text-amber-300',
    offline: 'bg-red-900/50 text-red-300',
  }
  const tipoLabel: Record<string, string> = {
    principal: 'Principal',
    secundario: 'Secundário',
    backup: 'Secundário',
  }

  const principais = list.filter((s) => s.tipo === 'principal' && s.id !== form.id)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="plural-page-title flex items-center gap-2">
            <Server className="w-5 h-5" />
            Servidores IPTV
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Servidores do serviço IPTV. Principal e secundário. Associe clientes a cada servidor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ nome: '', tipo: 'principal', status: 'online', servidorId: null, mensalidade: null, dataPagamento: null })
            setModal('new')
          }}
          className="flex w-full items-center justify-center gap-2 py-2 px-4 bg-white text-black rounded-md hover:bg-primary-700 text-sm font-medium sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Novo servidor
        </button>
      </div>

      <div className="plural-filter-bar">
        <div className="plural-filter-field-sm">
          <RoveSelect
            compact
            value={filter.tipo}
            onChange={(e) => setFilter((f) => ({ ...f, tipo: e.target.value }))}
            placeholder="Todos os tipos"
            title="Filtrar por tipo"
          >
            <option value="">Todos os tipos</option>
            <option value="principal">Principal</option>
            <option value="secundario">Secundário</option>
          </RoveSelect>
        </div>
        <div className="plural-filter-field-sm">
          <RoveSelect
            compact
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            placeholder="Todos os estados"
            title="Filtrar por estado"
          >
            <option value="">Todos os estados</option>
            <option value="online">Online</option>
            <option value="instável">Instável</option>
            <option value="offline">Offline</option>
          </RoveSelect>
        </div>
        <div className="plural-filter-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Nome ou servidor primário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-400">A carregar...</div>
        ) : filteredList.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-400">Nenhum servidor corresponde aos filtros.</div>
        ) : (
          filteredList.map((s) => (
            <div
              key={s.id}
              className={`rounded-md shadow p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${
                s.status === 'offline'
                  ? 'bg-red-900/20 border-2 border-red-500/50'
                  : s.status === 'instável'
                    ? 'bg-amber-900/20 border-2 border-amber-500/50'
                    : 'bg-netflix-card border border-netflix-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary-600/20 text-primary-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{s.nome}</h3>
                  <p className="text-sm text-gray-500">
                    {tipoLabel[s.tipo] ?? s.tipo}
                    {s.tipo === 'secundario' && s.servidor && (
                      <span className="text-gray-400"> → {s.servidor.nome}</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    <span className="font-medium">{s.totalClientes}</span> clientes
                  </p>
                  {s.tipo === 'principal' && (
                    <>
                      <p className="text-sm text-gray-400 mt-1">
                        Mensalidade:{' '}
                        <span className="text-white font-medium">{Number(s.mensalidade ?? 0).toFixed(2)} kz</span>
                      </p>
                      <p className="text-sm text-gray-400">
                        Pagamento:{' '}
                        <span className="text-white font-medium">
                          {s.dataPagamento ? new Date(s.dataPagamento).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </p>
                    </>
                  )}
                  <span
                    className={`inline-flex mt-2 px-2 py-0.5 rounded text-xs font-medium ${statusClass[s.status] || 'bg-gray-700 text-gray-300'}`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 self-stretch sm:self-auto sm:shrink-0">
                {s.tipo === 'principal' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRenovarMeses('')
                      setServidorToRenovar(s)
                    }}
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-emerald-500/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 hover:text-white shadow-sm shadow-emerald-900/40 transition-colors"
                    title="Renovar (+1 mês)"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                {s.status !== 'offline' && (
                  <button
                    type="button"
                    onClick={() => setServidorToSuspender(s)}
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/30 hover:text-white shadow-sm shadow-amber-900/40 transition-colors"
                    title="Suspender servidor"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...s })
                    setModal('edit')
                  }}
                  className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-primary-500/50 bg-primary-500/10 text-primary-300 hover:bg-primary-500/30 hover:text-white hover:border-primary-400 shadow-sm shadow-primary-900/40 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setServidorToDelete(s)}
                  className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-red-500/60 bg-red-500/15 text-red-300 hover:bg-red-500/30 hover:text-white shadow-sm shadow-red-900/40 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {servidorToRenovar && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-emerald-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Renovar servidor</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    <span className="text-white font-medium">{servidorToRenovar.nome}</span>
                  </p>
                  <div className="h-1 w-12 bg-emerald-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500">
                A data de pagamento será prolongada a partir da data atual ou da próxima data registada.
                Mensalidade:{' '}
                <span className="text-gray-300 font-medium">
                  {Number(servidorToRenovar.mensalidade ?? 0).toLocaleString('pt-PT')} kz
                </span>
              </p>
              <div>
                <RoveFormLabel required>Meses de pagamento</RoveFormLabel>
                <RoveSelect
                  compact
                  required
                  value={renovarMeses === '' ? '' : String(renovarMeses)}
                  onChange={(e) => setRenovarMeses(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Selecione os meses"
                  title="Quantos meses de pagamento registar"
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
                onClick={() => {
                  setServidorToRenovar(null)
                  setRenovarMeses('')
                }}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRenovar}
                disabled={renovarMeses === ''}
                title={renovarMeses === '' ? 'Selecione os meses' : 'Confirmar renovação'}
                className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-900/30"
              >
                Renovar
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {servidorToSuspender && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-amber-500/30 max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Suspender servidor</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    O servidor <span className="text-white font-medium">{servidorToSuspender.nome}</span> passará a
                    estado <span className="text-amber-400 font-medium">offline</span>.
                  </p>
                </div>
              </div>
              <div className="h-1 w-12 bg-amber-500 rounded-full mt-4" />
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-300">Tem a certeza que deseja suspender este servidor?</p>
            </div>
            <div className="flex gap-3 p-6 pt-0 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setServidorToSuspender(null)}
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

      {servidorToDelete && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-red-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-red-500/20 text-red-400 ring-1 ring-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Excluir servidor</h3>
                  <div className="h-1 w-12 bg-red-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja excluir o servidor{' '}
                <span className="font-medium text-white">{servidorToDelete.nome}</span>?
              </p>
              <p className="text-xs text-gray-500">
                Clientes vinculados ficarão sem servidor. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setServidorToDelete(null)}
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

      {modal && (
        <RoveModalOverlay>
          <div className="plural-modal-panel">
            <div className="border-b border-netflix-border/80 shrink-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">
                    {modal === 'new' ? 'Novo servidor' : 'Editar servidor'}
                  </h3>
                  <div className="h-0.5 w-10 bg-primary-500 rounded-full mt-2" />
                </div>
                <div className="w-32 shrink-0 sm:w-36">
                  <RoveFormLabel required>Estado</RoveFormLabel>
                  <RoveSelect
                    compact
                    required
                    value={form.status || 'online'}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="online">Online</option>
                    <option value="instável">Instável</option>
                    <option value="offline">Offline</option>
                  </RoveSelect>
                </div>
              </div>
            </div>

            <div className="plural-modal-body space-y-3">
              <p className="text-[10px] text-gray-500 pb-0.5">
                Campos com <span className="text-primary-400">*</span> são obrigatórios.
              </p>

              <div>
                <RoveFormLabel required>Nome</RoveFormLabel>
                <input
                  type="text"
                  required
                  value={form.nome || ''}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Servidor 1"
                  className={ROVE_FORM_INPUT_SM}
                />
              </div>

              <div className="border-t border-netflix-border/60 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2.5">
                  Tipo & ligação
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <RoveFormLabel required>Tipo</RoveFormLabel>
                    <RoveSelect
                      compact
                      required
                      value={form.tipo || 'principal'}
                      onChange={(e) => {
                        const tipo = e.target.value
                        setForm((f) => ({
                          ...f,
                          tipo,
                          servidorId: tipo === 'secundario' ? f.servidorId : null,
                        }))
                      }}
                    >
                      <option value="principal">Principal</option>
                      <option value="secundario">Secundário</option>
                    </RoveSelect>
                  </div>
                  <div>
                    <RoveFormLabel required={form.tipo === 'secundario'}>Servidor primário</RoveFormLabel>
                    {form.tipo === 'secundario' ? (
                      <RoveSelect
                        compact
                        required
                        value={form.servidorId ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            servidorId: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                      >
                        <option value="">Selecione o primário</option>
                        {principais.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome}
                          </option>
                        ))}
                      </RoveSelect>
                    ) : (
                      <div className={ROVE_FORM_LOCKED_SM}>
                        <span className="text-gray-400">Apenas no Secundário</span>
                        <RoveLockedBadge label="Principal" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-netflix-border/60 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2.5">Pagamento</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <RoveFormLabel>Mensalidade (kz)</RoveFormLabel>
                    {form.tipo === 'principal' ? (
                      <RoveMensalidadeInput
                        compact
                        value={form.mensalidade ?? null}
                        onChange={(mensalidade) => setForm((f) => ({ ...f, mensalidade }))}
                        placeholder="Definir mensalidade"
                        title="Valor mensal do servidor em kz"
                      />
                    ) : (
                      <div className={ROVE_FORM_LOCKED_SM}>
                        <span className="font-semibold tabular-nums text-primary-50">
                          {form.mensalidade != null
                            ? `${Number(form.mensalidade).toLocaleString('pt-PT')} kz`
                            : '—'}
                        </span>
                        <RoveLockedBadge label="Principal" />
                      </div>
                    )}
                  </div>
                  <div>
                    <RoveFormLabel>Data de pagamento</RoveFormLabel>
                    {form.tipo === 'principal' ? (
                      <RoveDatePicker
                        compact
                        value={form.dataPagamento ? String(form.dataPagamento).slice(0, 10) : ''}
                        onChange={(dataPagamento) =>
                          setForm((f) => ({ ...f, dataPagamento: dataPagamento || null }))
                        }
                        placeholder="Selecionar data"
                        title="Data do próximo pagamento"
                      />
                    ) : (
                      <div className={ROVE_FORM_LOCKED_SM}>
                        <span className="font-medium text-primary-50">
                          {form.dataPagamento
                            ? new Date(String(form.dataPagamento).slice(0, 10)).toLocaleDateString('pt-PT')
                            : '—'}
                        </span>
                        <RoveLockedBadge label="Principal" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 pt-2 border-t border-netflix-border/80 shrink-0">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="py-1.5 px-3 border border-netflix-border rounded-md text-xs font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                className="flex-1 py-1.5 px-3 bg-white text-black rounded-md text-xs font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-900/30"
              >
                Guardar
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}
    </motion.div>
  )
}
