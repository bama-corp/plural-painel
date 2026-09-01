import { useState } from 'react'
import { AlertTriangle, LayoutGrid, RefreshCw, Server, Zap } from 'lucide-react'
import { FinanceiroActionBtn } from './FinanceiroActionBtn'
import { FinanceiroConfirmModal } from './FinanceiroConfirmModal'
import { api } from '../../api/client'
import { useAlert } from '../../contexts/AlertContext'
import { useAuth } from '../../contexts/AuthContext'
import { RoveSelect } from '../../components/RoveSelect'
import { TablePagination, ROWS_PER_PAGE } from '../../components/TablePagination'
import { PluralTableShell } from '../../components/PluralTableShell'
import { mesesPagamentoLabel, RoveFormLabel } from '../../components/roveFormUi'
import type { SalaFinanceira, ServicoView, ServidorFinanceiro } from './types'

function daysUntilSala(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

export function FinanceiroCustos({
  servicoView,
  salas,
  servidores,
  onReloadSalas,
  onReloadServidores,
  onReloadDashboard,
}: {
  servicoView: ServicoView
  salas: SalaFinanceira[]
  servidores: ServidorFinanceiro[]
  onReloadSalas: () => Promise<void>
  onReloadServidores: () => Promise<void>
  onReloadDashboard?: () => Promise<void>
}) {
  const { showError, showSuccess } = useAlert()
  const { user } = useAuth()
  const canSuspendServidor = user?.role !== 'financeiro'
  const [servidorGestaoPage, setServidorGestaoPage] = useState(1)
  const [salaTablePage, setSalaTablePage] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [salaToPagar, setSalaToPagar] = useState<SalaFinanceira | null>(null)
  const [servidorUmMes, setServidorUmMes] = useState<ServidorFinanceiro | null>(null)
  const [servidorSuspender, setServidorSuspender] = useState<ServidorFinanceiro | null>(null)
  const [servidorToRenovar, setServidorToRenovar] = useState<ServidorFinanceiro | null>(null)
  const [renovarMeses, setRenovarMeses] = useState<number | ''>('')

  const canShowNetflix = servicoView === 'todos' || servicoView === 'netflix'
  const canShowIptv = servicoView === 'todos' || servicoView === 'iptv'
  const principais = servidores.filter((s) => s.tipo === 'principal')

  async function confirmarPagarSala() {
    if (!salaToPagar) return
    setSubmitting(true)
    try {
      await api.post(`/api/salas/${salaToPagar.id}/pagar-mes`, {})
      showSuccess(`Sala «${salaToPagar.nome}» renovada por +1 mês.`)
      setSalaToPagar(null)
      await onReloadSalas()
      await onReloadDashboard?.()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao renovar sala')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmarPagarUmMesServidor() {
    if (!servidorUmMes) return
    setSubmitting(true)
    try {
      await api.post(`/api/servidores/${servidorUmMes.id}/pagar-mes-principal`, { meses: 1 })
      showSuccess(`Pagamento de 1 mês registado: «${servidorUmMes.nome}».`)
      setServidorUmMes(null)
      await onReloadServidores()
      await onReloadDashboard?.()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao registar pagamento')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmarSuspenderServidor() {
    if (!servidorSuspender) return
    setSubmitting(true)
    try {
      await api.post(`/api/servidores/${servidorSuspender.id}/suspender`, {})
      await Promise.all([onReloadServidores(), onReloadDashboard?.()])
      showSuccess(`Servidor «${servidorSuspender.nome}» suspenso.`)
      setServidorSuspender(null)
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao suspender servidor')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmarPagarServidor() {
    if (!servidorToRenovar || renovarMeses === '') return
    const meses = Math.min(24, Math.max(1, renovarMeses))
    setSubmitting(true)
    try {
      await api.post(`/api/servidores/${servidorToRenovar.id}/pagar-mes-principal`, { meses })
      showSuccess(`Pagamento do servidor «${servidorToRenovar.nome}» registado (+${meses} mês(es)).`)
      setServidorToRenovar(null)
      setRenovarMeses('')
      await onReloadServidores()
      await onReloadDashboard?.()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao registar pagamento do servidor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {canShowIptv && principais.length > 0 && (
        <PluralTableShell>
          <div className="p-6 pb-0">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              Servidores IPTV (custos)
            </h3>
            <p className="text-sm text-gray-400 mb-4">Mensalidades e datas de pagamento aos fornecedores.</p>
          </div>
          <table className="plural-table plural-table--cards-md">
              <thead>
                <tr className="text-gray-400 border-b border-netflix-border">
                  <th className="text-left py-2 px-3">Servidor</th>
                  <th className="text-right py-2 px-3">Clientes</th>
                  <th className="text-right py-2 px-3">Mensalidade</th>
                  <th className="text-left py-2 px-3">Data pagamento</th>
                  <th className="text-left py-2 px-3">Estado</th>
                  <th className="text-right py-2 px-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalPages = Math.max(1, Math.ceil(principais.length / ROWS_PER_PAGE))
                  const page = Math.min(servidorGestaoPage, totalPages)
                  return principais.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE).map((s) => (
                    <tr key={s.id} className="border-b border-netflix-border/60">
                      <td className="py-2 px-3 text-white" data-label="Servidor">{s.nome}</td>
                      <td className="py-2 px-3 text-right text-gray-300" data-label="Clientes">{s.totalClientes}</td>
                      <td className="py-2 px-3 text-right text-gray-300" data-label="Mensalidade">{Number(s.mensalidade ?? 0).toFixed(2)} kz</td>
                      <td className="py-2 px-3 text-gray-300" data-label="Data pagamento">
                        {s.dataPagamento ? new Date(s.dataPagamento).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-2 px-3" data-label="Estado">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            s.status === 'online'
                              ? 'bg-green-900/50 text-green-300'
                              : s.status === 'instável'
                                ? 'bg-amber-900/50 text-amber-300'
                                : 'bg-red-900/50 text-red-300'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="plural-table-cell-actions py-2 px-3" data-label="Ações">
                        <div className="flex justify-end flex-wrap gap-1.5">
                          <FinanceiroActionBtn
                            icon={Zap}
                            label="+1 mês"
                            variant="emerald"
                            onClick={() => setServidorUmMes(s)}
                          />
                          <FinanceiroActionBtn
                            icon={RefreshCw}
                            label="Pagar"
                            variant="blue"
                            onClick={() => {
                              setServidorToRenovar(s)
                              setRenovarMeses('')
                            }}
                          />
                          {canSuspendServidor && s.status !== 'offline' && (
                            <FinanceiroActionBtn
                              icon={Server}
                              label="Suspender"
                              variant="amber"
                              onClick={() => setServidorSuspender(s)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          <TablePagination
            totalItems={principais.length}
            currentPage={Math.min(servidorGestaoPage, Math.max(1, Math.ceil(principais.length / ROWS_PER_PAGE)))}
            onPageChange={setServidorGestaoPage}
          />
        </PluralTableShell>
      )}

      {canShowNetflix && (
        <PluralTableShell>
          <div className="p-6 pb-0">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary-400" />
              Salas Netflix (renovação de contas)
            </h3>
            <p className="text-sm text-gray-400 mb-4">Renove as contas Netflix por sala (+1 mês).</p>
          </div>
          <table className="plural-table plural-table--cards-md">
              <thead>
                <tr className="text-gray-400 border-b border-netflix-border">
                  <th className="text-left py-2 px-3">Sala</th>
                  <th className="text-right py-2 px-3">Clientes</th>
                  <th className="text-left py-2 px-3">Data renovação</th>
                  <th className="text-left py-2 px-3">Estado</th>
                  <th className="text-right py-2 px-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalPages = Math.max(1, Math.ceil(salas.length / ROWS_PER_PAGE))
                  const page = Math.min(salaTablePage, totalPages)
                  return salas.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE).map((s) => {
                    const days = daysUntilSala(s.dataFim)
                    const urgent = days !== null && days <= 3 && days >= 0
                    const exp = days !== null && days < 0
                    return (
                      <tr key={s.id} className="border-b border-netflix-border/60">
                        <td className="py-2 px-3 text-white" data-label="Sala">{s.nome}</td>
                        <td className="py-2 px-3 text-right text-gray-300" data-label="Clientes">{s.totalClientes}</td>
                        <td className="py-2 px-3" data-label="Data renovação">
                          <span className={exp ? 'text-red-400' : urgent ? 'text-amber-300' : 'text-gray-300'}>
                            {s.dataFim ? new Date(s.dataFim).toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3" data-label="Estado">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs ${
                              s.status === 'ativo' ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/50 text-amber-300'
                            }`}
                          >
                            {s.status === 'ativo' ? 'Ativo' : 'Suspenso'}
                          </span>
                        </td>
                        <td className="plural-table-cell-actions py-2 px-3 text-right" data-label="Ações">
                          <FinanceiroActionBtn
                            icon={RefreshCw}
                            label="+1 mês"
                            variant="emerald"
                            onClick={() => setSalaToPagar(s)}
                          />
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          <TablePagination
            totalItems={salas.length}
            currentPage={Math.min(salaTablePage, Math.max(1, Math.ceil(salas.length / ROWS_PER_PAGE)))}
            onPageChange={setSalaTablePage}
          />
        </PluralTableShell>
      )}

      <FinanceiroConfirmModal
        open={!!salaToPagar}
        onClose={() => !submitting && setSalaToPagar(null)}
        onConfirm={confirmarPagarSala}
        icon={LayoutGrid}
        variant="primary"
        title="Renovar sala Netflix"
        subtitle={
          salaToPagar ? (
            <>
              Sala <span className="text-white font-medium">{salaToPagar.nome}</span>
            </>
          ) : undefined
        }
        description="Adiciona 1 mês à data de renovação da conta Netflix desta sala."
        detail={
          salaToPagar
            ? `${salaToPagar.totalClientes} cliente(s) na sala terão a data de vencimento sincronizada.`
            : undefined
        }
        confirmLabel="Renovar +1 mês"
        loading={submitting}
      />

      <FinanceiroConfirmModal
        open={!!servidorUmMes}
        onClose={() => !submitting && setServidorUmMes(null)}
        onConfirm={confirmarPagarUmMesServidor}
        icon={Zap}
        variant="emerald"
        title="Pagamento rápido"
        subtitle={
          servidorUmMes ? (
            <>
              Servidor <span className="text-white font-medium">{servidorUmMes.nome}</span>
            </>
          ) : undefined
        }
        description={
          servidorUmMes
            ? `Registar pagamento de 1 mês (${Number(servidorUmMes.mensalidade ?? 0).toFixed(2)} kz/mês)? A data de pagamento avança 1 mês.`
            : undefined
        }
        confirmLabel="Registar +1 mês"
        loading={submitting}
      />

      <FinanceiroConfirmModal
        open={!!servidorSuspender}
        onClose={() => !submitting && setServidorSuspender(null)}
        onConfirm={confirmarSuspenderServidor}
        icon={AlertTriangle}
        variant="amber"
        title="Suspender servidor"
        subtitle={
          servidorSuspender ? (
            <>
              Servidor <span className="text-white font-medium">{servidorSuspender.nome}</span>
            </>
          ) : undefined
        }
        description="O servidor passará a estado Offline. Os clientes associados podem deixar de ter acesso até reativação."
        confirmLabel="Suspender"
        loading={submitting}
      />

      <FinanceiroConfirmModal
        open={!!servidorToRenovar}
        onClose={() => {
          if (!submitting) {
            setServidorToRenovar(null)
            setRenovarMeses('')
          }
        }}
        onConfirm={confirmarPagarServidor}
        icon={RefreshCw}
        variant="blue"
        title="Pagamento do servidor"
        subtitle={
          servidorToRenovar ? (
            <>
              Servidor <span className="text-white font-medium">{servidorToRenovar.nome}</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Mensalidade: {Number(servidorToRenovar.mensalidade ?? 0).toFixed(2)} kz
              </span>
            </>
          ) : undefined
        }
        description="Selecione quantos meses de pagamento ao fornecedor deseja registar."
        confirmLabel="Registar pagamento"
        confirmDisabled={renovarMeses === ''}
        loading={submitting}
        maxWidth="max-w-sm"
      >
        <div>
          <RoveFormLabel required>Meses pagos</RoveFormLabel>
          <RoveSelect
            compact
            value={renovarMeses === '' ? '' : String(renovarMeses)}
            onChange={(e) => setRenovarMeses(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Selecione</option>
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
