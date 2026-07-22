<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="glass-overlay z-50 flex items-center justify-center p-4">
        <Transition name="scale-in">
          <div
            v-if="open"
            class="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-700 text-center"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              :class="variant === 'danger' ? 'bg-danger-50 dark:bg-danger-500/10' : variant === 'warning' ? 'bg-warning-50 dark:bg-warning-500/10' : 'bg-info-50 dark:bg-info-500/10'"
            >
              <AppIcon :name="variant === 'danger' ? 'warning' : variant === 'warning' ? 'lightning' : 'info'" :size="24" :class="variant === 'danger' ? 'text-danger-600 dark:text-danger-400' : variant === 'warning' ? 'text-warning-600 dark:text-warning-400' : 'text-info-600 dark:text-info-400'" />
            </div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white mb-2">{{ title }}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">{{ message }}</p>
            <div class="flex gap-3">
              <button
                class="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                @click="$emit('cancel')"
              >
                {{ cancelText || 'Cancel' }}
              </button>
              <button
                class="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl text-white transition-colors"
                :class="variant === 'danger' ? 'bg-danger-600 hover:bg-danger-700' : variant === 'warning' ? 'bg-warning-600 hover:bg-warning-700' : 'bg-primary-600 hover:bg-primary-700'"
                @click="$emit('confirm')"
              >
                {{ confirmText || 'Confirm' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scale-in-enter-active { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.scale-in-leave-active { transition: all 0.15s ease-in; }
.scale-in-enter-from { opacity: 0; transform: scale(0.9); }
.scale-in-leave-to { opacity: 0; transform: scale(0.9); }
</style>
