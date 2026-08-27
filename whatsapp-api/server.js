/**
 * API de WhatsApp - Microserviço Rove+ Painel
 * whatsapp-web.js + Express — Railway (Docker + Chromium do sistema).
 */

process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD =
  process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD || 'true'
process.env.PUPPETEER_SKIP_DOWNLOAD = process.env.PUPPETEER_SKIP_DOWNLOAD || 'true'

const fs = require('fs')
const express = require('express')
const cors = require('cors')
const qrcodeTerminal = require('qrcode-terminal')
const QRCode = require('qrcode')
const { Client, LocalAuth } = require('whatsapp-web.js')

const PORT = process.env.PORT || 3002
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || ''
const WWEBJS_AUTH_PATH = process.env.WWEBJS_AUTH_PATH || './.wwebjs_auth'

function resolveChromiumPath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    '/usr/bin/chromium-rove',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean)
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      /* ignore */
    }
  }
  return undefined
}

const CHROMIUM_PATH = resolveChromiumPath()

const puppeteerArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-extensions',
  '--disable-features=IsolateOrigins,site-per-process',
  '--single-process',
]

let isConnected = false
let lastQr = null
let lastQrAt = null
let reconnectTimer = null
let initError = CHROMIUM_PATH
  ? null
  : 'Chromium não encontrado. Use o Dockerfile no Railway (Settings → Build → Dockerfile).'

function scheduleReconnect(delayMs = 20_000) {
  if (reconnectTimer || isConnected) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (isConnected || !CHROMIUM_PATH) return
    console.log('[WhatsApp] A tentar religar…')
    client.initialize().catch((err) => {
      initError = err instanceof Error ? err.message : String(err)
      console.error('[WhatsApp] Falha ao religar:', initError)
      scheduleReconnect(30_000)
    })
  }, delayMs)
}

async function restartClient() {
  isConnected = false
  lastQr = null
  try {
    await client.destroy()
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 2000))
  await client.initialize()
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: WWEBJS_AUTH_PATH }),
  webVersionCache: {
    type: 'remote',
    remotePath:
      'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
  puppeteer: {
    headless: true,
    ...(CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {}),
    args: puppeteerArgs,
    protocolTimeout: 120_000,
  },
})

client.on('qr', (qr) => {
  lastQr = qr
  lastQrAt = new Date()
  console.log('\n[WhatsApp] Novo QR Code — abra /pair no browser ou escaneie no terminal:\n')
  qrcodeTerminal.generate(qr, { small: true })
})

client.on('ready', () => {
  isConnected = true
  lastQr = null
  initError = null
  console.log('[WhatsApp] Conectado e pronto para enviar mensagens.')
})

client.on('authenticated', () => {
  console.log('[WhatsApp] Sessão autenticada.')
})

client.on('auth_failure', (msg) => {
  initError = String(msg || 'auth_failure')
  console.error('[WhatsApp] Falha de autenticação:', msg)
  isConnected = false
})

client.on('disconnected', (reason) => {
  console.log('[WhatsApp] Desconectado:', reason)
  isConnected = false
  scheduleReconnect()
})

client.on('loading_screen', (percent, message) => {
  console.log('[WhatsApp] A carregar:', percent, message || '')
})

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason)
  initError = msg
  console.error('[WhatsApp] Erro assíncrono (API HTTP continua online):', msg)
  if (!isConnected) scheduleReconnect(25_000)
})

if (CHROMIUM_PATH) {
  client.initialize().catch((err) => {
    initError = err instanceof Error ? err.message : String(err)
    console.error('[WhatsApp] Erro ao inicializar:', initError)
  })
  console.log('[WhatsApp] Chromium:', CHROMIUM_PATH)
} else {
  console.error(
    '[WhatsApp] Chromium não encontrado. No Railway: Settings → Build → Builder = Dockerfile → Redeploy.'
  )
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '64kb' }))

function authMiddleware(req, res, next) {
  if (!WHATSAPP_TOKEN) {
    console.warn('[Auth] WHATSAPP_TOKEN não definido — API exposta sem proteção.')
    return next()
  }
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token de autorização ausente' })
  }
  const token = authHeader.slice(7)
  if (token !== WHATSAPP_TOKEN) {
    return res.status(401).json({ success: false, error: 'Token inválido' })
  }
  next()
}

app.get('/health', (_req, res) => {
  const sessionReady = isConnected && !!client.info?.wid
  res.json({
    ok: true,
    whatsapp: sessionReady,
    awaitingQr: !!lastQr && !sessionReady,
    authPath: WWEBJS_AUTH_PATH,
    chromium: CHROMIUM_PATH || null,
    initError: initError || undefined,
  })
})

/** Estado da ligação (protegido se houver token). */
app.get('/status', authMiddleware, (_req, res) => {
  res.json({
    connected: isConnected,
    awaitingQr: !!lastQr && !isConnected,
    lastQrAt: lastQrAt ? lastQrAt.toISOString() : null,
  })
})

