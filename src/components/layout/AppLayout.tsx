import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { LayoutDashboard, Wallet, ArrowLeftRight, Tag, Settings, Bell, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { categoriesApi } from '@/lib/api/categories'
import { CurrencyText } from '@/components/ui/CurrencyText'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import type { BudgetAlertEvent, Category } from '@/types/api'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts',     icon: Wallet,          label: 'Contas' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transações' },
  { to: '/categories',   icon: Tag,             label: 'Categorias' },
  { to: '/settings',     icon: Settings,        label: 'Perfil' },
]


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
    <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-80 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Alertas de orçamento</span>
        <div className="flex items-center gap-2">
          {alerts.length > 1 && (
            <button
              onClick={onDismissAll}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Dispensar todos
            </button>
          )}
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="px-4 py-6 text-sm text-center text-[var(--text-tertiary)]">Nenhum alerta</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] max-h-80 overflow-y-auto">
          {alerts.map(a => {
            const isOver = a.thresholdPercent >= 100
            const categoryName =
              a.categoryName || categories.find(c => c.id === a.categoryId)?.name || a.categoryId
            return (
              <li key={`${a.budgetId}_${a.thresholdPercent}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{categoryName}</p>
                    <p className={`text-xs mt-0.5 ${isOver ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                      {isOver ? 'Orçamento estourado' : `${a.thresholdPercent}% atingido`}
                      {' — '}
                      <CurrencyText value={isNaN(a.spentAmount.amount) ? 0 : a.spentAmount.amount} overrideCurrency={a.spentAmount.currency} />
                      {' de '}
                      <CurrencyText value={isNaN(a.budgetAmount.amount) ? 0 : a.budgetAmount.amount} overrideCurrency={a.budgetAmount.currency} />
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {a.referenceMonth}
                      {a.receivedAt && (
                        <> · {new Date(a.receivedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => onDismiss(a.budgetId, a.thresholdPercent)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors flex-shrink-0 mt-0.5"
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
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} className={hasAlerts ? 'text-[var(--warning)]' : 'text-[var(--text-tertiary)]'} />
        {hasAlerts && (
          <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-[var(--danger)] text-white text-[10px] font-bold leading-none">
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
    <div className="flex min-h-screen bg-[var(--bg-secondary)]">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 bg-[var(--bg-primary)] border-r border-[var(--border)] fixed inset-y-0">
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-lg font-bold text-[var(--accent)]">SaveWithMe</span>
          <BellButton alerts={alerts} categories={categories} onDismiss={dismiss} onDismissAll={dismissAll} panelAlign="left" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-[var(--border)] flex items-center justify-between">
          <ThemeToggle />
          <button
            onClick={signOut}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors"
            title="Sair"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 pb-nav-safe md:pb-0">
        {/* Mobile topbar with bell */}
        <header className="md:hidden sticky top-0 z-10 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 h-[52px] flex items-center justify-between">
          <span className="text-base font-bold text-[var(--accent)]">SaveWithMe</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BellButton alerts={alerts} categories={categories} onDismiss={dismiss} onDismissAll={dismissAll} />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only (RM-01.1) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--bg-primary)] border-t border-[var(--border)] flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center min-h-[56px] py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
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
