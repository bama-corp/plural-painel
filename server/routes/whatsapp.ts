import { Router } from 'express'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import {
  sendWhatsAppMessageDetailed,
  getBusinessPhone,
  formatClientMessage,
} from '../services/whatsapp.js'

const router = Router()

router.use(authMiddleware)
router.use(requireAdmin)

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

/** Estado da ligação à API WhatsApp (Railway). */
router.get('/status', async (_req, res) => {
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
      pairUrl: `${apiUrl}/pair`,
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
router.post('/test', async (req, res) => {
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
      return res.status(503).json({
        ok: false,
        sent: false,
        phone,
        error: result.error,
        hint: 'No Railway: POST /restart depois escaneie /pair de novo.',
      })
    }
    res.json({ ok: true, sent: true, phone, message: 'Mensagem de teste enviada. Verifique o WhatsApp.' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao enviar teste WhatsApp'
    res.status(500).json({ error: 'Erro ao enviar teste', detail: msg })
  }
})

export default router
