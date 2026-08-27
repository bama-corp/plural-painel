import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { prisma } from './lib/prisma.js'
import { getCorsOptions } from './middleware/corsConfig.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import clientsRoutes from './routes/clients.js'
import servidoresRoutes from './routes/servidores.js'
import revendedoresRoutes from './routes/revendedores.js'
import salasRoutes from './routes/salas.js'
import indicacoesRoutes from './routes/indicacoes.js'
import auditRoutes from './routes/audit.js'
import cronRoutes from './routes/cron.js'
import usersRoutes from './routes/users.js'
import clientPortalRoutes from './routes/client-portal.js'
import whatsappRoutes from './routes/whatsapp.js'

const app = express()

if (process.env.VERCEL === '1' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1)
}

// Cabeçalhos HTTP (API JSON; sem CSP de página)
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }))

app.use(cors(getCorsOptions()))
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/servidores', servidoresRoutes)
app.use('/api/revendedores', revendedoresRoutes)
app.use('/api/salas', salasRoutes)
app.use('/api/indicacoes', indicacoesRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/cron', cronRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/client-portal', clientPortalRoutes)
app.use('/api/whatsapp', whatsappRoutes)

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    res.json({ ok: true, db: 'connected' })
  } catch (e) {
    res.status(503).json({ ok: false, db: 'error', message: e instanceof Error ? e.message : 'Conexão à BD falhou' })
  }
})

// Rotas /api inexistentes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Não encontrado' })
})

// Erros (em produção não enviar pormenores ao cliente)
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API] Erro:', err)
  const message = err instanceof Error ? err.message : 'Erro interno'
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) {
    res.status(500).json({ error: 'Internal Server Error' })
  } else {
    res.status(500).json({ error: 'Internal Server Error', detail: message })
  }
})

export default app
