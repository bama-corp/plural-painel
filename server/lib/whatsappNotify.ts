import { prisma } from './prisma.js'
import {
  sendWhatsAppMessage,
  normalizeClientWhatsappKey,
  templates,
} from '../services/whatsapp.js'
import {
  publishNtfy,
  ntfyTitleForCategories,
  ntfyTagsForCategories,
  ntfyPriorityForCategories,
} from '../services/ntfy.js'
import type { PanelAlertCategory } from './panelAlertPrefs.js'

export type { PanelAlertCategory } from './panelAlertPrefs.js'

/** @deprecated Usar PanelAlertCategory em notifyPanelUsers */
export type PanelAlertScope = 'admin' | 'geral' | 'financeiro' | 'netflix' | 'iptv' | 'suporte' | 'all'

function panelClickUrl(): string | undefined {
  const base = (
    process.env.PANEL_PUBLIC_URL ||
    process.env.ROVE_PUBLIC_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    ''
  ).replace(/\/$/, '')
  return base || undefined
}

/**
 * Alerta interno da equipa via ntfy (tópico partilhado).
 * Mensagens a clientes continuam no WhatsApp.
 */
export async function notifyPanelUsers(
  categories: PanelAlertCategory | PanelAlertCategory[],
  message: string
): Promise<void> {
  const wanted = Array.isArray(categories) ? categories : [categories]
  const body = message.trim()
  if (!body) return

  void publishNtfy({
    title: ntfyTitleForCategories(wanted),
    message: body,
    tags: ntfyTagsForCategories(wanted),
    priority: ntfyPriorityForCategories(wanted),
    click: panelClickUrl(),
  }).catch(() => {})
}

type ClientWhatsappTarget = { id: number; nome: string; whatsapp: string }

/**
 * Envia WhatsApp de vencimento/suspensão e só marca `whatsappNotificadoVencimentoAt`
 * se o envio tiver sucesso (permite retry no cron).
 */
export async function notifyClientVencimento(
  client: ClientWhatsappTarget,
  kind: 'periodo' | 'suspenso' = 'periodo'
): Promise<boolean> {
  if (!client.whatsapp?.trim()) return false
  const msg =
    kind === 'suspenso' ? templates.servicoSuspenso(client.nome) : templates.periodoVencido(client.nome)
  const ok = await sendWhatsAppMessage(client.whatsapp, msg)
  if (ok) {
    await prisma.client.update({
      where: { id: client.id },
      data: { whatsappNotificadoVencimentoAt: new Date() },
    })
  }
  return ok
}

/**
 * Marca ativos com data fim passada como vencido e envia WhatsApp (uma vez, até sucesso).
 * Também tenta de novo clientes já vencidos ainda sem notificação.
 */
export async function markExpiredClientsStatus(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const r = await prisma.client.updateMany({
    where: { status: 'ativo', dataFim: { lt: today } },
    data: { status: 'vencido' },
  })
  return r.count
}

export async function notifyPendingVencidosWhatsApp(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pendentes = await prisma.client.findMany({
    where: {
      status: 'vencido',
      dataFim: { lt: today },
      whatsappNotificadoVencimentoAt: null,
    },
    select: { id: true, nome: true, whatsapp: true },
  })
  let sent = 0
  for (const c of pendentes) {
    if (await notifyClientVencimento(c, 'periodo')) sent++
  }
  return sent
}

export async function syncExpiredClientsAndNotifyWhatsApp(): Promise<number> {
  await markExpiredClientsStatus()
  return notifyPendingVencidosWhatsApp()
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
