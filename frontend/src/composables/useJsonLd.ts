import { type RouteLocationNormalized } from 'vue-router'
import { GAME_NAMES } from './useMeta'

const SITE_URL = 'https://topup.lorndavid.online'
const DEFAULT_IMAGE = `${SITE_URL}/apple-touch-icon-180x180.png`

/**
 * Human-readable route labels for BreadcrumbList generation.
 */
const ROUTE_LABELS: Record<string, string> = {
  home: 'Home',
  'game-detail': '',
  checkout: 'Checkout',
  payment: 'Payment',
  'payment-success': 'Payment Successful',
  'order-history': 'My Orders',
  'order-status': 'Order Status',
}

/**
 * Shared helper: creates or updates a <script type="application/ld+json"> element
 * with the given ID. If a script with that ID already exists, its textContent is
 * replaced. Otherwise, a new element is appended to <head>.
 */
function upsertJsonLd(id: string, data: Record<string, unknown>): void {
  const existing = document.querySelector(`script#${id}`)
  if (existing) {
    existing.textContent = JSON.stringify(data)
    return
  }
  const script = document.createElement('script')
  script.id = id
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

/**
 * Removes a JSON-LD script element by ID. Used to clean up stale dynamic
 * schemas (e.g. Product) when navigating away from a game-detail page.
 */
function removeJsonLd(id: string): void {
  const el = document.querySelector(`script#${id}`)
  if (el) el.remove()
}

/**
 * Composable that injects Schema.org structured data (JSON-LD) into the page <head>.
 *
 * Schemas injected per route:
 *   - All routes:     Organization + BreadcrumbList — persistent site-wide context
 *   - home:           WebSite (with SearchAction) — added/home route only
 *   - game-detail:    Product schema — dynamic per game, removed on leave
 */
export function useJsonLd() {
  /**
   * Injects/updates JSON-LD for the current route.
   * Call this inside router.afterEach.
   */
  function setJsonLd(route: RouteLocationNormalized): void {
    const name = route.name as string | undefined
    const url = `${SITE_URL}${route.path}`

    // ─── Organization — on EVERY route (crawlers may deep-link) ──
    upsertJsonLd('jsonld-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'VidTopUp',
      url: SITE_URL,
      logo: DEFAULT_IMAGE,
      description:
        'Fast & secure game top-ups in Cambodia. Mobile Legends, Free Fire, PUBG Mobile & more. KHQR Payment via ABA/Bakong — Instant Delivery.',
      areaServed: 'KH',
      paymentAccepted: ['KHQR', 'ABA PayWay'],
      priceRange: '$0.50–$200',
    })

    // ─── BreadcrumbList — on every page ──────────────────────
    const crumbs: Array<{ position: number; name: string; item: string }> = [
      { position: 1, name: 'Home', item: SITE_URL },
    ]

    if (name === 'game-detail') {
      const gameCode = (route.params.gameCode as string) || ''
      const game = GAME_NAMES[gameCode]
      const gameName = game?.name || gameCode.toUpperCase()
      crumbs.push({
        position: 2,
        name: gameName,
        item: url,
      })
    } else if (name && ROUTE_LABELS[name] && name !== 'home') {
      crumbs.push({
        position: 2,
        name: ROUTE_LABELS[name],
        item: url,
      })
    }

    upsertJsonLd('jsonld-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c) => ({
        '@type': 'ListItem',
        position: c.position,
        name: c.name,
        item: c.item,
      })),
    })

    // ─── Route-specific schemas ──────────────────────────────

    if (name === 'home') {
      // WebSite with search action
      upsertJsonLd('jsonld-website', {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      })

      // Remove stale product schema from previous game-detail visit
      removeJsonLd('jsonld-product')
    } else if (name === 'game-detail') {
      const gameCode = (route.params.gameCode as string) || ''
      const game = GAME_NAMES[gameCode]
      const productName = game?.name || gameCode.toUpperCase()
      const productDesc =
        game?.description ||
        `Top up ${gameCode} in Cambodia — Fast, secure, KHQR payment.`

      upsertJsonLd('jsonld-product', {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${productName} Top-Up`,
        description: productDesc,
        image: DEFAULT_IMAGE,
        brand: {
          '@type': 'Brand',
          name: productName,
        },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        url,
      })
    } else {
      // Non-home, non-game-detail: remove product schema only
      removeJsonLd('jsonld-product')
    }
  }

  return { setJsonLd }
}
