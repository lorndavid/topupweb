<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineProps<{
  isDark: boolean
}>()

const emit = defineEmits<{
  'toggle-dark': []
}>()

const route = useRoute()
const router = useRouter()

// Hide mobile bottom nav during dedicated payment screens to maximize focus
const shouldShow = computed(() => {
  return route.name !== 'payment' && route.name !== 'payment-success'
})

function isActive(name: string): boolean {
  if (name === 'home') {
    return route.name === 'home'
  }
  if (name === 'game') {
    return route.name === 'game-detail'
  }
  if (name === 'orders') {
    return route.name === 'order-history' || route.name === 'order-status'
  }
  return false
}

function handleGamesClick() {
  if (route.name === 'home') {
    const el = document.getElementById('games') || document.getElementById('featured-games')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      return
    }
  }
  router.push('/')
}
</script>

<template>
  <nav
    v-if="shouldShow"
    class="fixed bottom-0 left-0 right-0 z-40 lg:hidden backdrop-blur-2xl bg-white/90 dark:bg-surface-950/90 border-t border-surface-200/80 dark:border-surface-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.35)] transition-all duration-300"
    style="padding-bottom: max(0.4rem, env(safe-area-inset-bottom, 0.4rem));"
    aria-label="Mobile Navigation"
  >
    <div class="max-w-md mx-auto px-4 py-2 flex items-center justify-around">
      <!-- 1. Home / Games Tab -->
      <router-link
        to="/"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 group active:scale-90"
        :class="isActive('home') ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'"
      >
        <div class="relative p-1">
          <svg class="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <!-- Active indicator glow -->
          <span
            v-if="isActive('home')"
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-sm shadow-primary-500"
          ></span>
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight">Home</span>
      </router-link>

      <!-- 2. Browse Games Tab -->
      <button
        type="button"
        @click="handleGamesClick"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 group active:scale-90"
        :class="isActive('game') ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'"
      >
        <div class="relative p-1">
          <svg class="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
          <span
            v-if="isActive('game')"
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-sm shadow-primary-500"
          ></span>
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight">Top Up</span>
      </button>

      <!-- 3. My Orders Tab -->
      <router-link
        to="/orders"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 group active:scale-90"
        :class="isActive('orders') ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200'"
      >
        <div class="relative p-1">
          <svg class="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span
            v-if="isActive('orders')"
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-sm shadow-primary-500"
          ></span>
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight">Orders</span>
      </router-link>

      <!-- 4. Theme / Dark Mode Quick Toggle -->
      <button
        type="button"
        @click="emit('toggle-dark')"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 transition-all duration-200 active:scale-90"
        title="Toggle dark/light mode"
      >
        <div class="relative p-1">
          <!-- Sun icon when dark -->
          <svg v-if="isDark" class="w-5 h-5 text-amber-400 transition-transform duration-300 rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <!-- Moon icon when light -->
          <svg v-else class="w-5 h-5 text-indigo-500 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight">{{ isDark ? 'Light' : 'Dark' }}</span>
      </button>
    </div>
  </nav>
</template>
