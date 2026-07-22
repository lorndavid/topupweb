<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{
  title?: string
  message?: string
  icon?: string
  action?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4">
    <AppIcon :name="icon || 'inbox'" :size="40" class="mb-4 text-slate-300 dark:text-slate-600" />
    <h3 class="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">{{ title || 'No data' }}</h3>
    <p v-if="message" class="text-sm text-slate-400 dark:text-slate-500 text-center max-w-sm">{{ message }}</p>
    <button
      v-if="action"
      class="mt-4 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
      @click="$emit('action')"
    >
      {{ action }}
    </button>
  </div>
</template>
