import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  PiggyBank,
  Landmark,
  Banknote,
  ChevronRight,
  Target,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { accountsApi } from '@/lib/api/accounts'
import { transactionsApi } from '@/lib/api/transactions'
import { useAuth } from '@/hooks/useAuth'
import type { Account, Transaction } from '@/types/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)

function currentMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return { from: fmt(from), to: fmt(to) }
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Corrente',
  SAVINGS: 'Poupança',
  CREDIT_CARD: 'Cartão de Crédito',
  INVESTMENT: 'Investimento',
  CASH: 'Dinheiro',
}

const ACCOUNT_TYPE_ICONS: Record<string, React.ReactNode> = {
  CHECKING: <Landmark size={16} />,
  SAVINGS: <PiggyBank size={16} />,
  CREDIT_CARD: <CreditCard size={16} />,
  INVESTMENT: <TrendingUp size={16} />,
  CASH: <Banknote size={16} />,
}

// ─── Mock budgets (placeholder — no backend yet) ───────────────────────────────

const MOCK_BUDGETS = [
  { id: '1', name: 'Alimentação', spent: 820, limit: 1200, color: 'emerald' },
  { id: '2', name: 'Transporte', spent: 380, limit: 400, color: 'amber' },
  { id: '3', name: 'Lazer', spent: 290, limit: 250, color: 'red' },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

function TransactionRow({ tx, accounts }: { tx: Transaction; accounts: Account[] }) {
  const account = accounts.find((a) => a.id === tx.account_id)
  const isExpense = tx.type === 'EXPENSE'
  const isTransfer = tx.type === 'TRANSFER'
  const isIncome = tx.type === 'INCOME'

  const formattedDate = new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`p-2 rounded-full flex-shrink-0 ${
            isExpense ? 'bg-red-50' : isTransfer ? 'bg-blue-50' : 'bg-emerald-50'
          }`}
        >
          {isExpense ? (
            <TrendingDown size={15} className="text-red-500" />
          ) : isTransfer ? (
            <ArrowLeftRight size={15} className="text-blue-500" />
          ) : (
            <TrendingUp size={15} className="text-emerald-500" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {tx.description || (isExpense ? 'Despesa' : isIncome ? 'Receita' : 'Transferência')}
          </p>
          <p className="text-xs text-gray-400">
            {account?.name ?? '—'} · {formattedDate}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <p
          className={`text-sm font-semibold ${
            isExpense ? 'text-red-600' : isIncome ? 'text-emerald-600' : 'text-blue-600'
          }`}
        >
          {isExpense ? '-' : isIncome ? '+' : ''}
          {fmt(tx.amount, tx.currency)}
        </p>
        {tx.status !== 'ACTIVE' && (
          <span className="text-xs text-amber-500">pendente</span>
        )}
      </div>
    </div>
  )
}

function AccountRow({ account }: { account: Account }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="p-2 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
        {ACCOUNT_TYPE_ICONS[account.type] ?? <Wallet size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{account.name}</p>
        <p className="text-xs text-gray-400">{ACCOUNT_TYPE_LABELS[account.type]}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
        {fmt(account.balance, account.currency)}
      </p>
    </div>
  )
}

function BudgetRow({
  budget,
}: {
  budget: (typeof MOCK_BUDGETS)[0]
}) {
  const pct = Math.min((budget.spent / budget.limit) * 100, 100)
  const over = budget.spent > budget.limit
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red: 'bg-red-500',
  }
  const barColor = over ? 'bg-red-500' : colorMap[budget.color] ?? 'bg-emerald-500'

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-800">{budget.name}</span>
          {over && <AlertCircle size={13} className="text-red-500" />}
        </div>
        <span className={`text-xs font-medium ${over ? 'text-red-600' : 'text-gray-500'}`}>
          {fmt(budget.spent)} / {fmt(budget.limit)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth()
  const { from, to } = currentMonthRange()
  const now = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(true),
    staleTime: 0,
  })

  const { data: monthTx = [], isLoading: loadingMonthTx } = useQuery({
    queryKey: ['transactions', 'month', from, to],
    queryFn: () => transactionsApi.list({ status: 'ACTIVE', from, to }),
  })

  // Derived stats
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  const monthIncome = monthTx
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)

  const monthExpenses = monthTx
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  const monthNet = monthIncome - monthExpenses

  const expensePct =
    monthIncome > 0 ? Math.min((monthExpenses / monthIncome) * 100, 100) : 0

  const recentTx = [...monthTx]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const firstName = user?.email?.split('@')[0] ?? 'você'

  return (
    <div className="space-y-5 pb-6">
      {/* Greeting */}
      <div>
        <p className="text-sm text-gray-500">Olá, {firstName} 👋</p>
        <h1 className="text-2xl font-bold text-gray-900">Visão do mês</h1>
      </div>

      {/* Monthly summary card */}
      <div className="bg-emerald-600 text-white rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-emerald-100 font-medium">{monthLabel}</p>
          <span className="text-xs bg-emerald-500 text-emerald-100 px-2 py-0.5 rounded-full">
            Consolidado
          </span>
        </div>

        {/* Net balance */}
        <div>
          <p className="text-xs text-emerald-200 uppercase tracking-wider">Saldo total das contas</p>
          {loadingAccounts ? (
            <div className="h-9 w-40 mt-1 bg-emerald-500 rounded animate-pulse" />
          ) : (
            <p className="text-4xl font-bold mt-0.5 tracking-tight">{fmt(totalBalance)}</p>
          )}
        </div>

        {/* Income / Expenses */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={13} className="text-emerald-200" />
              <p className="text-xs text-emerald-200">Receitas</p>
            </div>
            {loadingMonthTx ? (
              <div className="h-5 w-24 bg-emerald-500 rounded animate-pulse" />
            ) : (
              <p className="text-base font-bold">{fmt(monthIncome)}</p>
            )}
          </div>
          <div className="bg-emerald-500/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown size={13} className="text-emerald-200" />
              <p className="text-xs text-emerald-200">Despesas</p>
            </div>
            {loadingMonthTx ? (
              <div className="h-5 w-24 bg-emerald-500 rounded animate-pulse" />
            ) : (
              <p className="text-base font-bold">{fmt(monthExpenses)}</p>
            )}
          </div>
        </div>

        {/* Expense ratio bar */}
        {!loadingMonthTx && monthIncome > 0 && (
          <div>
            <div className="flex justify-between text-xs text-emerald-200 mb-1">
              <span>
                Resultado:{' '}
                <span className={monthNet >= 0 ? 'text-white font-semibold' : 'text-red-300 font-semibold'}>
                  {monthNet >= 0 ? '+' : ''}{fmt(monthNet)}
                </span>
              </span>
              <span>{Math.round(expensePct)}% gasto</span>
            </div>
            <div className="h-1.5 bg-emerald-500 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  expensePct >= 90 ? 'bg-red-400' : expensePct >= 70 ? 'bg-amber-300' : 'bg-white'
                }`}
                style={{ width: `${expensePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2-col grid: transactions + accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent transactions */}
        <div className="bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <h2 className="text-sm font-semibold text-gray-700">Últimas transações</h2>
            <Link
              to="/transactions"
              className="flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Ver todas <ChevronRight size={13} />
            </Link>
          </div>
          <div className="px-4 divide-y divide-gray-100">
            {loadingMonthTx || loadingAccounts ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : recentTx.length === 0 ? (
              <p className="py-8 text-sm text-center text-gray-400">
                Nenhuma transação este mês.
              </p>
            ) : (
              recentTx.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} accounts={accounts} />
              ))
            )}
          </div>
        </div>

        {/* Accounts */}
        <div className="bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <h2 className="text-sm font-semibold text-gray-700">Contas</h2>
            <Link
              to="/accounts"
              className="flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Gerenciar <ChevronRight size={13} />
            </Link>
          </div>
          <div className="px-4 divide-y divide-gray-100">
            {loadingAccounts ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))
            ) : accounts.length === 0 ? (
              <p className="py-8 text-sm text-center text-gray-400">
                Nenhuma conta ativa.
              </p>
            ) : (
              accounts.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Budgets (placeholder) */}
      <div className="bg-white border border-gray-200 rounded-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Orçamentos</h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Em breve
            </span>
          </div>
          <Target size={15} className="text-gray-300" />
        </div>
        <div className="px-4 pb-1 divide-y divide-gray-100">
          {MOCK_BUDGETS.map((budget) => (
            <BudgetRow key={budget.id} budget={budget} />
          ))}
        </div>
        <div className="px-4 py-3 bg-gray-50 rounded-b-2xl border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Defina limites de gastos por categoria — funcionalidade chegando em breve
          </p>
        </div>
      </div>
    </div>
  )
}
