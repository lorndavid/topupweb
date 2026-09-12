import { createRouter, createWebHistory } from 'vue-router'

// ─── Route meta type augmentation ──────────────────────────
// Extends Vue Router's RouteMeta so we get type-safe meta fields.
declare module 'vue-router' {
  interface RouteMeta {
    /**
     * Transition effect for page enter/leave.
     * - 'slide' (default): Horizontal slide-fade — directional
     * - 'fade':            Crossfade only, no movement
     * - 'scale':           Scale + fade (pops in/out)
     * - 'slide-up':        Vertical slide up + fade (card-like reveal)
     */
    transition?: 'slide' | 'fade' | 'scale' | 'slide-up'
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    // Restore scroll position on browser back/forward navigation
    if (savedPosition) {
      return savedPosition
    }
    // Smooth scroll to hash anchor if present (e.g., /game/mlbb#products)
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    // Default: scroll to top
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { transition: 'slide' },
    },
    {
      path: '/game/:gameCode',
      name: 'game-detail',
      component: () => import('@/views/GameDetail.vue'),
      props: true,
      meta: { transition: 'slide' },
    },
    {
      path: '/checkout',
      redirect: '/',
    },
    {
      path: '/payment',
      name: 'payment',
      component: () => import('@/views/Payment.vue'),
      meta: { transition: 'fade' },
    },
    {
      path: '/payment/success',
      name: 'payment-success',
      component: () => import('@/views/PaymentSuccess.vue'),
      meta: { transition: 'scale' },
    },
    {
      path: '/orders',
      name: 'order-history',
      component: () => import('@/views/OrderHistory.vue'),
      meta: { transition: 'slide' },
    },
    {
      path: '/order/:reference',
      name: 'order-status',
      component: () => import('@/views/OrderStatus.vue'),
      props: true,
      meta: { transition: 'fade' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// ─── Dynamic Titles for SEO & Google Search ──────────────────
const routeTitles: Record<string, string> = {
  home: 'VidTopUp - Game Top-Up Cambodia | Instant KHQR Delivery',
  'order-history': 'My Orders - Track Order History & Status | VidTopUp',
  checkout: 'Checkout & Order Review | VidTopUp Cambodia',
  payment: 'Pay with KHQR - Instant ABA PayWay | VidTopUp',
  'payment-success': 'Payment Successful - Diamonds Delivered | VidTopUp',
  'order-status': 'Live Order Delivery Status | VidTopUp Cambodia',
}

const gameCodeNames: Record<string, string> = {
  mlbb: 'Mobile Legends: Bang Bang Diamonds',
  mlbb_exclusive: 'MLBB Exclusive Diamonds',
  mlbb_global: 'MLBB Global Diamonds',
  freefire_sgmy: 'Free Fire Diamonds (SG/MY)',
  freefire_global: 'Free Fire Diamonds (Global)',
  pubgm: 'PUBG Mobile UC',
  hok: 'Honor of Kings Tokens',
  genshin: 'Genshin Impact Genesis Crystals',
}

router.afterEach((to) => {
  let title = 'VidTopUp - Fast & Secure Game Top-Up Cambodia'

  if (to.name === 'game-detail' && to.params.gameCode) {
    const code = String(to.params.gameCode)
    const name = gameCodeNames[code] || code.toUpperCase().replace(/_/g, ' ')
    title = `Top Up ${name} - Instant KHQR | VidTopUp Cambodia`
  } else if (to.name && routeTitles[String(to.name)]) {
    title = routeTitles[String(to.name)]
  }

  document.title = title

  // Sync OpenGraph title for social previews
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) {
    ogTitle.setAttribute('content', title)
  }
})

export default router
