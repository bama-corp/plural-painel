import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Server,
  Store,
  LayoutGrid,
  Gift,
  FileText,
  BookOpen,
  DollarSign,
  LogOut,
  Bell,
  User,
} from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { tratamentoNome } from '../utils/tratamento'
import {
  countNotifBadge,
  loadNotifBadgePrefs,
  type NotifBadgeStats,
} from '../lib/notifBadgePrefs'

const STAFF_ROLES = ['admin', 'geral', 'netflix', 'iptv', 'suporte'] as const

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: [...STAFF_ROLES] },
  { to: '/clientes', icon: Users, label: 'Clientes', roles: [...STAFF_ROLES] },
  { to: '/servidores', icon: Server, label: 'Servidores', roles: ['admin', 'geral', 'iptv', 'suporte'] },
  { to: '/revendedores', icon: Store, label: 'Revendedores', roles: ['admin', 'geral', 'iptv', 'suporte'] },
  { to: '/salas', icon: LayoutGrid, label: 'Salas', roles: ['admin', 'geral', 'netflix', 'suporte'] },
  { to: '/indicacoes', icon: Gift, label: 'Indicações', roles: [...STAFF_ROLES] },
  { to: '/utilizadores', icon: UserCog, label: 'Utilizadores', roles: ['admin'] },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro', roles: ['admin', 'financeiro'] },
  { to: '/audit', icon: FileText, label: 'Log', roles: ['admin'] },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [alertaCount, setAlertaCount] = useState(0)

  const refreshAlertas = useCallback(() => {
    const prefs = loadNotifBadgePrefs()
    api
      .get<NotifBadgeStats>('/api/dashboard')
      .then((data) => setAlertaCount(countNotifBadge(data, prefs, user?.role)))
      .catch(() => {
        /* silencioso — o badge some se falhar */
      })
  }, [user?.role])

  useEffect(() => {
    refreshAlertas()
    const id = window.setInterval(refreshAlertas, 60_000)
    const onPrefs = () => refreshAlertas()
    window.addEventListener('plural:notif-badge-prefs', onPrefs)
    window.addEventListener('storage', onPrefs)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('plural:notif-badge-prefs', onPrefs)
      window.removeEventListener('storage', onPrefs)
    }
  }, [refreshAlertas, location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const visibleNav = nav.filter(
    (item) => !item.roles || !user?.role || item.roles.includes(user.role)
  )

  const badgeLabel = alertaCount > 99 ? '99+' : String(alertaCount)

  return (
    <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-netflix-bg">
      <header className="plural-header-edge flex h-14 shrink-0 items-center gap-2 bg-netflix-bg/95 px-3 backdrop-blur-sm sm:px-4">
        <Link
          to={user?.role === 'financeiro' ? '/financeiro' : '/dashboard'}
          className="flex shrink-0 items-center"
          title="Dashboard"
          aria-label="Ir para o dashboard"
        >
          <img src="/logo/plural-mark.png" alt="plural" className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium text-white sm:text-base">Painel Plural</h1>
          {user?.nome && (
            <p className="truncate text-[11px] text-gray-500">{tratamentoNome(user.nome)}</p>
          )}
        </div>
        <Link
          to="/notificacoes"
          className={`relative rounded-md p-2 text-gray-300 transition-shadow hover:bg-white/10 hover:text-white ${
            location.pathname === '/notificacoes' ? 'plural-edge-soft bg-white/10 text-white' : ''
          }`}
          aria-label={
            alertaCount > 0
              ? `Notificações: ${alertaCount} alertas`
              : 'Notificações'
          }
          title={
            alertaCount > 0
              ? `${alertaCount} alerta${alertaCount === 1 ? '' : 's'} (conforme as tuas preferências)`
              : 'Notificações'
          }
        >
          <Bell className="h-5 w-5" />
          {alertaCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-black shadow-sm">
              {badgeLabel}
            </span>
          )}
        </Link>
        <Link
          to="/manual"
          className={`rounded-md p-2 text-gray-300 transition-shadow hover:bg-white/10 hover:text-white ${
            location.pathname === '/manual' ? 'plural-edge-soft bg-white/10 text-white' : ''
          }`}
          aria-label="Manual"
          title="Manual"
        >
          <BookOpen className="h-5 w-5" />
        </Link>
        <Link
          to="/perfil"
          className={`rounded-md p-2 text-gray-300 transition-shadow hover:bg-white/10 hover:text-white ${
            location.pathname === '/perfil' ? 'plural-edge-soft bg-white/10 text-white' : ''
          }`}
          aria-label="Meu perfil"
          title="Meu perfil"
        >
          <User className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="rove-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 pb-24 [-webkit-overflow-scrolling:touch] sm:p-6 sm:pb-28">
        <Outlet />
      </main>

      <nav
        className="plural-nav-edge fixed inset-x-0 bottom-0 z-40 bg-netflix-bg/95 backdrop-blur-xl"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Navegação principal"
      >
        <div className="flex items-stretch gap-1 overflow-x-auto overscroll-x-contain px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleNav.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`plural-nav-item flex min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all sm:min-w-[4.75rem] sm:text-[11px] ${
                  isActive
                    ? 'plural-nav-item-active bg-white text-black'
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
                }`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="max-w-[4.5rem] truncate leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
