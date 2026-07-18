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
      name: 'checkout',
      component: () => import('@/views/Checkout.vue'),
      meta: { transition: 'slide-up' },
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

export default router
