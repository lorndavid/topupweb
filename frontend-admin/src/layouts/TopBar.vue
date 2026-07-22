<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  menuClick: []
  toggleExpand: []
}>()

const route = useRoute()
const router = useRouter()
const theme = useThemeStore()
const auth = useAuthStore()

const userMenuOpen = ref(false)

const pageTitle = computed(() => {
  return (route.meta?.title as string) || 'Dashboard'
})

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

function handleLogout() {
  userMenuOpen.value = false
  auth.logout()
}

// Close user menu on click outside
function onClickOutside() {
  userMenuOpen.value = false
}
</script>

<template>
  <header class="flex items-center justify-between h-16 px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
    <!-- Left: menu button + breadcrumbs -->
    <div class="flex items-center gap-4">
      <!-- Hamburger (mobile) / Collapse (desktop) -->
      <button
        class="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 lg:hidden"
        @click="emit('menuClick')"
        aria-label="Toggle navigation"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Collapse toggle (desktop) -->
      <button
        class="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
        @click="emit('toggleExpand')"
        aria-label="Toggle sidebar"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>

      <!-- Breadcrumbs -->
      <div class="flex items-center gap-2 text-sm">
        <span class="text-slate-400 dark:text-slate-500">Admin</span>
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="font-medium text-slate-700 dark:text-slate-300">{{ pageTitle }}</span>
      </div>
    </div>

    <!-- Right: search, theme toggle, user -->
    <div class="flex items-center gap-2">
      <!-- Search -->
      <div class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 text-xs">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search...</span>
        <kbd class="hidden lg:inline-flex px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">⌘K</kbd>
      </div>

      <!-- Theme toggle -->
      <button
        class="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
        @click="theme.toggle()"
        :aria-label="theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <svg v-if="theme.isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <!-- User dropdown -->
      <div class="relative">
        <button
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
          @click="toggleUserMenu"
        >
          <div class="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {{ auth.username?.[0]?.toUpperCase() || 'A' }}
          </div>
          <span class="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">{{ auth.username }}</span>
          <svg class="w-3.5 h-3.5 text-slate-400 transition-transform duration-150" :class="userMenuOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown menu -->
        <Transition name="fade">
          <div
            v-if="userMenuOpen"
            v-click-outside="onClickOutside"
            class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 py-1 shadow-lg z-50"
          >
            <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <p class="text-xs font-medium text-slate-900 dark:text-white">{{ auth.username }}</p>
              <p class="text-[10px] text-slate-400 dark:text-slate-500">Administrator</p>
            </div>
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              @click="handleLogout"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<!-- Vue directive for click-outside -->
<script lang="ts">
interface ClickOutsideElement extends HTMLElement {
  _clickOutside?: (event: MouseEvent) => void
}

export default {
  directives: {
    'click-outside': {
      mounted(el: HTMLElement, binding: { value: () => void }) {
        const element = el as ClickOutsideElement
        element._clickOutside = (event: MouseEvent) => {
          if (!el.contains(event.target as Node)) {
            binding.value()
          }
        }
        document.addEventListener('click', element._clickOutside)
      },
      unmounted(el: HTMLElement) {
        const element = el as ClickOutsideElement
        if (element._clickOutside) {
          document.removeEventListener('click', element._clickOutside)
        }
      },
    },
  },
}
</script>
