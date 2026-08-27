import { prisma } from './prisma.js'
import { ensureUserWhatsappColumn } from './userColumns.js'
import { parsePositiveInt } from './validate.js'

export type UserPublicProfile = {
  id: number
  nome: string
  email: string
  role: string
  whatsapp: string | null
}

export async function getUserPublicProfile(userId: unknown): Promise<UserPublicProfile | null> {
  const id = parsePositiveInt(userId)
  if (!id) return null

  await ensureUserWhatsappColumn().catch(() => {})

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, role: true, whatsapp: true },
  })
  if (!user) return null

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    whatsapp: user.whatsapp ?? null,
  }
}
