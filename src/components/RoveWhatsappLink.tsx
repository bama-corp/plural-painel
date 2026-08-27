import { Phone } from 'lucide-react'

type RoveWhatsappLinkProps = {
  value?: string | null
  emptyLabel?: string
  className?: string
  compact?: boolean
  hideWhenEmpty?: boolean
}

export function RoveWhatsappLink({
  value,
  emptyLabel = '—',
  className = '',
  compact = false,
  hideWhenEmpty = false,
}: RoveWhatsappLinkProps) {
  const trimmed = value?.trim()
  if (!trimmed) {
    if (hideWhenEmpty) return null
    return <span className={`text-sm text-gray-400 ${className}`.trim()}>{emptyLabel}</span>
  }

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) {
    if (hideWhenEmpty) return null
    return <span className={`text-sm text-gray-400 ${className}`.trim()}>{emptyLabel}</span>
  }

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-primary-400 hover:text-primary-300 hover:underline ${compact ? 'text-xs' : 'text-sm'} ${className}`.trim()}
    >
      <Phone className="w-3.5 h-3.5 shrink-0" />
      {trimmed}
    </a>
  )
}
