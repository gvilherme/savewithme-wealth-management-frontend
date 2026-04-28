import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Power, PowerOff } from 'lucide-react'
import { accountsApi, type CreateAccountDto } from '@/lib/api/accounts'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import type { AccountType } from '@/types/api'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'CHECKING',    label: 'Conta Corrente' },
  { value: 'SAVINGS',     label: 'Poupança' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'INVESTMENT',  label: 'Investimento' },
  { value: 'CASH',        label: 'Dinheiro' },
]

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-[var(--bg-primary)] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-lg leading-none">&times;</button>
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
  const [form, setForm] = useState<Omit<CreateAccountDto, 'initial_balance'> & { type: AccountType }>({
    name: '', type: 'CHECKING', currency: 'BRL',
  })
  const [initialBalanceCents, setInitialBalanceCents] = useState(0)
  const [newName, setNewName] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
    staleTime: 0,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['accounts'] })

  const createMut = useMutation({
    mutationFn: (dto: CreateAccountDto) => accountsApi.create(dto),
    onSuccess: () => {
      invalidate()
      setShowCreate(false)
      setApiError(null)
      setInitialBalanceCents(0)
      setForm({ name: '', type: 'CHECKING', currency: 'BRL' })
    },
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

  const inputClass = "w-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--text-tertiary)]"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Contas</h1>
        <button
          onClick={() => { setShowCreate(true); setApiError(null) }}
          className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus size={16} /> Nova conta
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => (
            <div
              key={account.id}
              className={`bg-[var(--bg-primary)] border rounded-xl px-4 py-4 flex items-center justify-between ${
                account.is_active ? 'border-[var(--border)]' : 'border-[var(--border-subtle)] opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{account.name}</p>
                  {!account.is_active && (
                    <span className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] px-2 py-0.5 rounded-full">Inativa</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {ACCOUNT_TYPES.find(t => t.value === account.type)?.label} · {account.currency}
                </p>
                <p className="text-base font-bold text-[var(--text-primary)] mt-1">
                  <CurrencyText value={account.balance} overrideCurrency={account.currency} />
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRenameTarget({ id: account.id, name: account.name })
                    setNewName(account.name)
                    setApiError(null)
                  }}
                  className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                  title="Renomear"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => toggleMut.mutate({ id: account.id, active: account.is_active })}
                  className={`p-2 rounded-lg transition-colors ${
                    account.is_active
                      ? 'text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]'
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

      {showCreate && (
        <Modal title="Nova conta" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={e => {
              e.preventDefault()
              createMut.mutate({ ...form, initial_balance: initialBalanceCents / 100 })
            }}
            className="space-y-3"
          >
            <input
              placeholder="Nome da conta"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              maxLength={100}
              className={inputClass}
            />
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as AccountType })}
              className={inputClass}
            >
              {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <CurrencyInput
              cents={initialBalanceCents}
              onChange={setInitialBalanceCents}
              className={inputClass}
            />
            {apiError && <p className="text-sm text-[var(--danger)]">{apiError}</p>}
            <button
              type="submit"
              disabled={createMut.isPending}
              className="w-full bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
        </Modal>
      )}

      {renameTarget && (
        <Modal title="Renomear conta" onClose={() => setRenameTarget(null)}>
          <form
            onSubmit={e => { e.preventDefault(); renameMut.mutate({ id: renameTarget.id, name: newName }) }}
            className="space-y-3"
          >
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              maxLength={100}
              className={inputClass}
            />
            {apiError && <p className="text-sm text-[var(--danger)]">{apiError}</p>}
            <button
              type="submit"
              disabled={renameMut.isPending}
              className="w-full bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {renameMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
