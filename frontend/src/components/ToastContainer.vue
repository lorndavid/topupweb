<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

function getIcon(type: string) {
  switch (type) {
    case 'success':
      return 'M5 13l4 4L19 7'
    case 'error':
      return 'M6 18L18 6M6 6l12 12'
    case 'warning':
      return 'M12 9v2m0 4h.01M12 3l9.66 9.66a1 1 0 01-.7 1.7H3a1 1 0 01-.7-1.7L12 3z'
    case 'info':
      return 'M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z'
    default:
      return 'M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z'
  }
}

function getColors(type: string) {
  switch (type) {
    case 'success':
      return 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
    case 'error':
      return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
    case 'info':
      return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
    default:
      return 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300'
  }
}
</script>

<template>
  <div class="fixed top-20 right-4 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
    <transition-group
      name="toast"
      tag="div"
      class="flex flex-col gap-2.5"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm',
          getColors(toast.type)
        ]"
      >
        <div class="shrink-0 mt-0.5">
          <svg class="w-5 h-5 toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getIcon(toast.type)" />
          </svg>
        </div>
        <p class="text-sm font-medium flex-1 min-w-0">{{ toast.message }}</p>
        <button
          @click="toastStore.removeToast(toast.id)"
          class="shrink-0 p-0.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-150"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-enter-active .toast-icon {
  animation: toast-icon-bounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.15s both;
}

@keyframes toast-icon-bounce {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
