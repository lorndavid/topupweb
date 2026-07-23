import { type RouteLocationNormalized } from 'vue-router'

export interface SeoMeta {
  title: string
  description: string
  image?: string
  ogType?: string
  twitterCard?: 'summary' | 'summary_large_image'
}

const SITE_URL = 'https://topup.lorndavid.online'
const DEFAULT_IMAGE = `${SITE_URL}/apple-touch-icon-180x180.png`

/**
 * Maps game codes to human-readable names for dynamic SEO titles/descriptions.
 */
const GAME_NAMES: Record<string, { name: string; description: string }> = {
  mlbb: {
    name: 'Mobile Legends Bang Bang',
    description: 'Fast MLBB diamond top-up in Cambodia — KHQR Payment, Instant Delivery.',
  },
  mlbb_exclusive: {
    name: 'Mobile Legends Bang Bang',
    description: 'Fast MLBB diamond top-up in Cambodia — KHQR Payment, Instant Delivery.',
  },
  freefire_sgmy: {
    name: 'Free Fire',
    description: 'Free Fire diamond & bundle top-up in Cambodia — Best prices, Instant Delivery.',
  },
  freefire_sg: {
    name: 'Free Fire',
    description: 'Free Fire diamond & bundle top-up in Cambodia — Best prices, Instant Delivery.',
  },
  pubg_mobile: {
    name: 'PUBG Mobile',
    description: 'PUBG Mobile UC top-up in Cambodia — Secure payment, Instant Delivery.',
  },
  bloodstrike: {
    name: 'Blood Strike',
    description: 'Blood Strike top-up in Cambodia — Fast & affordable, KHQR Payment.',
  },
}

/**
 * Static SEO metadata keyed by route name.
 * Dynamic routes (game-detail) are handled in setMeta with param lookup.
 */
const ROUTE_META: Record<string, SeoMeta> = {
  home: {
    title: 'VidTopUp — Game Top-Up Cambodia',
    description:
      'Fast & secure game top-ups in Cambodia. Mobile Legends, Free Fire, PUBG Mobile & more. KHQR Payment via ABA/Bakong — Instant Delivery.',
    ogType: 'website',
    twitterCard: 'summary_large_image',
  },
  checkout: {
    title: 'Checkout — VidTopUp',
    description: 'Complete your game top-up payment securely with KHQR.',
    ogType: 'website',
    twitterCard: 'summary',
  },
  payment: {
    title: 'Payment — VidTopUp',
    description: 'Scan KHQR to pay for your game top-up.',
    ogType: 'website',
    twitterCard: 'summary',
  },
  'payment-success': {
    title: 'Payment Successful — VidTopUp',
    description: 'Your game top-up payment was successful! Your diamonds are on the way.',
    ogType: 'website',
    twitterCard: 'summary',
  },
  'order-history': {
    title: 'My Orders — VidTopUp',
    description: 'View your game top-up order history and track delivery status.',
    ogType: 'website',
    twitterCard: 'summary',
  },
  'order-status': {
    title: 'Order Status — VidTopUp',
    description: 'Track your game top-up order in real-time.',
    ogType: 'website',
    twitterCard: 'summary',
  },
}

/**
 * Build SEO metadata for the current route.
 * Uses static ROUTE_META by route name, with special handling for game-detail.
 */
function buildSeoMeta(route: RouteLocationNormalized): SeoMeta {
  const name = route.name as string | undefined

  // ─── Game detail: derive from game code param ───
  if (name === 'game-detail') {
    const gameCode = (route.params.gameCode as string) || ''
    // Safety guard: if gameCode is empty, fall back to home meta
    if (!gameCode) return ROUTE_META.home
    const game = GAME_NAMES[gameCode]
    if (game) {
      return {
        title: `${game.name} Top-Up — VidTopUp`,
        description: game.description,
        ogType: 'product',
        twitterCard: 'summary_large_image',
      }
    }
    // Fallback for unknown game codes
    const code = gameCode.toUpperCase()
    return {
      title: `${code} Top-Up — VidTopUp`,
      description: `Top up ${gameCode} in Cambodia — Fast, secure, KHQR payment.`,
      ogType: 'product',
      twitterCard: 'summary',
    }
  }

  // ─── Static routes ───
  if (name && ROUTE_META[name]) {
    return ROUTE_META[name]
  }

  // ─── Fallback ───
  return ROUTE_META.home
}

/**
 * Sets or updates DOM meta tags for SEO (title, description, Open Graph, Twitter Card).
 * Call this on every route change.
 */
export function useMeta() {
  function setMeta(route: RouteLocationNormalized): void {
    const seo = buildSeoMeta(route)
    const url = `${SITE_URL}${route.path}`
    const image = seo.image || DEFAULT_IMAGE

    document.title = seo.title

    // Helper: set or create a meta tag
    function setMetaTag(name: string, content: string, property = false): void {
      const attr = property ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    // Standard meta
    setMetaTag('description', seo.description)

    // Open Graph
    setMetaTag('og:title', seo.title, true)
    setMetaTag('og:description', seo.description, true)
    setMetaTag('og:image', image, true)
    setMetaTag('og:url', url, true)
    setMetaTag('og:type', seo.ogType || 'website', true)
    setMetaTag('og:site_name', 'VidTopUp', true)

    // Twitter Card
    setMetaTag('twitter:card', seo.twitterCard || 'summary_large_image')
    setMetaTag('twitter:title', seo.title)
    setMetaTag('twitter:description', seo.description)
    setMetaTag('twitter:image', image)
    setMetaTag('twitter:url', url)

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url
  }

  return { setMeta }
}
