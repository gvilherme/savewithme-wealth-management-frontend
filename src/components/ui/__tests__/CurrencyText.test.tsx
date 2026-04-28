import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext'
import { CurrencyText } from '../CurrencyText'

function renderCurrency(props: React.ComponentProps<typeof CurrencyText>) {
  return render(
    <UserPreferencesProvider>
      <CurrencyText {...props} />
    </UserPreferencesProvider>,
  )
}

describe('CurrencyText', () => {
  it('formats a positive value in pt-BR', () => {
    renderCurrency({ value: 1234.56 })
    expect(screen.getByText(/1\.234,56/)).toBeInTheDocument()
  })

  it('formats zero as R$ 0,00', () => {
    renderCurrency({ value: 0 })
    expect(screen.getByText(/0,00/)).toBeInTheDocument()
  })

  it('formats a negative value with minus sign', () => {
    renderCurrency({ value: -50 })
    expect(screen.getByText(/-/)).toBeInTheDocument()
    expect(screen.getByText(/50,00/)).toBeInTheDocument()
  })

  it('formats large values (milhões) with separators', () => {
    renderCurrency({ value: 1_000_000 })
    expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument()
  })

  it('prepends + for positive value when showSign=true', () => {
    renderCurrency({ value: 100, showSign: true })
    expect(screen.getByText(/^\+/)).toBeInTheDocument()
  })

  it('does not prepend + for negative value when showSign=true', () => {
    renderCurrency({ value: -100, showSign: true })
    expect(screen.queryByText(/^\+/)).toBeNull()
  })

  it('applies accent color class for positive when colorize=true', () => {
    const { container } = renderCurrency({ value: 100, colorize: true })
    expect(container.firstChild).toHaveClass('text-[var(--accent-text)]')
  })

  it('applies danger color class for negative when colorize=true', () => {
    const { container } = renderCurrency({ value: -100, colorize: true })
    expect(container.firstChild).toHaveClass('text-[var(--danger)]')
  })

  it('applies no color class for zero when colorize=true', () => {
    const { container } = renderCurrency({ value: 0, colorize: true })
    expect(container.firstChild).not.toHaveClass('text-[var(--accent-text)]')
    expect(container.firstChild).not.toHaveClass('text-[var(--danger)]')
  })
})
