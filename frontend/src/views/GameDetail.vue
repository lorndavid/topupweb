<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import ProductCard from '@/components/ProductCard.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import { verifyPlayer } from '@/services/api'
import type { TranslationKey } from '@/i18n/translations'
import type { GameProduct } from '@/types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const i18n = useI18nStore()
const toast = useToastStore()

const gameCode = computed(() => route.params.gameCode as string)
const selectedProduct = ref<GameProduct | null>(null)
const playerId = ref('')
const serverId = ref('')

// Verification state
const verifying = ref(false)
const verified = ref(false)
const verifyError = ref<string | null>(null)
const playerNickname = ref<string | null>(null)
const verifyProvider = ref<string | null>(null)

const needsServerId = computed(() => {
  const category = gameStore.categories.find((c) => c.game_code === gameCode.value)
  return category?.game_fields?.includes('serverid') ?? false
})

const isMlbbGame = computed(() => {
  return gameCode.value.toLowerCase().startsWith('mlbb')
})

// Map provider code to human-readable label
function providerLabel(provider: string): string {
  const key = `verify.provider.${provider}` as TranslationKey
  const label = i18n.t(key)
  // If translation returns the key as-is (not found), fall back
  return label === key ? provider : label
}

// Map provider code to descriptive tooltip text
function providerTooltip(provider: string): string {
  const tooltipKey = `verify.provider.tooltip.${provider}` as TranslationKey
  const tooltip = i18n.t(tooltipKey)
  // If translation returns the key as-is (not found), use a generic fallback
  return tooltip === tooltipKey
    ? `${i18n.t('verify.provider.prefix')} ${providerLabel(provider)}`
    : tooltip
}

function isRealProvider(provider: string | null): boolean {
  return provider !== null && provider !== 'simulated'
}

const canProceed = computed(() => {
  return selectedProduct.value && verified.value && playerId.value.trim()
})

// Reset verification when player ID changes
watch(playerId, () => {
  verified.value = false
  verifyError.value = null
  playerNickname.value = null
  verifyProvider.value = null
})

function selectProduct(product: GameProduct) {
  selectedProduct.value = product
}

async function handleVerify() {
  const id = playerId.value.trim()
  if (!id) {
    toast.warning(i18n.t('detail.toast.enterPlayerId'))
    return
  }

  verifying.value = true
  verifyError.value = null

  try {
    const result = await verifyPlayer({
      game_code: gameCode.value,
      player_id: id,
      server_id: serverId.value.trim() || undefined,
    })
    if (result.verified && result.nickname) {
      verified.value = true
      playerNickname.value = result.nickname
      verifyProvider.value = result.provider || null
      toast.success(i18n.t('verify.successMessage'))
    } else {
      verifyError.value = i18n.t('verify.error.notFound')
    }
  } catch {
    verifyError.value = i18n.t('verify.error.generic')
  } finally {
    verifying.value = false
  }
}

