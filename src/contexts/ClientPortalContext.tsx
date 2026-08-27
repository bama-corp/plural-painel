import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { clientPortalApi } from '../api/clientPortal'
import { isClientLoginPath } from '../lib/publicRoutes'

export interface ClientPortalUser {
  id: number
  nome: string
}

interface ClientPortalContextValue {
  client: ClientPortalUser | null
  loading: boolean
  login: (whatsapp: string, pin: string) => Promise<void>
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const ClientPortalContext = createContext<ClientPortalContextValue | null>(null)

/** Rotas da app «cliente final»: /cliente e /cliente/... — não confundir com /clientes (painel admin). */
function isClienteAppPath(path: string): boolean {
  if (isClientLoginPath(path)) return false
  return path === '/cliente' || path.startsWith('/cliente/')
}

export function ClientPortalProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [client, setClient] = useState<ClientPortalUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const me = await clientPortalApi.get<{ id: number; nome: string }>('/api/client-portal/me')
      setClient({ id: me.id, nome: me.nome })
    } catch {
      setClient(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const path = location.pathname
    if (isClienteAppPath(path)) {
      setLoading(true)
      refetch()
    } else {
      setLoading(false)
    }
  }, [location.pathname, refetch])

  const login = useCallback(async (whatsapp: string, pin: string) => {
    const r = await clientPortalApi.post<{ client: ClientPortalUser }>('/api/client-portal/login', { whatsapp, pin })
    setClient(r.client)
    setLoading(false)
  }, [])

  const logout = useCallback(async () => {
    await clientPortalApi.post('/api/client-portal/logout').catch(() => {})
    setClient(null)
  }, [])

  return (
    <ClientPortalContext.Provider value={{ client, loading, login, logout, refetch }}>
      {children}
    </ClientPortalContext.Provider>
  )
}

export function useClientPortal() {
  const ctx = useContext(ClientPortalContext)
  if (!ctx) throw new Error('useClientPortal must be used within ClientPortalProvider')
  return ctx
}
