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
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { User, Palette, Globe, LogOut, ChevronRight } from 'lucide-react'

function Section({ title, children }: { children: React.ReactNode; title: string }) {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{title}</h2>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">{children}</div>
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
      <div className="text-[var(--text-tertiary)] flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {value && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{value}</p>}
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Perfil & Configurações</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Personalize sua experiência</p>
      </div>

      <Section title="Conta">
        <Row icon={<User size={17} />} label="E-mail" value={user?.email ?? '—'} />
        <Row icon={<LogOut size={17} />} label="Sair da conta">
          <button
            onClick={signOut}
            className="text-sm text-[var(--danger)] hover:opacity-80 font-medium transition-opacity flex items-center gap-1"
          >
            Sair <ChevronRight size={14} />
          </button>
        </Row>
      </Section>

      <Section title="Preferências">
        <Row
          icon={<Globe size={17} />}
          label="Moeda padrão"
          value="Usada em novos lançamentos e no resumo do dashboard"
        >
          <select
            value={currency.code}
            onChange={(e) => setCurrency(e.target.value)}
            className="text-sm border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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

        <Row
          icon={<Palette size={17} />}
          label="Tema"
          value="Claro, escuro ou seguir o sistema"
        >
          <ThemeToggle />
        </Row>
      </Section>

      {import.meta.env.DEV && (
        <div className="bg-[var(--warning-subtle)] border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-[var(--warning)] space-y-1">
          <p className="font-semibold">Débito técnico (visível apenas em dev)</p>
          <p>
            Preferências salvas somente em cookie local. Falta endpoint{' '}
            <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">PATCH /api/v1/users/me/preferences</code>{' '}
            no backend para persistir por conta.
          </p>
        </div>
      )}
    </div>
  )
}
