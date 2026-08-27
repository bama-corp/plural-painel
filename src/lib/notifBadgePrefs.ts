/** Preferências do badge do sino (header) — por browser, em localStorage. */

export const NOTIF_BADGE_KEYS = [
  'clientesVencidos',
  'vencendoEm7Dias',
  'salasVencidas',
  'salasVencendo',
  'indicacoesPendentes',
  'servidoresOffline',
] as const

export type NotifBadgeKey = (typeof NOTIF_BADGE_KEYS)[number]

export type NotifBadgePrefs = Record<NotifBadgeKey, boolean>

export const NOTIF_BADGE_META: Record<
  NotifBadgeKey,
  { label: string; description: string; roles?: string[] }
> = {
  clientesVencidos: {
    label: 'Clientes vencidos',
    description: 'Renovação em atraso',
  },
  vencendoEm7Dias: {
    label: 'A vencer (7 dias)',
    description: 'Clientes com data fim nos próximos 7 dias',
  },
  salasVencidas: {
    label: 'Salas vencidas',
    description: 'Salas Netflix com data fim já passada',
    roles: ['admin', 'geral', 'netflix', 'suporte'],
  },
  salasVencendo: {
    label: 'Salas a vencer',
    description: 'Salas Netflix nos próximos 7 dias',
    roles: ['admin', 'geral', 'netflix', 'suporte'],
  },
  indicacoesPendentes: {
    label: 'Indicações pendentes',
    description: 'Indicações por confirmar',
  },
  servidoresOffline: {
    label: 'Servidores offline / instáveis',
    description: 'Servidores que não estão online',
    roles: ['admin', 'geral', 'iptv', 'suporte'],
  },
}

export const DEFAULT_NOTIF_BADGE_PREFS: NotifBadgePrefs = {
  clientesVencidos: true,
  vencendoEm7Dias: true,
  salasVencidas: true,
  salasVencendo: true,
  indicacoesPendentes: true,
  servidoresOffline: true,
}

const STORAGE_KEY = 'plural.notifBadgePrefs'

export function loadNotifBadgePrefs(): NotifBadgePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_NOTIF_BADGE_PREFS }
    const parsed = JSON.parse(raw) as Partial<NotifBadgePrefs>
    return { ...DEFAULT_NOTIF_BADGE_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_NOTIF_BADGE_PREFS }
  }
}

export function saveNotifBadgePrefs(prefs: NotifBadgePrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  window.dispatchEvent(new CustomEvent('plural:notif-badge-prefs'))
}

export function isBadgeKeyVisibleForRole(key: NotifBadgeKey, role?: string): boolean {
  const roles = NOTIF_BADGE_META[key].roles
  if (!roles || !role) return true
  return roles.includes(role)
}

export type NotifBadgeStats = {
  clientesVencidos?: number
  vencendoEm7Dias?: number
  salasVencendo?: number
  salasVencidas?: number
  indicacoesPendentes?: number
  clientsByServidor?: { status: string }[]
}

export function countNotifBadge(
  data: NotifBadgeStats | null,
  prefs: NotifBadgePrefs,
  role?: string
): number {
  if (!data) return 0
  let n = 0

  if (prefs.clientesVencidos) n += Number(data.clientesVencidos ?? 0)
  if (prefs.vencendoEm7Dias) n += Number(data.vencendoEm7Dias ?? 0)
  if (prefs.indicacoesPendentes) n += Number(data.indicacoesPendentes ?? 0)

  if (isBadgeKeyVisibleForRole('salasVencidas', role) && prefs.salasVencidas) {
    n += Number(data.salasVencidas ?? 0)
  }
  if (isBadgeKeyVisibleForRole('salasVencendo', role) && prefs.salasVencendo) {
    n += Number(data.salasVencendo ?? 0)
  }
  if (isBadgeKeyVisibleForRole('servidoresOffline', role) && prefs.servidoresOffline) {
    n += (data.clientsByServidor ?? []).filter((s) => s.status !== 'online').length
  }

  return n
}
