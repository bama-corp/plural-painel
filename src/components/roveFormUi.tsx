import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'

export const ROVE_FORM_INPUT_SM =
  'w-full px-2.5 py-1.5 bg-netflix-panel border border-netflix-border rounded-md text-xs text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 outline-none transition-colors'

export const ROVE_FORM_LOCKED_SM =
  'flex min-h-[32px] w-full items-center justify-between gap-1.5 rounded-md border border-white/20 bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-netflix-panel px-2.5 py-1.5 text-xs text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-white/10'

export function RoveLockedBadge({ label = 'Bloqueado' }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary-500/35 bg-primary-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-200">
      <Lock className="h-3 w-3" />
      {label}
    </span>
  )
}

export function RequiredMark() {
  return (
    <span className="text-primary-400 font-normal" aria-hidden>
      {' '}
      *
    </span>
  )
}

export function mesesPagamentoLabel(n: number): string {
  return n === 1 ? '1 Mês' : `${n} Meses`
}

export function RoveFormLabel({
  children,
  required,
}: {
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-gray-300">
      {children}
      {required && <RequiredMark />}
    </label>
  )
}
