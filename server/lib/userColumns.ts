import { prisma } from './prisma.js'

let whatsappColumnReady = false
let statusColumnReady = false
let alertScopesColumnReady = false

export async function ensureUserWhatsappColumn(): Promise<void> {
  if (whatsappColumnReady) return
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS whatsapp TEXT
  `)
  whatsappColumnReady = true
}

export async function ensureUserStatusColumn(): Promise<void> {
  if (statusColumnReady) return
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo'
  `)
  statusColumnReady = true
}

export async function ensureUserAlertScopesColumn(): Promise<void> {
  if (alertScopesColumnReady) return
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS alert_scopes TEXT
  `)
  alertScopesColumnReady = true
}
