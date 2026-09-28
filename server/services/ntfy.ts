/**
 * Alertas internos do painel via ntfy (https://ntfy.sh).
 * Mensagens a clientes continuam no WhatsApp.
 *
 * Env:
 * - NTFY_TOPIC (obrigatório para enviar) — ex.: plural-painel-a7f3k9
 * - NTFY_BASE_URL (opcional, default https://ntfy.sh)
 * - NTFY_TOKEN (opcional) — Bearer token se o tópico exigir auth
 */

import type { PanelAlertCategory } from '../lib/panelAlertPrefs.js'

const DEFAULT_BASE = 'https://ntfy.sh'

const CATEGORY_TITLE: Record<PanelAlertCategory, string> = {
  clientes_netflix: 'Clientes Netflix',
  clientes_iptv: 'Clientes IPTV',
  financeiro: 'Financeiro',
  salas: 'Salas Netflix',
  servidores: 'Servidores',
  indicacoes: 'Indicações',
  utilizadores: 'Utilizadores',
  resumo: 'Resumo do painel',
}

const CATEGORY_TAGS: Record<PanelAlertCategory, string> = {
  clientes_netflix: 'tv,busts_in_silhouette',
  clientes_iptv: 'satellite,busts_in_silhouette',
  financeiro: 'moneybag',
  salas: 'door',
  servidores: 'computer',
  indicacoes: 'gift',
  utilizadores: 'key',
  resumo: 'clipboard',
}

function baseUrl(): string {
  return (process.env.NTFY_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
}

function topic(): string | null {
  const t = process.env.NTFY_TOPIC?.trim()
  return t && /^[-_A-Za-z0-9]{1,64}$/.test(t) ? t : null
}

export function isNtfyConfigured(): boolean {
  return topic() != null
}

export type NtfyPublishOptions = {
  title?: string
  message: string
  /** 1 (min) … 5 (max). Default 3. */
  priority?: 1 | 2 | 3 | 4 | 5
  tags?: string
  click?: string
}

/** Publica uma notificação no tópico configurado. Sem NTFY_TOPIC, não faz nada. */
export async function publishNtfy(opts: NtfyPublishOptions): Promise<boolean> {
  const t = topic()
  if (!t) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[ntfy] NTFY_TOPIC em falta — alerta do painel não enviado')
    }
    return false
  }

  const url = `${baseUrl()}/${t}`
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
  }
  if (opts.title) headers['Title'] = opts.title
  if (opts.priority != null) headers['Priority'] = String(opts.priority)
  if (opts.tags) headers['Tags'] = opts.tags
  if (opts.click) headers['Click'] = opts.click
  const token = process.env.NTFY_TOKEN?.trim()
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: opts.message.trim(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[ntfy] Falha ao publicar:', res.status, text.slice(0, 200))
      return false
    }
    return true
  } catch (e) {
    console.error('[ntfy] Erro de rede:', e instanceof Error ? e.message : e)
    return false
  }
}

export function ntfyTitleForCategories(
  categories: PanelAlertCategory | PanelAlertCategory[]
): string {
  const list = Array.isArray(categories) ? categories : [categories]
  if (list.length === 0) return 'plural Painel'
  if (list.length === 1) return `plural · ${CATEGORY_TITLE[list[0]]}`
  return `plural · ${list.map((c) => CATEGORY_TITLE[c]).join(', ')}`
}

export function ntfyTagsForCategories(
  categories: PanelAlertCategory | PanelAlertCategory[]
): string {
  const list = Array.isArray(categories) ? categories : [categories]
  const tags = list.map((c) => CATEGORY_TAGS[c]).join(',')
  return tags || 'bell'
}

export function ntfyPriorityForCategories(
  categories: PanelAlertCategory | PanelAlertCategory[]
): 1 | 2 | 3 | 4 | 5 {
  const list = Array.isArray(categories) ? categories : [categories]
  if (list.some((c) => c === 'financeiro' || c === 'resumo')) return 4
  if (list.some((c) => c === 'salas' || c === 'servidores')) return 4
  return 3
}

/** URL pública do tópico (para documentação / UI). */
export function ntfySubscribeUrl(): string | null {
  const t = topic()
  if (!t) return null
  return `${baseUrl()}/${t}`
}
