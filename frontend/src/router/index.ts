import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/game/:gameCode',
      name: 'game-detail',
      component: () => import('@/views/GameDetail.vue'),
      props: true,
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/views/Checkout.vue'),
    },
    {
      path: '/payment',
      name: 'payment',
      component: () => import('@/views/Payment.vue'),
    },
    {
      path: '/payment/success',
      name: 'payment-success',
      component: () => import('@/views/PaymentSuccess.vue'),
    },
    {
      path: '/orders',
      name: 'order-history',
      component: () => import('@/views/OrderHistory.vue'),
    },
    {
      path: '/order/:reference',
      name: 'order-status',
      component: () => import('@/views/OrderStatus.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
