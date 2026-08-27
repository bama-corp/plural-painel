export type AdminThemeMode = 'light' | 'dark'

export const ADMIN_THEME_KEY = 'plural.adminTheme'

export function readAdminTheme(): AdminThemeMode {
  try {
    const v = localStorage.getItem(ADMIN_THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function writeAdminTheme(mode: AdminThemeMode) {
  try {
    localStorage.setItem(ADMIN_THEME_KEY, mode)
  } catch {
    /* ignore */
  }
}

/** Variáveis CSS das superfícies netflix-* (Tailwind). */
export function getAdminSurfaceVars(mode: AdminThemeMode): Record<string, string> {
  if (mode === 'light') {
    return {
      '--n-bg': '250 250 250',
      '--n-card': '255 255 255',
      '--n-panel': '245 245 245',
      '--n-border': '229 229 229',
      '--n-hover': '240 240 240',
      '--n-fg': '23 23 23',
      '--n-muted': '115 115 115',
    }
  }
  return {
    '--n-bg': '0 0 0',
    '--n-card': '10 10 10',
    '--n-panel': '17 17 17',
    '--n-border': '38 38 38',
    '--n-hover': '26 26 26',
    '--n-fg': '245 245 245',
    '--n-muted': '115 115 115',
  }
}

export type AdminThemeTokens = {
  page: string
  header: string
  title: string
  subtitle: string
  iconBtn: (active: boolean) => string
  themeToggle: string
  logout: string
  badge: string
  nav: string
  navItem: (active: boolean) => string
  mark: string
  spin: string
}

export function getAdminThemeTokens(mode: AdminThemeMode): AdminThemeTokens {
  const light = mode === 'light'

  return {
    page: light ? 'bg-[#fafafa] text-neutral-800' : 'bg-netflix-bg text-gray-100',
    header: light
      ? 'plural-header-edge flex h-16 shrink-0 items-center gap-3 bg-[#ffffff]/90 px-3 backdrop-blur-sm sm:h-[4.25rem] sm:px-5'
      : 'plural-header-edge flex h-16 shrink-0 items-center gap-3 bg-netflix-bg/95 px-3 backdrop-blur-sm sm:h-[4.25rem] sm:px-5',
    title: light
      ? 'truncate text-base font-semibold text-[#000000] sm:text-lg'
      : 'truncate text-base font-semibold text-white sm:text-lg',
    subtitle: light ? 'truncate text-[11px] text-[#525252]' : 'truncate text-[11px] text-neutral-500',
    iconBtn: (active) =>
      light
        ? active
          ? 'relative rounded-md p-2.5 text-[#000000] transition-shadow plural-edge-soft bg-[#000000]/[0.05]'
          : 'relative rounded-md p-2.5 text-[#525252] transition-shadow hover:bg-[#000000]/[0.05] hover:text-[#000000]'
        : active
          ? 'relative rounded-md p-2.5 text-white transition-shadow plural-edge-soft bg-white/10'
          : 'relative rounded-md p-2.5 text-gray-300 transition-shadow hover:bg-white/10 hover:text-white',
    themeToggle: light
      ? 'rounded-md p-2.5 text-[#525252] transition-colors hover:bg-[#000000] hover:text-[#ffffff]'
      : 'rounded-md p-2.5 text-gray-300 transition-colors hover:bg-white hover:text-black',
    logout: light
      ? 'rounded-md p-2.5 text-[#525252] transition-colors hover:bg-[#000000] hover:text-[#ffffff]'
      : 'rounded-md p-2.5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white',
    badge: light
      ? 'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#000000] px-1 text-[10px] font-bold leading-none text-[#ffffff] shadow-sm'
      : 'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-black shadow-sm',
    nav: light
      ? 'plural-nav-edge fixed inset-x-0 bottom-0 z-40 bg-[#ffffff]/95 backdrop-blur-xl'
      : 'plural-nav-edge fixed inset-x-0 bottom-0 z-40 bg-netflix-bg/95 backdrop-blur-xl',
    navItem: (active) =>
      light
        ? active
          ? 'plural-nav-item plural-nav-item-active flex min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-[#000000] px-2 py-1.5 text-[10px] font-medium text-[#ffffff] transition-all sm:min-w-[4.75rem] sm:text-[11px]'
          : 'plural-nav-item flex min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] font-medium text-[#525252] transition-all hover:bg-[#000000]/[0.05] hover:text-[#000000] sm:min-w-[4.75rem] sm:text-[11px]'
        : active
          ? 'plural-nav-item plural-nav-item-active flex min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-md bg-white px-2 py-1.5 text-[10px] font-medium text-black transition-all sm:min-w-[4.75rem] sm:text-[11px]'
          : 'plural-nav-item flex min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] font-medium text-white/70 transition-all hover:bg-white/8 hover:text-white sm:min-w-[4.75rem] sm:text-[11px]',
    mark: light ? 'bg-[#000000]' : 'bg-white',
    spin: light
      ? 'animate-spin rounded-full h-10 w-10 border-2 border-[#000000]/20 border-t-[#000000]'
      : 'animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent',
  }
}
