import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { categoriesApi, type CreateCategoryDto, type UpdateCategoryDto } from '@/lib/api/categories'
import type { Category, CategoryType } from '@/types/api'

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
  const isSystem = category.user_id === null

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
          <p className="text-sm font-medium text-gray-800">{category.name}</p>
          <p className="text-xs text-gray-400">
            {category.type === 'INCOME' ? 'Receita' : 'Despesa'}
            {isSystem ? ' · Sistema' : ''}
          </p>
        </div>
      </div>

      {!isSystem && (
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              category.active
                ? 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'
            }`}
            title={category.active ? 'Desativar' : 'Ativar'}
          >
            {category.active ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
  const userCategories = categories.filter((c) => c.user_id !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        <button
          onClick={() => { setShowCreate(true); setCreateForm({ name: '', type: 'EXPENSE' }); setApiError(null) }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} /> Nova
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* User categories */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
            <p className="py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Minhas categorias</p>
            {userCategories.length === 0 ? (
              <p className="py-4 text-sm text-gray-400">Nenhuma categoria personalizada.</p>
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

          {/* System categories */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
            <p className="py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Categorias do sistema</p>
            {systemCategories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} />
            ))}
          </div>
        </>
      )}

      {/* Create modal */}
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={createForm.type}
              onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as CategoryType })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
            <input
              placeholder="Cor (ex: #4CAF50)"
              value={createForm.color ?? ''}
              onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
              maxLength={7}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
            <button
              type="submit"
              disabled={createMut.isPending}
              className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? 'Criando...' : 'Criar'}
            </button>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              placeholder="Cor (ex: #4CAF50)"
              value={editForm.color ?? ''}
              onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
              maxLength={7}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
            <button
              type="submit"
              disabled={updateMut.isPending}
              className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {updateMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
