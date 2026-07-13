<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useToastStore } from '@/stores/toast'
import ProductCard from '@/components/ProductCard.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import type { GameProduct } from '@/types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const toast = useToastStore()

const gameCode = computed(() => route.params.gameCode as string)
const selectedProduct = ref<GameProduct | null>(null)
const playerId = ref('')
const serverId = ref('')

const needsServerId = computed(() => {
  const category = gameStore.categories.find((c) => c.game_code === gameCode.value)
  return category?.game_fields?.includes('serverid') ?? false
})

function selectProduct(product: GameProduct) {
  selectedProduct.value = product
}

function proceedToCheckout() {
  if (!selectedProduct.value) {
    toast.warning('Please select a package first')
    return
  }
  if (!playerId.value.trim()) {
    toast.warning('Please enter your Player ID')
    return
  }
  if (needsServerId.value && !serverId.value.trim()) {
    toast.warning('Please enter your Server ID')
    return
  }

  gameStore.setOrder({
    gameName: gameStore.selectedGame?.name || '',
    gameCode: gameCode.value,
    productName: selectedProduct.value.name,
    productCode: selectedProduct.value.product_code,
    amount: selectedProduct.value.sell_price,
    playerId: playerId.value.trim(),
    serverId: serverId.value.trim() || undefined,
  })

  router.push('/checkout')
}

onMounted(() => {
  if (gameCode.value) {
    gameStore.fetchProducts(gameCode.value)
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back Button -->
    <button
      @click="router.back()"
      class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-6 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <!-- Loading State -->
    <template v-if="gameStore.loading">
      <div class="flex items-center gap-4 mb-8 animate-pulse">
        <div class="w-20 h-20 rounded-2xl skeleton"></div>
        <div class="space-y-2 flex-1">
          <div class="h-6 skeleton w-1/3"></div>
          <div class="h-4 skeleton w-2/3"></div>
        </div>
      </div>
      <LoadingSkeleton :count="4" />
    </template>

    <!-- Error State -->
    <div
      v-else-if="gameStore.error"
      class="text-center py-16"
    >
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-surface-500 dark:text-surface-400 mb-4">{{ gameStore.error }}</p>
      <button
        @click="gameStore.fetchProducts(gameCode)"
        class="btn-primary text-sm"
      >
        Try Again
      </button>
    </div>

    <!-- Game Detail -->
    <template v-else-if="gameStore.selectedGame">
      <!-- Game Header -->
      <div class="flex items-center gap-4 sm:gap-6 mb-8 p-6 card">
        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-surface-100 dark:bg-surface-800 shrink-0">
          <img
            :src="gameStore.selectedGame.image_url"
            :alt="gameStore.selectedGame.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="min-w-0">
          <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100">
            {{ gameStore.selectedGame.name }}
          </h1>
          <p class="mt-1 text-sm text-surface-500 dark:text-surface-400 line-clamp-2">
            {{ gameStore.selectedGame.description }}
          </p>
          <span class="inline-block mt-2 text-xs text-surface-400 dark:text-surface-500 font-mono">
            {{ gameStore.selectedGame.game_code }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Products List -->
        <div class="lg:col-span-2 space-y-6">
          <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100">
            Select a Package
          </h2>
          <div class="space-y-3">
            <ProductCard
              v-for="product in gameStore.products"
              :key="product.product_code"
              :product="product"
              :selected="selectedProduct?.product_code === product.product_code"
              @select="selectProduct(product)"
            />
          </div>
        </div>

        <!-- Order Form -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-24 space-y-5">
            <h3 class="font-semibold text-surface-900 dark:text-surface-100">
              Player Information
            </h3>

            <!-- Player ID -->
            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Player ID <span class="text-red-500">*</span>
              </label>
              <input
                v-model="playerId"
                type="text"
                placeholder="Enter your Player ID"
                class="input-field"
              />
              <p class="mt-1 text-xs text-surface-400 dark:text-surface-500">
                Usually found in your game profile
              </p>
            </div>

            <!-- Server ID (conditional) -->
            <div v-if="needsServerId">
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Server ID <span class="text-red-500">*</span>
              </label>
              <input
                v-model="serverId"
                type="text"
                placeholder="Enter your Server ID"
                class="input-field"
              />
              <p class="mt-1 text-xs text-surface-400 dark:text-surface-500">
                Required for this game
              </p>
            </div>

            <!-- Selected Package -->
            <div v-if="selectedProduct" class="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
              <p class="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wider">Selected Package</p>
              <p class="mt-1 font-semibold text-surface-900 dark:text-surface-100">{{ selectedProduct.name }}</p>
              <p class="text-lg font-bold text-primary-500 dark:text-primary-400">
                ${{ selectedProduct.sell_price.toFixed(2) }}
              </p>
            </div>
            <p v-else class="text-sm text-surface-400 dark:text-surface-500 text-center py-3">
              Select a package to continue
            </p>

            <!-- Proceed Button -->
            <button
              @click="proceedToCheckout"
              :disabled="!selectedProduct || !playerId.trim()"
              class="btn-primary w-full"
            >
              Continue to Checkout
              <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
