import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getAdminThemeTokens,
  getAdminSurfaceVars,
  readAdminTheme,
  writeAdminTheme,
  type AdminThemeMode,
  type AdminThemeTokens,
} from '../lib/adminTheme'

type AdminThemeContextValue = {
  theme: AdminThemeMode
  t: AdminThemeTokens
  surfaceVars: Record<string, string>
  setTheme: (mode: AdminThemeMode) => void
  toggleTheme: () => void
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null)

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminThemeMode>(() => readAdminTheme())

  const setTheme = useCallback((mode: AdminThemeMode) => {
    setThemeState(mode)
    writeAdminTheme(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      writeAdminTheme(next)
      return next
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-admin-theme', theme)
    const vars = getAdminSurfaceVars(theme)
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value)
    }
    return () => {
      root.removeAttribute('data-admin-theme')
      for (const key of Object.keys(vars)) {
        root.style.removeProperty(key)
      }
    }
  }, [theme])

  const t = useMemo(() => getAdminThemeTokens(theme), [theme])
  const surfaceVars = useMemo(() => getAdminSurfaceVars(theme), [theme])

  const value = useMemo(
    () => ({ theme, t, surfaceVars, setTheme, toggleTheme }),
    [theme, t, surfaceVars, setTheme, toggleTheme]
  )

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext)
  if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider')
  return ctx
}
