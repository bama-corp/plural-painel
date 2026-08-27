import { prisma } from './prisma.js'
import {
  sendWhatsAppMessage,
  normalizeClientWhatsappKey,
  formatAdminMessage,
  templates,
} from '../services/whatsapp.js'
import { ensureUserAlertScopesColumn } from './userColumns.js'
import {
  type PanelAlertCategory,
  parseStoredAlertScopes,
  userReceivesCategories,
} from './panelAlertPrefs.js'

export type { PanelAlertCategory } from './panelAlertPrefs.js'

/** @deprecated Usar PanelAlertCategory em notifyPanelUsers */
export type PanelAlertScope = 'admin' | 'geral' | 'financeiro' | 'netflix' | 'iptv' | 'suporte' | 'all'

/** Envia alerta WhatsApp a operadores com a categoria activa nas preferências. */
export async function notifyPanelUsers(
  categories: PanelAlertCategory | PanelAlertCategory[],
  message: string
): Promise<void> {
  await ensureUserAlertScopesColumn().catch(() => {})

  const wanted = Array.isArray(categories) ? categories : [categories]

  const users = await prisma.user.findMany({
    where: { whatsapp: { not: null } },
    select: { id: true, whatsapp: true, role: true },
  })

  let statusMap: Record<number, string> = {}
  let alertScopesMap: Record<number, string | null> = {}
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: number; status: string; alert_scopes: string | null }>
    >('SELECT id, status, alert_scopes FROM "User"')
    for (const r of rows) {
      statusMap[r.id] = r.status
      alertScopesMap[r.id] = r.alert_scopes
    }
  } catch {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: number; status: string }>>(
        'SELECT id, status FROM "User"'
      )
      statusMap = Object.fromEntries(rows.map((r) => [r.id, r.status]))
    } catch {
      /* colunas opcionais */
    }
  }

  const msg = formatAdminMessage(message)
  const seen = new Set<string>()
  for (const u of users) {
    if (statusMap[u.id] === 'suspenso' || !u.whatsapp) continue
    const stored = parseStoredAlertScopes(alertScopesMap[u.id])
    if (!userReceivesCategories(stored, u.role, wanted)) continue
    const key = normalizeClientWhatsappKey(u.whatsapp)
    if (seen.has(key)) continue
    seen.add(key)
    void sendWhatsAppMessage(u.whatsapp, msg).catch(() => {})
  }
}

export async function notifyUniqueClients(
  clients: Array<{ nome: string; whatsapp: string }>,
  message: string | ((nome: string) => string)
): Promise<void> {
  const seen = new Set<string>()
  for (const c of clients) {
    const key = normalizeClientWhatsappKey(c.whatsapp)
    if (seen.has(key)) continue
    seen.add(key)
    const body = typeof message === 'string' ? message : message(c.nome)
    void sendWhatsAppMessage(c.whatsapp, body).catch(() => {})
  }
}

export async function notifySalaClients(
  salaId: number,
  message: string | ((nome: string, dataFim: string) => string)
): Promise<void> {
  const clients = await prisma.client.findMany({
    where: { salaId, status: { not: 'cancelado' } },
    select: { nome: true, whatsapp: true, dataFim: true },
  })
  const seen = new Set<string>()
  for (const c of clients) {
    const key = normalizeClientWhatsappKey(c.whatsapp)
    if (seen.has(key)) continue
    seen.add(key)
    const fim = c.dataFim.toLocaleDateString('pt-BR')
    const body = typeof message === 'string' ? message : message(c.nome, fim)
    void sendWhatsAppMessage(c.whatsapp, body).catch(() => {})
  }
}

export async function notifyServidorClients(
  servidorId: number,
  buildMessage: (nome: string) => string
): Promise<void> {
  const clients = await prisma.client.findMany({
    where: { servidorId, servico: 'iptv', status: { in: ['ativo', 'vencido'] } },
    select: { nome: true, whatsapp: true },
  })
  await notifyUniqueClients(clients, buildMessage)
}

export function clientAreaUrl(): string {
  const base = (
    process.env.ROVE_PUBLIC_URL ||
    process.env.PANEL_PUBLIC_URL ||
    'https://roveplus-bpa.vercel.app'
  ).replace(/\/$/, '')
  return `${base}/cliente`
}

export function formatDateBr(d: Date): string {
  return d.toLocaleDateString('pt-BR')
}

/** Dias em que o cron envia lembrete de renovação (evita mensagem todos os dias). */
export const LEMBRETE_DIAS = [7, 3, 1, 0] as const

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Nova indicação registada — avisa indicador e equipa. */
export async function notifyIndicacaoCreated(
  indicadorId: number,
  indicadoNome: string,
  indicadoWhatsapp: string
): Promise<void> {
  const indicador = await prisma.client.findUnique({
    where: { id: indicadorId },
    select: { nome: true, whatsapp: true },
  })
  if (indicador?.whatsapp) {
    void sendWhatsAppMessage(
      indicador.whatsapp,
      templates.indicacaoRegistada(indicador.nome, indicadoNome)
    ).catch(() => {})
  }
  void notifyPanelUsers(
    'indicacoes',
    `Nova indicação pendente:\n• Indicado: ${indicadoNome} (${indicadoWhatsapp})\n• Indicador: ${indicador?.nome ?? `#${indicadorId}`}`
  )
}

/** Indicação confirmada — avisa indicador, indicado e equipa. */
export async function notifyIndicacaoConfirmed(indicacaoId: number): Promise<void> {
  const i = await prisma.indicacao.findUnique({
    where: { id: indicacaoId },
    include: { indicador: { select: { nome: true, whatsapp: true } } },
  })
  if (!i || i.status !== 'confirmada') return
  if (i.indicador.whatsapp) {
    void sendWhatsAppMessage(
      i.indicador.whatsapp,
      templates.indicacaoConfirmadaIndicador(i.indicador.nome, i.indicadoNome)
    ).catch(() => {})
  }
  if (i.indicadoWhatsapp) {
    void sendWhatsAppMessage(
      i.indicadoWhatsapp,
      templates.indicacaoConviteIndicado(i.indicadoNome, i.indicador.nome)
    ).catch(() => {})
  }
  void notifyPanelUsers(
    'indicacoes',
    `Indicação confirmada: ${i.indicadoNome} (${i.indicadoWhatsapp}) — indicador ${i.indicador.nome}.`
  )
}
