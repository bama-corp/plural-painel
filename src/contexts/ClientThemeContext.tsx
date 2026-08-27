import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getClientThemeTokens,
  readClientTheme,
  writeClientTheme,
  type ClientThemeMode,
  type ClientThemeTokens,
} from '../lib/clientTheme'

type ClientThemeContextValue = {
  theme: ClientThemeMode
  t: ClientThemeTokens
  setTheme: (mode: ClientThemeMode) => void
  toggleTheme: () => void
}

const ClientThemeContext = createContext<ClientThemeContextValue | null>(null)

export function ClientThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ClientThemeMode>(() => readClientTheme())

  const setTheme = useCallback((mode: ClientThemeMode) => {
    setThemeState(mode)
    writeClientTheme(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      writeClientTheme(next)
      return next
    })
  }, [])

  const t = useMemo(() => getClientThemeTokens(theme), [theme])

  const value = useMemo(
    () => ({ theme, t, setTheme, toggleTheme }),
    [theme, t, setTheme, toggleTheme]
  )

  return <ClientThemeContext.Provider value={value}>{children}</ClientThemeContext.Provider>
}

export function useClientTheme() {
  const ctx = useContext(ClientThemeContext)
  if (!ctx) throw new Error('useClientTheme must be used within ClientThemeProvider')
  return ctx
}
