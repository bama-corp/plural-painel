/** Rota inicial após login no painel, consoante o perfil. */
export function defaultPanelPath(role?: string | null): string {
  if (role === 'financeiro') return '/financeiro'
  return '/clientes'
}

export function canAccessFinanceiroPage(role?: string | null): boolean {
  return role === 'admin' || role === 'financeiro'
}

export function isFinanceiroRole(role?: string | null): boolean {
  return role === 'financeiro'
}
