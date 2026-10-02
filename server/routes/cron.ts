import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { sendWhatsAppMessage, templates } from '../services/whatsapp.js'
import {
  syncExpiredClientsAndNotifyWhatsApp,
  LEMBRETE_DIAS,
  formatDateBr,
} from '../lib/whatsappNotify.js'
import { notifyPanelBadgeDigest } from '../lib/panelNotifDigest.js'

const router = Router()

// Chamar via Vercel Cron (GET /api/cron/alertas)
// - Na Vercel: Vercel envia Authorization: Bearer <CRON_SECRET>
// - Local: podes também usar ?secret=SEU_SECRET para testes
// Configurar em vercel.json: "crons": [{ "path": "/api/cron/alertas", "schedule": "0 5 * * *" }]
router.get('/alertas', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (process.env.NODE_ENV === 'production' && !secret) {
    return res
      .status(503)
      .json({ error: 'CRON não configurado. Defina CRON_SECRET no ambiente de produção.' })
  }
  if (secret) {
    // Vercel Cron normalmente chama com Authorization: Bearer <CRON_SECRET>
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
    const querySecret = typeof req.query.secret === 'string' ? req.query.secret : ''
    if (token !== secret && querySecret !== secret) {
      return res.status(401).json({ error: 'Não autorizado' })
    }
  }

  const testAdmin = req.query.testAdmin === '1'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)

  // Contagens auxiliares para o cron (lembretes WA + extras no digest)
  const salasVencendo = await prisma.sala.findMany({
    where: { status: 'ativo', dataFim: { gte: today, lte: in7Days } },
    select: { id: true, nome: true, dataFim: true },
    orderBy: { dataFim: 'asc' },
  })
  const salasVencidas = await prisma.sala.findMany({
    where: { status: 'ativo', dataFim: { lt: today } },
    select: { id: true, nome: true, dataFim: true },
    orderBy: { dataFim: 'asc' },
  })
  const servidoresProblema = await prisma.servidor.findMany({
    where: { status: { in: ['instável', 'offline'] } },
    select: { id: true, nome: true, status: true, _count: { select: { clients: true } } },
    orderBy: { nome: 'asc' },
  })

  await prisma.$executeRawUnsafe(`
    ALTER TABLE servidores ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP
  `).catch(() => {})
  const servidoresPagamento = await prisma.$queryRawUnsafe<
    Array<{ id: number; nome: string; data_pagamento: Date | null }>
  >(
    `SELECT id, nome, data_pagamento FROM servidores
     WHERE tipo = 'principal' AND data_pagamento IS NOT NULL
       AND data_pagamento >= $1 AND data_pagamento <= $2
     ORDER BY data_pagamento ASC`,
    today,
    in7Days
  ).catch(() => [])

  /** Vencidos: marcar + WhatsApp no número registado (retry até sucesso) + ntfy. */
  let vencidosAutoSent = 0
  if (!testAdmin) {
    vencidosAutoSent = await syncExpiredClientsAndNotifyWhatsApp()
  }

  const clients = await prisma.client.findMany({
    where: {
      status: 'ativo',
      dataFim: { gte: today, lte: in7Days },
    },
  })
  let sent = 0
  if (!testAdmin) {
    for (const c of clients) {
      const dataFim = new Date(c.dataFim)
      dataFim.setHours(0, 0, 0, 0)
      const dias = Math.ceil((dataFim.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      if (!LEMBRETE_DIAS.includes(dias as (typeof LEMBRETE_DIAS)[number])) continue
      const msg = templates.lembreteRenovacao(c.nome, c.dataFim.toLocaleDateString('pt-BR'), dias)
      const ok = await sendWhatsAppMessage(c.whatsapp, msg)
      if (ok) sent++
    }
  }

  const inscricoesPendentes = await prisma.client
    .count({
      where: { servico: 'netflix', inscricaoPaga: false, status: { not: 'cancelado' } },
    })
    .catch(() => 0)

  const extraLines: string[] = []
  if (!testAdmin) {
    if (vencidosAutoSent > 0) {
      extraLines.push(`Clientes notificados (vencimento automático WA): ${vencidosAutoSent}`)
    }
    if (sent > 0) {
      extraLines.push(`Lembretes de renovação enviados hoje: ${sent}`)
    }
    if (inscricoesPendentes > 0) {
      extraLines.push(`Inscrições Netflix pendentes: ${inscricoesPendentes}`)
    }
    if (servidoresPagamento.length > 0) {
      extraLines.push(
        `Servidores com pagamento nos próximos 7 dias: ${servidoresPagamento.length} (${servidoresPagamento
          .slice(0, 5)
          .map((s) => `${s.nome} (${formatDateBr(s.data_pagamento!)})`)
          .join(', ')}${servidoresPagamento.length > 5 ? '…' : ''})`
      )
    }
  }

  const digest = await notifyPanelBadgeDigest(
    testAdmin
      ? {
          testMessage:
            'Teste ntfy do painel (sino/notificações). Se recebeu esta notificação, está a funcionar.',
        }
      : { extraLines }
  )

  res.json({
    ok: true,
    total: testAdmin ? 0 : clients.length,
    sent,
    vencidosAutoNotificados: testAdmin ? undefined : vencidosAutoSent,
    testAdmin: testAdmin || undefined,
    ntfyDigestSent: digest.sent,
    badge: digest.stats,
    salasVencendo: salasVencendo.length,
    salasVencidas: salasVencidas.length,
    servidoresProblema: servidoresProblema.length,
  })
})

export default router
