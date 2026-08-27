import { Server, Tv } from 'lucide-react'
import { PLANOS_IPTV, PLANOS_NETFLIX } from '../../lib/planos'

export function FinanceiroPlanos() {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-netflix-border/80 bg-netflix-card/80 p-5">
        <h3 className="text-base font-semibold text-white mb-1">Tabela de preços</h3>
        <p className="text-sm text-gray-400">
          Valores de referência usados ao criar clientes no painel (kz). Alterações em clientes individuais fazem-se em Clientes.
        </p>
      </div>

      <div className="rounded-md border border-blue-600/40 bg-blue-900/20 overflow-hidden">
        <div className="p-5 border-b border-blue-600/30 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          <h4 className="font-semibold text-white">IPTV</h4>
        </div>
        <table className="plural-table">
          <thead>
            <tr className="text-gray-400 border-b border-netflix-border/60">
              <th className="text-left py-2 px-4">Plano</th>
              <th className="text-right py-2 px-4">Mensalidade</th>
            </tr>
          </thead>
          <tbody>
            {PLANOS_IPTV.map((p) => (
              <tr key={p.id} className="border-b border-netflix-border/40">
                <td className="py-3 px-4 text-white">{p.label}</td>
                <td className="py-3 px-4 text-right font-medium text-white">{p.valor.toLocaleString('pt-PT')} kz</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-primary-600/40 bg-primary-900/20 overflow-hidden">
        <div className="p-5 border-b border-primary-600/30 flex items-center gap-2">
          <Tv className="w-5 h-5 text-primary-400" />
          <h4 className="font-semibold text-white">Netflix</h4>
        </div>
        <table className="plural-table">
          <thead>
            <tr className="text-gray-400 border-b border-netflix-border/60">
              <th className="text-left py-2 px-4">Plano</th>
              <th className="text-right py-2 px-4">Inscrição</th>
              <th className="text-right py-2 px-4">Mensalidade</th>
            </tr>
          </thead>
          <tbody>
            {PLANOS_NETFLIX.map((p) => (
              <tr key={p.id} className="border-b border-netflix-border/40">
                <td className="py-3 px-4 text-white">{p.label}</td>
                <td className="py-3 px-4 text-right text-amber-300">
                  {p.inscricao.toLocaleString('pt-PT')} kz
                </td>
                <td className="py-3 px-4 text-right font-medium text-white">{p.valor.toLocaleString('pt-PT')} kz</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
