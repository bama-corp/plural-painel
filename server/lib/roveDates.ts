/** Formata valor de data para texto legível (auditoria, logs). */
export function formatRoveDate(v: unknown): string {
  if (v == null || v === '') return '—'
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
