import { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChangeEvent, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'

type PanelLayout = {
  top: number
  left: number
  width: number
  placement: 'top' | 'bottom'
}

export type RoveSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

function parseOptions(children: ReactNode): RoveSelectOption[] {
  const options: RoveSelectOption[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return
    const props = child.props as {
      value?: string | number
      disabled?: boolean
      children?: ReactNode
    }
    options.push({
      value: String(props.value ?? ''),
      label: String(props.children ?? ''),
      disabled: !!props.disabled,
    })
  })
  return options
}

function getPlaceholder(options: RoveSelectOption[], explicit?: string): string {
  if (explicit) return explicit
  const empty = options.find((o) => o.value === '' || (o.disabled && o.value === ''))
  return empty?.label || 'Selecionar'
}

function syntheticChange(value: string): ChangeEvent<HTMLSelectElement> {
  return { target: { value } } as ChangeEvent<HTMLSelectElement>
}

type RoveSelectProps = {
  value: string | number
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
  placeholder?: string
  title?: string
  disabled?: boolean
  compact?: boolean
  required?: boolean
  /** Estilo do indicativo WhatsApp (prefixo à esquerda) */
  variant?: 'default' | 'prefix'
}

export function RoveSelect({
  value,
  onChange,
  children,
  placeholder,
  title,
  disabled = false,
  compact = false,
  required = false,
  variant = 'default',
}: RoveSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [panelLayout, setPanelLayout] = useState<PanelLayout | null>(null)

  const options = useMemo(() => parseOptions(children), [children])
  const selectable = options.filter((o) => !o.disabled)
  const strValue = String(value ?? '')
  const selected = options.find((o) => o.value === strValue && !o.disabled)
  const displayPlaceholder = getPlaceholder(options, placeholder)
  const displayLabel = selected?.label ?? (strValue ? strValue : displayPlaceholder)
  const hasValue = !!selected
  const isPrefix = variant === 'prefix'

  const updatePanelLayout = useCallback(() => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom
    const placement = spaceBelow >= spaceAbove ? 'bottom' : 'top'
    const gap = 8
    setPanelLayout({
      left: rect.left,
      width: isPrefix ? Math.max(rect.width, 160) : rect.width,
      placement,
      top: placement === 'bottom' ? rect.bottom + gap : rect.top - gap,
    })
  }, [isPrefix])

  useEffect(() => {
    if (!open) return
    updatePanelLayout()
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
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updatePanelLayout])

  function toggleOpen() {
    if (disabled) return
    if (!open) updatePanelLayout()
    setOpen((o) => !o)
  }

  function pick(option: RoveSelectOption) {
    if (option.disabled) return
    onChange(syntheticChange(option.value))
    setOpen(false)
  }

  const placement = panelLayout?.placement ?? 'bottom'

  const triggerClass = isPrefix
    ? `relative flex h-full min-w-[3.75rem] shrink-0 items-center border-0 border-r border-netflix-border/70 bg-netflix-hover font-bold tabular-nums tracking-wide text-gray-300 outline-none transition-colors hover:bg-netflix-panel focus:bg-netflix-panel ${
        compact ? 'rounded-l-lg px-2 py-1.5 pr-6 text-xs' : 'rounded-l-xl py-2.5 pl-2.5 pr-7 text-sm'
      }`
    : `flex w-full items-center justify-between gap-2 border border-netflix-border bg-netflix-panel text-left transition-colors outline-none ${
        compact ? 'min-h-[32px] rounded-md px-2.5 py-1.5 text-xs' : 'min-h-[42px] rounded-md px-3 py-2.5 text-sm'
      } ${
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:border-netflix-hover focus:ring-2 focus:ring-black/15 focus:border-neutral-400'
      } ${open && !isPrefix ? 'ring-2 ring-black/15 border-neutral-400' : ''}`

  const dropdownPanel =
    open && panelLayout ? (
      <motion.div
        ref={panelRef}
        role="listbox"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: panelLayout.top,
          left: panelLayout.left,
          width: panelLayout.width,
          transform: placement === 'top' ? 'translateY(-100%)' : undefined,
          zIndex: 200,
        }}
        className={`overflow-hidden rounded-md border border-netflix-border bg-netflix-card plural-edge shadow-xl ${
          isPrefix ? 'min-w-[10rem]' : 'min-w-[10rem]'
        }`}
      >
        <div className="border-b border-netflix-border/80 bg-netflix-panel px-3 py-2">
          <p className={`font-semibold text-white ${compact || isPrefix ? 'text-xs' : 'text-sm'}`}>
            {displayPlaceholder}
          </p>
        </div>

        <ul className={`rove-scrollbar max-h-52 overflow-y-auto p-1.5 ${compact || isPrefix ? 'text-xs' : 'text-sm'}`}>
          {selectable.map((option) => {
            const isSelected = option.value === strValue
            return (
              <li key={option.value || '__empty'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => pick(option)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left font-medium transition-all ${
                    isSelected
                      ? 'bg-white text-black shadow-sm'
                      : 'text-gray-200 hover:bg-netflix-hover hover:text-white'
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                </button>
              </li>
            )
          })}
        </ul>
      </motion.div>
    ) : null

  return (
    <div ref={rootRef} className={`relative ${isPrefix ? 'shrink-0' : 'w-full'}`}>
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={triggerClass}
      >
        <span
          className={`min-w-0 truncate ${
            isPrefix
              ? 'text-gray-300'
              : hasValue
                ? 'font-medium text-white'
                : 'text-gray-500'
          }`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={`shrink-0 transition-transform duration-200 ${
            isPrefix
              ? `absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`
              : `${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${open ? 'rotate-180 text-gray-400' : 'text-gray-500'}`
          }`}
        />
      </button>

      {required && (
        <select
          tabIndex={-1}
          aria-hidden
          value={strValue}
          required
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        >
          {children}
        </select>
      )}

      {typeof document !== 'undefined' &&
        createPortal(<AnimatePresence>{dropdownPanel}</AnimatePresence>, document.body)}
    </div>
  )
}
