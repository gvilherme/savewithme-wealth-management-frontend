import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Wallet, ArrowLeftRight, Tag, LogOut, Bell, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { categoriesApi } from '@/lib/api/categories'
import type { BudgetAlertEvent, Category } from '@/types/api'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
]

const fmtMoney = (v: { amount: number; currency: string }) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: v.currency }).format(
    isNaN(v.amount) ? 0 : v.amount,
  )

function AlertPanel({
  alerts,
  categories,
  onDismiss,
  onDismissAll,
  onClose,
  align = 'right',
}: {
  alerts: BudgetAlertEvent[]
  categories: Category[]
  onDismiss: (budgetId: string, thresholdPercent: number) => void
  onDismissAll: () => void
  onClose: () => void
  align?: 'left' | 'right'
}) {
  return (
    <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">Alertas de orçamento</span>
        <div className="flex items-center gap-2">
          {alerts.length > 1 && (
            <button
              onClick={onDismissAll}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Dispensar todos
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="px-4 py-6 text-sm text-center text-gray-400">Nenhum alerta</p>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {alerts.map(a => {
            const isOver = a.thresholdPercent >= 100
            const categoryName =
              a.categoryName || categories.find(c => c.id === a.categoryId)?.name || a.categoryId
            return (
              <li key={`${a.budgetId}_${a.thresholdPercent}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{categoryName}</p>
                    <p className={`text-xs mt-0.5 ${isOver ? 'text-red-600' : 'text-amber-600'}`}>
                      {isOver
                        ? `Orçamento estourado — ${fmtMoney(a.spentAmount)} de ${fmtMoney(a.budgetAmount)}`
                        : `${a.thresholdPercent}% atingido — ${fmtMoney(a.spentAmount)} de ${fmtMoney(a.budgetAmount)}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.referenceMonth}
                      {a.receivedAt && (
                        <> · {new Date(a.receivedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => onDismiss(a.budgetId, a.thresholdPercent)}
                    className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5"
                    aria-label="Dispensar"
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function BellButton({
  alerts,
  categories,
  onDismiss,
  onDismissAll,
  panelAlign = 'right',
}: {
  alerts: BudgetAlertEvent[]
  categories: Category[]
  onDismiss: (budgetId: string, thresholdPercent: number) => void
  onDismissAll: () => void
  panelAlign?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const hasAlerts = alerts.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} className={hasAlerts ? 'text-amber-500' : 'text-gray-400'} />
        {hasAlerts && (
          <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <AlertPanel
          alerts={alerts}
          categories={categories}
          onDismiss={onDismiss}
          onDismissAll={onDismissAll}
          onClose={() => setOpen(false)}
          align={panelAlign}
        />
      )}
    </div>
  )
}

export function AppLayout() {
  const { user, signOut } = useAuth()
  const { alerts, dismiss, dismissAll } = useBudgetAlerts(user?.id)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 30 * 60 * 1000,
  })

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed inset-y-0">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <span className="text-lg font-bold text-emerald-600">SaveWithMe</span>
          <BellButton alerts={alerts} categories={categories} onDismiss={dismiss} onDismissAll={dismissAll} panelAlign="left" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 pb-20 md:pb-0">
        {/* Mobile topbar with bell */}
        <header className="md:hidden sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 h-12 flex items-center justify-between">
          <span className="text-base font-bold text-emerald-600">SaveWithMe</span>
          <BellButton alerts={alerts} categories={categories} onDismiss={dismiss} onDismissAll={dismissAll} />
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-600' : 'text-gray-500'
              }`
            }
          >
            <Icon size={20} />
            <span className="mt-0.5">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
