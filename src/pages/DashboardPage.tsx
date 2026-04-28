import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowLeftRight, Wallet, Settings2, AlertTriangle } from 'lucide-react'
import { accountsApi } from '@/lib/api/accounts'
import { transactionsApi } from '@/lib/api/transactions'
import { categoriesApi } from '@/lib/api/categories'
import { budgetsApi } from '@/lib/api/budgets'
import { useAuth } from '@/hooks/useAuth'
import { useFmt } from '@/contexts/UserPreferencesContext'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { getBudgetState, sortBudgets, summarizeOverBudget, type BudgetState } from '@/lib/budget'
import type { Account, Transaction, BudgetProgressItem, Category } from '@/types/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING:    'Corrente',
  SAVINGS:     'Poupança',
  CREDIT_CARD: 'Cartão',
  INVESTMENT:  'Investimento',
  CASH:        'Dinheiro',
}

// RF-07: color palette for categories without a color set
const CATEGORY_PALETTE = [
  '#0F6E56', '#2563EB', '#7C3AED', '#DB2777',
  '#EA580C', '#CA8A04', '#0891B2', '#65A30D',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function monthRange() {
  const now = new Date()
  return {
    from: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: fmtDate(now),
  }
}

// RF-01: day after same day last month → today gives the delta to subtract from current balance
function prevMonthDeltaFrom(): string {
  const now = new Date()
  return fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate() + 1))
}

// RF-03: 7 days ago
function sevenDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return fmtDate(d)
}

// Format a percentage with minimal decimals (e.g., 3% not 3.0%, but 3.2% when needed)
function fmtPct(pct: number): string {
  const abs = Math.abs(pct)
  return abs % 1 < 0.05 ? `${Math.round(abs)}%` : `${abs.toFixed(1).replace('.', ',')}%`
}

// ── RF-06: Budget state ────────────────────────────────────────────────────────

const BAR_COLOR: Record<BudgetState, string> = {
  empty:   'bg-[var(--accent)]',
  ok:      'bg-[var(--accent)]',
  warning: 'bg-orange-400',
  limit:   'bg-amber-500',
  over:    'bg-[var(--danger)]',
}

