import { type RouteLocationNormalized } from 'vue-router'
import { GAME_NAMES } from './useMeta'

const SITE_URL = 'https://topup.lorndavid.online'
const DEFAULT_IMAGE = `${SITE_URL}/apple-touch-icon-180x180.png`

/**
 * Game-specific FAQ data for FAQPage schema.
 * Each entry maps a game code to an array of { question, answer } pairs.
 * Keys prefixed with '__default' are used as fallbacks for unknown games.
 */
const GAME_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  mlbb: [
    {
      question: 'How long does an MLBB diamond top-up take?',
      answer: 'Most Mobile Legends top-ups are delivered instantly (within 30 seconds to 2 minutes). In rare cases during peak hours, it may take up to 5 minutes. If you haven\'t received your diamonds after 5 minutes, contact our support with your order reference.',
    },
    {
      question: 'What do I need to top up Mobile Legends diamonds?',
      answer: 'You need your Mobile Legends Player ID and Server ID (Zone ID). Both can be found in your game profile screen — tap your avatar in the top-left corner of the MLBB lobby, and your ID and server will be displayed below your nickname.',
    },
    {
      question: 'Is KHQR / ABA PayWay a secure payment method?',
      answer: 'Yes. KHQR payments via ABA PayWay are processed through Cambodia\'s official banking infrastructure with bank-grade encryption. Your payment goes directly through ABA Bank\'s secure payment gateway — we never store your banking details.',
    },
    {
      question: 'Can I top up MLBB for Indonesian accounts?',
      answer: 'Mobile Legends top-ups from Bay2Game are for the MLBB Exclusive/Global regions. For Indonesian accounts, please use the mlbb_global option. Indonesia has separate pricing and package availability via the Global server route.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept Bakong KHQR payments via all Cambodian banking apps (ABA, ACLEDA, Wing, etc.) and ABA PayWay payment links. All transactions are in USD.',
    },
  ],
  mlbb_exclusive: [
    {
      question: 'What is MLBB Exclusive vs Global?',
      answer: 'MLBB Exclusive is the standard Mobile Legends server for most regions outside Indonesia. Indonesian users should use mlbb_global instead. US, EU, and other regions use the exclusive server.',
    },
    {
      question: 'How do I find my MLBB server ID?',
      answer: 'Open Mobile Legends, tap your profile avatar in the top-left corner. Your Player ID (numeric) and Server ID (e.g., \"3645\") are shown below your in-game name. Both are required when ordering.',
    },
    {
      question: 'Will I get bonus diamonds from weekly passes?',
      answer: 'Yes! Weekly Diamond Passes and other subscription packages grant bonus diamonds over multiple days. Check the product description for the exact delivery schedule. One-time diamond packages are delivered instantly.',
    },
  ],
  mlbb_global: [
    {
      question: 'What is the MLBB Global server?',
      answer: 'The MLBB Global server is specifically for Indonesian players who cannot use the standard MLBB Exclusive server. If you are in Indonesia, select \"Mobile Legends Global\" when topping up.',
    },
    {
      question: 'Are MLBB Global prices different from Exclusive?',
      answer: 'Yes. MLBB Global has separate pricing and package options set by the game publisher for the Indonesian market. Prices may differ from the Exclusive server packages.',
    },
    {
      question: 'Can I use KHQR payment for MLBB Global top-ups?',
      answer: 'Yes. We accept Bakong KHQR payments for all Mobile Legends servers including MLBB Global. Pay via any Cambodian banking app using our secure ABA PayWay payment gateway.',
    },
  ],
  freefire_sgmy: [
    {
      question: 'How fast is Free Fire diamond delivery?',
      answer: 'Free Fire top-ups are delivered instantly in most cases (under 1 minute). During high-traffic periods, delivery may take 2-3 minutes. Your diamonds will appear in-game automatically — no need to restart the game.',
    },
    {
      question: 'What information do I need for Free Fire top-up?',
      answer: 'You only need your Free Fire Player ID. This is your in-game UID number found in your Free Fire profile settings. Server ID is not required for Free Fire top-ups via Bay2Game.',
    },
    {
      question: 'What is the \"Less is More\" 520-diamond package?',
      answer: 'The \"Less is More\" package gives 520 Free Fire diamonds instantly upon first recharge. It is available for Free Fire SG/MY accounts with 49 or fewer remaining diamonds. You must confirm your balance is ≤49 diamonds before purchasing.',
    },
    {
      question: 'Can I top up Free Fire for accounts in Cambodia?',
      answer: 'Yes. Free Fire SG/MY covers Cambodia (KH), Singapore (SG), Malaysia (MY), Philippines (PH), Europe, and Bangladesh. Simply enter your Free Fire UID and select your package.',
    },
  ],
  pubg_mobile: [
    {
      question: 'How long does PUBG Mobile UC top-up take?',
      answer: 'PUBG Mobile UC is delivered instantly (under 2 minutes). If you experience delays, check your order status using your reference number. Most delays are resolved within 5 minutes.',
    },
    {
      question: 'What do I need for a PUBG Mobile top-up?',
      answer: 'You need your PUBG Mobile Player ID. This numeric ID can be found in your in-game profile or settings menu. No server/zone ID is required for PUBG Mobile top-ups.',
    },
    {
      question: 'Is PUBG Mobile UC the same for all regions?',
      answer: 'PUBG Mobile UC is region-specific. Make sure to select the correct region (e.g., PUBG Mobile Global, KR/JP, etc.) to ensure your UC credits are delivered to the right account.',
    },
  ],
  bloodstrike: [
    {
      question: 'How fast is Blood Strike top-up delivery?',
      answer: 'Blood Strike top-ups are delivered instantly through the official API. Most orders complete within 30 seconds to 1 minute from payment confirmation.',
    },
    {
      question: 'What details do I need for Blood Strike?',
      answer: 'You only need your Blood Strike Player ID (UID). This is found in your in-game profile. No server ID is required for Blood Strike top-ups.',
    },
    {
      question: 'What currencies are available for Blood Strike?',
      answer: 'Blood Strike offers various in-game items and currencies for top-up. Check the available packages on our game page for the latest offerings and prices.',
    },
  ],
  hok: [
    {
      question: 'What is Honor of Kings (HOK)?',
      answer: 'Honor of Kings (HOK) is a popular MOBA game by TiMi Studios / Level Infinite. We offer top-up packages for HOK at competitive prices with instant delivery.',
    },
    {
      question: 'What do I need for HOK top-up?',
      answer: 'You need your HOK Player ID and Server ID. Both can be found in your game profile screen.',
    },
    {
      question: 'Is HOK top-up delivered instantly?',
      answer: 'Yes. Honor of Kings top-ups are processed through our automated system and delivered within 1-2 minutes in most cases.',
    },
  ],
  wuwa: [
    {
      question: 'What is Wuthering Waves (WUWA)?',
      answer: 'Wuthering Waves is an open-world action RPG by Kuro Games. We offer top-up services for Lunite and other in-game currencies.',
    },
    {
      question: 'How do I find my WUWA player ID?',
      answer: 'Your Wuthering Waves player ID can be found in your profile settings within the game. Enter this ID when ordering a top-up.',
    },
    {
      question: 'How long does a Wuthering Waves top-up take?',
      answer: 'Wuthering Waves top-ups are delivered instantly through our automated API. Most orders complete within 30 seconds to 2 minutes from payment confirmation.',
    },
  ],
}

