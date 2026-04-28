import { describe, it, expect } from 'vitest'
import { getBudgetState, sortBudgets, summarizeOverBudget } from '../budget'
import type { BudgetProgressItem } from '@/types/api'

// ── helpers ──────────────────────────────────────────────────────────────────

function item(
  categoryId: string,
  pct: number,
  remaining: number,
): BudgetProgressItem {
  return {
    budgetId: categoryId,
    categoryId,
    categoryType: 'EXPENSE',
    budgetAmount: 100,
    spentAmount: 100 - remaining,
    remainingAmount: remaining,
    progressPercent: pct,
    referenceMonth: '2026-04',
  }
}

// ── getBudgetState ────────────────────────────────────────────────────────────

describe('getBudgetState', () => {
  it('empty — 0% and no spending', () => {
    expect(getBudgetState(0, 100)).toBe('empty')
  })

  it('ok — 1% to 79%', () => {
    expect(getBudgetState(1, 99)).toBe('ok')
    expect(getBudgetState(50, 50)).toBe('ok')
    expect(getBudgetState(79, 21)).toBe('ok')
  })

  it('warning — 80% to 99%', () => {
    expect(getBudgetState(80, 20)).toBe('warning')
    expect(getBudgetState(99, 1)).toBe('warning')
  })

  it('limit — exactly 100% with remaining = 0', () => {
    expect(getBudgetState(100, 0)).toBe('limit')
  })

  it('over — remainingAmount < 0 regardless of pct', () => {
    expect(getBudgetState(110, -10)).toBe('over')
    expect(getBudgetState(200, -100)).toBe('over')
  })

  it('over wins over limit when remainingAmount is negative', () => {
    // pct = 100 but remaining < 0 due to rounding: must be 'over'
    expect(getBudgetState(100, -0.01)).toBe('over')
  })
})

// ── sortBudgets ───────────────────────────────────────────────────────────────

describe('sortBudgets', () => {
  const noName = (id: string) => id

  it('sorts by progressPercent descending', () => {
    const items = [item('a', 50, 50), item('b', 90, 10), item('c', 10, 90)]
    const sorted = sortBudgets(items, noName)
    expect(sorted.map(i => i.categoryId)).toEqual(['b', 'a', 'c'])
  })

  it('puts zeros at the end', () => {
    const items = [item('zero', 0, 100), item('mid', 50, 50), item('high', 80, 20)]
    const sorted = sortBudgets(items, noName)
    expect(sorted[sorted.length - 1].categoryId).toBe('zero')
  })

  it('breaks ties alphabetically by category name', () => {
    const items = [item('z', 50, 50), item('a', 50, 50)]
    const sorted = sortBudgets(items, id => id)
    expect(sorted.map(i => i.categoryId)).toEqual(['a', 'z'])
  })

  it('sorts multiple zeros alphabetically', () => {
    const items = [item('zero-z', 0, 10), item('zero-a', 0, 10), item('nonzero', 40, 60)]
    const sorted = sortBudgets(items, id => id)
    expect(sorted.map(i => i.categoryId)).toEqual(['nonzero', 'zero-a', 'zero-z'])
  })

  it('does not mutate the original array', () => {
    const items = [item('b', 80, 20), item('a', 90, 10)]
    const original = [...items]
    sortBudgets(items, noName)
    expect(items).toEqual(original)
  })
})

// ── summarizeOverBudget ───────────────────────────────────────────────────────

describe('summarizeOverBudget', () => {
  it('returns empty list and 0 when nothing is over', () => {
    const items = [item('a', 50, 50), item('b', 100, 0)]
    const { overItems, totalOver } = summarizeOverBudget(items)
    expect(overItems).toHaveLength(0)
    expect(totalOver).toBe(0)
  })

  it('counts only over-budget items', () => {
    const items = [item('ok', 50, 50), item('over1', 110, -10), item('over2', 150, -50)]
    const { overItems } = summarizeOverBudget(items)
    expect(overItems).toHaveLength(2)
    expect(overItems.map(i => i.categoryId)).toContain('over1')
    expect(overItems.map(i => i.categoryId)).toContain('over2')
  })

  it('sums the absolute exceeded amounts', () => {
    const items = [item('a', 120, -20), item('b', 110, -10)]
    const { totalOver } = summarizeOverBudget(items)
    expect(totalOver).toBeCloseTo(30)
  })

  it('excludes the limit (remaining = 0) from over-budget', () => {
    const items = [item('limit', 100, 0)]
    const { overItems } = summarizeOverBudget(items)
    expect(overItems).toHaveLength(0)
  })
})
