import rateLimit from 'express-rate-limit'

const msg = { error: 'Demasiados pedidos a partir deste endereço. Tente de novo daqui a alguns minutos.' }

export const panelLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg,
})

export const clientPortalAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg,
})

export const clientPortalRecoverRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de pedidos de recuperação de PIN atingido. Tente de novo mais tarde.' },
})

export const clientPortalAssistantRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas mensagens ao POne. Aguarde um momento e tente de novo.' },
})
