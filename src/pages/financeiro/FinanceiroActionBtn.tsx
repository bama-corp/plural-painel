import type { LucideIcon } from 'lucide-react'

type Variant = 'green' | 'emerald' | 'amber' | 'blue' | 'red'

const VARIANTS: Record<Variant, string> = {
  green: 'border-green-500/50 bg-green-500/10 text-green-300 hover:bg-green-500/30 hover:text-white',
  emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/30 hover:text-white',
  amber: 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/30 hover:text-white',
  blue: 'border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/30 hover:text-white',
  red: 'border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/30 hover:text-white',
}

export function FinanceiroActionBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = 'green',
  title,
  hideLabel,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: Variant
  title?: string
  hideLabel?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title ?? label}
      className={`inline-flex items-center justify-center gap-1.5 h-8 rounded-md border text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${hideLabel ? 'px-2' : 'px-3'}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!hideLabel && <span>{label}</span>}
    </button>
  )
}
