/**
 * Admin Analytics — lightweight tracking composable for the admin dashboard.
 *
 * Tracks admin page views and admin actions (order status changes, etc.)
 * by posting events to the same /api/analytics/track endpoint used by the
 * public site. Events are sent immediately (no batching) since admin
 * traffic is very low volume.
 *
 * Uses the admin JWT token for authentication (optional — the track
 * endpoint is unauthenticated, but the admin API interceptor will
 * attach the token if available).
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

let initialized = false

function getSessionId(): string {
  const key = 'admin_analytics_session'
  let sid = localStorage.getItem(key)
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(key, sid)
  }
  return sid
}

/**
 * Track an admin analytics event.
 * Fires-and-forgets — never throws.
 */
export function trackAdminEvent(
  event_type: string,
  extra?: {
    page?: string
    event_data?: Record<string, unknown>
    reference?: string
    previous_status?: string
    new_status?: string
  }
): void {
  try {
    const payload: Record<string, unknown> = {
      event_type,
      session_id: getSessionId(),
      page: extra?.page || window.location.pathname,
      event_data: extra?.event_data || {},
    }
    if (extra?.reference) payload.event_data = { ...(payload.event_data as Record<string, unknown>), reference: extra.reference }
    if (extra?.previous_status) (payload.event_data as Record<string, unknown>).previous_status = extra.previous_status
    if (extra?.new_status) (payload.event_data as Record<string, unknown>).new_status = extra.new_status

    // Use sendBeacon for page leave events, fetch for everything else
    const body = JSON.stringify(payload)
    navigator.sendBeacon(`${API_BASE}/analytics/track`, new Blob([body], { type: 'application/json' }))
  } catch {
    // Silently drop — analytics are non-critical
  }
}

/**
 * Initialize admin analytics: sets up page view tracking on route changes.
 * Call once in App.vue onMounted.
 */
export function initAdminAnalytics(): void {
  if (initialized) return
  initialized = true

  // Track initial page load
  trackAdminEvent('admin_page_view', { page: window.location.pathname })

  // Track subsequent navigations via pushState / replaceState (router navigation in SPA)
  let navTimeout: ReturnType<typeof setTimeout> | null = null
  function trackNav() {
    if (navTimeout) clearTimeout(navTimeout)
    navTimeout = setTimeout(() => {
      trackAdminEvent('admin_page_view', { page: window.location.pathname })
      navTimeout = null
    }, 100)
  }

  const originalPushState = history.pushState
  history.pushState = function (...args) {
    originalPushState.apply(this, args)
    trackNav()
  }

  const originalReplaceState = history.replaceState
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args)
    trackNav()
  }
}

/**
 * Track an order status change event.
 */
export function trackOrderStatusChange(
  reference: string,
  previousStatus: string,
  newStatus: string
): void {
  trackAdminEvent('admin_order_status_change', {
    reference,
    previous_status: previousStatus,
    new_status: newStatus,
    event_data: { reference, previous_status: previousStatus, new_status: newStatus },
  })
}

/**
 * Track a product price change event.
 */
export function trackProductPriceChange(
  productCode: string,
  productName: string,
  gameCode: string,
  oldPrice: number,
  newPrice: number,
  action: 'manual_edit' | 'inline_edit' | 'reset_override'
): void {
  trackAdminEvent('admin_product_price_change', {
    event_data: {
      product_code: productCode,
      product_name: productName,
      game_code: gameCode,
      old_price: oldPrice,
      new_price: newPrice,
      difference: +(newPrice - oldPrice).toFixed(2),
      action,
    },
  })
}

/**
 * Track an announcement CRUD event.
 */
export function trackAnnouncementEvent(
  action: 'create' | 'update' | 'toggle' | 'delete',
  data: {
    announcementId?: string
    title?: string
    type?: string
    wasActive?: boolean
    newActive?: boolean
  }
): void {
  const eventType = `admin_announcement_${action}` as const
  trackAdminEvent(eventType, {
    event_data: {
      announcement_id: data.announcementId,
      title: data.title,
      type: data.type,
      was_active: data.wasActive,
      new_active: data.newActive,
      action,
    },
  })
}
