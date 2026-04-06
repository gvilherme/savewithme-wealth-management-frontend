import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, RotateCcw } from 'lucide-react'
import { transactionsApi, type CreateTransactionDto } from '@/lib/api/transactions'
import { accountsApi } from '@/lib/api/accounts'
import { categoriesApi } from '@/lib/api/categories'
import type { TransactionType, TransactionStatus } from '@/types/api'

const fmt = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)

const STATUS_LABEL: Record<TransactionStatus, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativa',
  PENDING_REVERSAL: 'Estornando',
  REVERSED: 'Estornada',
}

const STATUS_COLOR: Record<TransactionStatus, string> = {
  PENDING: 'text-amber-500 bg-amber-50',
  ACTIVE: 'text-emerald-600 bg-emerald-50',
  PENDING_REVERSAL: 'text-orange-500 bg-orange-50',
  REVERSED: 'text-gray-400 bg-gray-100',
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function TransactionsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<CreateTransactionDto>({
    type: 'EXPENSE',
    account_id: '',
    amount: 0,
    currency: 'BRL',
    date: today,
  })

  // Filters
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
    onSuccess: () => { invalidate(); setShowCreate(false); setApiError(null) },
    onError: (e: Error) => setApiError(e.message),
  })

  const reverseMut = useMutation({
    mutationFn: transactionsApi.reverse,
    onSuccess: invalidate,
  })

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE' && c.active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <button
          onClick={() => { setShowCreate(true); setApiError(null) }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Nova
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <select
          value={filterAccountId}
          onChange={(e) => setFilterAccountId(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas as contas</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos os tipos</option>
          <option value="INCOME">Receita</option>
          <option value="EXPENSE">Despesa</option>
          <option value="TRANSFER">Transferência</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TransactionStatus | '')}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="ACTIVE">Ativa</option>
          <option value="PENDING_REVERSAL">Estornando</option>
          <option value="REVERSED">Estornada</option>
        </select>
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          title="De"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="col-span-2 md:col-span-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          title="Até"
        />
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 px-4">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="py-8 text-sm text-center text-gray-400">Nenhuma transação encontrada.</p>
        ) : (
          transactions.map((tx) => {
            const account = accounts.find((a) => a.id === tx.account_id)
            const category = categories.find((c) => c.id === tx.category_id)
            const isExpense = tx.type === 'EXPENSE'
            const isTransfer = tx.type === 'TRANSFER'
            const isIncome = tx.type === 'INCOME'
            const canReverse = tx.status === 'ACTIVE'

            return (
              <div key={tx.id} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-full flex-shrink-0 ${isExpense ? 'bg-red-50' : isTransfer ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                    {isExpense ? (
                      <TrendingDown size={15} className="text-red-500" />
                    ) : isTransfer ? (
                      <ArrowLeftRight size={15} className="text-blue-500" />
                    ) : (
                      <TrendingUp size={15} className="text-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.description || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {account?.name ?? '—'}
                      {category ? ` · ${category.name}` : ''}
                      {' · '}{tx.date}
                    </p>
                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${STATUS_COLOR[tx.status]}`}>
                      {STATUS_LABEL[tx.status]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className={`text-sm font-bold ${isExpense ? 'text-red-600' : isIncome ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isExpense ? '-' : isIncome ? '+' : ''}{fmt(tx.amount, tx.currency)}
                  </p>
                  {canReverse && (
                    <button
                      onClick={() => reverseMut.mutate(tx.id)}
                      className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Estornar"
                    >
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
        <Modal title="Nova transação" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }}
            className="space-y-3"
          >
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType, category_id: undefined, destination_account_id: undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
              <option value="TRANSFER">Transferência</option>
            </select>
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Conta de origem</option>
              {accounts.filter((a) => a.is_active).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {form.type === 'TRANSFER' && (
              <select
                value={form.destination_account_id ?? ''}
                onChange={(e) => setForm({ ...form, destination_account_id: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Conta de destino</option>
                {accounts.filter((a) => a.is_active && a.id !== form.account_id).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            {form.type === 'EXPENSE' && (
              <select
                value={form.category_id ?? ''}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Categoria</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <input
              type="number"
              placeholder="Valor"
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              required
              min={0.01}
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              placeholder="Descrição (opcional)"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
            <button
              type="submit"
              disabled={createMut.isPending}
              className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? 'Criando...' : 'Criar transação'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