/**
 * Generic FAQ fallback for games without specific FAQ entries.
 */
const DEFAULT_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'How long does my top-up take to deliver?',
    answer: 'Most game top-ups are delivered instantly (within 30 seconds to 2 minutes) via our automated API. If your order is still processing after 5 minutes, it may be awaiting stock — our system will automatically retry every 60 seconds.',
  },
  {
    question: 'What information do I need to top up?',
    answer: 'You typically need your in-game Player ID (numeric UID). Some games also require a Server/Zone ID. The required fields are shown on the game page when you start the top-up process.',
  },
  {
    question: 'Is KHQR / ABA PayWay secure?',
    answer: 'Yes. All payments are processed through ABA PayWay\'s secure payment gateway using Cambodia\'s Bakong KHQR system. Your payment information is encrypted and we never store your banking details.',
  },
  {
    question: 'What should I do if my top-up does not arrive?',
    answer: 'If your diamonds/UC have not arrived after 10 minutes, check your order status using your reference number. Most issues are due to temporary stock shortages — our system retries automatically. Contact our support team if the issue persists.',
  },
  {
    question: 'Can I get a refund if I enter the wrong Player ID?',
    answer: 'Top-ups are processed automatically by the game publisher and cannot be reversed once delivered. Please double-check your Player ID and Server ID before completing payment. If you made a mistake, contact our support immediately with your order reference.',
  },
]

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
 *   - game-detail:    Product + FAQPage schemas — dynamic per game, removed on leave
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

      // Remove stale schemas from previous game-detail visits
      removeJsonLd('jsonld-product')
      removeJsonLd('jsonld-faq')
    } else if (name === 'game-detail') {
      const gameCode = (route.params.gameCode as string) || ''
      const game = GAME_NAMES[gameCode]
      const productName = game?.name || gameCode.toUpperCase()
      const productDesc =
        game?.description ||
        `Top up ${gameCode} in Cambodia — Fast, secure, KHQR payment.`

      // ─── Product schema (existing) ────────────────
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

      // ─── FAQPage schema (game-specific) ───────────
      const faqs = GAME_FAQS[gameCode] || DEFAULT_FAQS
      upsertJsonLd('jsonld-faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      })
    } else {
      // Non-home, non-game-detail: remove dynamic schemas
      removeJsonLd('jsonld-product')
      removeJsonLd('jsonld-faq')
    }
  }

  return { setJsonLd }
}
