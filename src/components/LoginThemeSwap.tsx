import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export type LoginTheme = 'light' | 'dark'

type SwapState = {
  active: boolean
  to: string
  fromTheme: LoginTheme
  theme: LoginTheme
  phase: 'cover' | 'reveal'
} | null

type LoginThemeSwapContextValue = {
  swapTo: (to: string, theme: LoginTheme) => void
}

const LoginThemeSwapContext = createContext<LoginThemeSwapContextValue | null>(null)

const THEME_BG: Record<LoginTheme, string> = {
  light: '#fafafa',
  dark: '#000000',
}

type Speck = {
  id: number
  layer: 0 | 1 | 2
  x: number
  y: number
  size: number
  delay: number
  duration: number
  dx: number
  dy: number
  rotate: number
  blur: number
  opacityPeak: number
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function buildSpecks(): Speck[] {
  const out: Speck[] = []
  let i = 0

  // Camada fina — poeira
  for (let n = 0; n < 160; n++, i++) {
    const t = seededRandom(i * 3.1)
    const u = seededRandom(i * 7.7)
    const angle = t * Math.PI * 2
    const radius = 18 + u * 92
    out.push({
      id: i,
      layer: 0,
      x: 50 + (seededRandom(i + 1) - 0.5) * 22,
      y: 58 + (seededRandom(i + 2) - 0.5) * 16,
      size: 1 + seededRandom(i + 3) * 2.2,
      delay: seededRandom(i + 4) * 0.42,
      duration: 1.25 + seededRandom(i + 5) * 0.7,
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius * 0.9 - 10,
      rotate: (seededRandom(i + 6) - 0.5) * 160,
      blur: seededRandom(i + 7) > 0.65 ? 0.8 : 0,
      opacityPeak: 0.3 + seededRandom(i + 8) * 0.4,
    })
  }

  // Camada média — grãos
  for (let n = 0; n < 90; n++, i++) {
    const t = seededRandom(i * 2.4)
    const u = seededRandom(i * 5.2)
    const angle = t * Math.PI * 2
    const radius = 28 + u * 78
    out.push({
      id: i,
      layer: 1,
      x: 50 + (seededRandom(i + 11) - 0.5) * 12,
      y: 60 + (seededRandom(i + 12) - 0.5) * 10,
      size: 2.2 + seededRandom(i + 13) * 3.2,
      delay: 0.06 + seededRandom(i + 14) * 0.36,
      duration: 1.15 + seededRandom(i + 15) * 0.55,
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius * 0.92 - 8,
      rotate: (seededRandom(i + 16) - 0.5) * 100,
      blur: seededRandom(i + 17) > 0.5 ? 1.4 : 0.5,
      opacityPeak: 0.45 + seededRandom(i + 18) * 0.4,
    })
  }

  // Camada suave — brilhos alongados
  for (let n = 0; n < 40; n++, i++) {
    const t = seededRandom(i * 1.9)
    const angle = t * Math.PI * 2
    const radius = 36 + seededRandom(i * 4.1) * 70
    out.push({
      id: i,
      layer: 2,
      x: 50 + (seededRandom(i + 21) - 0.5) * 8,
      y: 62 + (seededRandom(i + 22) - 0.5) * 6,
      size: 0.9 + seededRandom(i + 23) * 1.5,
      delay: 0.1 + seededRandom(i + 24) * 0.32,
      duration: 1.35 + seededRandom(i + 25) * 0.55,
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius * 0.8 - 14,
      rotate: angle * (180 / Math.PI),
      blur: 1.8 + seededRandom(i + 26) * 2.4,
      opacityPeak: 0.22 + seededRandom(i + 27) * 0.32,
    })
  }

  return out
}

function ThemeParticles({
  fromTheme,
  toTheme,
  phase,
}: {
  fromTheme: LoginTheme
  toTheme: LoginTheme
  phase: 'cover' | 'reveal'
}) {
  const specks = useMemo(() => buildSpecks(), [])
  const fromColor = THEME_BG[fromTheme]
  const toColor = THEME_BG[toTheme]
  const midColor = toTheme === 'dark' ? '#2a2a2a' : '#e8e8e8'
  const glow =
    toTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  return (
    <motion.div
      className="fixed inset-0 z-[300] overflow-hidden pointer-events-none"
      style={{ backgroundColor: 'transparent' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'reveal' ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: phase === 'reveal' ? 0.75 : 0.18, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      {/* Véu de fundo — dissolve suave */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, backgroundColor: fromColor }}
        animate={{
          opacity: phase === 'cover' ? [0, 0.4, 0.85, 1] : 0,
          backgroundColor: [fromColor, midColor, midColor, toColor],
        }}
        transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1], times: [0, 0.35, 0.7, 1] }}
      />

      {/* Halo central subtil */}
      <motion.div
        className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 'min(95vw, 780px)',
          height: 'min(95vw, 780px)',
          background: `radial-gradient(circle, ${glow} 0%, transparent 72%)`,
        }}
        initial={{ scale: 0.25, opacity: 0 }}
        animate={{
          scale: phase === 'cover' ? [0.25, 1.05, 1.55] : 1.8,
          opacity: phase === 'cover' ? [0, 0.75, 0.2] : 0,
        }}
        transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
      />

      {specks.map((p) => {
        const isStreak = p.layer === 2
        return (
          <motion.span
            key={p.id}
            className="absolute will-change-transform"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: isStreak ? p.size * 9 : p.size,
              height: p.size,
              marginLeft: isStreak ? -(p.size * 4.5) : -p.size / 2,
              marginTop: -p.size / 2,
              borderRadius: isStreak ? 999 : '50%',
              filter: p.blur ? `blur(${p.blur}px)` : undefined,
              boxShadow: p.layer === 1 ? `0 0 ${p.size * 2.2}px ${glow}` : undefined,
            }}
            initial={{
              scale: 0.15,
              opacity: 0,
              x: 0,
              y: 0,
              rotate: 0,
              backgroundColor: fromColor,
            }}
            animate={
              phase === 'cover'
                ? {
                    scale: [0.15, 1.05, 1],
                    opacity: [0, p.opacityPeak * 0.55, p.opacityPeak, p.opacityPeak * 0.7, 0],
                    x: [`0vw`, `${p.dx * 0.35}vw`, `${p.dx * 0.7}vw`, `${p.dx}vw`],
                    y: [`0vh`, `${p.dy * 0.3}vh`, `${p.dy * 0.65}vh`, `${p.dy}vh`],
                    rotate: [0, p.rotate * 0.25, p.rotate * 0.65, p.rotate],
                    backgroundColor: [fromColor, fromColor, midColor, toColor, toColor],
                  }
                : {
                    opacity: 0,
                    scale: 0.55,
                    x: `${p.dx * 1.12}vw`,
                    y: `${p.dy * 1.12}vh`,
                    backgroundColor: toColor,
                  }
            }
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.16, 1, 0.3, 1],
              times: phase === 'cover' ? [0, 0.2, 0.5, 0.78, 1] : undefined,
              backgroundColor: {
                duration: p.duration * 1.05,
                delay: p.delay + 0.08,
                ease: [0.45, 0, 0.2, 1],
              },
            }}
          />
        )
      })}
    </motion.div>
  )
}

