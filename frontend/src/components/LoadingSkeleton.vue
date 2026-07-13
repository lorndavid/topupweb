<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'card' | 'list' | 'detail'
  count?: number
}>(), {
  variant: 'card',
  count: 6,
})
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-for="i in count"
      :key="i"
      class="card p-4 space-y-3 animate-pulse"
    >
      <!-- Image placeholder -->
      <div class="w-full aspect-video rounded-xl skeleton"></div>
      <!-- Title placeholder -->
      <div class="h-4 skeleton w-3/4"></div>
      <!-- Description placeholder -->
      <div class="h-3 skeleton w-full"></div>
      <div class="h-3 skeleton w-2/3"></div>
      <!-- Action placeholder -->
      <div class="h-10 skeleton w-full mt-2"></div>
    </div>
  </div>
</template>
