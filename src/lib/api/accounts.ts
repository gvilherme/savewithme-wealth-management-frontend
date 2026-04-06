import { api } from './client'
import type { Account, AccountType } from '@/types/api'

export interface CreateAccountDto {
  name: string
  type: AccountType
  initial_balance: number
  currency?: string
}

export const accountsApi = {
  list: (activeOnly = false) =>
    api.get<Account[]>(`/accounts?activeOnly=${activeOnly}`),

  get: (id: string) =>
    api.get<Account>(`/accounts/${id}`),

  create: (dto: CreateAccountDto) =>
    api.post<Account>('/accounts', dto),

  rename: (id: string, name: string) =>
    api.patch<Account>(`/accounts/${id}/name`, { name }),

  activate: (id: string) =>
    api.post<Account>(`/accounts/${id}/activate`),

  deactivate: (id: string) =>
    api.post<Account>(`/accounts/${id}/deactivate`),
}
