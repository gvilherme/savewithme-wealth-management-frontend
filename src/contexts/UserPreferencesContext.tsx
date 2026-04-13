import { createContext, useContext, useState, useCallback } from 'react'
import { getCookie, setCookie } from '@/lib/cookies'

export interface Currency {
  code: string
  symbol: string
  label: string
  locale: string
}

export const CURRENCIES: Currency[] = [
  { code: 'BRL', symbol: 'R$', label: 'Real brasileiro', locale: 'pt-BR' },
  { code: 'USD', symbol: '$',  label: 'Dólar americano', locale: 'en-US' },
  { code: 'EUR', symbol: '€',  label: 'Euro',            locale: 'de-DE' },
  { code: 'GBP', symbol: '£',  label: 'Libra esterlina', locale: 'en-GB' },
]

interface UserPreferences {
  currency: Currency
  setCurrency: (code: string) => void
}

const COOKIE_CURRENCY = 'swm_currency'

function resolveCurrency(code: string | null): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

const UserPreferencesContext = createContext<UserPreferences | null>(null)

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() =>
    resolveCurrency(getCookie(COOKIE_CURRENCY))
  )

  const setCurrency = useCallback((code: string) => {
    const found = resolveCurrency(code)
    setCurrencyState(found)
    // No expiry — persists indefinitely
    setCookie(COOKIE_CURRENCY, found.code)
  }, [])

  return (
    <UserPreferencesContext.Provider value={{ currency, setCurrency }}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext)
  if (!ctx) throw new Error('useUserPreferences must be used within UserPreferencesProvider')
  return ctx
}

/** Shorthand: format a value with the user's preferred currency */
export function useFmt() {
  const { currency } = useUserPreferences()
  return (value: number, overrideCurrency?: string) => {
    const code = overrideCurrency ?? currency.code
    const locale = overrideCurrency
      ? (CURRENCIES.find((c) => c.code === overrideCurrency)?.locale ?? currency.locale)
      : currency.locale
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(value)
  }
}
