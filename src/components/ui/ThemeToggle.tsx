import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext'

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: 'light',  icon: Sun,     label: 'Claro' },
  { value: 'dark',   icon: Moon,    label: 'Escuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-0.5">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setPreference(value)}
          aria-label={label}
          title={label}
          className={`min-h-[44px] min-w-[36px] flex items-center justify-center rounded-md transition-colors ${
            preference === value
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
