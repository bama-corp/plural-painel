import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { encryptField } from '../server/lib/fieldCrypto.js'

const prisma = new PrismaClient()

const DEMO_CLIENT_ROVE_ID = 'PLURAL-DEMO'

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@plural.com'
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
  const plainStored = encryptField(password)
  await prisma.$executeRawUnsafe(
    'UPDATE "User" SET password_plain = $1 WHERE id = $2',
    plainStored,
    user.id
  )
  console.log('Admin criado:', user.email)

  const removed = await prisma.client.deleteMany({
    where: { roveId: DEMO_CLIENT_ROVE_ID },
  })
  if (removed.count > 0) {
    console.log('Cliente demo removido:', DEMO_CLIENT_ROVE_ID)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
