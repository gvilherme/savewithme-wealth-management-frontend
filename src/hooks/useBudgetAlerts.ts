import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { BudgetAlertEvent } from '@/types/api'

const STORAGE_KEY = 'budget_alerts_dismissed'

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveDismissed(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

function alertKey(budgetId: string, thresholdPercent: number) {
  return `${budgetId}_${thresholdPercent}`
}

export function useBudgetAlerts(userId: string | undefined) {
  const [alerts, setAlerts] = useState<BudgetAlertEvent[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const dismiss = useCallback((budgetId: string, thresholdPercent: number) => {
    const key = alertKey(budgetId, thresholdPercent)
    const set = getDismissed()
    set.add(key)
    saveDismissed(set)
    setAlerts(prev => prev.filter(a => alertKey(a.budgetId, a.thresholdPercent) !== key))
  }, [])

  const dismissAll = useCallback(() => {
    setAlerts(prev => {
      const set = getDismissed()
      for (const a of prev) set.add(alertKey(a.budgetId, a.thresholdPercent))
      saveDismissed(set)
      return []
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    let retryTimeout: ReturnType<typeof setTimeout>
    const BASE_URL = import.meta.env.VITE_API_URL as string

    async function connect() {
      if (cancelled) return

      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token || cancelled) return

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(
          `${BASE_URL}/api/v1/user/${userId}/budgets/alerts/stream`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        )

        if (!res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let pendingEvent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('event:')) {
              pendingEvent = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              const payload = line.slice(5).trim()
              if (pendingEvent === 'budget-threshold') {
                try {
                  const alert: BudgetAlertEvent = { ...JSON.parse(payload), receivedAt: new Date().toISOString() }
                  const key = alertKey(alert.budgetId, alert.thresholdPercent)
                  if (!getDismissed().has(key)) {
                    setAlerts(prev =>
                      prev.some(a => alertKey(a.budgetId, a.thresholdPercent) === key)
                        ? prev
                        : [...prev, alert],
                    )
                  }
                } catch { /* malformed payload */ }
              }
              pendingEvent = ''
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }

      if (!cancelled) {
        retryTimeout = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(retryTimeout)
      abortRef.current?.abort()
    }
  }, [userId])

  return { alerts, dismiss, dismissAll }
}
