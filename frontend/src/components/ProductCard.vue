<script setup lang="ts">
import type { GameProduct } from '@/types'
import { useFormattedPrice } from '@/composables/useCurrency'

const props = defineProps<{
  product: GameProduct
  selected?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const khrPrice = useFormattedPrice(props.product.sell_price)
</script>

<template>
  <button
    @click="emit('select')"
    :class="[
      'relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 text-left w-full group',
      selected
        ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 shadow-lg shadow-primary-500/10 scale-[1.01]'
        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5'
    ]"
  >
    <!-- Selected glow ring -->
    <div
      v-if="selected"
      class="absolute inset-0 rounded-xl pointer-events-none animate-glow"
    ></div>

    <!-- Selected indicator -->
    <div
      v-if="selected"
      class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30 animate-bounce-in"
    >
      <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <!-- Product info -->
    <div class="flex-1 min-w-0">
      <p :class="[
        'font-semibold transition-colors duration-200',
        selected ? 'text-primary-700 dark:text-primary-300' : 'text-surface-900 dark:text-surface-100 group-hover:text-primary-700 dark:group-hover:text-primary-300'
      ]">
        {{ product.name }}
      </p>
      <p class="mt-0.5 text-xs text-surface-400 dark:text-surface-500 font-mono">
        {{ product.product_code }}
      </p>
    </div>

    <!-- Price -->
    <div class="ml-4 text-right shrink-0">
      <p :class="[
        'text-lg font-bold transition-all duration-300',
        selected
          ? 'text-primary-600 dark:text-primary-400 scale-105'
          : 'text-surface-900 dark:text-surface-100'
      ]">
        {{ khrPrice.formatted }}
      </p>
      <p :class="[
        'text-[10px] uppercase tracking-wider transition-colors duration-200',
        selected ? 'text-primary-400 dark:text-primary-500' : 'text-surface-400 dark:text-surface-500'
      ]">{{ khrPrice.code }}</p>
    </div>
  </button>
</template>
