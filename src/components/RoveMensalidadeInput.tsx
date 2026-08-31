import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Banknote, Check } from 'lucide-react'

const DEFAULT_PRESETS = [10000, 15000, 20000, 25000, 30000, 35000, 40000, 50000] as const
const PANEL_WIDTH = 256

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

type PanelLayout = {
  left: number
  bottom: number
  width: number
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
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [panelLayout, setPanelLayout] = useState<PanelLayout | null>(null)

  const updatePanelLayout = useCallback(() => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const gap = 8
    const width = Math.min(Math.max(rect.width, PANEL_WIDTH), 320)
    let left = rect.left
    const maxLeft = window.innerWidth - width - 8
    if (left > maxLeft) left = Math.max(8, maxLeft)

    // Sempre para cima / fora do modal
    setPanelLayout({
      left,
      width,
      bottom: window.innerHeight - rect.top + gap,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    setDraft(value != null ? String(value) : '')
    updatePanelLayout()
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = () => updatePanelLayout()
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, value, updatePanelLayout])

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

  function toggleOpen() {
    if (disabled) return
    if (!open) updatePanelLayout()
    setOpen((o) => !o)
  }

  const parsedDraft = parseAmount(draft)
  const draftValid = draft.trim() === '' || parsedDraft != null

  const panel =
    open && panelLayout ? (
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          bottom: panelLayout.bottom,
          left: panelLayout.left,
          width: panelLayout.width,
          zIndex: 220,
        }}
        className={`overflow-hidden rounded-md border border-netflix-border/90 bg-netflix-card shadow-2xl shadow-black/50 ring-1 ring-white/5 ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        <div className="border-b border-netflix-border/80 bg-gradient-to-r from-primary-950/50 via-netflix-panel to-netflix-panel px-3 py-2">
          <p className={`font-semibold text-white ${compact ? 'text-xs' : 'text-sm'}`}>Mensalidade</p>
          <p className="mt-0.5 text-[10px] text-gray-500">Valores em kwanzas (kz)</p>
        </div>

        <div className="p-2.5">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">Valores rápidos</p>
          <div className="grid grid-cols-2 gap-1.5">
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
    ) : null

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={toggleOpen}
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

      {typeof document !== 'undefined' &&
        createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)}
    </div>
  )
}
