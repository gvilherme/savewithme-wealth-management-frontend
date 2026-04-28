import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext'
import { CurrencyInput } from '../CurrencyInput'

function renderInput(cents: number, onChange = vi.fn()) {
  render(
    <UserPreferencesProvider>
      <CurrencyInput cents={cents} onChange={onChange} />
    </UserPreferencesProvider>,
  )
  return { input: screen.getByRole('textbox'), onChange }
}

describe('CurrencyInput', () => {
  describe('display', () => {
    it('shows empty string when cents = 0', () => {
      const { input } = renderInput(0)
      expect(input).toHaveValue('')
    })

    it('shows formatted value for non-zero cents', () => {
      const { input } = renderInput(150000)
      expect(input).toHaveValue('R$\xa01.500,00')
    })
  })

  describe('typing', () => {
    it('calls onChange with integer cents when digits are typed', async () => {
      const onChange = vi.fn()
      renderInput(0, onChange)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, '5')
      expect(onChange).toHaveBeenCalledWith(expect.any(Number))
    })

    it('strips non-digit characters', async () => {
      const onChange = vi.fn()
      renderInput(0, onChange)
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'abc')
      // onChange called with 0 (all chars stripped to '')
      expect(onChange).toHaveBeenCalledWith(0)
    })
  })

  describe('paste normalization', () => {
    it('accepts plain integer "1234" → 123400 cents', async () => {
      const onChange = vi.fn()
      renderInput(0, onChange)
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.paste('1234')
      expect(onChange).toHaveBeenCalledWith(123400)
    })

    it('accepts decimal "1234.56" → 123456 cents', async () => {
      const onChange = vi.fn()
      renderInput(0, onChange)
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.paste('1234.56')
      expect(onChange).toHaveBeenCalledWith(123456)
    })

    it('accepts pt-BR format "1.234,56" → 123456 cents', async () => {
      const onChange = vi.fn()
      renderInput(0, onChange)
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.paste('1.234,56')
      expect(onChange).toHaveBeenCalledWith(123456)
    })

    it('accepts "R$ 1.234,56" → 123456 cents', async () => {
      const onChange = vi.fn()
      renderInput(0, onChange)
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.paste('R$ 1.234,56')
      expect(onChange).toHaveBeenCalledWith(123456)
    })

    it('returns 0 for unparseable paste', async () => {
      const onChange = vi.fn()
      renderInput(0, onChange)
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.paste('abc')
      expect(onChange).toHaveBeenCalledWith(0)
    })
  })

  describe('disabled', () => {
    it('renders input as disabled', () => {
      render(
        <UserPreferencesProvider>
          <CurrencyInput cents={0} onChange={vi.fn()} disabled />
        </UserPreferencesProvider>,
      )
      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })
})
