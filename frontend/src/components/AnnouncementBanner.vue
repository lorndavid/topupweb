<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getAnnouncements } from '@/services/api'
import type { SiteAnnouncement } from '@/types'

const announcements = ref<SiteAnnouncement[]>([])
const dismissedIds = ref<Set<string>>(new Set())
const loading = ref(true)

const visibleAnnouncements = computed(() =>
  announcements.value.filter((a) => !dismissedIds.value.has(a._id))
)

const bannerStyle = (type: string) => {
  switch (type) {
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200'
    case 'success':
      return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-200'
    case 'promo':
      return 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-800 dark:text-purple-200'
    case 'info':
    default:
      return 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-200'
  }
}

const accentIcon = (type: string) => {
  switch (type) {
    case 'warning': return 'warning'
    case 'success': return 'check'
    case 'promo': return 'star'
    default: return 'info'
  }
}

function dismiss(id: string) {
  dismissedIds.value = new Set([...dismissedIds.value, id])
  // Persist dismissed announcements in localStorage
  try {
    const stored = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]') as string[]
    if (!stored.includes(id)) {
      stored.push(id)
      localStorage.setItem('dismissed_announcements', JSON.stringify(stored))
    }
  } catch { /* ignore */ }
}

onMounted(async () => {
  try {
    // Restore dismissed state
    try {
      const stored = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]') as string[]
      dismissedIds.value = new Set(stored)
    } catch { /* ignore */ }

    announcements.value = await getAnnouncements()
  } catch {
    // Silently fail — banners are non-critical
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-0">
    <TransitionGroup name="banner">
      <div
        v-for="ann in visibleAnnouncements"
        :key="ann._id"
        class="relative border-b px-4 py-2.5 text-sm transition-all duration-300"
        :class="bannerStyle(ann.type)"
      >
        <div class="max-w-5xl mx-auto flex items-center gap-3">
          <!-- Icon -->
          <svg
            v-if="ann.type === 'warning'"
            class="w-5 h-5 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <svg
            v-else-if="ann.type === 'success'"
            class="w-5 h-5 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else-if="ann.type === 'promo'"
            class="w-5 h-5 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <svg
            v-else
            class="w-5 h-5 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          <!-- Text -->
          <div class="flex-1 min-w-0">
            <span class="font-semibold mr-1.5">{{ ann.title }}</span>
            <span class="opacity-90">{{ ann.message }}</span>
            <a
              v-if="ann.link_url"
              :href="ann.link_url"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-2 font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {{ ann.link_label || 'Learn More' }} →
            </a>
          </div>

          <!-- Dismiss -->
          <button
            v-if="ann.dismissible"
            class="flex-shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            @click="dismiss(ann._id)"
            aria-label="Dismiss announcement"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.banner-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.banner-leave-active {
  transition: all 0.25s ease-in;
}
.banner-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-100%);
  padding-top: 0;
  padding-bottom: 0;
  margin-bottom: 0;
  overflow: hidden;
}
.banner-enter-to {
  opacity: 1;
  max-height: 80px;
}
.banner-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-bottom: 0;
  overflow: hidden;
}
</style>
