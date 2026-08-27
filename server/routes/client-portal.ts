import { Router, type Request } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { normalizeClientWhatsappKey, sendWhatsAppMessage, formatClientMessage } from '../services/whatsapp.js'
import { notifyIndicacaoCreated } from '../lib/whatsappNotify.js'
import { clientPortalMiddleware, type ClientPortalJwtPayload } from '../middleware/clientPortalAuth.js'
import { setPortalPinPlainInDb } from '../lib/portalPinPlain.js'
import {
  clientPortalAuthRateLimit,
  clientPortalRecoverRateLimit,
  clientPortalAssistantRateLimit,
} from '../middleware/rateLimits.js'
import { ensureClientRoveId } from '../lib/roveId.js'
import {
  getAssistantWelcome,
  getAssistantReply,
  type ClientAssistantContext,
} from '../lib/clientAssistant.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 dias

type ClientPortalReq = Request & { clientPortal: ClientPortalJwtPayload }

async function ensurePortalFirstLoginColumn(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS portal_first_login BOOLEAN NOT NULL DEFAULT false
  `)
}

function diasAteDataFim(dataFim: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fim = new Date(dataFim)
  fim.setHours(0, 0, 0, 0)
  return Math.ceil((fim.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

async function findClientByWhatsappInput(input: string) {
  const key = normalizeClientWhatsappKey(input)
  if (key.length < 8) return null
  const rows = await prisma.client.findMany({ select: { id: true, whatsapp: true } })
  const hit = rows.find((r) => normalizeClientWhatsappKey(r.whatsapp) === key)
  if (!hit) return null
  return prisma.client.findUnique({ where: { id: hit.id } })
}

function generateTemporaryPortalPin(): string {
  // PIN temporário numérico para facilitar o primeiro acesso no telemóvel.
  return String(Math.floor(100000 + Math.random() * 900000))
}

router.post('/login', clientPortalAuthRateLimit, async (req, res) => {
  const { whatsapp, pin } = req.body as { whatsapp?: string; pin?: string }
  if (!whatsapp || !pin) {
    return res.status(400).json({ error: 'WhatsApp e PIN são obrigatórios' })
  }
  try {
    const client = await findClientByWhatsappInput(String(whatsapp))
    if (!client?.portalPinHash) {
      return res.status(401).json({
        error: 'Dados incorretos ou área cliente não ativada. Peça o PIN à Rove+.',
      })
    }
    if (!(await bcrypt.compare(String(pin), client.portalPinHash))) {
      return res.status(401).json({ error: 'WhatsApp ou PIN incorretos.' })
    }
    if (client.status === 'cancelado') {
      return res.status(403).json({ error: 'Conta cancelada. Contacte a Rove+.' })
    }
    const payload: ClientPortalJwtPayload = { clientId: client.id, typ: 'client_portal' }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
    res.cookie('client_token', token, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
    res.json({ ok: true, client: { id: client.id, nome: client.nome } })
  } catch (e) {
    console.error('[client-portal] login', e)
    res.status(500).json({ error: 'Erro ao iniciar sessão' })
  }
})

router.post('/recover-pin', clientPortalRecoverRateLimit, async (req, res) => {
  await ensurePortalFirstLoginColumn().catch(() => {})
  const { whatsapp } = req.body as { whatsapp?: string }
  if (!whatsapp) {
    return res.status(400).json({ error: 'WhatsApp é obrigatório.' })
  }
  try {
    const client = await findClientByWhatsappInput(String(whatsapp))
    // Resposta neutra para não expor se o número existe.
    if (!client || client.status === 'cancelado') {
      return res.json({
        ok: true,
        message:
          'Se o número estiver registado e ativo, enviaremos um PIN temporário por WhatsApp em instantes.',
      })
    }

    const tempPin = generateTemporaryPortalPin()
    const msg = formatClientMessage(
      [
        `Olá ${client.nome}!`,
        'Recebemos um pedido de recuperação do PIN da sua área cliente Rove+.',
        `PIN temporário: ${tempPin}`,
        'Por segurança, entre e altere o PIN no primeiro acesso (mín. 6 caracteres).',
      ].join('\n')
    )
    const sent = await sendWhatsAppMessage(client.whatsapp, msg).catch(() => false)
    if (!sent) {
      return res.status(503).json({
        error:
          'Não foi possível enviar o PIN temporário por WhatsApp neste momento. Tente novamente em instantes ou contacte o suporte.',
      })
    }

    const hash = await bcrypt.hash(tempPin, 10)
    await prisma.client.update({
      where: { id: client.id },
      data: { portalPinHash: hash },
    })
    try {
      await setPortalPinPlainInDb(client.id, tempPin)
    } catch (e) {
      console.error('[client-portal] recover-pin portal_pin_plain', e)
    }
    await prisma.$executeRawUnsafe('UPDATE clients SET portal_first_login = true WHERE id = $1', client.id).catch(() => {})

    return res.json({
      ok: true,
      message: 'PIN temporário enviado por WhatsApp. Use-o para entrar e altere-o no primeiro acesso.',
    })
  } catch (e) {
    console.error('[client-portal] recover-pin', e)
    return res.status(500).json({ error: 'Erro ao processar recuperação de PIN.' })
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('client_token', {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  res.json({ ok: true })
})

router.get('/me', clientPortalMiddleware, async (req, res) => {
  const { clientId } = (req as Request & { clientPortal: ClientPortalJwtPayload }).clientPortal
  await ensurePortalFirstLoginColumn().catch(() => {})
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { sala: { select: { id: true, nome: true, dataFim: true } }, servidor: { select: { id: true, nome: true, status: true } }, revendedor: { select: { nome: true } } },
  })
  if (!client) return res.status(401).json({ error: 'Sessão inválida' })
  const roveId = await ensureClientRoveId(clientId).catch(() => null)
  const portalFlag = await prisma
    .$queryRawUnsafe<Array<{ portal_first_login: boolean }>>(
      'SELECT portal_first_login FROM clients WHERE id = $1',
      clientId
    )
    .then((rows) => rows[0]?.portal_first_login ?? false)
    .catch(() => false)
  res.json({
    id: client.id,
    nome: client.nome,
    whatsapp: client.whatsapp,
    servico: client.servico,
    plano: client.plano,
    status: client.status,
    dataInicio: client.dataInicio,
    dataFim: client.dataFim,
    valor: Number(client.valor),
    perfil: client.perfil,
    pin: client.pin,
    localizacao: client.localizacao,
    sala: client.sala,
    servidor: client.servidor,
    revendedor: client.revendedor,
    iptvUser: client.iptvUser,
    iptvPassSet: !!(client.iptvPass && String(client.iptvPass).length > 0),
    iptvPass:
      client.iptvPass && String(client.iptvPass).length > 0 ? String(client.iptvPass) : null,
    iptvMac: client.iptvMac,
    roveId,
    iptvM3u: client.iptvM3u,
    inscricaoPaga: client.inscricaoPaga,
    indicacoes: client.indicacoes,
    portalFirstLogin: portalFlag,
  })
})

/** Avisos gerados a partir do estado da conta (renovação, lembrete WhatsApp, indicações, etc.). */
router.get('/notificacoes', clientPortalMiddleware, async (req, res) => {
  const { clientId } = (req as ClientPortalReq).clientPortal
  await ensurePortalFirstLoginColumn().catch(() => {})
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      status: true,
      dataFim: true,
      whatsappNotificadoVencimentoAt: true,
    },
  })
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })

  const indicacoesPendentes = await prisma.indicacao.count({
    where: { indicadorId: clientId, status: 'pendente' },
  })
  const portalFirstLogin = await prisma
    .$queryRawUnsafe<Array<{ portal_first_login: boolean }>>(
      'SELECT portal_first_login FROM clients WHERE id = $1',
      clientId
    )
    .then((rows) => rows[0]?.portal_first_login ?? false)
    .catch(() => false)

  const items: Array<{
    id: string
    tipo: 'info' | 'warning' | 'success' | 'danger'
    titulo: string
    mensagem: string
    em?: string
  }> = []

  const dias = diasAteDataFim(client.dataFim)
  const dataStr = new Date(client.dataFim).toLocaleDateString('pt-BR')

  if (client.status === 'cancelado') {
    items.push({
      id: 'conta-cancelada',
      tipo: 'danger',
      titulo: 'Conta cancelada',
      mensagem: 'A sua conta está cancelada. Contacte a Rove+ para mais informações.',
    })
  } else if (client.status === 'vencido') {
    items.push({
      id: 'subscricao-vencida',
      tipo: 'warning',
      titulo: 'Subscrição vencida',
      mensagem: `A renovação não foi efetuada. Data de fim: ${dataStr}. Fale connosco no WhatsApp para reativar o serviço.`,
    })
  } else if (client.status === 'ativo') {
    if (dias < 0) {
      items.push({
        id: 'data-fim-passou',
        tipo: 'warning',
        titulo: 'Renovação em atraso',
        mensagem: `A data de fim (${dataStr}) já passou. Renove o mais breve possível.`,
      })
    } else if (dias === 0) {
      items.push({
        id: 'renova-hoje',
        tipo: 'warning',
        titulo: 'Renovação hoje',
        mensagem: 'A sua subscrição vence hoje. Renove para manter o acesso sem interrupções.',
      })
    } else if (dias <= 3) {
      items.push({
        id: 'renova-curto',
        tipo: 'warning',
        titulo: 'Renovação muito próxima',
        mensagem: `Faltam ${dias} dia(s). Data de fim: ${dataStr}.`,
      })
    } else if (dias <= 7) {
      items.push({
        id: 'renova-7',
        tipo: 'warning',
        titulo: 'Renovação na próxima semana',
        mensagem: `Faltam ${dias} dias até ${dataStr}.`,
      })
    } else if (dias <= 30) {
      items.push({
        id: 'renova-30',
        tipo: 'info',
        titulo: 'Lembrete de renovação',
        mensagem: `Faltam ${dias} dias até a próxima data de renovação (${dataStr}).`,
      })
    } else {
      items.push({
        id: 'conta-ativa',
        tipo: 'success',
        titulo: 'Tudo em dia',
        mensagem: 'A sua subscrição está ativa. Obrigado por ser cliente Rove+.',
      })
    }
  }

  if (client.whatsappNotificadoVencimentoAt) {
    items.push({
      id: 'lembrete-whatsapp',
      tipo: 'info',
      titulo: 'Lembrete enviado por WhatsApp',
      mensagem: 'Enviámos um aviso de renovação para o seu número.',
      em: client.whatsappNotificadoVencimentoAt.toISOString(),
    })
  }

  if (indicacoesPendentes > 0) {
    items.push({
      id: 'indicacoes-pendentes',
      tipo: 'info',
      titulo: 'Indicações em análise',
      mensagem:
        indicacoesPendentes === 1
          ? 'Tem 1 indicação pendente de confirmação pela equipa.'
          : `Tem ${indicacoesPendentes} indicações pendentes de confirmação pela equipa.`,
    })
  }
  if (portalFirstLogin) {
    items.push({
      id: 'primeiro-login-pin',
      tipo: 'warning',
      titulo: 'Primeiro acesso',
      mensagem: 'Por segurança, altere agora o seu PIN de acesso da área cliente (mín. 6 caracteres).',
    })
  }

  res.json({ items })
})

router.post('/change-pin', clientPortalMiddleware, async (req, res) => {
  const { clientId } = (req as ClientPortalReq).clientPortal
  await ensurePortalFirstLoginColumn().catch(() => {})
  const { currentPin, newPin } = req.body as { currentPin?: string; newPin?: string }
  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'PIN atual e novo PIN são obrigatórios.' })
  }
  const novo = String(newPin).trim()
  if (novo.length < 6) {
    return res.status(400).json({ error: 'O novo PIN deve ter pelo menos 6 caracteres.' })
  }
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client?.portalPinHash) {
    return res.status(400).json({ error: 'Acesso da área cliente não está ativo para este cliente.' })
  }
  const ok = await bcrypt.compare(String(currentPin), client.portalPinHash)
  if (!ok) {
    return res.status(401).json({ error: 'PIN atual incorreto.' })
  }
  const hash = await bcrypt.hash(novo, 10)
  await prisma.client.update({
    where: { id: clientId },
    data: { portalPinHash: hash },
  })
  // PIN em claro no painel admin (igual a definir no backoffice)
  try {
    await setPortalPinPlainInDb(clientId, novo)
  } catch (e) {
    console.error('[client-portal] change-pin portal_pin_plain', e)
  }
  await prisma.$executeRawUnsafe('UPDATE clients SET portal_first_login = false WHERE id = $1', clientId).catch(() => {})
  res.json({ ok: true })
})

/** Lista de indicações feitas por este cliente (área /cliente). */
router.get('/indicacoes', clientPortalMiddleware, async (req, res) => {
  const { clientId } = (req as ClientPortalReq).clientPortal
  const list = await prisma.indicacao.findMany({
    where: { indicadorId: clientId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      indicadoNome: true,
      indicadoWhatsapp: true,
      status: true,
      createdAt: true,
    },
  })
  res.json(list)
})

/** Registar nova indicação (pendente até a equipa confirmar). */
router.post('/indicacoes', clientPortalMiddleware, async (req, res) => {
  const { clientId } = (req as ClientPortalReq).clientPortal
  const body = req.body as { indicadoNome?: string; indicadoWhatsapp?: string }
  const nome = String(body.indicadoNome ?? '').trim()
  const waRaw = String(body.indicadoWhatsapp ?? '').trim()
  if (nome.length < 2) {
    return res.status(400).json({ error: 'Indique o nome completo da pessoa indicada (mín. 2 caracteres).' })
  }
  if (!waRaw) {
    return res.status(400).json({ error: 'Indique o WhatsApp de quem vai ser contactado.' })
  }
  const keyNew = normalizeClientWhatsappKey(waRaw)
  if (keyNew.length < 8) {
    return res.status(400).json({ error: 'WhatsApp do indicado parece inválido. Use o número com indicativo.' })
  }
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
  if (client.status === 'cancelado') {
    return res.status(403).json({ error: 'Conta cancelada. Não é possível registar indicações.' })
  }
  const selfKey = normalizeClientWhatsappKey(client.whatsapp)
  if (keyNew === selfKey) {
    return res.status(400).json({ error: 'Não pode indicar o seu próprio número de WhatsApp.' })
  }
  const jaExistem = await prisma.indicacao.findMany({
    where: { indicadorId: clientId },
    select: { indicadoWhatsapp: true },
  })
  for (const row of jaExistem) {
    if (normalizeClientWhatsappKey(row.indicadoWhatsapp) === keyNew) {
      return res.status(400).json({ error: 'Já registou uma indicação com este WhatsApp.' })
    }
  }
  const indicacao = await prisma.indicacao.create({
    data: {
      indicadorId: clientId,
      indicadoNome: nome,
      indicadoWhatsapp: waRaw,
      status: 'pendente',
    },
  })
  await prisma.client.update({
    where: { id: clientId },
    data: { indicacoes: { increment: 1 } },
  })
  void notifyIndicacaoCreated(clientId, nome, waRaw)
  res.status(201).json(indicacao)
})

async function loadAssistantContext(clientId: number): Promise<ClientAssistantContext | null> {
  await ensurePortalFirstLoginColumn().catch(() => {})
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      nome: true,
      whatsapp: true,
      servico: true,
      plano: true,
      status: true,
      dataFim: true,
      valor: true,
      perfil: true,
      pin: true,
      iptvUser: true,
      iptvPass: true,
      iptvMac: true,
      iptvM3u: true,
      inscricaoPaga: true,
      indicacoes: true,
    },
  })
  if (!client) return null
  const portalFirstLogin = await prisma
    .$queryRawUnsafe<Array<{ portal_first_login: boolean }>>(
      'SELECT portal_first_login FROM clients WHERE id = $1',
      clientId
    )
    .then((rows) => rows[0]?.portal_first_login ?? false)
    .catch(() => false)
  const roveId = await ensureClientRoveId(clientId).catch(() => null)
  return {
    nome: client.nome,
    whatsapp: client.whatsapp,
    servico: client.servico,
    plano: client.plano,
    status: client.status,
    dataFim: client.dataFim,
    valor: Number(client.valor),
    perfil: client.perfil,
    pin: client.pin,
    iptvUser: client.iptvUser,
    iptvPass: client.iptvPass && String(client.iptvPass).length > 0 ? String(client.iptvPass) : null,
    iptvMac: client.iptvMac,
    iptvM3u: client.iptvM3u,
    inscricaoPaga: client.inscricaoPaga,
    indicacoes: client.indicacoes,
    portalFirstLogin,
    roveId,
    diasRestantes: diasAteDataFim(client.dataFim),
  }
}

router.get('/assistente/saudacao', clientPortalMiddleware, async (req, res) => {
  const { clientId } = (req as ClientPortalReq).clientPortal
  const ctx = await loadAssistantContext(clientId)
  if (!ctx) return res.status(401).json({ error: 'Sessão inválida' })
  res.json(getAssistantWelcome(ctx))
})

router.post('/assistente', clientPortalMiddleware, clientPortalAssistantRateLimit, async (req, res) => {
  const { clientId } = (req as ClientPortalReq).clientPortal
  const { message } = req.body as { message?: string }
  const text = String(message ?? '').trim()
  if (text.length > 500) {
    return res.status(400).json({ error: 'Mensagem demasiado longa (máx. 500 caracteres).' })
  }
  const ctx = await loadAssistantContext(clientId)
  if (!ctx) return res.status(401).json({ error: 'Sessão inválida' })
  res.json(getAssistantReply(ctx, text))
})

export default router
