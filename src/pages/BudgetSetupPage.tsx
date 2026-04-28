import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { categoriesApi } from '@/lib/api/categories'
import { budgetsApi } from '@/lib/api/budgets'
import { useAuth } from '@/hooks/useAuth'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import type { CategoryType } from '@/types/api'

const now = new Date()
const YEAR = now.getFullYear()
const MONTH = now.getMonth() + 1
const REFERENCE_MONTH = `${YEAR}-${String(MONTH).padStart(2, '0')}`

function CategoryRow({
  id: _id,
  name,
  icon,
  cents,
  onChange,
}: {
  id: string
  name: string
  icon?: string
  cents: number
  onChange: (cents: number) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg leading-none">{icon}</span>}
        <span className="text-sm font-medium text-[var(--text-secondary)]">{name}</span>
      </div>
      <CurrencyInput
        cents={cents}
        onChange={onChange}
        className="w-36 text-sm border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />
    </div>
  )
}

function CategorySection({
  title,
  categories,
  amounts,
  setAmount,
}: {
  title: string
  categories: { id: string; name: string; icon?: string }[]
  amounts: Record<string, number>
  setAmount: (id: string, cents: number) => void
}) {
  if (categories.length === 0) return null
  return (
    <section>
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">{title}</h2>
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border-subtle)]">
        {categories.map(cat => (
          <CategoryRow
            key={cat.id}
            id={cat.id}
            name={cat.name}
            icon={cat.icon}
            cents={amounts[cat.id] ?? 0}
            onChange={cents => setAmount(cat.id, cents)}
          />
        ))}
      </div>
    </section>
  )
}

export function BudgetSetupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const { data: progress = [] } = useQuery({
    queryKey: ['budgets', 'progress', YEAR, MONTH],
    queryFn: () => budgetsApi.progress(user!.id, YEAR, MONTH),
    enabled: !!user,
  })

  const initialAmounts = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const p of progress) {
      if (p.budgetAmount > 0) map[p.categoryId] = Math.round(p.budgetAmount * 100)
    }
    return map
  }, [progress])

  const [overrides, setOverrides] = useState<Record<string, number>>({})

  const amounts = { ...initialAmounts, ...overrides }

  const setAmount = (id: string, cents: number) =>
    setOverrides(prev => ({ ...prev, [id]: cents }))

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: (items: { categoryId: string; categoryType: CategoryType; amount: number }[]) =>
      budgetsApi.upsert(user!.id, { referenceMonth: REFERENCE_MONTH, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      navigate('/dashboard')
    },
  })

  const activeCategories = categories.filter(c => c.active)
  const expenseCategories = activeCategories.filter(c => c.type === 'EXPENSE')
  const incomeCategories = activeCategories.filter(c => c.type === 'INCOME')

  function handleSave() {
    const items = activeCategories.map(c => ({
      categoryId: c.id,
      categoryType: c.type,
      amount: (amounts[c.id] ?? 0) / 100,
    }))
    save(items)
  }

  if (loadingCats) {
    return (
      <div className="py-12 flex justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configurar orçamentos</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Referência: <strong>{REFERENCE_MONTH}</strong> · Deixar em branco ou zero remove o orçamento
          </p>
        </div>
      </div>

      <CategorySection
        title="Despesas"
        categories={expenseCategories}
        amounts={amounts}
        setAmount={setAmount}
      />

      <CategorySection
        title="Receitas"
        categories={incomeCategories}
        amounts={amounts}
        setAmount={setAmount}
      />

      {activeCategories.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
          Nenhuma categoria ativa. Crie categorias primeiro em <strong>Categorias</strong>.
        </p>
      )}

      {error && (
        <p className="text-sm text-[var(--danger)] bg-[var(--danger-subtle)] rounded-lg px-4 py-3">
          Erro ao salvar: {(error as Error).message}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isPending || activeCategories.length === 0}
        className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-white py-3 rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
      >
        <Save size={18} />
        {isPending ? 'Salvando…' : 'Salvar orçamentos'}
      </button>
    </div>
  )
}
