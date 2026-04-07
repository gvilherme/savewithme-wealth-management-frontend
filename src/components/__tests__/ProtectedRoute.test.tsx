import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/contexts/AuthContext'

function renderWithRouter(ui: React.ReactNode, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows loading spinner while auth is resolving', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: true, user: null, signOut: vi.fn() })

    const { container } = renderWithRouter(
      <ProtectedRoute><div>Protected</div></ProtectedRoute>,
    )

    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { user: { id: 'u1' } } as never,
      loading: false,
      user: { id: 'u1' } as never,
      signOut: vi.fn(),
    })

    renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to /login when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, user: null, signOut: vi.fn() })

    renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
      '/dashboard',
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })
})
