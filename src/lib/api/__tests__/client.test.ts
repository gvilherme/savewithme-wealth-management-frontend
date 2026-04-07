import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import after mocks are set up
const { api } = await import('../client')
const { supabase } = await import('@/lib/supabase')

describe('api client', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends Authorization Bearer header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    })

    await api.get('/accounts')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/accounts'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  })

  it('throws with status code on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ title: 'Not Found', detail: 'Account not found' }),
    })

    await expect(api.get('/accounts/bad-id')).rejects.toMatchObject({ status: 404 })
  })

  it('throws with 422 on business rule violation', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ title: 'Unprocessable', detail: 'Insufficient balance' }),
    })

    await expect(api.post('/transactions', {})).rejects.toMatchObject({
      status: 422,
      message: 'Insufficient balance',
    })
  })

  it('throws Not authenticated when session is missing', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
    } as never)

    await expect(api.get('/accounts')).rejects.toThrow('Not authenticated')
  })

  it('returns undefined for 204 No Content', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 })

    const result = await api.delete('/categories/123')
    expect(result).toBeUndefined()
  })
})
