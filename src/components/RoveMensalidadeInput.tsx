import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Banknote, Check } from 'lucide-react'

const DEFAULT_PRESETS = [10000, 15000, 20000, 25000, 30000, 35000, 40000, 50000] as const

function formatKz(value: number): string {
  return `${value.toLocaleString('pt-PT')} kz`
}

function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return null
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

type RoveMensalidadeInputProps = {
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  title?: string
  disabled?: boolean
  compact?: boolean
  presets?: number[]
}

export function RoveMensalidadeInput({
  value,
  onChange,
  placeholder = 'Definir mensalidade',
  title,
  disabled = false,
  compact = false,
  presets = [...DEFAULT_PRESETS],
}: RoveMensalidadeInputProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!open) return
    setDraft(value != null ? String(value) : '')
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, value])

  function pick(amount: number) {
    onChange(amount)
    setOpen(false)
  }

  function applyDraft() {
    const parsed = parseAmount(draft)
    if (parsed == null) {
      onChange(null)
    } else {
      onChange(parsed)
    }
    setOpen(false)
  }

  const parsedDraft = parseAmount(draft)
  const draftValid = draft.trim() === '' || parsedDraft != null

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 border border-netflix-border bg-netflix-panel text-left transition-colors outline-none ${
          compact ? 'min-h-[32px] rounded-md px-2.5 py-1.5 text-xs' : 'min-h-[42px] rounded-md px-3 py-2.5 text-sm'
        } ${
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-netflix-hover focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50'
        } ${open ? 'ring-2 ring-primary-500/40 border-primary-500/50' : ''}`}
      >
        <span className={`min-w-0 truncate tabular-nums ${value != null ? 'font-medium text-white' : 'text-gray-500'}`}>
          {value != null ? formatKz(value) : placeholder}
        </span>
        <Banknote
          className={`shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${open ? 'text-primary-400' : 'text-gray-500'}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute bottom-[calc(100%+0.5rem)] left-0 z-[60] w-[min(100%,16rem)] overflow-hidden rounded-md border border-netflix-border/90 bg-netflix-card shadow-2xl shadow-black/50 ring-1 ring-white/5 ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            <div className="border-b border-netflix-border/80 bg-gradient-to-r from-primary-950/50 via-netflix-panel to-netflix-panel px-3 py-2">
              <p className={`font-semibold text-white ${compact ? 'text-xs' : 'text-sm'}`}>Mensalidade</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Valores em kwanzas (kz)</p>
            </div>

            <div className="p-2.5">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">Valores rápidos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {presets.map((amount) => {
                  const isSelected = value === amount
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => pick(amount)}
                      className={`flex items-center justify-between gap-1 rounded-md px-2.5 py-2 text-left font-medium tabular-nums transition-all ${
                        isSelected
                          ? 'bg-white text-black shadow-md shadow-primary-900/40'
                          : 'text-gray-200 hover:bg-netflix-hover hover:text-white'
                      }`}
                    >
                      <span>{amount.toLocaleString('pt-PT')}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 border-t border-netflix-border/60 pt-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">Valor personalizado</p>
                <div className="flex gap-1.5">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyDraft()
                    }}
                    placeholder="Ex: 25000"
                    className="min-w-0 flex-1 rounded-md border border-netflix-border bg-netflix-panel px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-colors focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/40"
                  />
                  <span className="flex shrink-0 items-center rounded-md border border-netflix-border/80 bg-netflix-panel/80 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    kz
                  </span>
                </div>
                {draft.trim() !== '' && !draftValid && (
                  <p className="mt-1 text-[10px] text-amber-400">Indique um valor numérico válido.</p>
                )}
                {parsedDraft != null && draft.trim() !== '' && (
                  <p className="mt-1 text-[10px] text-gray-500">
                    Pré-visualização: <span className="text-gray-300">{formatKz(parsedDraft)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-netflix-border/80 bg-netflix-panel/60 px-3 py-2">
              {value != null ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
                >
                  Limpar
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={applyDraft}
                disabled={!draftValid || draft.trim() === ''}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
