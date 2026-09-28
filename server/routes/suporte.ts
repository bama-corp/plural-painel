import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import {
  authMiddleware,
  canAccessServico,
  canAccessSuporte,
} from '../middleware/auth.js'
import type { AuthPayload } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import {
  formatClientMessage,
  sendWhatsAppMessageDetailed,
} from '../services/whatsapp.js'

const router = Router()
const MAX_MESSAGE_LEN = 2000

router.use(authMiddleware)

router.post(
  '/send',
  auditLog('send_support_message', 'client', (req) => {
    const id = Number(req.body?.clientId)
    return Number.isFinite(id) && id > 0 ? id : undefined
  }),
  async (req, res) => {
    const user = (req as unknown as { user: AuthPayload }).user
    if (!canAccessSuporte(user.role)) {
      return res.status(403).json({ error: 'Sem acesso ao centro de suporte' })
    }

    const clientId = Number(req.body?.clientId)
    if (!Number.isFinite(clientId) || clientId < 1) {
      return res.status(400).json({ error: 'Cliente inválido' })
    }

    const rawMessage = req.body?.message != null ? String(req.body.message).trim() : ''
    if (!rawMessage) {
      return res.status(400).json({ error: 'Mensagem obrigatória' })
    }
    if (rawMessage.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({
        error: `Mensagem demasiado longa (máx. ${MAX_MESSAGE_LEN} caracteres)`,
      })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        servico: true,
        status: true,
      },
    })
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
    if (!canAccessServico(user.role, client.servico)) {
      return res.status(403).json({ error: 'Sem acesso a este cliente' })
    }

    const phoneDigits = client.whatsapp.replace(/\D/g, '')
    if (phoneDigits.length < 8) {
      return res.status(400).json({ error: 'Cliente sem WhatsApp válido' })
    }

    const withNome = rawMessage.replace(/\{\{\s*nome\s*\}\}/gi, client.nome)
    const message = formatClientMessage(withNome)
    const result = await sendWhatsAppMessageDetailed(client.whatsapp, message)
    if (!result.ok) {
      const detail = result.error || 'WhatsApp não ligado'
      return res.status(503).json({
        ok: false,
        sent: false,
        error: `${detail}. Confirme a sessão no Railway (/pair) e tente de novo.`,
      })
    }

    const excerpt = withNome.length > 120 ? `${withNome.slice(0, 117)}…` : withNome
    res.json({
      ok: true,
      sent: true,
      clientId: client.id,
      nome: client.nome,
      whatsapp: client.whatsapp,
      excerpt,
    })
  }
)

export default router
