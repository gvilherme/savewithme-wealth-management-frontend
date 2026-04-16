import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { categoriesApi } from '@/lib/api/categories'
import { budgetsApi } from '@/lib/api/budgets'
import { useAuth } from '@/hooks/useAuth'
import type { CategoryType } from '@/types/api'

const now = new Date()
const YEAR = now.getFullYear()
const MONTH = now.getMonth() + 1
const REFERENCE_MONTH = `${YEAR}-${String(MONTH).padStart(2, '0')}`

function CategoryRow({
  id: _id,
  name,
  icon,
  value,
  onChange,
}: {
  id: string
  name: string
  icon?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg leading-none">{icon}</span>}
        <span className="text-sm font-medium text-gray-700">{name}</span>
      </div>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="0,00"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-32 text-right text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
  amounts: Record<string, string>
  setAmount: (id: string, v: string) => void
}) {
  if (categories.length === 0) return null
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h2>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {categories.map(cat => (
          <CategoryRow
            key={cat.id}
            id={cat.id}
            name={cat.name}
            icon={cat.icon}
            value={amounts[cat.id] ?? ''}
            onChange={v => setAmount(cat.id, v)}
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

  const initialAmounts = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const p of progress) {
      if (p.budgetAmount > 0) map[p.categoryId] = String(p.budgetAmount)
    }
    return map
  }, [progress])

  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const amounts = { ...initialAmounts, ...overrides }

  const setAmount = (id: string, v: string) =>
    setOverrides(prev => ({ ...prev, [id]: v }))

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
      amount: parseFloat(amounts[c.id] ?? '0') || 0,
    }))
    save(items)
  }

  if (loadingCats) {
    return (
      <div className="py-12 flex justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurar orçamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
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
        <p className="text-sm text-gray-400 text-center py-8">
          Nenhuma categoria ativa. Crie categorias primeiro em <strong>Categorias</strong>.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          Erro ao salvar: {(error as Error).message}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isPending || activeCategories.length === 0}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        <Save size={18} />
        {isPending ? 'Salvando…' : 'Salvar orçamentos'}
      </button>
    </div>
  )
}
