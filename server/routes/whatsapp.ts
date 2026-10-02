import { Router } from 'express'
import {
  authMiddleware,
  requireAdmin,
  canAccessSuporte,
} from '../middleware/auth.js'
import type { AuthPayload } from '../middleware/auth.js'
import {
  sendWhatsAppMessageDetailed,
  getBusinessPhone,
  formatClientMessage,
} from '../services/whatsapp.js'

const router = Router()

router.use(authMiddleware)

async function fetchWhatsappHealth(apiUrl: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const healthRes = await fetch(`${apiUrl}/health`, { signal: controller.signal })
    return (await healthRes.json().catch(() => ({}))) as {
      ok?: boolean
      whatsapp?: boolean
      awaitingQr?: boolean
      initError?: string
    }
  } finally {
    clearTimeout(timeout)
  }
}

/** Estado da ligação à API WhatsApp (Railway). Roles do centro de suporte. */
router.get('/status', async (req, res) => {
  const user = (req as unknown as { user: AuthPayload }).user
  if (!canAccessSuporte(user.role)) {
    return res.status(403).json({ error: 'Sem permissão' })
  }
  try {
    const apiUrl = process.env.WHATSAPP_API_URL?.replace(/\/$/, '')
    const token = process.env.WHATSAPP_TOKEN
    if (!apiUrl || !token) {
      return res.json({
        configured: false,
        connected: false,
        message: 'Defina WHATSAPP_API_URL e WHATSAPP_TOKEN no .env',
      })
    }
    const health = await fetchWhatsappHealth(apiUrl)
    const initError =
      typeof health.initError === 'string' && health.initError.trim()
        ? health.initError.trim()
        : undefined
    let message = health.whatsapp
      ? 'WhatsApp ligado e pronto a enviar.'
      : 'WhatsApp não está online na API.'
    if (!health.whatsapp && initError) {
      message = `WhatsApp não online: ${initError}`
    } else if (!health.whatsapp && health.awaitingQr) {
      message = 'Aguarda QR Code — abre /pair no Railway e escaneia de novo.'
    }
    return res.json({
      configured: true,
      apiUrl,
      ok: health.ok === true,
      connected: health.whatsapp === true,
      awaitingQr: health.awaitingQr === true,
      initError,
      message,
      /** Abrir no browser e escanear QR (WhatsApp → Dispositivos ligados). */
      pairUrl: `${apiUrl}/pair?token=${encodeURIComponent(token)}`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao consultar API WhatsApp'
    return res.status(503).json({
      configured: !!process.env.WHATSAPP_API_URL,
      connected: false,
      message: msg,
    })
  }
})

/** Envia mensagem de teste (admin). Body: { phone?: string } */
router.post('/test', requireAdmin, async (req, res) => {
  try {
    const raw = req.body?.phone != null ? String(req.body.phone) : getBusinessPhone()
    const phone = raw.replace(/\D/g, '')
    if (phone.length < 8) {
      return res.status(400).json({ error: 'Número inválido para teste.' })
    }
    const msg = formatClientMessage(
      'Teste de envio Rove+ Painel. Se recebeu esta mensagem, o WhatsApp está a funcionar.'
    )
    const result = await sendWhatsAppMessageDetailed(raw, msg)
    if (!result.ok) {
      const apiUrl = process.env.WHATSAPP_API_URL?.replace(/\/$/, '')
      const token = process.env.WHATSAPP_TOKEN
      const pairUrl =
        apiUrl && token ? `${apiUrl}/pair?token=${encodeURIComponent(token)}` : undefined
      return res.status(503).json({
        ok: false,
        sent: false,
        phone,
        error: result.error,
        pairUrl,
        hint: pairUrl
          ? 'Abra o link pairUrl, escaneie o QR no telemóvel (+244 933623143) e tente de novo.'
          : 'Configure WHATSAPP_API_URL e WHATSAPP_TOKEN; depois escaneie o QR em /pair no Railway.',
      })
    }
    res.json({ ok: true, sent: true, phone, message: 'Mensagem de teste enviada. Verifique o WhatsApp.' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao enviar teste WhatsApp'
    res.status(500).json({ error: 'Erro ao enviar teste', detail: msg })
  }
})

/** Reinicia o browser WhatsApp na API (Railway). Admin — útil antes de novo QR. */
router.post('/restart', requireAdmin, async (req, res) => {
  try {
    const apiUrl = process.env.WHATSAPP_API_URL?.replace(/\/$/, '')
    const token = process.env.WHATSAPP_TOKEN
    if (!apiUrl || !token) {
      return res.status(400).json({ error: 'WHATSAPP_API_URL ou WHATSAPP_TOKEN em falta' })
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45_000)
    const restartRes = await fetch(`${apiUrl}/restart`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    clearTimeout(timeout)
    const body = (await restartRes.json().catch(() => ({}))) as { error?: string }
    if (!restartRes.ok) {
      return res.status(restartRes.status).json({
        ok: false,
        error: body.error || restartRes.statusText,
      })
    }
    const health = await fetchWhatsappHealth(apiUrl)
    const pairUrl = `${apiUrl}/pair?token=${encodeURIComponent(token)}`
    res.json({
      ok: true,
      message: 'API reiniciada. Se ainda não estiver ligado, abra pairUrl e escaneie o QR.',
      pairUrl,
      connected: health.whatsapp === true,
      awaitingQr: health.awaitingQr === true,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao reiniciar WhatsApp'
    res.status(500).json({ error: msg })
  }
})

export default router
