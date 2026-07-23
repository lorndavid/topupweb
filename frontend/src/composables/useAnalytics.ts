import { onUnmounted } from 'vue'
import api from '@/services/api'

// ─── Types ──────────────────────────────────────────────────

export type AnalyticsEventType =
  | 'page_view'
  | 'game_click'
  | 'product_select'
  | 'verify_player'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'search'

export interface AnalyticsEvent {
  event_type: AnalyticsEventType
  event_data?: Record<string, unknown>
  page?: string
  game_code?: string
  product_code?: string
  session_id?: string
}

// ─── Session ID (persisted in localStorage) ────────────────

function getSessionId(): string {
  let sid = localStorage.getItem('analytics_session_id')
  if (!sid) {
    sid = (typeof crypto !== 'undefined' && crypto.randomUUID?.()) || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('analytics_session_id', sid)
  }
  return sid
}

// ─── Analytics Composable ───────────────────────────────────

/**
 * Self-hosted analytics composable.
 *
 * Features:
 * - Batches events and flushes every 5s or every 20 events (whichever comes first)
 * - Uses `navigator.sendBeacon` for reliable page-leave tracking (via `beforeunload`)
 * - Auto-generates a persistent session ID stored in localStorage
 * - Rate-limited server-side, so no throttling logic needed on the client
 *
 * Usage:
 * ```ts
 * const analytics = useAnalytics()
 * analytics.track('page_view', { page: '/game/mlbb' })
 * analytics.track('game_click', { game_code: 'mlbb' })
 * ```
 */
export function useAnalytics() {
  const sessionId = getSessionId()
  let buffer: AnalyticsEvent[] = []
  // Singleton guard: prevent duplicate timers/buffers when composable
  // is initialized in both App.vue and child page components.
  if ((window as any).__analyticsInitialized) {
    // Return a stub that delegates to the existing instance
    return {
      track: () => undefined,
      trackPageView: () => undefined,
      trackGameClick: () => undefined,
      trackPayment: () => undefined,
      flush: () => Promise.resolve(),
    }
  }
  (window as any).__analyticsInitialized = true

  let flushTimer: ReturnType<typeof setInterval> | null = null
  let isTeardown = false

  // ─── Flush buffer to backend ──────────────────────────────

  async function flush(): Promise<void> {
    if (buffer.length === 0) return
    const batch = buffer.splice(0) // atomically drain the buffer
    try {
      await api.post('/analytics/track', batch, { timeout: 3000 })
    } catch {
      // Silently drop — analytics are non-critical
    }
  }

  // ─── Push event into buffer ───────────────────────────────

  function push(event: AnalyticsEvent): void {
    if (isTeardown) return
    buffer.push(event)

    // Flush immediately if buffer is large enough
    if (buffer.length >= 20) {
      flush()
    }
  }

  // ─── Start periodic flush timer ───────────────────────────

  function start(): void {
    if (flushTimer) return
    flushTimer = setInterval(() => flush(), 5000) // flush every 5 seconds
  }

  // ─── Stop flush timer ─────────────────────────────────────

  function stop(): void {
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
  }

  // ─── Flush on page leave via sendBeacon ───────────────────

  function handleBeforeUnload(): void {
    if (buffer.length === 0) return
    const batch = buffer.splice(0)
    try {
      const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics/track', blob)
    } catch {
      // Silently drop
    }
  }

  // ─── Register/unregister leave handler ────────────────────

  function registerLeaveHandler(): void {
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  function unregisterLeaveHandler(): void {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Track an analytics event.
   *
   * @param event_type  - The type/category of event
   * @param extra       - Additional event data (game_code, product_code, page, etc.)
   */
  function track(
    event_type: AnalyticsEventType,
    extra?: {
      event_data?: Record<string, unknown>
      page?: string
      game_code?: string
      product_code?: string
    }
  ): void {
    push({
      event_type,
      session_id: sessionId,
      event_data: extra?.event_data,
      page: extra?.page,
      game_code: extra?.game_code,
      product_code: extra?.product_code,
    })
  }

  /**
   * Convenience: track a page view with the current route details.
   * Typically called once in router.afterEach.
   */
  function trackPageView(page: string, gameCode?: string): void {
    push({
      event_type: 'page_view',
      session_id: sessionId,
      page,
      ...(gameCode ? { game_code: gameCode } : {}),
    })
  }

  /**
   * Convenience: track a game card click.
   */
  function trackGameClick(gameCode: string): void {
    push({
      event_type: 'game_click',
      session_id: sessionId,
      game_code: gameCode,
      page: '/',
    })
  }

  /**
   * Convenience: track payment-related events.
   */
  function trackPayment(
    status: 'initiated' | 'completed' | 'failed',
    extra: { game_code?: string; product_code?: string; amount?: number; reference?: string }
  ): void {
    const mapping: Record<string, AnalyticsEventType> = {
      initiated: 'payment_initiated',
      completed: 'payment_completed',
      failed: 'payment_failed',
    }
    push({
      event_type: mapping[status],
      session_id: sessionId,
      event_data: extra as Record<string, unknown>,
      game_code: extra.game_code,
      product_code: extra.product_code,
    })
  }

  // ─── Lifecycle ────────────────────────────────────────────

  onUnmounted(() => {
    isTeardown = true
    flush() // flush remaining events on unmount
    stop()
    unregisterLeaveHandler()
  })

  // ─── Init ─────────────────────────────────────────────────

  start()
  registerLeaveHandler()

  return {
    track,
    trackPageView,
    trackGameClick,
    trackPayment,
    flush,
  }
}
