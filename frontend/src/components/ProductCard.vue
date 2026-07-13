<script setup lang="ts">
import type { GameProduct } from '@/types'

const props = defineProps<{
  product: GameProduct
  selected?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    @click="emit('select')"
    :class="[
      'relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left w-full',
      selected
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm shadow-primary-500/10'
        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm'
    ]"
  >
    <!-- Selected indicator -->
    <div
      v-if="selected"
      class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shadow-sm"
    >
      <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <!-- Product info -->
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-surface-900 dark:text-surface-100">
        {{ product.name }}
      </p>
      <p class="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
        {{ product.product_code }}
      </p>
    </div>

    <!-- Price -->
    <div class="ml-4 text-right shrink-0">
      <p :class="[
        'text-lg font-bold',
        selected ? 'text-primary-600 dark:text-primary-400' : 'text-surface-900 dark:text-surface-100'
      ]">
        ${{ product.sell_price.toFixed(2) }}
      </p>
      <p class="text-[10px] text-surface-400 dark:text-surface-500 uppercase tracking-wider">USD</p>
    </div>
  </button>
</template>
