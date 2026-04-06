import { api } from './client'
import type { Transaction, TransactionType, TransactionStatus } from '@/types/api'

export interface CreateTransactionDto {
  type: TransactionType
  account_id: string
  category_id?: string
  destination_account_id?: string
  amount: number
  currency?: string
  description?: string
  date: string
}

export interface TransactionFilters {
  accountId?: string
  type?: TransactionType
  status?: TransactionStatus
  from?: string
  to?: string
}

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  if (filters.accountId) params.set('accountId', filters.accountId)
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const transactionsApi = {
  list: (filters: TransactionFilters = {}) =>
    api.get<Transaction[]>(`/transactions${buildQuery(filters)}`),

  get: (id: string) =>
    api.get<Transaction>(`/transactions/${id}`),

  create: (dto: CreateTransactionDto) =>
    api.post<Transaction>('/transactions', dto),

  reverse: (id: string) =>
    api.delete<Transaction>(`/transactions/${id}`),
}
