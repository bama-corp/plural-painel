/** Data/hora completa (pt-PT) — tooltips e texto secundário. */
export function formatRoveDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Data relativa curta («há 5 min») ou data completa se for mais antiga. */
export function formatRoveWhen(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH} h`
  return formatRoveDateTime(iso)
}
