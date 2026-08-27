import { useEffect, useMemo, useState } from 'react'
import { RoveModalOverlay } from '../components/RoveModalOverlay'
import { motion } from 'framer-motion'
import { Plus, Edit2, Trash2, LayoutGrid, AlertTriangle, CheckCircle, Eye, EyeOff, RefreshCw, Search } from 'lucide-react'
import { RoveDatePicker } from '../components/RoveDatePicker'
import { RoveSelect } from '../components/RoveSelect'
import { ROVE_FORM_INPUT_SM, RoveFormLabel } from '../components/roveFormUi'
import { api } from '../api/client'
import { useAlert } from '../contexts/AlertContext'
import { TablePagination, ROWS_PER_PAGE } from '../components/TablePagination'

interface Sala {
  id: number
  nome: string
  email: string | null
  senha: string | null
  observacoes: string | null
  dataFim: string | null
  status: string
  totalClientes: number
}

export default function Salas() {
  const { showError, showWarning, showInfo } = useAlert()
  const [list, setList] = useState<Sala[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)
  const [salaSuspender, setSalaSuspender] = useState<Sala | null>(null)
  const [salaAtivar, setSalaAtivar] = useState<Sala | null>(null)
  const [salaToRenovar, setSalaToRenovar] = useState<Sala | null>(null)
  const [salaToDelete, setSalaToDelete] = useState<Sala | null>(null)
  const [showSenha, setShowSenha] = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const [filter, setFilter] = useState({ status: '', vencendo: '' })
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [form, setForm] = useState<Partial<Sala>>({ nome: '', email: '', senha: '', observacoes: '', dataFim: '' })

  function daysUntilSala(dateStr: string | null): number | null {
    if (!dateStr) return null
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  }

  const filteredList = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase()
    return list.filter((s) => {
      if (filter.status && (s.status || 'ativo') !== filter.status) return false
      const days = daysUntilSala(s.dataFim)
      if (filter.vencendo === 'hoje' && (days !== 0 || (s.status || 'ativo') !== 'ativo')) return false
      if (filter.vencendo === '3dias' && (days === null || days < 0 || days > 3 || (s.status || 'ativo') !== 'ativo')) return false
      if (filter.vencendo === '7dias' && (days === null || days < 0 || days > 7 || (s.status || 'ativo') !== 'ativo')) return false
      if (filter.vencendo === 'vencidas' && !(days !== null && days < 0 && (s.status || 'ativo') === 'ativo')) return false
      if (!q) return true
      const hay = [s.nome, s.email, s.observacoes].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [list, filter, searchDebounced])

  const totalTablePages = Math.max(1, Math.ceil(filteredList.length / ROWS_PER_PAGE))
  const tablePageClamped = Math.min(tablePage, totalTablePages)
  const pagedList = filteredList.slice((tablePageClamped - 1) * ROWS_PER_PAGE, tablePageClamped * ROWS_PER_PAGE)

  function load() {
    setLoading(true)
    api
      .get<Sala[]>('/api/salas')
      .then((data) => setList(Array.isArray(data) ? data : []))
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

  useEffect(() => {
    setTablePage(1)
  }, [filter, searchDebounced])

  async function save() {
    if (!form.nome || !form.nome.trim()) {
      showWarning('Nome da sala é obrigatório.')
      return
    }
    try {
      if (modal === 'new') {
        await api.post('/api/salas', {
          nome: form.nome.trim(),
          email: form.email?.trim() || null,
          senha: form.senha || null,
          observacoes: form.observacoes?.trim() || null,
          dataFim: form.dataFim || undefined,
        })
      } else if (form.id) {
        await api.patch(`/api/salas/${form.id}`, {
          nome: form.nome.trim(),
          email: form.email?.trim() || null,
          senha: form.senha || null,
          observacoes: form.observacoes?.trim() || null,
          dataFim: form.dataFim || null,
          status: form.status ?? 'ativo',
        })
      }
      setModal(null)
      setShowSenha(false)
      setForm({ nome: '', email: '', senha: '', observacoes: '', dataFim: '' })
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao guardar')
    }
  }

  async function confirmarSuspender() {
    if (!salaSuspender) return
    try {
      await api.post(`/api/salas/${salaSuspender.id}/suspender`, {})
      setSalaSuspender(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function confirmarAtivar() {
    if (!salaAtivar) return
    try {
      await api.post(`/api/salas/${salaAtivar.id}/ativar`, {})
      setSalaAtivar(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function confirmarExcluir() {
    if (!salaToDelete) return
    try {
      await api.delete(`/api/salas/${salaToDelete.id}`)
      setSalaToDelete(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function confirmarRenovar() {
    if (!salaToRenovar) return
    try {
      await api.post(`/api/salas/${salaToRenovar.id}/pagar-mes`, {})
      setSalaToRenovar(null)
      showInfo(`Sala "${salaToRenovar.nome}" renovada por mais 1 mês.`)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao renovar sala')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            Salas Netflix
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Contas (salas) do Plano Room em que os clientes estão</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ nome: '', email: '', senha: '', observacoes: '', dataFim: '' })
            setShowSenha(false)
            setModal('new')
          }}
          className="flex items-center gap-2 py-2 px-4 bg-white text-black rounded-md hover:bg-primary-700 text-sm font-medium shadow-lg shadow-primary-900/30"
        >
          <Plus className="w-4 h-4" />
          Nova sala
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-4 rounded-md bg-netflix-card/60 border border-netflix-border/80">
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
            <option value="suspenso">Suspenso</option>
          </RoveSelect>
        </div>
        <div className="w-44 min-w-[11rem]">
          <RoveSelect
            compact
            value={filter.vencendo}
            onChange={(e) => setFilter((f) => ({ ...f, vencendo: e.target.value }))}
            placeholder="Qualquer validade"
            title="Filtrar por validade"
          >
            <option value="">Qualquer validade</option>
            <option value="hoje">Vence hoje</option>
            <option value="3dias">Vence em 3 dias</option>
            <option value="7dias">Vence em 7 dias</option>
            <option value="vencidas">Vencidas</option>
          </RoveSelect>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Nome, email, observações..."
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

      <div className="plural-table-shell">
        {loading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="plural-table">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-medium w-12 text-center">Nº</th>
                  <th className="px-4 py-3 font-medium">Sala</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Senha</th>
                  <th className="px-4 py-3 font-medium text-center">Clientes</th>
                  <th className="px-4 py-3 font-medium">Data fim</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Observações</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-netflix-border/80 text-gray-200">
                {pagedList.map((s, idx) => {
                  const days = daysUntilSala(s.dataFim)
                  const salaVencendo = days !== null && days >= 0 && days <= 7
                  const salaUrgente = days !== null && days >= 0 && days <= 3
                  const salaVencida = days !== null && days < 0 && (s.status || 'ativo') === 'ativo'
                  return (
                  <tr
                    key={s.id}
                    className={`hover:bg-netflix-hover/80 transition-colors ${
                      salaUrgente ? 'bg-amber-900/25' : salaVencendo ? 'bg-amber-900/15' : salaVencida ? 'bg-red-900/15' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center text-gray-400 text-sm">{(tablePageClamped - 1) * ROWS_PER_PAGE + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-sky-600/20 text-sky-400">
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-white">{s.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 max-w-[10rem] truncate" title={s.email || undefined}>
                      {s.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                      {s.senha ? '••••••••' : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-white">{s.totalClientes}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${salaUrgente ? 'text-amber-300 font-semibold' : salaVencendo ? 'text-amber-400 font-medium' : salaVencida ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                        {s.dataFim ? new Date(s.dataFim).toLocaleDateString('pt-BR') : '—'}
                        {days !== null && (s.status || 'ativo') === 'ativo' && (
                          <span className="text-gray-500 text-xs ml-1">
                            ({days > 0 ? `vence em ${days}d` : days === 0 ? 'vence hoje' : 'vencido'})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          (s.status || 'ativo') === 'ativo' ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/50 text-amber-300'
                        }`}
                      >
                        {(s.status || 'ativo') === 'ativo' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 max-w-[12rem] truncate" title={s.observacoes || undefined}>
                      {s.observacoes || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSalaToRenovar(s)}
                          title="Renovar (+1 mês)"
                          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-emerald-500/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 hover:text-white shadow-sm shadow-emerald-900/40 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        {(s.status || 'ativo') === 'ativo' ? (
                          <button
                            type="button"
                            onClick={() => setSalaSuspender(s)}
                            title="Suspender"
                            className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/30 hover:text-white shadow-sm shadow-amber-900/40 transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSalaAtivar(s)}
                            title="Ativar"
                            className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-green-500/50 bg-green-500/10 text-green-300 hover:bg-green-500/30 hover:text-white shadow-sm shadow-green-900/40 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setForm({
                              id: s.id,
                              nome: s.nome,
                              email: s.email ?? '',
                              senha: s.senha ?? '',
                              observacoes: s.observacoes ?? '',
                              dataFim: s.dataFim ? String(s.dataFim).slice(0, 10) : '',
                              status: s.status,
                            })
                            setShowSenha(false)
                            setModal('edit')
                          }}
                          title="Editar"
                          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-primary-500/50 bg-primary-500/10 text-primary-300 hover:bg-primary-500/30 hover:text-white hover:border-primary-400 shadow-sm shadow-primary-900/40 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSalaToDelete(s)}
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
          <TablePagination totalItems={filteredList.length} currentPage={tablePageClamped} onPageChange={setTablePage} />
          </>
        )}
        {!loading && filteredList.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            {list.length === 0
              ? 'Nenhuma sala. Crie uma para atribuir a clientes do Plano Room.'
              : 'Nenhuma sala corresponde aos filtros.'}
          </div>
        )}
      </div>

      {salaToDelete && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-red-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-red-500/20 text-red-400 ring-1 ring-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Excluir sala</h3>
                  <div className="h-1 w-12 bg-red-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja excluir a sala{' '}
                <span className="font-medium text-white">{salaToDelete.nome}</span>?
              </p>
              <p className="text-xs text-gray-500">
                Os clientes vinculados ficarão sem sala atribuída. Esta ação não pode ser desfeita.
              </p>
              {salaToDelete.totalClientes > 0 && (
                <p className="text-xs text-amber-400/90">
                  Atenção: <span className="font-semibold">{salaToDelete.totalClientes}</span>{' '}
                  {salaToDelete.totalClientes === 1 ? 'cliente está' : 'clientes estão'} associados a esta sala.
                </p>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setSalaToDelete(null)}
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

      {salaToRenovar && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-emerald-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Renovar sala</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    <span className="text-white font-medium">{salaToRenovar.nome}</span>
                  </p>
                  <div className="h-1 w-12 bg-emerald-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja renovar esta sala por mais{' '}
                <span className="font-medium text-white">1 mês</span>?
              </p>
              <p className="text-xs text-gray-500">
                A data fim da sala será prolongada
                {salaToRenovar.dataFim && (
                  <>
                    {' '}
                    (atual:{' '}
                    <span className="text-gray-400">
                      {new Date(salaToRenovar.dataFim).toLocaleDateString('pt-PT')}
                    </span>
                    )
                  </>
                )}
                . Os clientes do Plano Room nesta sala terão a mesma data fim atualizada.
              </p>
              {salaToRenovar.totalClientes > 0 && (
                <p className="text-xs text-gray-500">
                  Clientes afetados:{' '}
                  <span className="font-medium text-gray-300">{salaToRenovar.totalClientes}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setSalaToRenovar(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRenovar}
                className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30"
              >
                Renovar
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal confirmar suspender sala */}
      {salaSuspender && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-amber-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Suspender sala</h3>
                  <div className="h-1 w-12 bg-amber-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja suspender <span className="font-medium text-white">{salaSuspender.nome}</span>?
              </p>
              <p className="text-xs text-gray-500">A sala ficará com estado &quot;Suspenso&quot; e pode ser ativada novamente a qualquer momento.</p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setSalaSuspender(null)}
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

      {/* Modal confirmar ativar sala */}
      {salaAtivar && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-green-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-green-500/20 text-green-400 ring-1 ring-green-500/30">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Ativar sala</h3>
                  <div className="h-1 w-12 bg-green-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja ativar <span className="font-medium text-white">{salaAtivar.nome}</span>?
              </p>
              <p className="text-xs text-gray-500">A sala ficará com estado &quot;Ativo&quot; e poderá ser atribuída a clientes.</p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setSalaAtivar(null)}
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

      {modal && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-netflix-border max-w-lg w-full">
            <div className="border-b border-netflix-border/80 shrink-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">
                    {modal === 'new' ? 'Nova sala' : 'Editar sala'}
                  </h3>
                  <div className="h-0.5 w-10 bg-primary-500 rounded-full mt-2" />
                </div>
                {modal === 'edit' && (
                  <div className="w-32 shrink-0 sm:w-36">
                    <RoveFormLabel required>Estado</RoveFormLabel>
                    <RoveSelect
                      compact
                      required
                      value={form.status || 'ativo'}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="suspenso">Suspenso</option>
                    </RoveSelect>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
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
                  placeholder="Ex: Sala 1, Conta A"
                  className={ROVE_FORM_INPUT_SM}
                />
              </div>

              <div className="border-t border-netflix-border/60 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2.5">
                  Conta & acesso
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <RoveFormLabel>Email</RoveFormLabel>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                      className={ROVE_FORM_INPUT_SM}
                    />
                  </div>
                  <div>
                    <RoveFormLabel>Senha</RoveFormLabel>
                    <div className="relative">
                      <input
                        type={showSenha ? 'text' : 'password'}
                        value={form.senha || ''}
                        onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                        placeholder="••••••••"
                        autoComplete={modal === 'new' ? 'new-password' : 'current-password'}
                        className={`${ROVE_FORM_INPUT_SM} pr-9`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSenha((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                        title={showSenha ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showSenha ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-netflix-border/60 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2.5">
                  Validade & notas
                </p>
                <div className="space-y-3">
                  <div>
                    <RoveFormLabel>Data fim (partilhada pelos 4 utilizadores)</RoveFormLabel>
                    <RoveDatePicker
                      compact
                      value={form.dataFim ? String(form.dataFim).slice(0, 10) : ''}
                      onChange={(dataFim) => setForm((f) => ({ ...f, dataFim }))}
                      placeholder="Selecionar data"
                      title="Data de validade da sala"
                    />
                  </div>
                  <div>
                    <RoveFormLabel>Observações</RoveFormLabel>
                    <textarea
                      value={form.observacoes || ''}
                      onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                      placeholder="Opcional"
                      rows={2}
                      className={`${ROVE_FORM_INPUT_SM} min-h-[4.5rem] resize-none`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 pt-2 border-t border-netflix-border/80 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModal(null)
                  setShowSenha(false)
                }}
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
