import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AlertProvider } from './contexts/AlertContext'
import { LoginThemeSwapProvider } from './components/LoginThemeSwap'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Servidores from './pages/Servidores'
import Revendedores from './pages/Revendedores'
import Salas from './pages/Salas'
import Indicacoes from './pages/Indicacoes'
import Audit from './pages/Audit'
import Utilizadores from './pages/Utilizadores'
import Financeiro from './pages/Financeiro'
import Manual from './pages/Manual'
import Notificacoes from './pages/Notificacoes'
import MeuPerfil from './pages/MeuPerfil'
import ClienteLogin from './pages/ClienteLogin'
import ClientArea from './pages/ClientArea'
import { useClientPortal } from './contexts/ClientPortalContext'
import { RequirePanelRole } from './components/RequirePanelRole'

const STAFF = ['admin', 'geral', 'netflix', 'iptv', 'suporte'] as const

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function ProtectedClienteRoute({ children }: { children: React.ReactNode }) {
  const { client, loading } = useClientPortal()
  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }
  if (!client) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <AlertProvider>
      <LoginThemeSwapProvider>
      <Routes>
      <Route path="/" element={<ClienteLogin />} />
      <Route path="/cliente/login" element={<Navigate to="/" replace />} />
      <Route
        path="/cliente"
        element={
          <ProtectedClienteRoute>
            <ClientArea />
          </ProtectedClienteRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<RequirePanelRole allow={[...STAFF]}><Dashboard /></RequirePanelRole>} />
        <Route path="/clientes" element={<RequirePanelRole allow={[...STAFF]}><Clientes /></RequirePanelRole>} />
        <Route path="/servidores" element={<RequirePanelRole allow={['admin', 'geral', 'iptv', 'suporte']}><Servidores /></RequirePanelRole>} />
        <Route path="/revendedores" element={<RequirePanelRole allow={['admin', 'geral', 'iptv', 'suporte']}><Revendedores /></RequirePanelRole>} />
        <Route path="/salas" element={<RequirePanelRole allow={['admin', 'geral', 'netflix', 'suporte']}><Salas /></RequirePanelRole>} />
        <Route path="/indicacoes" element={<RequirePanelRole allow={[...STAFF]}><Indicacoes /></RequirePanelRole>} />
        <Route path="/utilizadores" element={<RequirePanelRole allow={['admin']}><Utilizadores /></RequirePanelRole>} />
        <Route path="/financeiro" element={<RequirePanelRole allow={['admin', 'financeiro']}><Financeiro /></RequirePanelRole>} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/perfil" element={<MeuPerfil />} />
        <Route path="/audit" element={<RequirePanelRole allow={['admin']}><Audit /></RequirePanelRole>} />
        <Route path="/manual" element={<Manual />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </LoginThemeSwapProvider>
    </AlertProvider>
  )
}

export default App
