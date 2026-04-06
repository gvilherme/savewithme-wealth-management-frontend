import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, ArrowLeftRight, Wallet } from 'lucide-react'
import { accountsApi } from '@/lib/api/accounts'
import { transactionsApi } from '@/lib/api/transactions'
import type { Account, Transaction } from '@/types/api'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Corrente',
  SAVINGS: 'Poupança',
  CREDIT_CARD: 'Cartão',
  INVESTMENT: 'Investimento',
  CASH: 'Dinheiro',
}

const fmt = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)

function TransactionRow({ tx, accounts }: { tx: Transaction; accounts: Account[] }) {
  const account = accounts.find((a) => a.id === tx.account_id)
  const isExpense = tx.type === 'EXPENSE'
  const isTransfer = tx.type === 'TRANSFER'
  const isIncome = tx.type === 'INCOME'

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isExpense ? 'bg-red-50' : isTransfer ? 'bg-blue-50' : 'bg-emerald-50'}`}>
          {isExpense ? (
            <TrendingDown size={16} className="text-red-500" />
          ) : isTransfer ? (
            <ArrowLeftRight size={16} className="text-blue-500" />
          ) : (
            <TrendingUp size={16} className="text-emerald-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{tx.description || tx.type}</p>
          <p className="text-xs text-gray-400">{account?.name ?? '—'} · {tx.date}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isExpense ? 'text-red-600' : isIncome ? 'text-emerald-600' : 'text-blue-600'}`}>
          {isExpense ? '-' : isIncome ? '+' : ''}{fmt(tx.amount, tx.currency)}
        </p>
        {tx.status !== 'ACTIVE' && (
          <span className="text-xs text-amber-500">{tx.status}</span>
        )}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(true),
    staleTime: 0,
  })

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionsApi.list({ status: 'ACTIVE' }),
  })

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const recentTx = transactions.slice(0, 10)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Net worth */}
      <div className="bg-emerald-600 text-white rounded-2xl p-6">
        <p className="text-sm text-emerald-100">Saldo total</p>
        {loadingAccounts ? (
          <div className="h-8 w-36 mt-1 bg-emerald-500 rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold mt-1">{fmt(totalBalance)}</p>
        )}
        <p className="text-sm text-emerald-100 mt-1">{accounts.length} conta(s) ativa(s)</p>
      </div>

      {/* Account cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Contas</h2>
        {loadingAccounts ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="min-w-44 h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma conta ativa. Crie uma em <strong>Contas</strong>.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {accounts.map((account) => (
              <div key={account.id} className="min-w-44 bg-white border border-gray-200 rounded-xl p-4 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{ACCOUNT_TYPE_LABELS[account.type]}</span>
                </div>
                <p className="text-sm font-medium text-gray-700 truncate">{account.name}</p>
                <p className="text-base font-bold text-gray-900 mt-1">{fmt(account.balance, account.currency)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Transações recentes</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 px-4">
          {loadingTx ? (
            <div className="py-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : recentTx.length === 0 ? (
            <p className="py-6 text-sm text-center text-gray-400">Nenhuma transação ainda.</p>
          ) : (
            recentTx.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} accounts={accounts} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
