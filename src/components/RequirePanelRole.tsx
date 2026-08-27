import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { defaultPanelPath } from '../lib/panelRoles'

export function RequirePanelRole({
  allow,
  children,
}: {
  allow: string[]
  children: React.ReactNode
}) {
  const { user } = useAuth()
  if (user && !allow.includes(user.role)) {
    return <Navigate to={defaultPanelPath(user.role)} replace />
  }
  return <>{children}</>
}
