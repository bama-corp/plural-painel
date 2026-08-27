import type { ReactNode } from 'react'

/** Contentor de tabela no estilo Plural (borda por sombra, cantos secos). */
export function PluralTableShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`plural-table-shell ${className}`.trim()}>{children}</div>
}
