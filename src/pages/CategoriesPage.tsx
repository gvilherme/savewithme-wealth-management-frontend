import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { categoriesApi, type CreateCategoryDto, type UpdateCategoryDto } from '@/lib/api/categories'
import type { Category, CategoryType } from '@/types/api'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full sm:max-w-sm bg-[var(--bg-primary)] rounded-t-2xl sm:rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-lg leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CategoryRow({
  category,
  onEdit,
  onToggle,
  onDelete,
}: {
  category: Category
  onEdit?: () => void
  onToggle?: () => void
  onDelete?: () => void
}) {
  const isSystem = !category.user_id

  return (
    <div className={`flex items-center justify-between py-3 ${!category.active ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        {category.color && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
        )}
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{category.name}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {category.type === 'INCOME' ? 'Receita' : 'Despesa'}
            {isSystem ? ' · Sistema' : ''}
          </p>
        </div>
      </div>

      {!isSystem && (
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onToggle}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors ${
              category.active
                ? 'text-[var(--text-tertiary)] hover:text-[var(--warning)] hover:bg-[var(--warning-subtle)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]'
            }`}
            title={category.active ? 'Desativar' : 'Ativar'}
          >
            {category.active ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button
            onClick={onDelete}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)] rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export function CategoriesPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState<CreateCategoryDto>({ name: '', type: 'EXPENSE' })
  const [editForm, setEditForm] = useState<UpdateCategoryDto>({})

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] })

  const createMut = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => { invalidate(); setShowCreate(false); setApiError(null) },
    onError: (e: Error) => setApiError(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryDto }) => categoriesApi.update(id, dto),
    onSuccess: () => { invalidate(); setEditTarget(null); setApiError(null) },
    onError: (e: Error) => setApiError(e.message),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? categoriesApi.deactivate(id) : categoriesApi.activate(id),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: invalidate,
  })

  const systemCategories = categories.filter((c) => !c.user_id)
  const userCategories = categories.filter((c) => !!c.user_id)

  const inputClass = "w-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--text-tertiary)]"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Categorias</h1>
        <button
          onClick={() => { setShowCreate(true); setCreateForm({ name: '', type: 'EXPENSE' }); setApiError(null) }}
          className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus size={16} /> Nova
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 divide-y divide-[var(--border-subtle)]">
            <p className="py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Minhas categorias</p>
            {userCategories.length === 0 ? (
              <p className="py-4 text-sm text-[var(--text-tertiary)]">Nenhuma categoria personalizada.</p>
            ) : (
              userCategories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  onEdit={() => { setEditTarget(cat); setEditForm({ name: cat.name, icon: cat.icon, color: cat.color }); setApiError(null) }}
                  onToggle={() => toggleMut.mutate({ id: cat.id, active: cat.active })}
                  onDelete={() => {
                    if (confirm(`Excluir "${cat.name}"?`)) deleteMut.mutate(cat.id)
                  }}
                />
              ))
            )}
          </div>

          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 divide-y divide-[var(--border-subtle)]">
            <p className="py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Categorias do sistema</p>
            {systemCategories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} />
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <Modal title="Nova categoria" onClose={() => setShowCreate(false)}>
          <form
            onSubmit={(e) => { e.preventDefault(); createMut.mutate(createForm) }}
            className="space-y-3"
          >
            <input
              placeholder="Nome"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
              maxLength={50}
              className={inputClass}
            />
            <select
              value={createForm.type}
              onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as CategoryType })}
              className={inputClass}
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
            <input
              placeholder="Cor (ex: #4CAF50)"
              value={createForm.color ?? ''}
              onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
              maxLength={7}
              className={inputClass}
            />
            {apiError && <p className="text-sm text-[var(--danger)]">{apiError}</p>}
            <button
              type="submit"
              disabled={createMut.isPending}
              className="w-full bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? 'Criando...' : 'Criar'}
            </button>
          </form>
        </Modal>
      )}

      {editTarget && (
        <Modal title="Editar categoria" onClose={() => setEditTarget(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); updateMut.mutate({ id: editTarget.id, dto: editForm }) }}
            className="space-y-3"
          >
            <input
              placeholder="Nome"
              value={editForm.name ?? ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              maxLength={50}
              className={inputClass}
            />
            <input
              placeholder="Cor (ex: #4CAF50)"
              value={editForm.color ?? ''}
              onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
              maxLength={7}
              className={inputClass}
            />
            {apiError && <p className="text-sm text-[var(--danger)]">{apiError}</p>}
            <button
              type="submit"
              disabled={updateMut.isPending}
              className="w-full bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {updateMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