const PCT_COLOR: Record<BudgetState, string> = {
  empty:   'text-[var(--text-tertiary)]',
  ok:      'text-[var(--text-secondary)]',
  warning: 'text-[var(--warning)]',
  limit:   'text-[var(--warning)]',
  over:    'text-[var(--danger)]',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--bg-tertiary)] rounded-lg ${className ?? ''}`} />
}

function ProgressBar({ percent, state }: { percent: number; state: BudgetState }) {
  return (
    <div
      className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all ${BAR_COLOR[state]}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

function BudgetRow({ item, categories }: { item: BudgetProgressItem; categories: Category[] }) {
  const fmt = useFmt()
  const cat = categories.find(c => c.id === item.categoryId)
  const pct = item.progressPercent
  const state = getBudgetState(pct, item.remainingAmount)

  const statusText =
    state === 'limit' ? 'Limite atingido'
    : state === 'over' ? `−${fmt(Math.abs(item.remainingAmount))} acima`
    : `${fmt(item.remainingAmount)} restante`

  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {cat?.icon && <span className="text-base leading-none">{cat.icon}</span>}
          <span className="text-sm font-medium text-[var(--text-secondary)]">{cat?.name ?? item.categoryId}</span>
        </div>
        <span className={`text-xs font-semibold ${PCT_COLOR[state]}`}>{Math.round(pct)}%</span>
      </div>
      <ProgressBar percent={pct} state={state} />
      <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
        <CurrencyText value={item.spentAmount} size="xs" />
        <span className={
          state === 'over'  ? 'text-[var(--danger)]'
          : state === 'limit' ? 'text-[var(--warning)]'
          : ''
        }>
          {statusText}
        </span>
        <CurrencyText value={item.budgetAmount} size="xs" />
      </div>
    </div>
  )
}

// RF-04: Critical banner — only when ≥1 category is over budget
function OverBudgetBanner({
  overItems,
  totalCount,
}: {
  overItems: BudgetProgressItem[]
  totalCount: number
}) {
  const fmt = useFmt()
  const totalOver = overItems.reduce((sum, i) => sum + Math.abs(i.remainingAmount), 0)
  return (
    <div className="flex items-start gap-3 bg-[var(--warning-subtle)] border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
      <AlertTriangle size={18} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-[var(--warning)]">
          {overItems.length} de {totalCount}{' '}
          {overItems.length === 1 ? 'categoria estourada' : 'categorias estouradas'}
        </p>
        <p className="text-xs text-[var(--warning)] opacity-80 mt-0.5">Total excedido: {fmt(totalOver)}</p>
      </div>
    </div>
  )
}

// RF-07: Stacked spending bar
interface Segment { id: string; name: string; amount: number; pct: number; color: string }

function SpendingBar({ transactions, categories }: { transactions: Transaction[]; categories: Category[] }) {
  const fmt = useFmt()

  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'EXPENSE')
    const total = expenses.reduce((sum, t) => sum + t.amount, 0)
    if (total === 0) return null

    const byCategory: Record<string, number> = {}
    for (const tx of expenses) {
      const key = tx.category_id ?? '__none__'
      byCategory[key] = (byCategory[key] ?? 0) + tx.amount
    }

    // The explicit "Outros" category (if it exists) is always merged into the
    // aggregated bucket so the legend never shows two entries named "Outros".
    const outrosCat = categories.find(c => c.name === 'Outros')
    const outrosCatId = outrosCat?.id

    const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a)
    const candidates = outrosCatId ? sorted.filter(([id]) => id !== outrosCatId) : sorted
    const outrosAmount = outrosCatId ? (byCategory[outrosCatId] ?? 0) : 0

    const top3 = candidates.slice(0, 3)
    const othersAmount = candidates.slice(3).reduce((sum, [, v]) => sum + v, 0) + outrosAmount

    const rawSegments: Omit<Segment, 'pct'>[] = top3.map(([catId, amount], i) => {
      const cat = categories.find(c => c.id === catId)
      return {
        id: catId,
        name: cat?.name ?? 'Sem categoria',
        amount,
        color: cat?.color ?? CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
      }
    })

    if (othersAmount > 0) {
      rawSegments.push({ id: '__others__', name: 'Outros', amount: othersAmount, color: outrosCat?.color ?? '#9CA3AF' })
    }

    const segTotal = rawSegments.reduce((s, r) => s + r.amount, 0)
    const segments: Segment[] = rawSegments.map(r => ({ ...r, pct: (r.amount / segTotal) * 100 }))

    return { total, segments }
  }, [transactions, categories])

  if (!data) return null

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
        Para onde foi seu dinheiro
      </p>
      <p className="text-xs text-[var(--text-tertiary)]">
        Distribuição dos {fmt(data.total)} gastos este mês
      </p>
      <div className="flex h-3 w-full rounded-full overflow-hidden">
        {data.segments.map(seg => (
          <div
            key={seg.id}
            style={{ width: `${seg.pct}%`, backgroundColor: seg.color, minWidth: seg.pct > 0 ? '2px' : undefined }}
            title={`${seg.name}: ${fmt(seg.amount)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {data.segments.map(seg => (
          <div key={seg.id} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-[var(--text-secondary)]">
              {seg.name}{' '}
              <span className="text-[var(--text-tertiary)]">{Math.round(seg.pct)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TransactionRow({ tx, accounts, categories }: { tx: Transaction; accounts: Account[]; categories: Category[] }) {
  const fmt = useFmt()
  const account = accounts.find(a => a.id === tx.account_id)
  const category = categories.find(c => c.id === tx.category_id)
  const isExpense = tx.type === 'EXPENSE'
  const isTransfer = tx.type === 'TRANSFER'
  const isIncome = tx.type === 'INCOME'
  const formattedDate = new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
  })

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isExpense ? 'bg-[var(--danger-subtle)]' : isTransfer ? 'bg-blue-50 dark:bg-blue-950' : 'bg-[var(--accent-subtle)]'}`}>
          {isExpense
            ? <TrendingDown size={15} className="text-[var(--danger)]" />
            : isTransfer
              ? <ArrowLeftRight size={15} className="text-blue-500" />
              : <TrendingUp size={15} className="text-[var(--accent)]" />}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{tx.description || '—'}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {account?.name ?? '—'}
            {category && <> · {category.icon && <span>{category.icon} </span>}{category.name}</>}
            {' · '}{formattedDate}
          </p>
        </div>
      </div>
      <p className={`text-sm font-semibold ${isExpense ? 'text-[var(--danger)]' : isIncome ? 'text-[var(--accent)]' : 'text-blue-600'}`}>
        {isExpense ? '-' : isIncome ? '+' : ''}{fmt(tx.amount, tx.currency)}
      </p>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fmt = useFmt()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { from, to } = useMemo(() => monthRange(), [])
  const prevFrom = useMemo(() => prevMonthDeltaFrom(), [])
  const weekFrom = useMemo(() => sevenDaysAgo(), [])

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(true),
    staleTime: 0,
  })

  const { data: monthTx = [], isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', 'month', from, to],
    queryFn: () => transactionsApi.list({ status: 'ACTIVE', from, to }),
    staleTime: 0,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 30 * 60 * 1000,
  })

  const { data: budgetProgress = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ['budgets', 'progress', year, month],
    queryFn: () => budgetsApi.progress(user!.id, year, month),
    enabled: !!user,
    staleTime: 0,
  })

  // RF-01: transactions since day after same day last month (DT-01)
  const { data: prevDeltaTx = [] } = useQuery({
    queryKey: ['transactions', 'prev-delta', prevFrom, to],
    queryFn: () => transactionsApi.list({ status: 'ACTIVE', from: prevFrom, to }),
    staleTime: 5 * 60 * 1000,
  })

  // RF-03: all transactions in last 7 days, grouped by account locally (DT-01)
  const { data: weekTx = [] } = useQuery({
    queryKey: ['transactions', 'week', weekFrom, to],
    queryFn: () => transactionsApi.list({ status: 'ACTIVE', from: weekFrom, to }),
    staleTime: 5 * 60 * 1000,
  })

  // ── Derived data ─────────────────────────────────────────────────────────────

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  const monthIncome = useMemo(
    () => monthTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0),
    [monthTx],
  )

  const monthExpenses = useMemo(
    () => monthTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0),
    [monthTx],
  )

  const recentTx = useMemo(
    () => [...monthTx]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
    [monthTx],
  )

  const expenseBudgets = useMemo(
    () => budgetProgress.filter(b => b.categoryType === 'EXPENSE'),
    [budgetProgress],
  )

  // RF-05: sort by % desc; ties: alpha; zeros at end
  const sortedExpenseBudgets = useMemo(
    () => sortBudgets(expenseBudgets, id => categories.find(c => c.id === id)?.name ?? ''),
    [expenseBudgets, categories],
  )

  // RF-04: items with remainingAmount < 0
  const overBudgetItems = useMemo(
    () => summarizeOverBudget(expenseBudgets).overItems,
    [expenseBudgets],
  )

  const hasBudgets = budgetProgress.length > 0
  const monthNet = monthIncome - monthExpenses

  // RF-01: derive previous balance and compute % variation (DT-01)
  const balanceVariation = useMemo(() => {
    if (loadingAccounts || prevDeltaTx.length === 0) return null
    const netDelta = prevDeltaTx.reduce((sum, t) => {
      if (t.type === 'INCOME')  return sum + t.amount
      if (t.type === 'EXPENSE') return sum - t.amount
      return sum
    }, 0)
    const previousBalance = totalBalance - netDelta
    if (previousBalance === 0) return null
    const pct = ((totalBalance - previousBalance) / Math.abs(previousBalance)) * 100
    return Math.abs(pct) < 0.05 ? null : pct
  }, [prevDeltaTx, totalBalance, loadingAccounts])

  // RF-03: net change per account over last 7 days (INCOME - EXPENSE only; DT-01)
  const weeklyNetByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of weekTx) {
      if (tx.type === 'INCOME')  map[tx.account_id] = (map[tx.account_id] ?? 0) + tx.amount
      if (tx.type === 'EXPENSE') map[tx.account_id] = (map[tx.account_id] ?? 0) - tx.amount
    }
    return map
  }, [weekTx])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-6">

      {/* RF-01 + RF-02: Balance + Leftover — 1fr 1fr on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* RF-01: Balance card — fixed emerald accent */}
        <div className="bg-emerald-600 dark:bg-emerald-800 text-white rounded-2xl p-5 space-y-1">
          <p className="text-xs text-emerald-200 dark:text-emerald-300 uppercase tracking-wider font-semibold">Saldo total</p>
          {loadingAccounts ? (
            <div className="h-10 w-44 mt-1 bg-emerald-500 dark:bg-emerald-700 rounded animate-pulse" />
          ) : (
            <p className="text-4xl font-bold tracking-tight">{fmt(totalBalance)}</p>
          )}
          <p className="text-xs text-emerald-300 dark:text-emerald-400 pt-1">{accounts.length} conta(s) ativa(s)</p>
          {balanceVariation !== null && (
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${
                balanceVariation >= 0 ? 'bg-emerald-500 dark:bg-emerald-700 text-white' : 'bg-red-400/80 dark:bg-red-600/80 text-white'
              }`}
              aria-label={`${balanceVariation >= 0 ? 'Aumento' : 'Queda'} de ${fmtPct(balanceVariation)} vs mês anterior`}
            >
              {balanceVariation >= 0 ? '↑' : '↓'} {fmtPct(balanceVariation)} vs mês anterior
            </span>
          )}
        </div>

        {/* RF-02: "Sobrou este mês" card */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-1">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Sobrou este mês</p>
          <p className="text-xs text-[var(--text-tertiary)]">Receita − despesas até hoje</p>
          {loadingTx ? (
            <Skeleton className="h-10 w-36 mt-1" />
          ) : (
            <p className={`text-3xl font-bold tracking-tight ${monthNet >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>
              {monthNet >= 0 ? '+' : ''}{fmt(monthNet)}
            </p>
          )}
          {!loadingTx && (
            <div className="text-xs text-[var(--text-tertiary)] space-y-0.5 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex justify-between">
                <span>Receita</span>
                <span className="text-[var(--accent)] font-medium">{fmt(monthIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gastos</span>
                <span className="text-[var(--danger)] font-medium">{fmt(monthExpenses)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RF-03: Account cards */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Contas</h2>
        {loadingAccounts ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="min-w-44 h-24" />)}
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">Nenhuma conta ativa. Crie uma em <strong>Contas</strong>.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {accounts.map(account => {
              const weeklyNet = weeklyNetByAccount[account.id] ?? 0
              return (
                <div key={account.id} className="min-w-44 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-4 flex-shrink-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Wallet size={13} className="text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-tertiary)]">{ACCOUNT_TYPE_LABELS[account.type]}</span>
                    </div>
                    {weeklyNet !== 0 && (
                      <span
                        className={`text-xs font-medium ${weeklyNet > 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}
                        aria-label={`${weeklyNet > 0 ? 'Aumento' : 'Queda'} de ${fmt(Math.abs(weeklyNet))} esta semana`}
                      >
                        {weeklyNet > 0 ? '↑' : '↓'} <CurrencyText value={Math.abs(weeklyNet)} size="xs" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--text-secondary)] truncate">{account.name}</p>
                  <p className="text-base font-bold text-[var(--text-primary)] mt-1">
                    <CurrencyText value={account.balance} overrideCurrency={account.currency} />
                  </p>
                  {weeklyNet !== 0 && (
                    <p className={`text-xs mt-0.5 ${weeklyNet > 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>
                      esta semana
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Budgets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Orçamentos de gastos
          </h2>
          <button
            onClick={() => navigate('/budgets/setup')}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
          >
            <Settings2 size={14} /> Configurar
          </button>
        </div>

        {/* RF-04: Critical banner */}
        {!loadingBudgets && overBudgetItems.length > 0 && (
          <OverBudgetBanner overItems={overBudgetItems} totalCount={expenseBudgets.length} />
        )}

        {loadingBudgets ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-4">
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !hasBudgets ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-6 text-center space-y-3">
            <p className="text-sm text-[var(--text-tertiary)]">Nenhum orçamento configurado para este mês.</p>
            <button
              onClick={() => navigate('/budgets/setup')}
              className="inline-flex items-center gap-2 bg-[var(--accent)] text-white text-sm px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
            >
              <Settings2 size={15} /> Configurar orçamentos
            </button>
          </div>
        ) : sortedExpenseBudgets.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">Nenhum orçamento de despesa definido.</p>
        ) : (
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border-subtle)]">
            {sortedExpenseBudgets.map(item => (
              <BudgetRow key={item.budgetId} item={item} categories={categories} />
            ))}
          </div>
        )}

        {/* RF-07: Stacked bar */}
        {!loadingTx && <SpendingBar transactions={monthTx} categories={categories} />}
      </div>

      {/* Recent transactions */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
          Transações recentes
        </h2>
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border-subtle)] px-4">
          {loadingTx ? (
            <div className="py-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : recentTx.length === 0 ? (
            <p className="py-6 text-sm text-center text-[var(--text-tertiary)]">Nenhuma transação ainda.</p>
          ) : (
            recentTx.map(tx => <TransactionRow key={tx.id} tx={tx} accounts={accounts} categories={categories} />)
          )}
        </div>
      </div>
    </div>
  )
}
