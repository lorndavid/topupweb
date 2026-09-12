import type { Router } from 'vue-router'

declare global {
  interface Window {
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
  }
}

/**
 * Clean & Professional Google Analytics 4 (GA4) Integration.
 * - Zero render blocking (async dynamic script injection)
 * - Safe fallback: does nothing if VITE_GA_MEASUREMENT_ID is empty
 * - Automatic page_view tracking on Vue Router route changes
 */
export function setupGoogleAnalytics(router: Router) {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID

  // Only load in browser environment and if measurement ID is provided
  if (!measurementId || typeof window === 'undefined') {
    return
  }

  // Prevent duplicate script injection
  if (document.getElementById('ga-gtag-script')) {
    return
  }

  // 1. Inject Google Tag Manager script asynchronously
  const script = document.createElement('script')
  script.id = 'ga-gtag-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)

  // 2. Initialize dataLayer & gtag function
  window.dataLayer = window.dataLayer || []
  function gtag(...args: any[]) {
    window.dataLayer?.push(args)
  }
  window.gtag = gtag

  gtag('js', new Date())
  gtag('config', measurementId, {
    send_page_view: false, // Handled dynamically per route
  })

  // 3. Track page views seamlessly on route transitions
  router.afterEach((to) => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: to.fullPath,
      })
    }
  })
}

/**
 * Track custom GA4 events (e.g. begin_checkout, purchase, select_item)
 */
export function trackGAEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag && import.meta.env.VITE_GA_MEASUREMENT_ID) {
    window.gtag('event', eventName, params)
  }
}
