<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const updating = ref(false)

// Use vite-plugin-pwa reactive helper
const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Periodically check for service worker updates (every 30 minutes)
      const interval = setInterval(async () => {
        if (!navigator.onLine) return
        try {
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: {
              cache: 'no-store',
              'cache-control': 'no-cache',
            },
          })
          if (resp?.status === 200) {
            await registration.update()
          }
        } catch { /* offline / network error */ }
      }, 30 * 60 * 1000)

      // Also check when tab becomes visible again
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          registration.update().catch(() => {})
        }
      }
      document.addEventListener('visibilitychange', onVisibilityChange)

      onUnmounted(() => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', onVisibilityChange)
      })
    }
  },
})

async function handleUpdate() {
  updating.value = true
  try {
    await updateServiceWorker(true)
  } catch (err) {
    console.error('Failed to update service worker:', err)
    window.location.reload()
  }
}

function handleDismiss() {
  needRefresh.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="update-banner">
      <div
        v-if="needRefresh"
        class="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-sm z-[999] pointer-events-auto"
        role="alert"
        aria-live="polite"
      >
        <div class="relative overflow-hidden rounded-2xl bg-surface-900/95 dark:bg-surface-900/95 backdrop-blur-xl border border-primary-500/40 p-4 shadow-2xl shadow-primary-500/15 text-white">
          <!-- Subtle top gradient accent line -->
          <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500 via-cyan-400 to-emerald-400"></div>

          <!-- Close button -->
          <button
            @click="handleDismiss"
            class="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss update"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Content -->
          <div class="flex items-start gap-3">
            <!-- Glowing rocket icon badge -->
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-emerald-500/20 border border-primary-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <svg class="w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.458 14.96 14.96 0 01.06-.312m-2.24 7.64a6 6 0 01-2.02-2.02" />
              </svg>
            </div>

            <div class="min-w-0 flex-1 pr-4">
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-bold text-white tracking-wide">Update Available</h4>
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Ready
                </span>
              </div>
              <p class="text-xs text-surface-300 mt-1 leading-relaxed">
                A new version of VidTopUp is ready with faster loading and new updates.
              </p>

              <!-- Actions -->
              <div class="flex items-center gap-2.5 mt-3">
                <button
                  @click="handleUpdate"
                  :disabled="updating"
                  class="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-primary-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <svg v-if="updating" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{{ updating ? 'Updating...' : 'Update Now' }}</span>
                </button>
                <button
                  @click="handleDismiss"
                  class="px-3 py-2 text-xs font-medium text-surface-400 hover:text-surface-200 transition-colors rounded-xl cursor-pointer"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.update-banner-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.update-banner-leave-active {
  transition: all 0.25s ease-in;
}
.update-banner-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.95);
}
.update-banner-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.95);
}
</style>
