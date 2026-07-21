<script setup lang="ts">
import type { GameProduct } from '@/types'
import { useFormattedPrice } from '@/composables/useCurrency'
import { getGameCurrency, extractAmount } from '@/utils/gameCurrency'

type ProductBadge = 'best-value' | 'most-popular' | 'new' | 'price-drop' | 'balance-check' | null

const props = defineProps<{
  product: GameProduct
  selected?: boolean
  gameCode?: string
  gameImageUrl?: string
  badge?: ProductBadge
}>()

const badgeConfig: Record<NonNullable<ProductBadge>, { label: string; bg: string; icon: string }> = {
  'best-value': {
    label: 'Best Value',
    bg: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  'most-popular': {
    label: 'Most Popular',
    bg: 'from-amber-500 to-orange-500 shadow-amber-500/30',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  },
  'new': {
    label: 'New',
    bg: 'from-blue-500 to-cyan-500 shadow-blue-500/30',
    icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
  },
  'price-drop': {
    label: '🔥 Price Dropped',
    bg: 'from-green-500 to-emerald-500 shadow-green-500/30',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  'balance-check': {
    label: 'Check Balance',
    bg: 'from-amber-500 to-rose-500 shadow-amber-500/30',
    icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
}

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
    <!-- Badge ribbon (top-left corner) -->
    <div
      v-if="badge"
      class="absolute -top-0.5 -left-0.5 z-10"
    >
      <div
        :class="[
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-br-lg text-[9px] font-bold text-white bg-gradient-to-r shadow-lg',
          badgeConfig[badge].bg
        ]"
      >
        <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
          <path :d="badgeConfig[badge].icon" />
        </svg>
        {{ badgeConfig[badge].label }}
      </div>
    </div>

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
