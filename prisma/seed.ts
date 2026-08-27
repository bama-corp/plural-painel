import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/** Cliente demo para “Acesso provisório” na área cliente */
const DEMO_CLIENT_WHATSAPP = '+244 900 000 000'
const DEMO_CLIENT_PIN = '1234'
const DEMO_CLIENT_ROVE_ID = 'PLURAL-DEMO'

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@roveplus.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash },
    create: {
      nome: 'Administrador',
      email,
      password: hash,
      role: 'admin',
    },
  })
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS password_plain TEXT
  `)
  await prisma.$executeRawUnsafe(
    'UPDATE "User" SET password_plain = $1 WHERE id = $2',
    password,
    user.id
  )
  console.log('Admin criado:', user.email)

  const pinHash = await bcrypt.hash(DEMO_CLIENT_PIN, 10)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dataFim = new Date(hoje)
  dataFim.setMonth(dataFim.getMonth() + 1)

  const demo = await prisma.client.upsert({
    where: { roveId: DEMO_CLIENT_ROVE_ID },
    update: {
      nome: 'Cliente Demo',
      whatsapp: DEMO_CLIENT_WHATSAPP,
      portalPinHash: pinHash,
      portalPinPlain: DEMO_CLIENT_PIN,
      portalFirstLogin: false,
      status: 'ativo',
      dataFim,
    },
    create: {
      roveId: DEMO_CLIENT_ROVE_ID,
      nome: 'Cliente Demo',
      whatsapp: DEMO_CLIENT_WHATSAPP,
      localizacao: 'Luanda',
      servico: 'iptv',
      plano: 'mensal',
      perfil: 'demo.plural',
      dataInicio: hoje,
      dataFim,
      valor: 5000,
      status: 'ativo',
      portalPinHash: pinHash,
      portalPinPlain: DEMO_CLIENT_PIN,
      portalFirstLogin: false,
    },
  })
  console.log('Cliente demo:', demo.whatsapp, `(PIN ${DEMO_CLIENT_PIN})`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
