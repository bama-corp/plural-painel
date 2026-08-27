import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

type AlertVariant = 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  variant: AlertVariant
}

interface AlertContextValue {
  showAlert: (message: string, variant?: AlertVariant) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
}

const AlertContext = createContext<AlertContextValue | null>(null)

const variantStyles: Record<
  AlertVariant,
  { icon: typeof AlertCircle; wrap: string; iconColor: string; text: string }
> = {
  error: {
    icon: AlertCircle,
    wrap: 'bg-red-50 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_1px_rgba(220,38,38,0.18)]',
    iconColor: 'text-red-600',
    text: 'text-red-800',
  },
  warning: {
    icon: AlertTriangle,
    wrap: 'bg-amber-50 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_1px_rgba(217,119,6,0.2)]',
    iconColor: 'text-amber-600',
    text: 'text-amber-900',
  },
  info: {
    icon: Info,
    wrap: 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]',
    iconColor: 'text-neutral-700',
    text: 'text-neutral-800',
  },
}

const AUTO_DISMISS_MS = 5200

export function AlertProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const showAlert = useCallback((message: string, variant: AlertVariant = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((list) => [...list.slice(-4), { id, message, variant }])
  }, [])

  const showError = useCallback((message: string) => showAlert(message, 'error'), [showAlert])
  const showWarning = useCallback((message: string) => showAlert(message, 'warning'), [showAlert])
  const showInfo = useCallback((message: string) => showAlert(message, 'info'), [showAlert])

  const value: AlertContextValue = { showAlert, showError, showWarning, showInfo }

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-20 right-4 z-[200] flex w-[min(100vw-2rem,22rem)] flex-col gap-2.5 sm:bottom-24"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </AlertContext.Provider>
  )
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: number) => void
}) {
  const styles = variantStyles[toast.variant]
  const Icon = styles.icon

  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS)
    return () => window.clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, x: 12 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 8, x: 12 }}
      transition={{ duration: 0.22 }}
      className={`pointer-events-auto flex items-start gap-2.5 rounded-md px-3.5 py-3 ${styles.wrap}`}
      role={toast.variant === 'error' ? 'alert' : 'status'}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.iconColor}`} aria-hidden />
      <p className={`flex-1 min-w-0 text-sm leading-snug ${styles.text}`}>{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-700"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert must be used within AlertProvider')
  return ctx
}
