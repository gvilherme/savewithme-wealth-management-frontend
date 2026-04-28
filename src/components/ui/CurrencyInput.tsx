import { useUserPreferences } from '@/contexts/UserPreferencesContext'

interface Props {
  /** Current value in integer cents (e.g. 150000 = R$ 1.500,00). */
  cents: number
  onChange: (cents: number) => void
  disabled?: boolean
  required?: boolean
  className?: string
}

export function CurrencyInput({ cents, onChange, disabled, required, className }: Props) {
  const { currency } = useUserPreferences()

  const fmt = (v: number) =>
    new Intl.NumberFormat(currency.locale, { style: 'currency', currency: currency.code }).format(v)

  const display = cents > 0 ? fmt(cents / 100) : ''
  const placeholder = fmt(0)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(parseInt(digits || '0', 10))
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    // Accept: "1234", "1.234,56", "R$ 1.234,56", "1234.56"
    const clean = text.replace(/[^\d,.]/g, '')
    // If both separators present, assume thousand = "." and decimal = ","
    const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
    const reais = parseFloat(normalized) || 0
    onChange(Math.round(reais * 100))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      onPaste={handlePaste}
      disabled={disabled}
      required={required}
      className={['text-right', className].filter(Boolean).join(' ')}
    />
  )
}
