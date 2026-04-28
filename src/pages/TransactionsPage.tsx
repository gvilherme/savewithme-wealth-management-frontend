import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, ArrowLeftRight, RotateCcw } from 'lucide-react'
import { transactionsApi, type CreateTransactionDto } from '@/lib/api/transactions'
import { accountsApi } from '@/lib/api/accounts'
import { categoriesApi } from '@/lib/api/categories'
import { useUserPreferences, useFmt } from '@/contexts/UserPreferencesContext'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import type { TransactionType, TransactionStatus } from '@/types/api'

const STATUS_LABEL: Record<TransactionStatus, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativa',
  PENDING_REVERSAL: 'Estornando',
  REVERSED: 'Estornada',
}

const STATUS_COLOR: Record<TransactionStatus, string> = {
  PENDING:          'text-[var(--warning)] bg-[var(--warning-subtle)]',
  ACTIVE:           'text-[var(--accent)] bg-[var(--accent-subtle)]',
  PENDING_REVERSAL: 'text-orange-500 bg-orange-50 dark:bg-orange-950',
  REVERSED:         'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]',
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-[var(--bg-primary)] rounded-2xl p-6 shadow-xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-lg leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const TYPE_CONFIG = {
  INCOME:   { label: 'Nova receita',      icon: TrendingUp,     classes: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white' },
  EXPENSE:  { label: 'Nova despesa',       icon: TrendingDown,   classes: 'bg-[var(--danger)] hover:opacity-90 text-white' },
  TRANSFER: { label: 'Nova transferência', icon: ArrowLeftRight, classes: 'bg-blue-500 hover:bg-blue-600 text-white' },
} as const

const MODAL_TITLES: Record<TransactionType, string> = {
  INCOME: 'Nova receita',
  EXPENSE: 'Nova despesa',
  TRANSFER: 'Nova transferência',
}

export function TransactionsPage() {
  const qc = useQueryClient()
  const { currency } = useUserPreferences()
  const fmt = useFmt()

  const today = new Date().toISOString().split('T')[0]
  const [showCreate, setShowCreate] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [amountCents, setAmountCents] = useState(0)
  const [form, setForm] = useState<CreateTransactionDto>({
    type: 'EXPENSE',
    account_id: '',
    amount: 0,
    currency: currency.code,
    date: today,
  })

  const [filterAccountId, setFilterAccountId] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | ''>('')
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | ''>('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.list() })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() })
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', filterAccountId, filterType, filterStatus, filterFrom, filterTo],
    queryFn: () => transactionsApi.list({
      accountId: filterAccountId || undefined,
      type: (filterType as TransactionType) || undefined,
      status: (filterStatus as TransactionStatus) || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
    }),
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some(
        (t) => t.status === 'PENDING' || t.status === 'PENDING_REVERSAL'
      )
      return hasPending ? 3000 : false
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['accounts'] })
  }

  const createMut = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      invalidate()
      setShowCreate(false)
      setApiError(null)
      setAmountCents(0)
    },
    onError: (e: Error) => setApiError(e.message),
  })

  const reverseMut = useMutation({
    mutationFn: transactionsApi.reverse,
    onSuccess: invalidate,
  })

  const openCreate = (type: TransactionType) => {
    setForm({ type, account_id: '', amount: 0, currency: currency.code, date: today })
    setAmountCents(0)
    setApiError(null)
    setShowCreate(true)
  }

  const activeAccounts = accounts.filter((a) => a.is_active)
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE' && c.active)
  const incomeCategories = categories.filter((c) => c.type === 'INCOME' && c.active)

  const inputClass = "border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
  const modalInputClass = "w-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--text-tertiary)]"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transações</h1>
        <div className="flex gap-2 flex-wrap">
          {(['INCOME', 'EXPENSE', 'TRANSFER'] as TransactionType[]).map((type) => {
            const { label, icon: Icon, classes } = TYPE_CONFIG[type]
            return (
              <button
                key={type}
                onClick={() => openCreate(type)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${classes}`}
              >
                <Icon size={14} /> {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <select value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)} className={inputClass}>
          <option value="">Todas as contas</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as TransactionType | '')} className={inputClass}>
          <option value="">Todos os tipos</option>
          <option value="INCOME">Receita</option>
          <option value="EXPENSE">Despesa</option>
          <option value="TRANSFER">Transferência</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TransactionStatus | '')} className={inputClass}>
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="ACTIVE">Ativa</option>
          <option value="PENDING_REVERSAL">Estornando</option>
          <option value="REVERSED">Estornada</option>
        </select>
        <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} title="De" className={inputClass} />
        <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} title="Até" className={`col-span-2 md:col-span-1 ${inputClass}`} />
      </div>

      {/* List */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border-subtle)] px-4">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="py-8 text-sm text-center text-[var(--text-tertiary)]">Nenhuma transação encontrada.</p>
        ) : (
          transactions.map((tx) => {
            const account = accounts.find((a) => a.id === tx.account_id)
            const category = categories.find((c) => c.id === tx.category_id)
            const isExpense = tx.type === 'EXPENSE'
            const isTransfer = tx.type === 'TRANSFER'
            const isIncome = tx.type === 'INCOME'

            return (
              <div key={tx.id} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full flex-shrink-0 ${isExpense ? 'bg-[var(--danger-subtle)]' : isTransfer ? 'bg-blue-50 dark:bg-blue-950' : 'bg-[var(--accent-subtle)]'}`}>
                    {isExpense ? <TrendingDown size={15} className="text-[var(--danger)]" />
                      : isTransfer ? <ArrowLeftRight size={15} className="text-blue-500" />
                      : <TrendingUp size={15} className="text-[var(--accent)]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{tx.description || '—'}</p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {account?.name ?? '—'}{category ? ` · ${category.name}` : ''}{' · '}{tx.date}
                    </p>
                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${STATUS_COLOR[tx.status]}`}>
                      {STATUS_LABEL[tx.status]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className={`text-sm font-bold ${isExpense ? 'text-[var(--danger)]' : isIncome ? 'text-[var(--accent)]' : 'text-blue-600'}`}>
                    {isExpense ? '-' : isIncome ? '+' : ''}{fmt(tx.amount, tx.currency)}
                  </p>
                  {tx.status === 'ACTIVE' && (
                    <button onClick={() => reverseMut.mutate(tx.id)}
                      className="p-1.5 text-[var(--text-tertiary)] hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 rounded-lg transition-colors" title="Estornar">
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title={MODAL_TITLES[form.type]} onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMut.mutate({ ...form, amount: amountCents / 100 }) }}
            className="space-y-3"
          >
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              required
              className={modalInputClass}
            >
              <option value="" disabled hidden>Conta de origem</option>
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            {form.type === 'TRANSFER' && (
              <select
                value={form.destination_account_id ?? ''}
                onChange={(e) => setForm({ ...form, destination_account_id: e.target.value })}
                required
                className={modalInputClass}
              >
                <option value="" disabled hidden>Conta de destino</option>
                {activeAccounts.filter((a) => a.id !== form.account_id).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            {(form.type === 'EXPENSE' || form.type === 'INCOME') && (
              <select
                value={form.category_id ?? ''}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
                className={modalInputClass}
              >
                <option value="">Categoria</option>
                {(form.type === 'EXPENSE' ? expenseCategories : incomeCategories).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            <CurrencyInput
              cents={amountCents}
              onChange={setAmountCents}
              required
              className={modalInputClass}
            />

            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required
              className={modalInputClass} />

            <input placeholder="Descrição (opcional)" value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={modalInputClass} />

            {apiError && <p className="text-sm text-[var(--danger)]">{apiError}</p>}

            <button
              type="submit"
              disabled={createMut.isPending || amountCents === 0}
              className={`w-full text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                form.type === 'INCOME' ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
                : form.type === 'EXPENSE' ? 'bg-[var(--danger)] hover:opacity-90'
                : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {createMut.isPending ? 'Criando...' : MODAL_TITLES[form.type]}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