/** JSON com QR atual (para integrações). */
app.get('/qr', authMiddleware, async (_req, res) => {
  if (isConnected) {
    return res.json({ connected: true, qr: null })
  }
  if (!lastQr) {
    return res.status(503).json({
      connected: false,
      error: 'QR ainda não disponível. Aguarde alguns segundos e tente de novo.',
      initError: initError || undefined,
    })
  }
  try {
    const dataUrl = await QRCode.toDataURL(lastQr, { margin: 2, width: 320 })
    res.json({
      connected: false,
      qr: lastQr,
      qrDataUrl: dataUrl,
      generatedAt: lastQrAt ? lastQrAt.toISOString() : null,
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erro ao gerar QR' })
  }
})

/** Página HTML para parear WhatsApp (útil no Railway). */
app.get('/pair', async (_req, res) => {
  if (isConnected) {
    return res.type('html').send(`<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Rove+ WhatsApp</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0a0c;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.box{max-width:420px;padding:32px;border-radius:16px;border:1px solid #333;background:#141418}
.ok{color:#34d399;font-size:1.25rem}</style></head>
<body><div class="box"><p class="ok">WhatsApp já está ligado.</p><p>API pronta a enviar mensagens.</p></div></body></html>`)
  }
  if (!lastQr) {
    return res.type('html').send(`<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Rove+ WhatsApp — QR</title>
<meta http-equiv="refresh" content="5"/>
<style>body{font-family:system-ui,sans-serif;background:#0a0a0c;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.box{max-width:420px;padding:32px;border-radius:16px;border:1px solid #333;background:#141418}</style></head>
<body><div class="box"><p>A preparar QR Code…</p><p style="color:#888;font-size:0.9rem">Esta página actualiza automaticamente.</p>
${initError ? `<p style="color:#f87171;margin-top:12px">${initError}</p>` : ''}</div></body></html>`)
  }
  try {
    const dataUrl = await QRCode.toDataURL(lastQr, { margin: 2, width: 320 })
    res.type('html').send(`<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Rove+ WhatsApp — QR</title>
<meta http-equiv="refresh" content="25"/>
<style>body{font-family:system-ui,sans-serif;background:#0a0a0c;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
.box{max-width:420px;padding:28px;border-radius:16px;border:1px solid #333;background:#141418;text-align:center}
img{border-radius:12px;background:#fff;padding:12px;max-width:100%}
h1{font-size:1.15rem;margin:0 0 8px}p{color:#aaa;font-size:0.9rem;line-height:1.5}</style></head>
<body><div class="box">
<h1>Ligar WhatsApp Rove+</h1>
<p>No telemóvel: WhatsApp → Dispositivos ligados → Ligar dispositivo → escaneie o QR.</p>
<img src="${dataUrl}" width="320" height="320" alt="QR Code WhatsApp"/>
<p style="margin-top:16px">O QR renova ~25s; esta página actualiza sozinha.</p>
</div></body></html>`)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao gerar QR' })
  }
})

app.post('/restart', authMiddleware, async (_req, res) => {
  try {
    await restartClient()
    res.json({ success: true, message: 'Cliente WhatsApp reiniciado. Aguarde o QR em /pair se necessário.' })
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : 'Falha ao reiniciar',
    })
  }
})

app.post('/send', authMiddleware, async (req, res) => {
  if (!isConnected || !client.info?.wid) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp não está conectado. Abra /pair e escaneie o QR Code.',
      pairUrl: '/pair',
    })
  }

  const { phone, message } = req.body || {}

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ success: false, error: 'Campo "phone" é obrigatório' })
  }
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'Campo "message" é obrigatório' })
  }
  if (message.length > 4096) {
    return res.status(400).json({ success: false, error: 'Mensagem demasiado longa (máx. 4096 caracteres)' })
  }

  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0+/, '')
  if (normalizedPhone.length < 8) {
    return res.status(400).json({ success: false, error: 'Número de telefone inválido' })
  }

  const chatId = `${normalizedPhone}@c.us`

  try {
    await client.sendMessage(chatId, message)
    console.log(`[WhatsApp] Enviado para ${normalizedPhone.slice(0, 6)}…`)
    res.json({ success: true, message: 'Mensagem enviada' })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[WhatsApp] Erro ao enviar:', errMsg)
    if (/detached|Session closed|Target closed|Protocol error/i.test(errMsg)) {
      isConnected = false
      initError = errMsg
      scheduleReconnect(8_000)
    }
    res.status(500).json({
      success: false,
      error: errMsg || 'Erro ao enviar mensagem',
      hint: 'Tente POST /restart e volte a escanear o QR em /pair',
    })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API WhatsApp Rove+ em http://0.0.0.0:${PORT}`)
  console.log('Endpoints: GET /health, GET /pair, GET /status, POST /send')
  console.log(`Sessão: ${WWEBJS_AUTH_PATH}`)
  if (!WHATSAPP_TOKEN) {
    console.warn('[Aviso] Defina WHATSAPP_TOKEN em produção.')
  }
})
