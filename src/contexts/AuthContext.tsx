import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '../api/client'

export interface User {
  id: number
  nome: string
  email: string
  role: string
  whatsapp?: string | null
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const u = await api.get<User>('/api/auth/me')
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.post<{ user: User }>('/api/auth/login', { email, password })
    setUser(u.user)
    return u.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => {})
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
