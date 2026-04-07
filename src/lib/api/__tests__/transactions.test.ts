import { describe, it, expect } from 'vitest'
import { buildQuery } from '../transactions'

describe('buildQuery', () => {
  it('returns empty string for empty filters', () => {
    expect(buildQuery({})).toBe('')
  })

  it('returns query string for a single filter', () => {
    expect(buildQuery({ type: 'EXPENSE' })).toBe('?type=EXPENSE')
  })

  it('combines multiple filters', () => {
    const result = buildQuery({ type: 'INCOME', accountId: 'abc-123', from: '2026-01-01' })
    expect(result).toMatch(/^\?/)
    expect(result).toContain('type=INCOME')
    expect(result).toContain('accountId=abc-123')
    expect(result).toContain('from=2026-01-01')
  })

  it('omits undefined filter values', () => {
    expect(buildQuery({ type: undefined, accountId: 'abc' })).toBe('?accountId=abc')
  })

  it('omits empty string filter values', () => {
    expect(buildQuery({ accountId: '', type: 'EXPENSE' })).toBe('?type=EXPENSE')
  })

  it('includes from and to date range', () => {
    const result = buildQuery({ from: '2026-01-01', to: '2026-01-31' })
    expect(result).toContain('from=2026-01-01')
    expect(result).toContain('to=2026-01-31')
  })
})
