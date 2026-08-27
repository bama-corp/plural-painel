import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RoveModalOverlay } from '../../components/RoveModalOverlay'

export type FinanceiroModalVariant = 'green' | 'emerald' | 'amber' | 'blue' | 'red' | 'primary'

const STYLES: Record<
  FinanceiroModalVariant,
  { border: string; bar: string; iconWrap: string; btn: string }
> = {
  green: {
    border: 'border-green-500/40',
    bar: 'bg-green-500',
    iconWrap: 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30',
    btn: 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/30',
  },
  emerald: {
    border: 'border-emerald-500/40',
    bar: 'bg-emerald-500',
    iconWrap: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
    btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/30',
  },
  amber: {
    border: 'border-amber-500/40',
    bar: 'bg-amber-500',
    iconWrap: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
    btn: 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-900/30',
  },
  blue: {
    border: 'border-blue-500/40',
    bar: 'bg-blue-500',
    iconWrap: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30',
    btn: 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/30',
  },
  red: {
    border: 'border-red-500/40',
    bar: 'bg-red-500',
    iconWrap: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
    btn: 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/30',
  },
  primary: {
    border: 'border-primary-500/40',
    bar: 'bg-primary-500',
    iconWrap: 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30',
    btn: 'bg-white hover:bg-neutral-200 text-black shadow-lg shadow-black/30',
  },
}

export function FinanceiroConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  detail,
  icon: Icon,
  variant = 'green',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  confirmDisabled = false,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  subtitle?: ReactNode
  description?: ReactNode
  detail?: ReactNode
  icon: LucideIcon
  variant?: FinanceiroModalVariant
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  confirmDisabled?: boolean
  children?: ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  const s = STYLES[variant]

  return (
    <RoveModalOverlay>
      <div
        className={`bg-netflix-card rounded-md shadow-2xl border ${s.border} ${maxWidth} w-full overflow-hidden`}
      >
        <div className="p-6 border-b border-netflix-border/80">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-md shrink-0 ${s.iconWrap}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              {subtitle != null && subtitle !== '' && (
                <div className="text-sm text-gray-400 mt-0.5">{subtitle}</div>
              )}
            </div>
          </div>
          <div className={`h-1 w-12 ${s.bar} rounded-full mt-4`} />
        </div>

        <div className="p-6 space-y-3">
          {description != null && description !== '' && (
            <p className="text-sm text-gray-300 leading-relaxed">{description}</p>
          )}
          {detail != null && detail !== '' && (
            <p className="text-xs text-gray-500 leading-relaxed">{detail}</p>
          )}
          {children}
        </div>

        <div className="flex gap-3 p-6 pt-4 border-t border-netflix-border/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 border border-netflix-border rounded-md text-sm font-medium text-gray-300 bg-netflix-panel hover:bg-netflix-hover transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className={`flex-1 py-2.5 px-4 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:hover:opacity-50 ${s.btn}`}
          >
            {loading ? 'A processar...' : confirmLabel}
          </button>
        </div>
      </div>
    </RoveModalOverlay>
  )
}
