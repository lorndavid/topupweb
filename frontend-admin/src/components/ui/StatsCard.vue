<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}>()
</script>

<template>
  <div class="card p-5 group hover:border-primary-200 dark:hover:border-primary-700/50 cursor-default transition-all duration-200">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{{ title }}</p>
        <p class="text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">{{ value }}</p>
        <p v-if="subtitle" class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ subtitle }}</p>
      </div>
      <div
        v-if="icon"
        class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
        :class="accent ? `bg-${accent}-50 dark:bg-${accent}-500/10` : 'bg-primary-50 dark:bg-primary-500/10'"
      >
        <AppIcon :name="icon" :size="20" :class="accent === 'primary' ? 'text-primary-600 dark:text-primary-400' : accent === 'success' ? 'text-success-600 dark:text-success-400' : accent === 'warning' ? 'text-warning-600 dark:text-warning-400' : accent === 'info' ? 'text-info-600 dark:text-info-400' : 'text-slate-600 dark:text-slate-400'" />
      </div>
    </div>
    <div v-if="trend && trendValue" class="flex items-center gap-1.5 mt-3">
      <AppIcon v-if="trend === 'up'" name="trending-up" :size="14" class="text-success-500" />
      <AppIcon v-else-if="trend === 'down'" name="trending-down" :size="14" class="text-danger-500" />
      <span v-else class="text-slate-400 text-xs">→</span>
      <span
        class="text-xs font-medium"
        :class="trend === 'up' ? 'text-success-600 dark:text-success-400' : trend === 'down' ? 'text-danger-600 dark:text-danger-400' : 'text-slate-500 dark:text-slate-400'"
      >
        {{ trendValue }}
      </span>
    </div>
  </div>
</template>
