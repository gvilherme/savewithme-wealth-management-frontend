import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const SESSION_EXPIRY_KEY = 'swm_session_expires_at'
const SHORT_SESSION_MS = 60 * 60 * 1000 // 1 hora

export function setShortSession() {
  localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SHORT_SESSION_MS))
}

export function clearShortSession() {
  localStorage.removeItem(SESSION_EXPIRY_KEY)
}

export function isShortSessionExpired(): boolean {
  const raw = localStorage.getItem(SESSION_EXPIRY_KEY)
  if (!raw) return false
  return Date.now() > parseInt(raw, 10)
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (session) return <Navigate to="/dashboard" replace />

  const handleGoogleSignIn = async () => {
    clearShortSession()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    try {
      if (tab === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!rememberMe) {
          setShortSession()
        } else {
          clearShortSession()
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Verifique seu e-mail para confirmar o cadastro.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "w-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--text-tertiary)]"

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--accent)]">SaveWithMe</h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">Gerencie suas finanças com clareza</p>
        </div>

        <div className="bg-[var(--bg-primary)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-tertiary)]">ou</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Tabs */}
          <div className="flex mb-4 bg-[var(--bg-secondary)] rounded-lg p-1">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setInfo(null) }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  tab === t
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {t === 'signin' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />

            {tab === 'signin' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="text-sm text-[var(--text-secondary)]">Manter conectado</span>
                {!rememberMe && (
                  <span className="text-xs text-[var(--text-tertiary)] ml-auto">sessão de 1h</span>
                )}
              </label>
            )}

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            {info && <p className="text-sm text-[var(--accent)]">{info}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[var(--accent)] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Aguarde...' : tab === 'signin' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