export function LoginThemeSwapProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [swap, setSwap] = useState<SwapState>(null)
  const [lastTheme, setLastTheme] = useState<LoginTheme>(() =>
    location.pathname === '/login' ? 'light' : 'dark'
  )

  const swapTo = useCallback(
    (to: string, theme: LoginTheme) => {
      if (swap?.active) return
      setSwap({
        active: true,
        to,
        fromTheme: lastTheme,
        theme,
        phase: 'cover',
      })
    },
    [lastTheme, swap?.active]
  )

  useEffect(() => {
    if (!swap || swap.phase !== 'cover') return
    const id = window.setTimeout(() => {
      setLastTheme(swap.theme)
      navigate(swap.to)
      setSwap((s) => (s ? { ...s, phase: 'reveal' } : null))
    }, 1100)
    return () => window.clearTimeout(id)
  }, [swap, navigate])

  useEffect(() => {
    if (!swap || swap.phase !== 'reveal') return
    const id = window.setTimeout(() => setSwap(null), 700)
    return () => window.clearTimeout(id)
  }, [swap])

  useEffect(() => {
    if (swap?.active) return
    if (location.pathname === '/login') setLastTheme('light')
    else if (location.pathname === '/' || location.pathname === '/cliente/login') setLastTheme('dark')
  }, [location.pathname, swap?.active])

  const value = useMemo(() => ({ swapTo }), [swapTo])

  return (
    <LoginThemeSwapContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence mode="wait">
            {swap?.active && (
              <ThemeParticles
                key="login-theme-particles"
                fromTheme={swap.fromTheme}
                toTheme={swap.theme}
                phase={swap.phase}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </LoginThemeSwapContext.Provider>
  )
}

export function useLoginThemeSwap() {
  const ctx = useContext(LoginThemeSwapContext)
  if (!ctx) {
    throw new Error('useLoginThemeSwap must be used within LoginThemeSwapProvider')
  }
  return ctx
}

export function LoginThemeSwapButton({
  to,
  theme,
  className,
  children,
}: {
  to: string
  theme: LoginTheme
  className?: string
  children: ReactNode
}) {
  const { swapTo } = useLoginThemeSwap()
  return (
    <button type="button" className={className} onClick={() => swapTo(to, theme)}>
      {children}
    </button>
  )
}
