import type { BudgetProgressItem } from '@/types/api'

export type BudgetState = 'empty' | 'ok' | 'warning' | 'limit' | 'over'

export function getBudgetState(pct: number, remainingAmount: number): BudgetState {
  if (remainingAmount < 0) return 'over'
  if (pct >= 100)          return 'limit'
  if (pct >= 80)           return 'warning'
  if (pct > 0)             return 'ok'
  return 'empty'
}

export function sortBudgets(
  items: BudgetProgressItem[],
  getName: (categoryId: string) => string,
): BudgetProgressItem[] {
  return [...items].sort((a, b) => {
    if (a.progressPercent === 0 && b.progressPercent === 0) {
      return getName(a.categoryId).localeCompare(getName(b.categoryId))
    }
    if (a.progressPercent === 0) return 1
    if (b.progressPercent === 0) return -1
    return b.progressPercent - a.progressPercent
  })
}

export function summarizeOverBudget(items: BudgetProgressItem[]): {
  overItems: BudgetProgressItem[]
  totalOver: number
} {
  const overItems = items.filter(b => b.remainingAmount < 0)
  const totalOver = overItems.reduce((sum, i) => sum + Math.abs(i.remainingAmount), 0)
  return { overItems, totalOver }
}
