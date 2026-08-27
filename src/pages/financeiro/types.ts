export interface ReceitaPorServidor {
  servidorId: number
  servidorNome: string
  receita: number
  clientes: number
}

export interface FinanceData {
  receitaMes: number
  receitaMesNetflix?: number
  receitaMesIptv?: number
  receitaMesAnterior?: number
  variacaoReceita?: number
  totalClientes: number
  totalNetflix: number
  totalIptv: number
  vencendoHoje: number
  vencendoEm7Dias?: number
  clientesVencidos?: number
  receitaUltimosMeses?: { mes: string; valor: number; valorNetflix?: number; valorIptv?: number }[]
  valorVencidoNetflix?: number
  valorVencidoIptv?: number
  valorVencidoTotal?: number
  receitaMensalProjetada?: number
  receitaMensalProjetadaNetflix?: number
  receitaMensalProjetadaIptv?: number
  receitaPorServidor?: ReceitaPorServidor[]
  custoSalasNetflix?: number
  custoServidoresIptv?: number
  lucroEstimado?: number
  totalSalasAtivas?: number
  salasVencendo?: number
  salasVencidas?: number
}

export interface SalaFinanceira {
  id: number
  nome: string
  dataFim: string | null
  status: string
  totalClientes: number
}

export interface ServidorFinanceiro {
  id: number
  nome: string
  tipo: string
  status: string
  totalClientes: number
  mensalidade?: number | null
  dataPagamento?: string | null
}

export interface ClienteFinanceiro {
  id: number
  nome: string
  whatsapp: string
  servico: string
  plano: string
  valor: number
  dataFim: string
  status: string
  inscricaoPaga?: boolean | null
  sala?: { nome: string } | null
  servidor?: { nome: string } | null
}

export type FinanceiroTab = 'visao' | 'cobrancas' | 'custos' | 'inscricoes' | 'planos'
export type ServicoView = 'todos' | 'iptv' | 'netflix'
export type CobrancaFiltro = 'vencidos' | 'hoje' | '7dias' | 'ativos' | 'todos'
