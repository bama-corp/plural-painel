export const WHATSAPP_PREFIXES = ['244', '351', '55'] as const
export type WhatsappPrefix = (typeof WHATSAPP_PREFIXES)[number]

export const DEFAULT_WHATSAPP_PREFIX: WhatsappPrefix = '244'

const PREFIX_CONFIG: Record<WhatsappPrefix, { nationalDigits: number; placeholder: string }> = {
  '244': { nationalDigits: 9, placeholder: '9XX XXX XXX' },
  '351': { nationalDigits: 9, placeholder: '9XX XXX XXX' },
  '55': { nationalDigits: 11, placeholder: '11 91234 5678' },
}

export const WHATSAPP_NATIONAL_PLACEHOLDER = PREFIX_CONFIG[DEFAULT_WHATSAPP_PREFIX].placeholder

/** @deprecated use DEFAULT_WHATSAPP_PREFIX */
export const WHATSAPP_AO_PREFIX = DEFAULT_WHATSAPP_PREFIX
/** @deprecated use WHATSAPP_NATIONAL_PLACEHOLDER */
export const WHATSAPP_AO_PLACEHOLDER = WHATSAPP_NATIONAL_PLACEHOLDER

export function prefixLabel(prefix: WhatsappPrefix): string {
  return `+${prefix}`
}

export function nationalPlaceholder(prefix: WhatsappPrefix): string {
  return PREFIX_CONFIG[prefix].placeholder
}

export function maxNationalDigits(prefix: WhatsappPrefix): number {
  return PREFIX_CONFIG[prefix].nationalDigits
}

export function whatsappPrefixFromValue(value: string): WhatsappPrefix {
  const digits = value.replace(/\D/g, '')
  const byLength = [...WHATSAPP_PREFIXES].sort((a, b) => b.length - a.length)
  for (const prefix of byLength) {
    if (digits.startsWith(prefix)) return prefix
  }
  return DEFAULT_WHATSAPP_PREFIX
}

export function emptyWhatsapp(prefix: WhatsappPrefix = DEFAULT_WHATSAPP_PREFIX): string {
  return `${prefixLabel(prefix)} `
}

/** @deprecated use emptyWhatsapp */
export function emptyWhatsappAo(): string {
  return emptyWhatsapp(DEFAULT_WHATSAPP_PREFIX)
}

export function nationalDigitsFromWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '')
  const prefix = whatsappPrefixFromValue(value || DEFAULT_WHATSAPP_PREFIX)
  const maxLen = maxNationalDigits(prefix)
  if (digits.startsWith(prefix)) return digits.slice(prefix.length, prefix.length + maxLen)
  return digits.slice(0, maxLen)
}

/** @deprecated use nationalDigitsFromWhatsapp */
export function nationalDigitsFromWhatsappAo(value: string): string {
  return nationalDigitsFromWhatsapp(value)
}

export function formatNationalPart(digits: string, prefix: WhatsappPrefix = DEFAULT_WHATSAPP_PREFIX): string {
  const clean = digits.replace(/\D/g, '').slice(0, maxNationalDigits(prefix))

  if (prefix === '55') {
    if (clean.length <= 2) return clean
    if (clean.length <= 7) return `${clean.slice(0, 2)} ${clean.slice(2)}`
    return `${clean.slice(0, 2)} ${clean.slice(2, 7)} ${clean.slice(7)}`
  }

  const parts: string[] = []
  for (let i = 0; i < clean.length; i += 3) {
    parts.push(clean.slice(i, i + 3))
  }
  return parts.join(' ')
}

export function formatWhatsapp(value: string, forcedPrefix?: WhatsappPrefix): string {
  const prefix = forcedPrefix ?? whatsappPrefixFromValue(value)
  let digits = value.replace(/\D/g, '')

  if (digits.startsWith(prefix)) {
    digits = digits.slice(prefix.length)
  } else {
    for (const p of [...WHATSAPP_PREFIXES].sort((a, b) => b.length - a.length)) {
      if (digits.startsWith(p)) {
        digits = digits.slice(p.length)
        break
      }
    }
  }

  digits = digits.slice(0, maxNationalDigits(prefix))

  if (digits.length === 0) {
    return emptyWhatsapp(prefix)
  }

  return `${prefixLabel(prefix)} ${formatNationalPart(digits, prefix)}`
}

/** @deprecated use formatWhatsapp */
export function formatWhatsappAo(value: string): string {
  return formatWhatsapp(value)
}

export function whatsappDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** @deprecated use whatsappDigits */
export function whatsappAoDigits(value: string): string {
  return whatsappDigits(value)
}

export function isWhatsappValid(value: string): boolean {
  const prefix = whatsappPrefixFromValue(value)
  const digits = whatsappDigits(value)
  return digits.startsWith(prefix) && digits.length === prefix.length + maxNationalDigits(prefix)
}

/** @deprecated use isWhatsappValid */
export function isWhatsappAoValid(value: string): boolean {
  return isWhatsappValid(value)
}
