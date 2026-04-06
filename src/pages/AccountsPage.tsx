import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Power, PowerOff } from 'lucide-react'
import { accountsApi, type CreateAccountDto } from '@/lib/api/accounts'
import type { AccountType } from '@/types/api'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'CHECKING', label: 'Conta Corrente' },
  { value: 'SAVINGS', label: 'Poupança' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'INVESTMENT', label: 'Investimento' },
  { value: 'CASH', label: 'Dinheiro' },
]

const fmt = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function AccountsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<CreateAccountDto>({ name: '', type: 'CHECKING', initial_balance: 0, currency: 'BRL' })
  const [newName, setNewName] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['accounts'] })

  const createMut = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => { invalidate(); setShowCreate(false); setApiError(null) },
    onError: (e: Error) => setApiError(e.message),
  })

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => accountsApi.rename(id, name),
    onSuccess: () => { invalidate(); setRenameTarget(null); setApiError(null) },
    onError: (e: Error) => setApiError(e.message),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? accountsApi.deactivate(id) : accountsApi.activate(id),
    onSuccess: invalidate,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contas</h1>
        <button
          onClick={() => { setShowCreate(true); setApiError(null) }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Nova conta
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`bg-white border rounded-xl px-4 py-4 flex items-center justify-between ${
                account.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{account.name}</p>
                  {!account.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativa</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ACCOUNT_TYPES.find((t) => t.value === account.type)?.label} · {account.currency}
                </p>
                <p className="text-base font-bold text-gray-900 mt-1">{fmt(account.balance, account.currency)}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setRenameTarget({ id: account.id, name: account.name }); setNewName(account.name); setApiError(null) }}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Renomear"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => toggleMut.mutate({ id: account.id, active: account.is_active })}
                  className={`p-2 rounded-lg transition-colors ${
                    account.is_active
                      ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'
                  }`}
                  title={account.is_active ? 'Desativar' : 'Ativar'}
                >
                  {account.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="Nova conta" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }}
            className="space-y-3"
          >
            <input
              placeholder="Nome da conta"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Saldo inicial"
              value={form.initial_balance}
              onChange={(e) => setForm({ ...form, initial_balance: parseFloat(e.target.value) || 0 })}
              min={0}
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
            <button
              type="submit"
              disabled={createMut.isPending}
              className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
        </Modal>
      )}

      {/* Rename modal */}
      {renameTarget && (
        <Modal title="Renomear conta" onClose={() => setRenameTarget(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); renameMut.mutate({ id: renameTarget.id, name: newName }) }}
            className="space-y-3"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
            <button
              type="submit"
              disabled={renameMut.isPending}
              className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {renameMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
