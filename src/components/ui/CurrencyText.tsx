import { useFmt } from '@/contexts/UserPreferencesContext'

const SIZE: Record<string, string> = {
  xs:   'text-xs',
  sm:   'text-sm',
  base: 'text-base',
  lg:   'text-lg',
  xl:   'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
}

interface Props {
  /** Value in reais (as returned by the API — float). */
  value: number
  /** Override the user's preferred currency (e.g. when the API sends its own currency code). */
  overrideCurrency?: string
  /** Prepend '+' to positive values. */
  showSign?: boolean
  /** Apply green/red color based on sign. */
  colorize?: boolean
  size?: keyof typeof SIZE
  className?: string
}

export function CurrencyText({
  value,
  overrideCurrency,
  showSign = false,
  colorize = false,
  size,
  className,
}: Props) {
  const fmt = useFmt()
  const formatted = fmt(value, overrideCurrency)
  const display = showSign && value > 0 ? `+${formatted}` : formatted

  const colorClass = colorize
    ? value > 0
      ? 'text-[var(--accent-text)]'
      : value < 0
        ? 'text-[var(--danger)]'
        : ''
    : ''

  const classes = [size ? SIZE[size] : '', colorClass, className].filter(Boolean).join(' ')

  return <span className={classes || undefined}>{display}</span>
}
