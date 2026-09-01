import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Tv } from 'lucide-react'
import { FinanceiroActionBtn } from './FinanceiroActionBtn'
import { FinanceiroConfirmModal } from './FinanceiroConfirmModal'
import { api } from '../../api/client'
import { useAlert } from '../../contexts/AlertContext'
import { RoveWhatsappLink } from '../../components/RoveWhatsappLink'
import { TablePagination, ROWS_PER_PAGE } from '../../components/TablePagination'
import { PluralTableShell } from '../../components/PluralTableShell'
import { inscricaoValorPlano } from '../../lib/planos'
import type { ClienteFinanceiro } from './types'

export function FinanceiroInscricoes({ onChanged }: { onChanged?: () => void }) {
  const { showError, showSuccess } = useAlert()
  const [clients, setClients] = useState<ClienteFinanceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [tablePage, setTablePage] = useState(1)
  const [clientInscricao, setClientInscricao] = useState<ClienteFinanceiro | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    return api
      .get<ClienteFinanceiro[]>('/api/clients?servico=netflix&inscricaoPaga=pendente')
      .then((rows) => {
        const list = (Array.isArray(rows) ? rows : []).filter((c) => inscricaoValorPlano(c.plano) != null)
        setClients(list)
      })
      .catch((e) => {
        showError(e instanceof Error ? e.message : 'Erro ao carregar inscrições')
        setClients([])
      })
      .finally(() => setLoading(false))
  }, [showError])

  useEffect(() => {
    load()
  }, [load])

  const totalPendente = clients.reduce((s, c) => s + (inscricaoValorPlano(c.plano) ?? 0), 0)
  const totalPages = Math.max(1, Math.ceil(clients.length / ROWS_PER_PAGE))
  const page = Math.min(tablePage, totalPages)
  const paged = clients.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const inscricaoValor = clientInscricao ? inscricaoValorPlano(clientInscricao.plano) : null

  async function confirmarInscricaoPaga() {
    if (!clientInscricao) return
    setSubmitting(true)
    try {
      await api.patch(`/api/clients/${clientInscricao.id}`, { inscricaoPaga: true })
      showSuccess(`Inscrição marcada como paga: «${clientInscricao.nome}».`)
      setClientInscricao(null)
      await load()
      onChanged?.()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao atualizar inscrição')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-primary-600/40 bg-primary-900/20 p-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Tv className="w-5 h-5 text-primary-400" />
          Inscrições Netflix pendentes
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Clientes Room/Solo com inscrição ainda não registada como paga.
        </p>
        <p className="text-sm text-gray-300 mt-3">
          {clients.length} pendente(s) · <strong className="text-white">{totalPendente.toLocaleString('pt-PT')} kz</strong> em inscrições
        </p>
      </div>

      <PluralTableShell>
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">A carregar...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhuma inscrição pendente.</div>
        ) : (
          <>
            <table className="plural-table plural-table--cards-md">
                <thead>
                  <tr className="text-gray-400 border-b border-netflix-border">
                    <th className="text-left py-2 px-3">Cliente</th>
                    <th className="text-left py-2 px-3">Contacto</th>
                    <th className="text-left py-2 px-3">Plano</th>
                    <th className="text-right py-2 px-3">Inscrição</th>
                    <th className="text-right py-2 px-3">Mensal</th>
                    <th className="text-right py-2 px-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => {
                    const insc = inscricaoValorPlano(c.plano)
                    return (
                      <tr key={c.id} className="border-b border-netflix-border/60">
                        <td className="py-2 px-3 text-white" data-label="Cliente">{c.nome}</td>
                        <td className="py-2 px-3" data-label="Contacto">
                          <RoveWhatsappLink value={c.whatsapp} compact />
                        </td>
                        <td className="py-2 px-3 text-gray-300" data-label="Plano">{c.plano}</td>
                        <td className="py-2 px-3 text-right font-medium text-amber-300" data-label="Inscrição">
                          {insc != null ? `${insc.toLocaleString('pt-PT')} kz` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-300" data-label="Mensal">{Number(c.valor).toFixed(2)} kz</td>
                        <td className="plural-table-cell-actions py-2 px-3 text-right" data-label="Ação">
                          <FinanceiroActionBtn
                            icon={CheckCircle}
                            label="Marcar paga"
                            variant="green"
                            disabled={submitting && clientInscricao?.id === c.id}
                            onClick={() => setClientInscricao(c)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
            </table>
            <TablePagination totalItems={clients.length} currentPage={page} onPageChange={setTablePage} />
          </>
        )}
      </PluralTableShell>

      <FinanceiroConfirmModal
        open={!!clientInscricao}
        onClose={() => !submitting && setClientInscricao(null)}
        onConfirm={confirmarInscricaoPaga}
        icon={CheckCircle}
        variant="primary"
        title="Marcar inscrição paga"
        subtitle={
          clientInscricao ? (
            <>
              Cliente <span className="text-white font-medium">{clientInscricao.nome}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{clientInscricao.plano}</span>
            </>
          ) : undefined
        }
        description={
          inscricaoValor != null
            ? `Confirma que recebeu a taxa de inscrição de ${inscricaoValor.toLocaleString('pt-PT')} kz?`
            : 'Confirma que a inscrição foi paga?'
        }
        detail="O estado da inscrição ficará registado no perfil do cliente Netflix."
        confirmLabel="Marcar como paga"
        loading={submitting}
      />
    </div>
  )
}
