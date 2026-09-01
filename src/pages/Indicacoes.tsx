import { useEffect, useMemo, useState } from 'react'
import { RoveModalOverlay } from '../components/RoveModalOverlay'
import { motion } from 'framer-motion'
import { Plus, Gift, Check, Edit2, Trash2, RotateCcw, Search, RefreshCw } from 'lucide-react'
import { RoveSelect } from '../components/RoveSelect'
import { WhatsappAoInput } from '../components/WhatsappAoInput'
import { RoveWhatsappLink } from '../components/RoveWhatsappLink'
import {
  ROVE_FORM_INPUT_SM,
  ROVE_FORM_LOCKED_SM,
  RoveFormLabel,
  RoveLockedBadge,
} from '../components/roveFormUi'
import { emptyWhatsapp, formatWhatsapp, isWhatsappValid, nationalDigitsFromWhatsapp } from '../utils/whatsapp'
import { api } from '../api/client'
import { useAlert } from '../contexts/AlertContext'
import { TablePagination, ROWS_PER_PAGE } from '../components/TablePagination'
import { PluralTableShell } from '../components/PluralTableShell'

const emptyForm = () => ({
  id: 0,
  indicadorRoveId: '',
  indicadoNome: '',
  indicadoWhatsapp: emptyWhatsapp(),
  status: 'pendente',
})

interface Indicacao {
  id: number
  indicadorId: number
  indicadoNome: string
  indicadoWhatsapp: string
  status: string
  createdAt: string
  indicador: { id: number; roveId?: string | null; nome: string; whatsapp: string }
}

interface Client {
  id: number
  roveId?: string | null
  nome: string
}

