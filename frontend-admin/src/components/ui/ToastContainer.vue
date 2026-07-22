<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import AppIcon from '@/components/ui/AppIcon.vue'

const toast = useToastStore()

const toastIcons: Record<string, string> = {
  success: 'check',
  error: 'x',
  warning: 'warning',
  info: 'info',
}

const toastColors: Record<string, string> = {
  success: 'border-l-success-500 bg-success-50 dark:bg-success-500/10',
  error: 'border-l-danger-500 bg-danger-50 dark:bg-danger-500/10',
  warning: 'border-l-warning-500 bg-warning-50 dark:bg-warning-500/10',
  info: 'border-l-info-500 bg-info-50 dark:bg-info-500/10',
}
</script>

<style>
/** Non-scoped: TransitionGroup applies classes to child elements that don't get the scope attribute */
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(24px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.95);
}
</style>

<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg border-l-4 cursor-pointer"
        :class="toastColors[t.type]"
        @click="toast.remove(t.id)"
      >
        <AppIcon :name="toastIcons[t.type]" :size="20" class="flex-shrink-0" :class="t.type === 'success' ? 'text-success-600 dark:text-success-400' : t.type === 'error' ? 'text-danger-600 dark:text-danger-400' : t.type === 'warning' ? 'text-warning-600 dark:text-warning-400' : 'text-info-600 dark:text-info-400'" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ t.title }}</p>
          <p v-if="t.message" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ t.message }}</p>
        </div>
        <button class="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>


