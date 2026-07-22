<script setup lang="ts">
defineProps<{
  lines?: number
  rows?: number
  type?: 'card' | 'table' | 'text'
}>()
</script>

<template>
  <div class="space-y-3 animate-pulse">
    <!-- Card skeleton -->
    <div v-if="type === 'card'" class="card p-5 space-y-3">
      <div class="h-3 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
      <div class="h-8 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
      <div class="h-3 w-1/4 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>

    <!-- Table skeleton -->
    <div v-else-if="type === 'table'" class="card p-4 space-y-3">
      <div v-for="r in (rows || 5)" :key="r" class="flex gap-4">
        <div v-for="c in 4" :key="c" class="h-4 flex-1 bg-slate-200 dark:bg-slate-700 rounded" :class="c === 1 ? 'w-1/4' : c === 2 ? 'w-1/3' : 'w-1/5'" />
      </div>
    </div>

    <!-- Text lines skeleton -->
    <div v-else class="space-y-2">
      <div v-for="l in (lines || 3)" :key="l" class="h-4 bg-slate-200 dark:bg-slate-700 rounded" :style="{ width: `${70 + Math.random() * 30}%` }" />
    </div>
  </div>
</template>