export default function Indicacoes() {
  const { showError, showWarning, showSuccess } = useAlert()
  const [list, setList] = useState<Indicacao[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '' })
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)
  const [indicacaoToDelete, setIndicacaoToDelete] = useState<Indicacao | null>(null)
  const [indicacaoToConfirmar, setIndicacaoToConfirmar] = useState<Indicacao | null>(null)
  const [indicacaoToReverter, setIndicacaoToReverter] = useState<Indicacao | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [tablePage, setTablePage] = useState(1)

  function load() {
    setLoading(true)
    api
      .get<Indicacao[]>('/api/indicacoes')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    api.get<Client[]>('/api/clients').then((c) => setClients(c)).catch(() => setClients([]))
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setTablePage(1)
  }, [filter, searchDebounced])

  const filtered = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase()
    return list.filter((i) => {
      if (filter.status && i.status !== filter.status) return false
      if (!q) return true
      const hay = [
        i.indicadoNome,
        i.indicadoWhatsapp,
        i.indicador.nome,
        i.indicador.roveId,
        i.indicador.whatsapp,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [list, filter, searchDebounced])

  const totalTablePages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const tablePageClamped = Math.min(tablePage, totalTablePages)
  const pagedIndicacoes = filtered.slice((tablePageClamped - 1) * ROWS_PER_PAGE, tablePageClamped * ROWS_PER_PAGE)

  const stats = {
    total: filtered.length,
    pendentes: filtered.filter((i) => i.status === 'pendente').length,
    confirmadas: filtered.filter((i) => i.status === 'confirmada').length,
  }

  async function save() {
    const nome = (form.indicadoNome ?? '').trim()
    const whatsapp = (form.indicadoWhatsapp ?? '').trim()
    const isEdit = !!form.id
    const whatsappPreenchido = nationalDigitsFromWhatsapp(whatsapp).length > 0
    if (!isEdit && !form.indicadorRoveId) {
      showWarning('Selecione o cliente que indicou.')
      return
    }
    if (!nome) {
      showWarning('Nome do indicado é obrigatório.')
      return
    }
    if (whatsappPreenchido && !isWhatsappValid(whatsapp)) {
      showWarning('WhatsApp inválido (+244, +351 ou +55 com número completo).')
      return
    }
    try {
      if (isEdit) {
        await api.patch(`/api/indicacoes/${form.id}`, {
          indicadoNome: nome,
          indicadoWhatsapp: whatsappPreenchido ? whatsapp : '',
          status: form.status || 'pendente',
        })
        showSuccess(`Indicação de «${nome}» actualizada.`)
      } else {
        await api.post('/api/indicacoes', {
          indicadorRoveId: form.indicadorRoveId,
          indicadoNome: nome,
          indicadoWhatsapp: whatsappPreenchido ? whatsapp : undefined,
        })
        showSuccess(`Indicação de «${nome}» registada.`)
      }
      setModal(null)
      setForm(emptyForm())
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao guardar')
    }
  }

  async function confirmarAprovar() {
    if (!indicacaoToConfirmar) return
    try {
      await api.patch(`/api/indicacoes/${indicacaoToConfirmar.id}`, { status: 'confirmada' })
      showSuccess(`Indicação de «${indicacaoToConfirmar.indicadoNome}» confirmada.`)
      setIndicacaoToConfirmar(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao confirmar indicação')
    }
  }

  async function confirmarReverter() {
    if (!indicacaoToReverter) return
    try {
      await api.patch(`/api/indicacoes/${indicacaoToReverter.id}`, { status: 'pendente' })
      showSuccess(`Indicação de «${indicacaoToReverter.indicadoNome}» reposta como pendente.`)
      setIndicacaoToReverter(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao reverter indicação')
    }
  }

  async function confirmarExcluir() {
    if (!indicacaoToDelete) return
    try {
      await api.delete(`/api/indicacoes/${indicacaoToDelete.id}`)
      showSuccess(`Indicação de «${indicacaoToDelete.indicadoNome}» eliminada.`)
      setIndicacaoToDelete(null)
      load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header com título, descrição, estatísticas e botão */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="plural-page-title flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Indicações
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Gestão de indicações de clientes. Acompanhe quem indicou, quem foi indicado e o estado.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-netflix-panel/80 border border-netflix-border/60 text-gray-300 text-sm">
              <span className="font-semibold text-white">{stats.total}</span> total
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-900/30 border border-amber-700/40 text-amber-300 text-sm">
              <span className="font-semibold">{stats.pendentes}</span> pendentes
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-900/30 border border-green-700/40 text-green-300 text-sm">
              <span className="font-semibold">{stats.confirmadas}</span> confirmadas
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm())
              setModal('new')
            }}
            className="flex items-center gap-2 py-2.5 px-5 bg-white text-black rounded-md hover:bg-primary-700 text-sm font-medium shadow-lg shadow-primary-900/30 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova indicação
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="plural-filter-bar">
        <div className="plural-filter-field">
          <RoveSelect
            compact
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            placeholder="Todos os estados"
            title="Filtrar por estado"
          >
            <option value="">Todos os estados</option>
            <option value="pendente">Pendentes</option>
            <option value="confirmada">Confirmadas</option>
          </RoveSelect>
        </div>
        <div className="plural-filter-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Indicado, indicador, WhatsApp, ID ROVE..."
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

      {/* Tabela */}
      <PluralTableShell>
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            <span className="text-sm">A carregar indicações...</span>
          </div>
        ) : (
          <>
            <table className="plural-table plural-table--cards-md">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 font-medium w-12 text-center">Nº</th>
                  <th className="px-4 py-3.5 font-medium">Indicado</th>
                  <th className="px-4 py-3.5 font-medium">WhatsApp indicado</th>
                  <th className="px-4 py-3.5 font-medium">Quem indicou</th>
                  <th className="px-4 py-3.5 font-medium">Data</th>
                  <th className="px-4 py-3.5 font-medium">Estado</th>
                  <th className="px-4 py-3.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-netflix-border/80 text-gray-200">
                {pagedIndicacoes.map((i, idx) => (
                  <tr key={i.id} className="hover:bg-netflix-hover/80 transition-colors">
                    <td className="plural-table-cell-num px-4 py-3 text-center text-gray-400 text-sm" data-label="Nº">{(tablePageClamped - 1) * ROWS_PER_PAGE + idx + 1}</td>
                    <td className="px-4 py-3" data-label="Indicado">
                      <span className="font-medium text-white">{i.indicadoNome}</span>
                    </td>
                    <td className="px-4 py-3" data-label="WhatsApp indicado">
                      <RoveWhatsappLink value={i.indicadoWhatsapp} />
                    </td>
                    <td className="px-4 py-3" data-label="Quem indicou">
                      <span className="text-gray-200 text-sm">{i.indicador.nome}</span>
                      <span className="text-primary-300 text-xs block">{i.indicador.roveId || 'Sem ID ROVE'}</span>
                      <RoveWhatsappLink value={i.indicador.whatsapp} compact hideWhenEmpty className="mt-0.5" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400" data-label="Data">
                      {new Date(i.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3" data-label="Estado">
                      <span
                        className={`plural-badge ${
                          i.status === 'confirmada'
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-amber-900/50 text-amber-300'
                        }`}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="plural-table-cell-actions px-4 py-3" data-label="Ações">
                      <div className="flex justify-end gap-1">
                        {i.status === 'pendente' && (
                          <button
                            type="button"
                            onClick={() => setIndicacaoToConfirmar(i)}
                            title="Confirmar indicação"
                            className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-primary-500/60 bg-primary-500/10 text-primary-300 hover:bg-primary-500/30 hover:text-white shadow-sm shadow-primary-900/40 transition-colors text-xs font-medium"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {i.status === 'confirmada' && (
                          <button
                            type="button"
                            onClick={() => setIndicacaoToReverter(i)}
                            title="Reverter para pendente"
                            className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/30 hover:text-white shadow-sm shadow-amber-900/40 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setForm({
                              id: i.id,
                              indicadorRoveId: i.indicador.roveId ?? '',
                              indicadoNome: i.indicadoNome,
                              indicadoWhatsapp: i.indicadoWhatsapp
                                ? formatWhatsapp(i.indicadoWhatsapp)
                                : emptyWhatsapp(),
                              status: i.status,
                            })
                            setModal('edit')
                          }}
                          title="Editar"
                          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-primary-500/50 bg-primary-500/10 text-primary-300 hover:bg-primary-500/30 hover:text-white shadow-sm shadow-primary-900/40 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIndicacaoToDelete(i)}
                          title="Excluir"
                          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-red-500/60 bg-red-500/15 text-red-300 hover:bg-red-500/30 hover:text-white shadow-sm shadow-red-900/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          <TablePagination totalItems={filtered.length} currentPage={tablePageClamped} onPageChange={setTablePage} />
          </>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <Gift className="w-10 h-10 text-gray-500" />
            Nenhuma indicação encontrada.
          </div>
        )}
      </PluralTableShell>

      {/* Modal confirmar aprovar indicação */}
      {indicacaoToConfirmar && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-green-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-green-500/20 text-green-400 ring-1 ring-green-500/30">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Confirmar indicação</h3>
                  <div className="h-1 w-12 bg-green-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja confirmar a indicação de{' '}
                <span className="font-medium text-white">{indicacaoToConfirmar.indicadoNome}</span>?
              </p>
              <p className="text-xs text-gray-500">
                Indicado por <span className="text-gray-400">{indicacaoToConfirmar.indicador.nome}</span>
                {indicacaoToConfirmar.indicador.roveId ? (
                  <span className="text-primary-300"> · {indicacaoToConfirmar.indicador.roveId}</span>
                ) : null}
                . O estado passará a <span className="text-green-400 font-medium">confirmada</span>.
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setIndicacaoToConfirmar(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAprovar}
                className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-900/30"
              >
                Confirmar
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal confirmar reverter para pendente */}
      {indicacaoToReverter && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-amber-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Reverter para pendente</h3>
                  <div className="h-1 w-12 bg-amber-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja reverter a indicação de{' '}
                <span className="font-medium text-white">{indicacaoToReverter.indicadoNome}</span> para pendente?
              </p>
              <p className="text-xs text-gray-500">
                O estado passará de <span className="text-green-400 font-medium">confirmada</span> para{' '}
                <span className="text-amber-400 font-medium">pendente</span>. O contador de indicações do cliente
                indicador será atualizado.
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setIndicacaoToReverter(null)}
                className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarReverter}
                className="flex-1 py-2.5 px-4 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors shadow-lg shadow-amber-900/30"
              >
                Reverter
              </button>
            </div>
          </div>
        </RoveModalOverlay>
      )}

      {/* Modal confirmar excluir indicação */}
      {indicacaoToDelete && (
        <RoveModalOverlay>
          <div className="bg-netflix-card rounded-md shadow-2xl border border-red-500/40 max-w-sm w-full overflow-hidden">
            <div className="p-6 border-b border-netflix-border/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-red-500/20 text-red-400 ring-1 ring-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Excluir indicação</h3>
                  <div className="h-1 w-12 bg-red-500 rounded-full mt-2" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-300">
                Tem a certeza que deseja excluir a indicação de <span className="font-medium text-white">{indicacaoToDelete.indicadoNome}</span>?
              </p>
              <p className="text-xs text-gray-500">O contador de indicações do cliente que indicou será atualizado.</p>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
              <button
                type="button"
                onClick={() => setIndicacaoToDelete(null)}
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

      {/* Modal nova / editar indicação */}
      {modal && (
        <RoveModalOverlay>
          <div className="plural-modal-panel">
            <div className="border-b border-netflix-border/80 shrink-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">
                    {modal === 'edit' ? 'Editar indicação' : 'Nova indicação'}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {modal === 'edit'
                      ? 'Altere os dados do indicado ou o estado.'
                      : 'Registe um novo cliente indicado.'}
                  </p>
                  <div className="h-0.5 w-10 bg-primary-500 rounded-full mt-2" />
                </div>
                {modal === 'edit' && (
                  <div className="w-32 shrink-0 sm:w-36">
                    <RoveFormLabel required>Estado</RoveFormLabel>
                    <RoveSelect
                      compact
                      required
                      value={form.status || 'pendente'}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="confirmada">Confirmada</option>
                    </RoveSelect>
                  </div>
                )}
              </div>
            </div>

            <div className="plural-modal-body space-y-3">
              <p className="text-[10px] text-gray-500 pb-0.5">
                Campos com <span className="text-primary-400">*</span> são obrigatórios.
              </p>

              <div className="border-t border-netflix-border/60 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2.5">
                  Quem indicou
                </p>
                {modal === 'edit' ? (
                  <div>
                    <RoveFormLabel>Cliente (ID ROVE)</RoveFormLabel>
                    <div className={ROVE_FORM_LOCKED_SM}>
                      <span className="min-w-0 truncate font-medium">
                        {clients.find((c) => c.roveId === form.indicadorRoveId)?.nome ?? '—'}
                        {form.indicadorRoveId ? (
                          <span className="text-primary-300"> · {form.indicadorRoveId}</span>
                        ) : null}
                      </span>
                      <RoveLockedBadge label="Fixo" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <RoveFormLabel required>Cliente (ID ROVE)</RoveFormLabel>
                    <RoveSelect
                      compact
                      required
                      value={form.indicadorRoveId}
                      onChange={(e) => setForm((f) => ({ ...f, indicadorRoveId: e.target.value }))}
                    >
                      <option value="">Selecione o cliente pelo ID ROVE</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.roveId ?? ''} disabled={!c.roveId}>
                          {c.roveId ? `${c.roveId} - ${c.nome}` : `${c.nome} (sem ID ROVE)`}
                        </option>
                      ))}
                    </RoveSelect>
                  </div>
                )}
              </div>

              <div className="border-t border-netflix-border/60 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2.5">
                  Dados do indicado
                </p>
                <div className="space-y-3">
                  <div>
                    <RoveFormLabel required>Nome</RoveFormLabel>
                    <input
                      type="text"
                      required
                      value={form.indicadoNome}
                      onChange={(e) => setForm((f) => ({ ...f, indicadoNome: e.target.value }))}
                      className={ROVE_FORM_INPUT_SM}
                      placeholder="Nome da pessoa indicada"
                    />
                  </div>
                  <div>
                    <RoveFormLabel>WhatsApp</RoveFormLabel>
                    <WhatsappAoInput
                      compact
                      value={form.indicadoWhatsapp}
                      onChange={(indicadoWhatsapp) => setForm((f) => ({ ...f, indicadoWhatsapp }))}
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
                  setForm(emptyForm())
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
