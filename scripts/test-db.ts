import 'dotenv/config'
import { prisma } from '../server/lib/prisma'

async function main() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    console.log('✓ BD conectada')
    const count = await prisma.client.count()
    console.log('✓ Clientes na BD:', count)
  } catch (e) {
    console.error('✗ Erro BD:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
  process.exit(0)
}

main()