function proceedToCheckout() {
  if (!selectedProduct.value) {
    toast.warning(i18n.t('detail.toast.selectPackage'))
    return
  }
  if (!playerId.value.trim()) {
    toast.warning(i18n.t('detail.toast.enterPlayerId'))
    return
  }
  if (!verified.value) {
    toast.warning(i18n.t('verify.mustVerify'))
    return
  }
  if (needsServerId.value && !serverId.value.trim()) {
    toast.warning(i18n.t('detail.toast.enterServerId'))
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
    verifyProvider: verifyProvider.value || undefined,
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
      {{ i18n.t('detail.back') }}
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
        {{ i18n.t('detail.tryAgain') }}
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
          <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100 font-khmer-heading">
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
          <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 font-khmer-heading">
            {{ i18n.t('detail.selectPackage') }}
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
            <h3 class="font-semibold text-surface-900 dark:text-surface-100 font-khmer-heading">
              {{ i18n.t('detail.playerInfo') }}
            </h3>

            <!-- Player ID Input -->
            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 font-khmer-body">
                {{ i18n.t('detail.playerId') }} <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  v-model="playerId"
                  type="text"
                  :placeholder="i18n.t('detail.playerIdPlaceholder')"
                  class="input-field pr-24"
                  :disabled="verifying"
                  @keyup.enter="handleVerify"
                />
                <!-- Verify Button (overlaid) -->
                <button
                  v-if="!verified"
                  @click="handleVerify"
                  :disabled="verifying || !playerId.trim()"
                  class="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="verifying
                    ? 'bg-surface-200 dark:bg-surface-600 text-surface-500 dark:text-surface-400'
                    : 'bg-primary-500 hover:bg-primary-600 text-white active:scale-95'"
                >
                  <span v-if="verifying" class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {{ i18n.t('verify.verifying') }}
                  </span>
                  <span v-else class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ i18n.t('verify.verify') }}
                  </span>
                </button>
                <!-- Verified Badge (overlaid) -->
                <div
                  v-else
                  class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium"
                >
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  {{ i18n.t('verify.verified') }}
                </div>
              </div>
              <p class="mt-1 text-xs text-surface-400 dark:text-surface-500">
                {{ i18n.t('verify.hint') }}
              </p>
            </div>

            <!-- Server / Zone ID (conditional) -->
            <div v-if="needsServerId">
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                {{ i18n.t('detail.serverId') }} <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  v-model="serverId"
                  type="text"
                  inputmode="numeric"
                  :placeholder="i18n.t('detail.serverIdPlaceholder')"
                  class="input-field"
                  :disabled="verifying"
                />
              </div>
              <p class="mt-1 text-xs text-surface-400 dark:text-surface-500">
                {{ isMlbbGame ? i18n.t('detail.serverIdHintMlbb') : i18n.t('detail.serverIdHint') }}
              </p>
            </div>

            <!-- Verification Error -->
            <div
              v-if="verifyError"
              class="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl"
            >
              <svg class="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-red-700 dark:text-red-400">{{ verifyError }}</p>
                <button
                  @click="handleVerify"
                  class="mt-1 text-xs text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200 underline font-medium"
                >
                  {{ i18n.t('verify.retry') }}
                </button>
              </div>
            </div>

            <!-- Verified Player Card -->
            <div
              v-if="verified && playerNickname"
              class="overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-900/10 dark:to-emerald-900/5"
            >
              <!-- Top accent bar: green for real providers, amber for simulated -->
              <div
                class="h-1"
                :class="isRealProvider(verifyProvider)
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500'"
              ></div>
              <div class="p-4">
                <!-- Header row: success badge + provider badge -->
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <span class="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-khmer-body">
                      {{ i18n.t('verify.success') }}
                    </span>
                  </div>

                  <!-- Provider badge with tooltip -->
                  <span
                    v-if="verifyProvider"
                    :title="providerTooltip(verifyProvider)"
                    class="group relative inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 cursor-help"
                    :class="isRealProvider(verifyProvider)
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'"
                  >
                    <!-- Dot indicator -->
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      :class="isRealProvider(verifyProvider)
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'"
                    ></span>
                    {{ i18n.t('verify.provider.prefix') }} {{ providerLabel(verifyProvider) }}

                    <!-- Info icon (always visible, more prominent on hover) -->
                    <svg
                      class="w-3 h-3 shrink-0 transition-all duration-200"
                      :class="isRealProvider(verifyProvider)
                        ? 'text-emerald-400 dark:text-emerald-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-300'
                        : 'text-amber-400 dark:text-amber-500 group-hover:text-amber-600 dark:group-hover:text-amber-300'"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                </div>

                <!-- Player info -->
                <div class="flex items-center gap-3">
                  <!-- Avatar placeholder -->
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    :class="isRealProvider(verifyProvider)
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                      : 'bg-gradient-to-br from-amber-400 to-amber-600'"
                  >
                    {{ (playerNickname[0] || '?').toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('verify.nicknamePrefix') }}</p>
                    <p class="font-semibold text-surface-900 dark:text-surface-100 truncate">
                      {{ playerNickname }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Selected Package -->
            <div v-if="selectedProduct" class="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
              <p class="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wider">{{ i18n.t('detail.selectedPackage') }}</p>
              <p class="mt-1 font-semibold text-surface-900 dark:text-surface-100">{{ selectedProduct.name }}</p>
              <p class="text-lg font-bold text-primary-500 dark:text-primary-400">
                ${{ selectedProduct.sell_price.toFixed(2) }}
              </p>
            </div>
            <p v-else class="text-sm text-surface-400 dark:text-surface-500 text-center py-3">
              {{ i18n.t('detail.selectPackageHint') }}
            </p>

            <!-- Proceed Button -->
            <button
              @click="proceedToCheckout"
              :disabled="!canProceed"
              class="btn-primary w-full relative overflow-hidden"
              :class="{
                'opacity-100': canProceed,
              }"
            >
              <span class="relative z-10 flex items-center justify-center">
                {{ i18n.t('detail.continueCheckout') }}
                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
