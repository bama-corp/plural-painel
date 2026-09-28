/**
 * Notifica o ph-painel (webhook) após mudanças de cliente.
 * Env Plural: PH_PANEL_URL (ex. http://localhost:8787) + PH_API_KEY (Bearer partilhada).
 */

type PhHookPayload = {
  event: string
  clientId: number | string
  clientName?: string
  amount?: number
  at?: string
  servico?: string
}

export async function notifyPhPanel(payload: PhHookPayload): Promise<void> {
  const base = (process.env.PH_PANEL_URL || '').trim().replace(/\/$/, '')
  const key = (process.env.PH_API_KEY || '').trim()
  if (!base || !key) return

  try {
    const res = await fetch(`${base}/api/plural/hook`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        at: payload.at || new Date().toISOString().slice(0, 10),
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[PH hook]', res.status, text.slice(0, 200))
    }
  } catch (e) {
    console.error('[PH hook] falha de rede:', e instanceof Error ? e.message : e)
  }
}
