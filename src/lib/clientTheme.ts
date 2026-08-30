export type ClientThemeMode = 'light' | 'dark'

export const CLIENT_THEME_KEY = 'plural.clientTheme'

export function readClientTheme(): ClientThemeMode {
  try {
    const v = localStorage.getItem(CLIENT_THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function writeClientTheme(mode: ClientThemeMode) {
  try {
    localStorage.setItem(CLIENT_THEME_KEY, mode)
  } catch {
    /* ignore */
  }
}

export type ClientThemeTokens = {
  page: string
  mark: string
  wordmark: string
  shell: string
  card: string
  panel: string
  btnPrimary: string
  btnGhost: string
  input: string
  fg: string
  muted: string
  hairline: string
  hairlineTop: string
  nav: string
  navBtn: (active: boolean) => string
  navBadge: (active: boolean) => string
  avatar: string
  logout: string
  themeToggle: string
  spin: string
  emptyNotif: string
  copyBtn: string
  iconMuted: string
  footer: string
  progressTrack: string
  progressBar: string
  status: (s: string) => { text: string; className: string }
  indBadge: (confirmada: boolean) => string
}

export function getClientThemeTokens(mode: ClientThemeMode): ClientThemeTokens {
  const light = mode === 'light'

  return {
    page: light ? 'bg-[#fafafa] text-neutral-800' : 'bg-black text-neutral-200',
    mark: light ? 'bg-black opacity-[0.04]' : 'bg-white opacity-[0.04]',
    wordmark: light ? 'bg-black' : 'bg-white',
    shell: light
      ? 'rounded-2xl bg-white/90 backdrop-blur-xl plural-edge shadow-[0_12px_40px_rgba(0,0,0,0.08)]'
      : 'rounded-2xl bg-[#0a0a0a]/90 backdrop-blur-xl plural-edge shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
    card: light ? 'rounded-md bg-white plural-edge' : 'rounded-md bg-[#0a0a0a] plural-edge',
    panel: light
      ? 'rounded-md bg-[#f4f4f4] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'
      : 'rounded-md bg-[#111] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
    btnPrimary: light
      ? 'inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800'
      : 'inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200',
    btnGhost: light
      ? 'inline-flex items-center justify-center gap-2 rounded-md bg-black/[0.04] px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-black/[0.08] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]'
      : 'inline-flex items-center justify-center gap-2 rounded-md bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.12] shadow-[0_0_0_1px_rgba(255,255,255,0.1)]',
    input: light
      ? 'w-full rounded-md bg-white py-2.5 pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none shadow-[0_0_0_1px_rgba(0,0,0,0.1)] focus:shadow-[0_0_0_1.5px_rgba(0,0,0,0.28)]'
      : 'w-full rounded-md bg-[#111] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-neutral-600 outline-none shadow-[0_0_0_1px_rgba(255,255,255,0.1)] focus:shadow-[0_0_0_1.5px_rgba(255,255,255,0.28)]',
    fg: light ? 'text-neutral-900' : 'text-white',
    muted: 'text-neutral-500',
    hairline: light
      ? 'shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]'
      : 'shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)]',
    hairlineTop: light
      ? 'shadow-[inset_0_1px_0_0_rgba(0,0,0,0.06)]'
      : 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    nav: light
      ? 'fixed z-40 flex gap-0.5 bg-white/95 backdrop-blur-xl plural-edge max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:flex-row max-sm:justify-around max-sm:rounded-none max-sm:rounded-t-2xl max-sm:border-t max-sm:border-black/10 max-sm:p-1.5 max-sm:pb-[max(0.35rem,env(safe-area-inset-bottom))] max-sm:shadow-[0_-8px_32px_rgba(0,0,0,0.12)] sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:flex-col sm:gap-1 sm:rounded-2xl sm:p-2 sm:shadow-[0_16px_48px_rgba(0,0,0,0.12)]'
      : 'fixed z-40 flex gap-0.5 bg-[#0a0a0a]/92 backdrop-blur-xl plural-edge max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:flex-row max-sm:justify-around max-sm:rounded-none max-sm:rounded-t-2xl max-sm:border-t max-sm:border-white/10 max-sm:p-1.5 max-sm:pb-[max(0.35rem,env(safe-area-inset-bottom))] max-sm:shadow-[0_-8px_32px_rgba(0,0,0,0.45)] sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:flex-col sm:gap-1 sm:rounded-2xl sm:p-2 sm:shadow-[0_16px_48px_rgba(0,0,0,0.6)]',
    navBtn: (active) =>
      light
        ? active
          ? 'bg-black text-white shadow-md shadow-black/20'
          : 'text-neutral-500 hover:bg-black/[0.06] hover:text-black'
        : active
          ? 'bg-white text-black shadow-md shadow-black/40'
          : 'text-neutral-400 hover:bg-white/[0.08] hover:text-white',
    navBadge: (active) =>
      light
        ? active
          ? 'bg-white text-black'
          : 'bg-black text-white'
        : active
          ? 'bg-black text-white'
          : 'bg-white text-black',
    avatar: light ? 'bg-black text-white' : 'bg-white text-black',
    logout: light
      ? 'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-black hover:text-white'
      : 'inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-white hover:text-black',
    themeToggle: light
      ? 'inline-flex shrink-0 items-center justify-center rounded-md p-2.5 text-neutral-500 transition-colors hover:bg-black hover:text-white'
      : 'inline-flex shrink-0 items-center justify-center rounded-md p-2.5 text-neutral-400 transition-colors hover:bg-white hover:text-black',
    spin: light
      ? 'rounded-full border-2 border-black/20 border-t-black animate-spin'
      : 'rounded-full border-2 border-white/25 border-t-white animate-spin',
    emptyNotif: light
      ? 'text-sm text-neutral-500 text-center py-6 rounded-md bg-black/[0.03] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'
      : 'text-sm text-neutral-500 text-center py-6 rounded-md bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]',
    copyBtn: light
      ? 'inline-flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-md bg-black/[0.05] text-neutral-600 text-xs hover:bg-black hover:text-white transition-colors'
      : 'inline-flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-md bg-white/[0.06] text-neutral-300 text-xs hover:bg-white hover:text-black transition-colors',
    iconMuted: light ? 'text-neutral-500' : 'text-neutral-400',
    footer: light ? 'text-neutral-400' : 'text-neutral-600',
    progressTrack: light ? 'bg-black/10' : 'bg-white/10',
    progressBar: light ? 'bg-black' : 'bg-white',
    status: (s) => {
      if (s === 'ativo')
        return {
          text: 'Ativo',
          className: light ? 'bg-black text-white' : 'bg-white text-black',
        }
      if (s === 'vencido')
        return {
          text: 'Vencido',
          className: light
            ? 'bg-black/10 text-neutral-800 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]'
            : 'bg-white/15 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.2)]',
        }
      if (s === 'cancelado')
        return {
          text: 'Cancelado',
          className: light
            ? 'bg-neutral-200 text-neutral-600'
            : 'bg-black text-neutral-400 shadow-[0_0_0_1px_rgba(255,255,255,0.14)]',
        }
      return {
        text: s,
        className: light ? 'bg-black/5 text-neutral-700' : 'bg-white/10 text-gray-200',
      }
    },
    indBadge: (confirmada) =>
      confirmada
        ? light
          ? 'bg-black text-white'
          : 'bg-white text-black'
        : light
          ? 'bg-black/8 text-neutral-700 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]'
          : 'bg-white/10 text-neutral-300 shadow-[0_0_0_1px_rgba(255,255,255,0.14)]',
  }
}
