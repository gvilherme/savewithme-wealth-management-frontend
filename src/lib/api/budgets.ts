import { api } from './client'
import type { BudgetProgressItem, BudgetUpsertDto } from '@/types/api'

export const budgetsApi = {
  upsert: (userId: string, dto: BudgetUpsertDto) =>
    api.put<void>(`/user/${userId}/budgets`, dto),

  progress: (userId: string, year: number, month: number) =>
    api.get<BudgetProgressItem[]>(`/user/${userId}/budgets/${year}/${month}/progress`),
}
