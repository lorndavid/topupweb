<script setup lang="ts">
import { ref, onMounted } from 'vue'

const DISMISSED_KEY = 'pwa_install_dismissed'
const deferredPrompt = ref<Event | null>(null)
const showPrompt = ref(false)
const dismissed = ref(localStorage.getItem(DISMISSED_KEY) === 'true')

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    if (!dismissed.value) {
      showPrompt.value = true
    }
  })

  window.addEventListener('appinstalled', () => {
    showPrompt.value = false
    deferredPrompt.value = null
  })
})

async function handleInstall() {
  if (!deferredPrompt.value) return
  const prompt = deferredPrompt.value as any
  prompt.prompt()
  const result = await prompt.userChoice
  if (result.outcome === 'accepted') {
    showPrompt.value = false
  }
  deferredPrompt.value = null
}

function handleDismiss() {
  showPrompt.value = false
  dismissed.value = true
  localStorage.setItem(DISMISSED_KEY, 'true')
}
</script>

<template>
  <Transition name="install-prompt">
    <div
      v-if="showPrompt"
      class="fixed bottom-20 left-4 right-4 z-50 lg:bottom-8 lg:left-auto lg:right-8 lg:w-80"
    >
      <div class="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 p-4 flex items-start gap-3">
        <!-- App icon -->
        <div class="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-primary-500/20 shrink-0 shadow-lg">
          <img src="/pwa-192x192.png" alt="VidTopUp" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-surface-900 dark:text-surface-100">Install VidTopUp</p>
          <p class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">Add to your home screen for faster top-ups</p>
          <div class="flex items-center gap-2 mt-3">
            <button
              @click="handleInstall"
              class="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Install
            </button>
            <button
              @click="handleDismiss"
              class="px-3 py-1.5 text-xs font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <!-- Close -->
        <button
          @click="handleDismiss"
          class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.install-prompt-enter-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.install-prompt-leave-active {
  transition: opacity 0.25s ease-in,
              transform 0.25s ease-in;
}
.install-prompt-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.install-prompt-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
