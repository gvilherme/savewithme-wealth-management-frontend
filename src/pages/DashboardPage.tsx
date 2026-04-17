import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowLeftRight, Wallet, Settings2, ChevronRight } from 'lucide-react'
import { accountsApi } from '@/lib/api/accounts'
import { transactionsApi } from '@/lib/api/transactions'
import { categoriesApi } from '@/lib/api/categories'
import { budgetsApi } from '@/lib/api/budgets'
import { useAuth } from '@/hooks/useAuth'
import type { Account, Transaction, BudgetProgressItem, Category } from '@/types/api'

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

// ─── Sub-components ────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

function TransactionRow({ tx, accounts }: { tx: Transaction; accounts: Account[] }) {
  const account = accounts.find(a => a.id === tx.account_id)
  const isExpense = tx.type === 'EXPENSE'
  const isTransfer = tx.type === 'TRANSFER'
  const isIncome = tx.type === 'INCOME'

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${isExpense ? 'bg-red-50' : isTransfer ? 'bg-blue-50' : 'bg-emerald-50'}`}
        >
          {isExpense ? (
            <TrendingDown size={15} className="text-red-500" />
          ) : isTransfer ? (
            <ArrowLeftRight size={15} className="text-blue-500" />
          ) : (
            <TrendingUp size={15} className="text-emerald-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{tx.description || tx.type}</p>
          <p className="text-xs text-gray-400">
            {account?.name ?? '—'} · {tx.date}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-semibold ${isExpense ? 'text-red-600' : isIncome ? 'text-emerald-600' : 'text-blue-600'}`}
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

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100)
  const color =
    percent >= 100
      ? 'bg-red-500'
      : percent >= 80
        ? 'bg-amber-400'
        : 'bg-emerald-500'

  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function BudgetRow({
  item,
  categories,
}: {
  item: BudgetProgressItem
  categories: Category[]
}) {
  const cat = categories.find(c => c.id === item.categoryId)
  const pct = item.progressPercent
  const labelColor = pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-gray-600'

  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {cat?.icon && <span className="text-base leading-none">{cat.icon}</span>}
          <span className="text-sm font-medium text-gray-700">{cat?.name ?? item.categoryId}</span>
        </div>
        <span className={`text-xs font-semibold ${labelColor}`}>{Math.round(pct)}%</span>
      </div>
      <ProgressBar percent={pct} />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{fmt(item.spentAmount)}</span>
        <span>
          {item.remainingAmount < 0 ? (
            <span className="text-red-500">−{fmt(Math.abs(item.remainingAmount))} acima</span>
          ) : (
            <span>{fmt(item.remainingAmount)} restante</span>
          )}
        </span>
        <span>{fmt(item.budgetAmount)}</span>
      </div>
    </div>
  )
}

function AccountRow({ account }: { account: Account }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <Wallet size={14} className="text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{account.name}</p>
          <p className="text-xs text-gray-400">{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</p>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700">{fmt(account.balance, account.currency)}</p>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { from, to } = currentMonthRange()
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${year}`

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(true),
    staleTime: 0,
  })

  const { data: monthTx = [], isLoading: loadingMonthTx } = useQuery({
    queryKey: ['transactions', 'month', from, to],
    queryFn: () => transactionsApi.list({ status: 'ACTIVE', from, to }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: budgetProgress = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ['budgets', 'progress', year, month],
    queryFn: () => budgetsApi.progress(user!.id, year, month),
    enabled: !!user,
    staleTime: 0,
  })

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
  const loadingTx = loadingMonthTx

  const firstName = user?.email?.split('@')[0] ?? 'você'

  const incomeBudgets = budgetProgress.filter(b => b.categoryType === 'INCOME')
  const expenseBudgets = budgetProgress.filter(b => b.categoryType === 'EXPENSE')
  const hasBudgets = budgetProgress.length > 0

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
        <p className="text-sm text-emerald-100 mt-1">{accounts.length} conta(s) ativa(s)</p>

        {/* Income budget target */}
        {!loadingBudgets && incomeBudgets.length > 0 && (
          <div className="mt-4 pt-4 border-t border-emerald-500 space-y-3">
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">
              Meta de receita do mês
            </p>
            {incomeBudgets.map(item => {
              const cat = categories.find(c => c.id === item.categoryId)
              const pct = item.progressPercent
              return (
                <div key={item.budgetId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-100">{cat?.name ?? item.categoryId}</span>
                    <span className="font-semibold">
                      {fmt(item.spentAmount)} / {fmt(item.budgetAmount)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-emerald-500 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? 'bg-white' : 'bg-emerald-200'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Account cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Contas
        </h2>
        {loadingAccounts ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="min-w-44 h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nenhuma conta ativa. Crie uma em <strong>Contas</strong>.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {accounts.map(account => (
              <div
                key={account.id}
                className="min-w-44 bg-white border border-gray-200 rounded-xl p-4 flex-shrink-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {ACCOUNT_TYPE_LABELS[account.type]}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700 truncate">{account.name}</p>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {fmt(account.balance, account.currency)}
                </p>
              </div>
            ))}
          </div>
        )}

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

      {/* Expense budgets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Orçamentos de gastos
          </h2>
          <button
            onClick={() => navigate('/budgets/setup')}
            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            <Settings2 size={14} />
            Configurar
          </button>
        </div>

        {loadingBudgets ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
          </div>
        ) : !hasBudgets ? (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-6 text-center space-y-3">
            <p className="text-sm text-gray-400">Nenhum orçamento configurado para este mês.</p>
            <button
              onClick={() => navigate('/budgets/setup')}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Settings2 size={15} />
              Configurar orçamentos
            </button>
          </div>
        ) : expenseBudgets.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum orçamento de despesa definido.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {expenseBudgets.map(item => (
              <BudgetRow key={item.budgetId} item={item} categories={categories} />
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Transações recentes
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 px-4">
          {loadingTx ? (
            <div className="py-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : recentTx.length === 0 ? (
            <p className="py-6 text-sm text-center text-gray-400">Nenhuma transação ainda.</p>
          ) : (
            recentTx.map(tx => <TransactionRow key={tx.id} tx={tx} accounts={accounts} />)
          )}
        </div>
      </div>
    </div>
  )
}
