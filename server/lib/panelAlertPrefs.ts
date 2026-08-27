/** Categorias de alerta WhatsApp configuráveis por operador. */
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

export const ALL_PANEL_ALERT_CATEGORIES: PanelAlertCategory[] = [...PANEL_ALERT_CATEGORIES]

const CATEGORY_SET = new Set<string>(PANEL_ALERT_CATEGORIES)

export function isPanelAlertCategory(value: string): value is PanelAlertCategory {
  return CATEGORY_SET.has(value)
}

/** Padrão por perfil — replica o roteamento anterior por role. */
export function defaultAlertScopesForRole(role: string): PanelAlertCategory[] {
  const r = role === 'suporte' ? 'geral' : role
  switch (r) {
    case 'admin':
      return [...ALL_PANEL_ALERT_CATEGORIES]
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

export function parseStoredAlertScopes(raw: unknown): PanelAlertCategory[] | null {
  if (raw == null || raw === '') return null
  let arr: unknown[] | null = null
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) arr = parsed
    } catch {
      return null
    }
  }
  if (!arr) return null
  const out: PanelAlertCategory[] = []
  for (const item of arr) {
    if (typeof item === 'string' && isPanelAlertCategory(item) && !out.includes(item)) {
      out.push(item)
    }
  }
  return out.length > 0 ? out : null
}

export function normalizeAlertScopesInput(
  input: unknown,
  role: string
): PanelAlertCategory[] {
  if (input === undefined) return defaultAlertScopesForRole(role)
  if (input === null) return defaultAlertScopesForRole(role)
  if (!Array.isArray(input)) {
    throw new Error('alertScopes deve ser uma lista de categorias')
  }
  const out: PanelAlertCategory[] = []
  for (const item of input) {
    if (typeof item !== 'string' || !isPanelAlertCategory(item)) {
      throw new Error(`Categoria de alerta inválida: ${String(item)}`)
    }
    if (!out.includes(item)) out.push(item)
  }
  if (out.length === 0) {
    throw new Error('Seleccione pelo menos uma categoria de alerta')
  }
  return out
}

/** Preferências efectivas (custom ou padrão do perfil). */
export function effectiveAlertScopes(
  stored: PanelAlertCategory[] | null | undefined,
  role: string
): PanelAlertCategory[] {
  return stored ?? defaultAlertScopesForRole(role)
}

export function userReceivesCategories(
  stored: PanelAlertCategory[] | null | undefined,
  role: string,
  categories: PanelAlertCategory | PanelAlertCategory[]
): boolean {
  const wanted = Array.isArray(categories) ? categories : [categories]
  const scopes = new Set(effectiveAlertScopes(stored, role))
  return wanted.some((c) => scopes.has(c))
}

export function serializeAlertScopes(scopes: PanelAlertCategory[]): string {
  return JSON.stringify(scopes)
}
