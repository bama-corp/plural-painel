import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const whatsapp = '+244 922 858 762'
  const updated = await prisma.user.updateMany({
    where: { role: 'admin' },
    data: { whatsapp },
  })
  console.log('Admin(s) atualizado(s):', updated.count, '→ whatsapp:', whatsapp)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
