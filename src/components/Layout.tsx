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
  MoreHorizontal,
  X,
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
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

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
      <header className="plural-header-edge relative flex h-14 shrink-0 items-center gap-1.5 bg-netflix-bg/95 px-3 backdrop-blur-sm sm:gap-2 sm:px-4">
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
            <p className="hidden truncate text-[11px] text-gray-500 sm:block">{tratamentoNome(user.nome)}</p>
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
        <div className="hidden items-center gap-0.5 sm:flex">
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
        </div>
        <div className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setHeaderMenuOpen((v) => !v)}
            className="rounded-md p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={headerMenuOpen ? 'Fechar menu' : 'Mais opções'}
            aria-expanded={headerMenuOpen}
          >
            {headerMenuOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          </button>
          {headerMenuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40"
                aria-label="Fechar menu"
                onClick={() => setHeaderMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[10.5rem] rounded-md border border-white/10 bg-netflix-panel py-1 shadow-xl">
                <Link
                  to="/manual"
                  onClick={() => setHeaderMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10"
                >
                  <BookOpen className="h-4 w-4" />
                  Manual
                </Link>
                <Link
                  to="/perfil"
                  onClick={() => setHeaderMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10"
                >
                  <User className="h-4 w-4" />
                  Meu perfil
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderMenuOpen(false)
                    void handleLogout()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="rove-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:p-6 sm:pb-28">
        <Outlet />
      </main>

      <nav
        className="plural-nav-edge fixed inset-x-0 bottom-0 z-40 bg-netflix-bg/95 backdrop-blur-xl"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Navegação principal"
      >
        <div className="grid grid-cols-5 gap-0.5 px-1 py-1.5 sm:flex sm:items-stretch sm:gap-1 sm:overflow-x-auto sm:overscroll-x-contain sm:px-2 sm:py-2 [scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
          {visibleNav.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`plural-nav-item flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-[9px] font-medium transition-all sm:min-w-[4.75rem] sm:flex-1 sm:px-2 sm:text-[11px] ${
                  isActive
                    ? 'plural-nav-item-active bg-white text-black'
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
                }`}
              >
                <item.icon className="h-[17px] w-[17px] shrink-0 sm:h-[18px] sm:w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="max-w-full truncate leading-tight px-0.5">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
