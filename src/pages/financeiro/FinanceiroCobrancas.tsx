import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, Power, RefreshCw, Wallet } from 'lucide-react'
import { api } from '../../api/client'
import { useAlert } from '../../contexts/AlertContext'
import { RoveSelect } from '../../components/RoveSelect'
import { RoveWhatsappLink } from '../../components/RoveWhatsappLink'
import { TablePagination, ROWS_PER_PAGE } from '../../components/TablePagination'
import { mesesPagamentoLabel, RoveFormLabel } from '../../components/roveFormUi'
import { FinanceiroActionBtn } from './FinanceiroActionBtn'
import { FinanceiroConfirmModal } from './FinanceiroConfirmModal'
import type { ClienteFinanceiro, CobrancaFiltro, ServicoView } from './types'

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

export function FinanceiroCobrancas({
  servicoView,
  initialFiltro,
  servidorId,
  onChanged,
}: {
  servicoView: ServicoView
  initialFiltro?: CobrancaFiltro
  servidorId?: number | null
  onChanged?: () => void
}) {
  const { showError, showInfo } = useAlert()
  const [filtro, setFiltro] = useState<CobrancaFiltro>(initialFiltro ?? 'vencidos')
  const [clients, setClients] = useState<ClienteFinanceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [tablePage, setTablePage] = useState(1)
  const [clientRenovar, setClientRenovar] = useState<ClienteFinanceiro | null>(null)
  const [clientMarcarPago, setClientMarcarPago] = useState<ClienteFinanceiro | null>(null)
  const [clientAtivar, setClientAtivar] = useState<ClienteFinanceiro | null>(null)
  const [renovarMeses, setRenovarMeses] = useState<number | ''>('')
  const [actionId, setActionId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialFiltro) setFiltro(initialFiltro)
  }, [initialFiltro])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (servicoView === 'iptv') params.set('servico', 'iptv')
    else if (servicoView === 'netflix') params.set('servico', 'netflix')
    if (servidorId) params.set('servidorId', String(servidorId))
    if (filtro === 'vencidos') params.set('status', 'vencido')
    else if (filtro === 'hoje') params.set('vencendo', 'hoje')
    else if (filtro === '7dias') params.set('vencendo', '7dias')
    else if (filtro === 'ativos') params.set('status', 'ativo')
    return api
      .get<ClienteFinanceiro[]>(`/api/clients?${params}`)
      .then((rows) => setClients(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        showError(e instanceof Error ? e.message : 'Erro ao carregar cobranças')
        setClients([])
      })
      .finally(() => setLoading(false))
  }, [filtro, servicoView, servidorId, showError])

  useEffect(() => {
    setTablePage(1)
    load()
  }, [load])

  const totalValor = useMemo(() => clients.reduce((s, c) => s + Number(c.valor), 0), [clients])
  const totalPages = Math.max(1, Math.ceil(clients.length / ROWS_PER_PAGE))
  const page = Math.min(tablePage, totalPages)
  const paged = clients.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  async function confirmarRenovar() {
    if (!clientRenovar || renovarMeses === '') return
    const meses = Math.min(24, Math.max(1, renovarMeses))
    setSubmitting(true)
    setActionId(clientRenovar.id)
    try {
      if (clientRenovar.status === 'vencido') {
        await api.post(`/api/clients/${clientRenovar.id}/ativar`)
      }
      await api.post(`/api/clients/${clientRenovar.id}/renovar`, { meses })
      showInfo(`Renovação de ${meses} mês(es) registada para "${clientRenovar.nome}".`)
      setClientRenovar(null)
      setRenovarMeses('')
      await load()
      onChanged?.()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao renovar cliente')
    } finally {
      setSubmitting(false)
      setActionId(null)
    }
  }

  async function confirmarMarcarPago() {
    if (!clientMarcarPago) return
    setSubmitting(true)
    setActionId(clientMarcarPago.id)
    try {
      await api.post(`/api/clients/${clientMarcarPago.id}/marcar-pago`, {})
      showInfo(`Pagamento registado para "${clientMarcarPago.nome}".`)
      setClientMarcarPago(null)
      await load()
      onChanged?.()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao registar pagamento')
    } finally {
      setSubmitting(false)
      setActionId(null)
    }
  }

  async function confirmarAtivar() {
    if (!clientAtivar) return
    setSubmitting(true)
    setActionId(clientAtivar.id)
    try {
      await api.post(`/api/clients/${clientAtivar.id}/ativar`)
      showInfo(`Cliente "${clientAtivar.nome}" reativado.`)
      setClientAtivar(null)
      await load()
      onChanged?.()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao ativar cliente')
    } finally {
      setSubmitting(false)
      setActionId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-netflix-border/80 bg-netflix-card/80 p-5">
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-400" />
          Cobranças de clientes
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Renove assinaturas, registe pagamentos ou reative clientes vencidos.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48 min-w-[11rem]">
            <RoveSelect
              compact
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as CobrancaFiltro)}
              title="Filtrar cobranças"
            >
              <option value="vencidos">Em dívida (vencidos)</option>
              <option value="hoje">Vencem hoje</option>
              <option value="7dias">Vencem em 7 dias</option>
              <option value="ativos">Ativos</option>
              <option value="todos">Todos</option>
            </RoveSelect>
          </div>
          {servidorId != null && (
            <span className="text-xs text-blue-300 bg-blue-900/30 border border-blue-500/30 px-2 py-1 rounded-md">
              Filtrado por servidor
            </span>
          )}
          <span className="text-sm text-gray-400 ml-auto">
            {clients.length} cliente(s) · <strong className="text-white">{totalValor.toFixed(2)} kz</strong>
          </span>
        </div>
      </div>

      <div className="plural-table-shell">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">A carregar...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhum cliente neste filtro.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="plural-table">
                <thead>
                  <tr className="text-gray-400 border-b border-netflix-border">
                    <th className="text-left py-2 px-3">Cliente</th>
                    <th className="text-left py-2 px-3">Contacto</th>
                    <th className="text-left py-2 px-3">Serviço</th>
                    <th className="text-right py-2 px-3">Valor</th>
                    <th className="text-left py-2 px-3">Vencimento</th>
                    <th className="text-left py-2 px-3">Estado</th>
                    <th className="text-right py-2 px-3 min-w-[220px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => {
                    const days = daysUntil(c.dataFim)
                    const busy = actionId === c.id
                    return (
                      <tr key={c.id} className="border-b border-netflix-border/60">
                        <td className="py-2 px-3 text-white">{c.nome}</td>
                        <td className="py-2 px-3">
                          <RoveWhatsappLink value={c.whatsapp} compact />
                        </td>
                        <td className="py-2 px-3 text-gray-300 capitalize">
                          {c.servico}
                          {c.servico === 'iptv' && c.servidor?.nome && (
                            <span className="block text-xs text-gray-500">{c.servidor.nome}</span>
                          )}
                          {c.servico === 'netflix' && c.sala?.nome && (
                            <span className="block text-xs text-gray-500">{c.sala.nome}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-white">
                          {Number(c.valor).toFixed(2)} kz
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={
                              days < 0 ? 'text-red-400' : days <= 3 ? 'text-amber-300' : 'text-gray-300'
                            }
                          >
                            {new Date(c.dataFim).toLocaleDateString('pt-BR')}
                            <span className="text-xs text-gray-500 ml-1">
                              ({days > 0 ? `${days}d` : days === 0 ? 'hoje' : 'vencido'})
                            </span>
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              c.status === 'ativo'
                                ? 'bg-green-900/50 text-green-300'
                                : 'bg-red-900/50 text-red-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end flex-wrap gap-1.5">
                            {c.status === 'ativo' && (
                              <>
                                <FinanceiroActionBtn
                                  icon={RefreshCw}
                                  label="Renovar"
                                  variant="green"
                                  disabled={busy}
                                  onClick={() => {
                                    setClientRenovar(c)
                                    setRenovarMeses('')
                                  }}
                                />
                                <FinanceiroActionBtn
                                  icon={CheckCircle}
                                  label="Pago"
                                  variant="emerald"
                                  disabled={busy}
                                  onClick={() => setClientMarcarPago(c)}
                                />
                              </>
                            )}
                            {c.status === 'vencido' && (
                              <>
                                <FinanceiroActionBtn
                                  icon={Power}
                                  label="Ativar"
                                  variant="green"
                                  disabled={busy}
                                  onClick={() => setClientAtivar(c)}
                                />
                                <FinanceiroActionBtn
                                  icon={RefreshCw}
                                  label="Renovar"
                                  variant="emerald"
                                  disabled={busy}
                                  onClick={() => {
                                    setClientRenovar(c)
                                    setRenovarMeses('')
                                  }}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination totalItems={clients.length} currentPage={page} onPageChange={setTablePage} />
          </>
        )}
      </div>

      <FinanceiroConfirmModal
        open={!!clientMarcarPago}
        onClose={() => !submitting && setClientMarcarPago(null)}
        onConfirm={confirmarMarcarPago}
        icon={CheckCircle}
        variant="emerald"
        title="Registar pagamento"
        subtitle={
          clientMarcarPago ? (
            <>
              Cliente <span className="text-white font-medium">{clientMarcarPago.nome}</span>
            </>
          ) : undefined
        }
        description={
          clientMarcarPago
            ? `Confirma que recebeu ${Number(clientMarcarPago.valor).toFixed(2)} kz e deseja registar o pagamento? O cliente mantém-se ativo com a mesma data de vencimento.`
            : undefined
        }
        detail="Será enviada uma mensagem WhatsApp de confirmação ao cliente."
        confirmLabel="Registar pagamento"
        loading={submitting}
      />

      <FinanceiroConfirmModal
        open={!!clientAtivar}
        onClose={() => !submitting && setClientAtivar(null)}
        onConfirm={confirmarAtivar}
        icon={Power}
        variant="green"
        title="Reativar cliente"
        subtitle={
          clientAtivar ? (
            <>
              Cliente <span className="text-white font-medium">{clientAtivar.nome}</span>
            </>
          ) : undefined
        }
        description="O cliente passará a estado ativo. O vencimento será definido para o próximo dia 11."
        detail="Será enviada uma mensagem WhatsApp de reativação."
        confirmLabel="Reativar"
        loading={submitting}
      />

      <FinanceiroConfirmModal
        open={!!clientRenovar}
        onClose={() => {
          if (!submitting) {
            setClientRenovar(null)
            setRenovarMeses('')
          }
        }}
        onConfirm={confirmarRenovar}
        icon={RefreshCw}
        variant="green"
        title="Renovar cliente"
        subtitle={
          clientRenovar ? (
            <>
              Cliente <span className="text-white font-medium">{clientRenovar.nome}</span>
              {clientRenovar.status === 'vencido' && (
                <span className="block text-amber-300/90 text-xs mt-1">Será reativado antes da renovação.</span>
              )}
            </>
          ) : undefined
        }
        description="Escolha quantos meses de pagamento atribuir. O vencimento mantém o dia da data atual."
        confirmLabel="Confirmar renovação"
        confirmDisabled={renovarMeses === ''}
        loading={submitting}
        maxWidth="max-w-sm"
      >
        <div>
          <RoveFormLabel required>Meses de pagamento</RoveFormLabel>
          <RoveSelect
            compact
            value={renovarMeses === '' ? '' : String(renovarMeses)}
            onChange={(e) => setRenovarMeses(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Selecione os meses"
          >
            <option value="">Selecione os meses</option>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {mesesPagamentoLabel(n)}
              </option>
            ))}
          </RoveSelect>
        </div>
      </FinanceiroConfirmModal>
    </div>
  )
}
