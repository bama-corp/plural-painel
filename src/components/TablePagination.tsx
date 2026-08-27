import { ChevronLeft, ChevronRight } from 'lucide-react'

export const ROWS_PER_PAGE = 8

interface TablePaginationProps {
  totalItems: number
  currentPage: number
  onPageChange: (page: number) => void
  pageSize?: number
}

export function TablePagination({
  totalItems,
  currentPage,
  onPageChange,
  pageSize = ROWS_PER_PAGE,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)

  if (totalItems <= pageSize) return null

  return (
    <div className="plural-table-foot flex flex-wrap items-center justify-between gap-3 tracking-wide">
      <span className="text-gray-400">
        A mostrar <span className="font-semibold text-gray-200">{from}</span> a{' '}
        <span className="font-semibold text-gray-200">{to}</span> de{' '}
        <span className="font-semibold text-gray-200">{totalItems}</span> registos
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-netflix-panel text-gray-400 transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-netflix-panel disabled:hover:text-gray-400 plural-edge-soft"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-md text-sm font-semibold transition-all ${
                p === currentPage
                  ? 'bg-white text-black plural-nav-item-active'
                  : 'bg-netflix-panel text-gray-400 plural-edge-soft hover:bg-white hover:text-black'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-netflix-panel text-gray-400 transition-all hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-netflix-panel disabled:hover:text-gray-400 plural-edge-soft"
          aria-label="Página seguinte"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
