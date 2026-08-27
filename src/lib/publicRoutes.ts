/** Página inicial / login da área do cliente final. */
export function isClientLoginPath(path: string = window.location.pathname): boolean {
  return path === '/' || path.startsWith('/cliente/login')
}

/** Login do painel interno (operadores). */
export function isPanelLoginPath(path: string = window.location.pathname): boolean {
  return path === '/login'
}

export function isPublicAuthPath(path: string = window.location.pathname): boolean {
  return isClientLoginPath(path) || isPanelLoginPath(path)
}
