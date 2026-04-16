export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH'
export type CategoryType = 'INCOME' | 'EXPENSE'
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'
export type TransactionStatus = 'PENDING' | 'ACTIVE' | 'PENDING_REVERSAL' | 'REVERSED'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  type: CategoryType
  icon?: string
  color?: string
  parent_category_id?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id?: string
  destination_account_id?: string
  transfer_pair_id?: string
  type: TransactionType
  amount: number
  currency: string
  description?: string
  date: string
  status: TransactionStatus
  reversed_at?: string
  created_at: string
  updated_at: string
}

export interface ApiError {
  type: string
  title: string
  status: number
  detail: string
  timestamp: string
}

export interface BudgetProgressItem {
  budgetId: string
  categoryId: string
  categoryType: CategoryType
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  progressPercent: number
  referenceMonth: string
}

export interface BudgetUpsertItem {
  categoryId: string
  categoryType: CategoryType
  amount: number
}

export interface BudgetUpsertDto {
  referenceMonth: string
  items: BudgetUpsertItem[]
}

export interface BudgetAlertMoneyAmount {
  amount: number
  currency: string
}

export interface BudgetAlertEvent {
  budgetId: string
  categoryId: string
  categoryName: string | null
  thresholdPercent: number
  spentAmount: BudgetAlertMoneyAmount
  budgetAmount: BudgetAlertMoneyAmount
  referenceMonth: string
  receivedAt?: string
}
