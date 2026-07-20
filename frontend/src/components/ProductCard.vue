<script setup lang="ts">
import type { GameProduct } from '@/types'
import { useFormattedPrice } from '@/composables/useCurrency'
import { getGameCurrency, extractAmount } from '@/utils/gameCurrency'

const props = defineProps<{
  product: GameProduct
  selected?: boolean
  gameCode?: string
  gameImageUrl?: string
}>()

const emit = defineEmits<{
  select: []
}>()

const khrPrice = useFormattedPrice(props.product.sell_price)
const currency = props.gameCode ? getGameCurrency(props.gameCode) : 'Currency'
const amount = extractAmount(props.product.name)
</script>

<template>
  <button
    @click="emit('select')"
    :class="[
      'relative flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border-2 transition-all duration-300 text-left w-full group overflow-hidden',
      selected
        ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 shadow-lg shadow-primary-500/10 scale-[1.02]'
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
      class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30 animate-bounce-in z-10"
    >
      <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <!-- Left: amount + currency + price -->
    <div class="flex-1 min-w-0">
      <p :class="[
        'text-xs sm:text-sm font-bold transition-colors duration-200',
        selected ? 'text-primary-700 dark:text-primary-300' : 'text-surface-900 dark:text-surface-100'
      ]">
        <span class="tabular-nums">{{ amount }}</span>
        <span class="font-medium ml-1">{{ currency }}</span>
      </p>
      <p :class="[
        'text-[11px] sm:text-xs font-semibold mt-0.5 transition-colors duration-200',
        selected ? 'text-primary-500 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'
      ]">
        {{ khrPrice.formatted }}
      </p>
    </div>

    <!-- Right: game icon -->
    <div
      v-if="gameImageUrl"
      class="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden ring-1 ring-surface-200 dark:ring-surface-700"
    >
      <img
        :src="gameImageUrl"
        :alt="currency"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  </button>
</template>
