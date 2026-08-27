import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

const WEEKDAYS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const

function parseIsoDate(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayPt(value: string): string {
  const date = parseIsoDate(value)
  if (!date) return ''
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isPastDate(date: Date, today: Date): boolean {
  return startOfDay(date).getTime() < startOfDay(today).getTime()
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startPad = (first.getDay() + 6) % 7
  const days: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= lastDay; d++) days.push(new Date(year, month, d))
  return days
}

type RoveDatePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title?: string
  disabled?: boolean
  compact?: boolean
  /** Por defeito só permite hoje e futuro (formulários). Filtros históricos devem usar true. */
  allowPastDates?: boolean
}

export function RoveDatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  title,
  disabled = false,
  compact = false,
  allowPastDates = false,
}: RoveDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = parseIsoDate(value)
  const [view, setView] = useState(() => selected ?? new Date())
  const today = useMemo(() => startOfDay(new Date()), [])

  useEffect(() => {
    if (selected) setView(selected)
  }, [value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const days = getCalendarDays(view.getFullYear(), view.getMonth())

  function pick(date: Date) {
    if (!allowPastDates && isPastDate(date, today)) return
    onChange(toIsoDate(date))
    setOpen(false)
  }

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1))
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 border border-netflix-border bg-netflix-panel text-left transition-colors outline-none ${
          compact ? 'min-h-[32px] rounded-md px-2.5 py-1.5 text-xs' : 'min-h-[42px] rounded-md px-3 py-2.5 text-sm'
        } ${
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-netflix-hover focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50'
        } ${open ? 'ring-2 ring-primary-500/40 border-primary-500/50' : ''}`}
      >
        <span className={value ? 'font-medium text-white tabular-nums' : 'text-gray-500'}>
          {value ? formatDisplayPt(value) : placeholder}
        </span>
        <Calendar className={`shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${open ? 'text-primary-400' : 'text-gray-500'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[calc(100%+0.5rem)] left-0 z-[60] w-[min(100%,18.5rem)] overflow-hidden rounded-md border border-netflix-border bg-netflix-card plural-edge shadow-xl"
          >
            <div className="border-b border-netflix-border/80 bg-netflix-panel px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">
                    {MONTHS_PT[view.getMonth()]} {view.getFullYear()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Mês seguinte"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-3">
              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEKDAYS_PT.map((day) => (
                  <span
                    key={day}
                    className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((date, i) => {
                  if (!date) {
                    return <span key={`empty-${i}`} className="h-9" aria-hidden />
                  }

                  const past = isPastDate(date, today)
                  const isSelected = !!(selected && sameDay(date, selected))
                  const isToday = sameDay(date, today)
                  const isDisabled = !allowPastDates && past && !isSelected

                  return (
                    <button
                      key={toIsoDate(date)}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => pick(date)}
                      aria-disabled={isDisabled}
                      className={`relative flex h-9 items-center justify-center rounded-md text-sm font-medium tabular-nums transition-all ${
                        isSelected
                          ? 'bg-white text-black shadow-sm'
                          : isDisabled
                            ? 'cursor-not-allowed text-gray-600 opacity-45'
                            : isToday
                              ? 'border border-netflix-border bg-netflix-hover text-white'
                              : 'text-gray-200 hover:bg-netflix-hover hover:text-white'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-netflix-border/80 bg-netflix-panel/60 px-3 py-2">
              <button
                type="button"
                onClick={() => pick(today)}
                className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-primary-300 transition-colors hover:bg-primary-600/20 hover:text-primary-200"
              >
                Hoje
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
                >
                  Limpar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
