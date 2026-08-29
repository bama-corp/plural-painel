import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const PREFIX = 'enc:v1:'

function getKey(): Buffer | null {
  const raw = process.env.FIELD_ENCRYPTION_KEY?.trim()
  if (!raw) return null
  try {
    const buf = Buffer.from(raw, 'base64')
    if (buf.length === 32) return buf
  } catch {
    /* ignore */
  }
  return null
}

export function isEncryptedField(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

/**
 * Cifra texto sensível (AES-256-GCM). Em produção sem FIELD_ENCRYPTION_KEY, falha
 * em vez de gravar em claro. Em desenvolvimento sem chave, devolve o plaintext (legado).
 */
export function encryptField(plain: string | null | undefined): string | null {
  if (plain == null || String(plain) === '') return null
  const text = String(plain)
  if (isEncryptedField(text)) return text

  const key = getKey()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FIELD_ENCRYPTION_KEY em falta ou inválida (32 bytes base64). Não é possível gravar dados sensíveis.'
      )
    }
    return text
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

/** Decifra se for enc:v1:; valores legados em claro devolvem-se como estão. */
export function decryptField(stored: string | null | undefined): string | null {
  if (stored == null || String(stored) === '') return null
  const value = String(stored)
  if (!isEncryptedField(value)) return value

  const key = getKey()
  if (!key) {
    console.error('[fieldCrypto] FIELD_ENCRYPTION_KEY em falta — não é possível decifrar')
    return null
  }

  const body = value.slice(PREFIX.length)
  const parts = body.split(':')
  if (parts.length !== 3) return null
  const [ivB64, tagB64, dataB64] = parts
  try {
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const data = Buffer.from(dataB64, 'base64')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch (e) {
    console.error('[fieldCrypto] Falha ao decifrar campo:', e instanceof Error ? e.message : e)
    return null
  }
}
