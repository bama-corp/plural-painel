const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parsePositiveInt(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}

export function normalizeEmail(email: unknown): string | null {
  if (email == null) return null
  const s = String(email).trim().toLowerCase()
  if (!s || !EMAIL_RE.test(s)) return null
  return s
}

export function normalizeNome(nome: unknown): string | null {
  if (nome == null) return null
  const s = String(nome).trim()
  if (s.length < 2) return null
  return s
}

/** undefined = campo omitido; null = limpar; string = valor válido */
export function normalizeWhatsappOptional(whatsapp: unknown): string | null | undefined {
  if (whatsapp === undefined) return undefined
  if (whatsapp == null || String(whatsapp).trim() === '') return null
  const digits = String(whatsapp).replace(/\D/g, '')
  if (digits.length < 8) return null
  return String(whatsapp).trim()
}
