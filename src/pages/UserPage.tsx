/**
 * Página de configurações do usuário.
 *
 * DÉBITO TÉCNICO (backend):
 * - As preferências aqui salvas ficam apenas no cookie do browser.
 * - Futuramente, criar endpoint PATCH /api/v1/users/me/preferences que persista
 *   { currency, theme } no banco, carregando-as ao logar em qualquer dispositivo.
 * - O front deve ler as preferências do backend ao iniciar e usar o cookie apenas
 *   como cache local (fallback offline).
 */

import { useAuth } from '@/hooks/useAuth'
import { CURRENCIES, useUserPreferences } from '@/contexts/UserPreferencesContext'
import { User, Palette, Globe, LogOut, ChevronRight, Moon } from 'lucide-react'

function Section({ title, children }: { children: React.ReactNode; title: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="text-gray-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {value && <p className="text-xs text-gray-400 mt-0.5">{value}</p>}
      </div>
      {children}
    </div>
  )
}

export function UserPage() {
  const { user, signOut } = useAuth()
  const { currency, setCurrency } = useUserPreferences()

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Perfil & Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Personalize sua experiência</p>
      </div>

      {/* Account info */}
      <Section title="Conta">
        <Row icon={<User size={17} />} label="E-mail" value={user?.email ?? '—'} />
        <Row icon={<LogOut size={17} />} label="Sair da conta">
          <button
            onClick={signOut}
            className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors flex items-center gap-1"
          >
            Sair <ChevronRight size={14} />
          </button>
        </Row>
      </Section>

      {/* Preferences */}
      <Section title="Preferências">
        {/* Currency */}
        <Row
          icon={<Globe size={17} />}
          label="Moeda padrão"
          value="Usada em novos lançamentos e no resumo do dashboard"
        >
          <select
            value={currency.code}
            onChange={(e) => setCurrency(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </Row>
        <Row
          icon={<Globe size={17} />}
          label="Moeda selecionada"
          value={`${currency.label} (${currency.symbol})`}
        />

        {/* Dark mode — placeholder */}
        <Row
          icon={<Moon size={17} />}
          label="Tema escuro"
          value="Em breve"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Em breve
            </span>
          </div>
        </Row>

        {/* Color scheme — placeholder */}
        <Row
          icon={<Palette size={17} />}
          label="Esquema de cores"
          value="Em breve"
        >
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            Em breve
          </span>
        </Row>
      </Section>

      {/* Tech debt note visible in dev */}
      {import.meta.env.DEV && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 space-y-1">
          <p className="font-semibold">⚠ Débito técnico (visível apenas em dev)</p>
          <p>
            Preferências salvas somente em cookie local. Falta endpoint{' '}
            <code className="bg-amber-100 px-1 rounded">PATCH /api/v1/users/me/preferences</code>{' '}
            no backend para persistir por conta.
          </p>
        </div>
      )}
    </div>
  )
}
