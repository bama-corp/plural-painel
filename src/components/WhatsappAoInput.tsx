import type { InputHTMLAttributes } from 'react'
import { RoveSelect } from './RoveSelect'
import {
  WHATSAPP_PREFIXES,
  emptyWhatsapp,
  formatNationalPart,
  formatWhatsapp,
  maxNationalDigits,
  nationalDigitsFromWhatsapp,
  nationalPlaceholder,
  prefixLabel,
  whatsappPrefixFromValue,
  type WhatsappPrefix,
} from '../utils/whatsapp'

const WHATSAPP_AO_WRAPPER =
  'flex w-full min-h-[42px] overflow-hidden rounded-md border border-netflix-border/80 bg-netflix-panel transition-colors focus-within:border-primary-500/45 focus-within:ring-2 focus-within:ring-primary-500/30'
const WHATSAPP_AO_WRAPPER_SM =
  'flex w-full min-h-[32px] overflow-hidden rounded-md border border-netflix-border/80 bg-netflix-panel transition-colors focus-within:border-primary-500/45 focus-within:ring-2 focus-within:ring-primary-500/30'
const WHATSAPP_AO_FIELD =
  'min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white tabular-nums tracking-[0.12em] outline-none placeholder:font-mono placeholder:text-[13px] placeholder:tracking-[0.28em] placeholder:text-gray-500/75'
const WHATSAPP_AO_FIELD_SM =
  'min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-xs text-white tabular-nums tracking-[0.1em] outline-none placeholder:font-mono placeholder:text-[11px] placeholder:tracking-[0.22em] placeholder:text-gray-500/75'

export function WhatsappAoInput({
  value,
  onChange,
  compact,
  ...rest
}: {
  value: string
  onChange: (value: string) => void
  compact?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'className' | 'placeholder'>) {
  const full = value || emptyWhatsapp()
  const prefix = whatsappPrefixFromValue(full)
  const national = nationalDigitsFromWhatsapp(full)

  return (
    <div className={compact ? WHATSAPP_AO_WRAPPER_SM : WHATSAPP_AO_WRAPPER}>
      <RoveSelect
        variant="prefix"
        compact={compact}
        title="Indicativo telefónico"
        value={prefix}
        onChange={(e) => {
          const newPrefix = e.target.value as WhatsappPrefix
          onChange(formatWhatsapp(newPrefix + national, newPrefix))
        }}
      >
        {WHATSAPP_PREFIXES.map((p) => (
          <option key={p} value={p}>
            {prefixLabel(p)}
          </option>
        ))}
      </RoveSelect>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatNationalPart(national, prefix)}
        placeholder={nationalPlaceholder(prefix)}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '').slice(0, maxNationalDigits(prefix))
          onChange(formatWhatsapp(prefix + raw, prefix))
        }}
        className={compact ? WHATSAPP_AO_FIELD_SM : WHATSAPP_AO_FIELD}
        {...rest}
      />
    </div>
  )
}
