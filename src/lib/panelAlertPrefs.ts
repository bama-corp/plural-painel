export const PANEL_ALERT_CATEGORIES = [
  'clientes_netflix',
  'clientes_iptv',
  'financeiro',
  'salas',
  'servidores',
  'indicacoes',
  'utilizadores',
  'resumo',
] as const

export type PanelAlertCategory = (typeof PANEL_ALERT_CATEGORIES)[number]

export const PANEL_ALERT_META: Record<
  PanelAlertCategory,
  { label: string; description: string; group: 'clientes' | 'operacao' | 'sistema' }
> = {
  clientes_netflix: {
    label: 'Clientes Netflix',
    description: 'Cadastro, suspensão, reativação e cancelamento',
    group: 'clientes',
  },
  clientes_iptv: {
    label: 'Clientes IPTV',
    description: 'Cadastro, suspensão, reativação e cancelamento',
    group: 'clientes',
  },
  financeiro: {
    label: 'Financeiro',
    description: 'Inscrições, pagamentos e cobranças',
    group: 'operacao',
  },
  salas: {
    label: 'Salas Netflix',
    description: 'Novas salas, renovações e suspensões',
    group: 'operacao',
  },
  servidores: {
    label: 'Servidores e revendedores',
    description: 'IPTV, manutenção e revendedores',
    group: 'operacao',
  },
  indicacoes: {
    label: 'Indicações',
    description: 'Novas indicações e confirmações',
    group: 'operacao',
  },
  utilizadores: {
    label: 'Utilizadores do painel',
    description: 'Novos operadores e suspensões',
    group: 'sistema',
  },
  resumo: {
    label: 'Resumo diário',
    description: 'Relatório automático do cron',
    group: 'sistema',
  },
}

export function defaultAlertScopesForRole(role: string): PanelAlertCategory[] {
  const r = role === 'suporte' ? 'geral' : role
  switch (r) {
    case 'admin':
      return [...PANEL_ALERT_CATEGORIES]
    case 'financeiro':
      return ['financeiro', 'resumo']
    case 'netflix':
      return ['clientes_netflix', 'salas', 'resumo']
    case 'iptv':
      return ['clientes_iptv', 'servidores', 'resumo']
    case 'geral':
      return [
        'clientes_netflix',
        'clientes_iptv',
        'salas',
        'servidores',
        'indicacoes',
        'resumo',
      ]
    default:
      return ['resumo']
  }
}

export function effectiveAlertScopes(
  custom: PanelAlertCategory[] | null | undefined,
  role: string
): PanelAlertCategory[] {
  return custom?.length ? custom : defaultAlertScopesForRole(role)
}

export function formatAlertScopesSummary(
  custom: PanelAlertCategory[] | null | undefined,
  role: string
): string {
  const scopes = effectiveAlertScopes(custom, role)
  if (scopes.length === PANEL_ALERT_CATEGORIES.length) return 'Todos os alertas'
  if (scopes.length <= 2) {
    return scopes.map((c) => PANEL_ALERT_META[c].label).join(', ')
  }
  return `${scopes.length} categorias`
}
