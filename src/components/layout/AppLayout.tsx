import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Wallet, ArrowLeftRight, Tag, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
]

export function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed inset-y-0">
        <div className="px-6 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-emerald-600">SaveWithMe</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100'
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
