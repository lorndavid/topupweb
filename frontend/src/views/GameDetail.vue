<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import ProductCard from '@/components/ProductCard.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import { verifyPlayer } from '@/services/api'
import type { GameProduct } from '@/types'
import gsap from 'gsap'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const i18n = useI18nStore()
const toast = useToastStore()

const gameCode = computed(() => route.params.gameCode as string)

// ─── Refs ────────────────────────────────────────────────────
const pageRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const formRef = ref<HTMLElement | null>(null)
const productsRef = ref<HTMLElement | null>(null)
const resultRef = ref<HTMLElement | null>(null)
const verifyBtnRef = ref<HTMLElement | null>(null)

const selectedProduct = ref<GameProduct | null>(null)
const playerId = ref('')
const serverId = ref('')

// Verification state
const verifying = ref(false)
const verified = ref(false)
const verifyError = ref<string | null>(null)
const playerNickname = ref<string | null>(null)
const playerRegion = ref<string | null>(null)
const playerGameTitle = ref<string | null>(null)
const verifyProvider = ref<string | null>(null)

// ─── Computed ────────────────────────────────────────────────
const needsServerId = computed(() => {
  const category = gameStore.categories.find((c) => c.game_code === gameCode.value)
  return category?.game_fields?.includes('serverid') ?? false
})

const canProceed = computed(() => {
  return selectedProduct.value && verified.value && playerId.value.trim()
})

const gameDisplayName = computed(() => {
  return gameStore.selectedGame?.name || gameCode.value
})

// ─── Watchers ────────────────────────────────────────────────
watch(playerId, () => {
  if (verified.value) {
    verified.value = false
    verifyError.value = null
    playerNickname.value = null
    playerRegion.value = null
    playerGameTitle.value = null
    verifyProvider.value = null
  }
})

watch(verified, (val) => {
  if (val && resultRef.value) {
    nextTick(() => {
      gsap.fromTo(
        resultRef.value,
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.7)',
        }
      )
      // Animate the accent bar
      const bar = resultRef.value?.querySelector('.result-accent-bar')
      if (bar) {
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power2.out' })
      }
    })
  }
})

// ─── Methods ─────────────────────────────────────────────────
function selectProduct(product: GameProduct) {
  selectedProduct.value = product
}

async function handleVerify() {
  const id = playerId.value.trim()
  if (!id) {
    toast.warning(i18n.t('detail.toast.enterPlayerId'))
    shakeElement(verifyBtnRef.value)
    return
  }

  verifying.value = true
  verifyError.value = null
  verified.value = false

  // Animate verify button to show loading
  if (verifyBtnRef.value) {
    gsap.to(verifyBtnRef.value, { scale: 0.97, duration: 0.15 })
  }

  try {
    const result = await verifyPlayer({
      game_code: gameCode.value,
      player_id: id,
      server_id: serverId.value.trim() || undefined,
    })

    if (result.verified && result.nickname) {
      verified.value = true
      playerNickname.value = result.nickname
      playerRegion.value = result.region || null
      playerGameTitle.value = result.gameTitle || null
      verifyProvider.value = result.provider || null

      toast.success(i18n.t('verify.successMessage'))

      // Success animation on button
      if (verifyBtnRef.value) {
        gsap.to(verifyBtnRef.value, {
          scale: 1.05,
          duration: 0.3,
          ease: 'back.out(2)',
          onComplete: () => {
            gsap.to(verifyBtnRef.value, { scale: 1, duration: 0.2 })
          },
        })
      }
    } else {
      verifyError.value = i18n.t('verify.error.notFound')
      shakeElement(verifyBtnRef.value)
    }
  } catch {
    verifyError.value = i18n.t('verify.error.generic')
    shakeElement(verifyBtnRef.value)
  } finally {
    verifying.value = false
  }
}

function shakeElement(el: HTMLElement | null) {
  if (!el) return
  gsap.to(el, {
    keyframes: [
      { x: -5, duration: 0.06 },
      { x: 5, duration: 0.06 },
      { x: -4, duration: 0.06 },
      { x: 4, duration: 0.06 },
      { x: -2, duration: 0.06 },
      { x: 2, duration: 0.06 },
      { x: 0, duration: 0.04 },
    ],
  })
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
    gameName: gameDisplayName.value,
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

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(() => {
  if (gameCode.value) {
    gameStore.fetchProducts(gameCode.value)
  }

  // Page entrance animation
  nextTick(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(
      pageRef.value,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5 }
    )

    if (headerRef.value) {
      tl.fromTo(
        headerRef.value.querySelectorAll('.anim-item'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 },
        '-=0.2'
      )
    }

    if (formRef.value) {
      tl.fromTo(
        formRef.value,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.4 },
        '-=0.1'
      )
    }

    if (productsRef.value) {
      tl.fromTo(
        productsRef.value,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.4 },
        '-=0.1'
      )
    }

    // Floating particles background
    gsap.to('.bg-particle', {
      y: -30,
      duration: 3 + Math.random() * 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.3,
    })
  })
})
</script>

<template>
  <div ref="pageRef" class="min-h-screen relative overflow-hidden">
    <!-- Background Particles -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-10">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-particle absolute w-24 h-24 rounded-full bg-primary-400/30 blur-3xl"
        :style="{
          left: `${10 + (i * 15) % 80}%`,
          top: `${5 + (i * 20) % 70}%`,
          animationDelay: `${i * 0.5}s`,
        }"
      ></div>
    </div>

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <!-- Back Button -->
      <button
        @click="router.back()"
        class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-primary-500 dark:hover:text-primary-400 mb-6 transition-all duration-200 group"
      >
        <svg class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div ref="headerRef" class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950 mb-8 p-6 sm:p-8 shadow-xl">
          <!-- Background image with overlay -->
          <div class="absolute inset-0 opacity-10">
            <img
              :src="gameStore.selectedGame.image_url"
              :alt="gameStore.selectedGame.name"
              class="w-full h-full object-cover"
            />
          </div>

          <div class="relative flex items-center gap-5 sm:gap-6">
            <!-- Game Icon -->
            <div class="anim-item w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-lg shrink-0 transform hover:scale-105 transition-transform duration-300">
              <img
                :src="gameStore.selectedGame.image_url"
                :alt="gameStore.selectedGame.name"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="anim-item min-w-0">
              <div class="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-medium text-white/80 mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {{ gameStore.categories.find(c => c.game_code === gameCode)?.game_fields?.join(' + ') || 'ID' }}
              </div>
              <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                {{ gameStore.selectedGame.name }}
              </h1>
              <p class="mt-2 text-sm text-white/60 line-clamp-2 max-w-xl">
                {{ gameStore.selectedGame.description }}
              </p>
              <div class="mt-3 flex items-center gap-3 text-xs">
                <span class="inline-flex items-center gap-1 text-white/40 font-mono">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {{ gameStore.selectedGame.game_code }}
                </span>
                <span class="text-white/30">|</span>
                <span class="inline-flex items-center gap-1 text-emerald-300/80">
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Real-time ID Check
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <!-- Products Column (left on desktop) -->
          <div ref="productsRef" class="lg:col-span-7 space-y-6 order-2 lg:order-1">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100">
                {{ i18n.t('detail.selectPackage') }}
              </h2>
              <span class="text-xs text-surface-400 dark:text-surface-500">
                {{ gameStore.products.length }} {{ i18n.t('search.games') }}
              </span>
            </div>

            <div v-if="gameStore.products.length === 0" class="text-center py-12 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 mb-3">
                <svg class="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p class="text-sm text-surface-500 dark:text-surface-400">No packages available yet</p>
            </div>

            <div class="space-y-3">
              <ProductCard
                v-for="(product, index) in gameStore.products"
                :key="product.product_code"
                :product="product"
                :selected="selectedProduct?.product_code === product.product_code"
                @select="selectProduct(product)"
                :style="{ animationDelay: `${index * 0.05}s` }"
                class="product-card"
              />
            </div>
          </div>

          <!-- Order Form Column (right on desktop) -->
          <div ref="formRef" class="lg:col-span-5 order-1 lg:order-2">
            <div class="sticky top-24 space-y-5">
              <!-- Player ID Card -->
              <div class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
                <div class="p-5 sm:p-6 space-y-5">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-surface-900 dark:text-surface-100">{{ i18n.t('verify.title') }}</h3>
                      <p class="text-xs text-surface-400 dark:text-surface-500">{{ gameStore.selectedGame.game_code }}</p>
                    </div>
                  </div>

                  <!-- Player ID Input -->
                  <div>
                    <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      {{ i18n.t('detail.playerId') }} <span class="text-red-400">*</span>
                    </label>
                    <div class="relative">
                      <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                        </svg>
                      </div>
                      <input
                        v-model="playerId"
                        type="text"
                        :placeholder="i18n.t('detail.playerIdPlaceholder')"
                        class="input-field pl-10 pr-24 h-11 text-sm"
                        :disabled="verifying"
                        @keyup.enter="handleVerify"
                      />
                      <!-- Verify Button -->
                      <button
                        v-if="!verified"
                        ref="verifyBtnRef"
                        @click="handleVerify"
                        :disabled="verifying || !playerId.trim()"
                        class="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                        :class="verifying
                          ? 'bg-surface-200 dark:bg-surface-600 text-surface-500 dark:text-surface-400'
                          : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-sm shadow-primary-500/20 hover:shadow-primary-500/30 active:scale-95'"
                      >
                        <template v-if="verifying">
                          <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>{{ i18n.t('verify.verifying') }}</span>
                        </template>
                        <template v-else>
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{{ i18n.t('verify.verify') }}</span>
                        </template>
                      </button>
                      <!-- Verified Badge -->
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
                    <p class="mt-1.5 text-xs text-surface-400 dark:text-surface-500 flex items-center gap-1">
                      <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                      </svg>
                      {{ i18n.t('verify.hint') }}
                    </p>
                  </div>

                  <!-- Server / Zone ID -->
                  <div v-if="needsServerId">
                    <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      {{ i18n.t('detail.serverId') }} <span class="text-red-400">*</span>
                    </label>
                    <div class="relative">
                      <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                      </div>
                      <input
                        v-model="serverId"
                        type="text"
                        inputmode="numeric"
                        :placeholder="i18n.t('detail.serverIdPlaceholder')"
                        class="input-field pl-10 h-11 text-sm"
                        :disabled="verifying"
                      />
                    </div>
                    <p class="mt-1.5 text-xs text-surface-400 dark:text-surface-500 flex items-center gap-1">
                      <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                      </svg>
                      {{ i18n.t('detail.serverIdHint') }}
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
                </div>
              </div>

              <!-- Verified Player Result Card -->
              <div
                v-if="verified && playerNickname"
                ref="resultRef"
                class="overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/10 dark:to-surface-900 shadow-lg shadow-emerald-500/5"
              >
                <!-- Accent bar -->
                <div class="result-accent-bar h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-primary-500 origin-left"></div>

                <div class="p-5 sm:p-6">
                  <!-- Header -->
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {{ i18n.t('verify.success') }}
                      </span>
                    </div>
                    <span
                      v-if="playerRegion"
                      class="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-surface-800 rounded-full text-[10px] font-semibold uppercase tracking-wider text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-600"
                    >
                      <svg class="w-3 h-3 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ playerRegion }}
                    </span>
                  </div>

                  <!-- Player Info -->
                  <div class="flex items-center gap-4">
                    <!-- Avatar -->
                    <div class="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-primary-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
                      {{ (playerNickname[0] || '?').toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs text-surface-500 dark:text-surface-400 mb-0.5">{{ i18n.t('verify.nicknamePrefix') }}</p>
                      <p class="font-bold text-lg text-surface-900 dark:text-surface-100 truncate">
                        {{ playerNickname }}
                      </p>
                      <p v-if="playerGameTitle" class="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                        {{ playerGameTitle }}
                      </p>
                    </div>
                  </div>

                  <!-- Provider badge -->
                  <div v-if="verifyProvider" class="mt-4 pt-3 border-t border-emerald-200/30 dark:border-emerald-800/20">
                    <span class="text-[10px] text-surface-400 dark:text-surface-500 font-medium uppercase tracking-wider">
                      {{ i18n.t('verify.provider.prefix') }}
                    </span>
                    
                  </div>
                </div>
              </div>

              <!-- Selected Package Summary -->
              <div class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
                <div class="p-5 sm:p-6 space-y-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 class="font-semibold text-surface-900 dark:text-surface-100">{{ i18n.t('detail.selectedPackage') }}</h3>
                  </div>

                  <div v-if="selectedProduct" class="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
                    <div class="flex items-center justify-between">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-surface-900 dark:text-surface-100 truncate">{{ selectedProduct.name }}</p>
                        <p class="text-xs text-surface-400 dark:text-surface-500 mt-0.5">{{ selectedProduct.product_code }}</p>
                      </div>
                      <div class="ml-4 text-right shrink-0">
                        <p class="text-xl font-bold text-primary-600 dark:text-primary-400">
                          ${{ selectedProduct.sell_price.toFixed(2) }}
                        </p>
                        <p class="text-[10px] text-surface-400 dark:text-surface-500 uppercase tracking-wider">USD</p>
                      </div>
                    </div>
                  </div>
                  <p v-else class="text-sm text-surface-400 dark:text-surface-500 text-center py-2">
                    {{ i18n.t('detail.selectPackageHint') }}
                  </p>

                  <!-- Proceed Button -->
                  <button
                    @click="proceedToCheckout"
                    :disabled="!canProceed"
                    class="btn-primary w-full relative overflow-hidden group"
                    :class="{
                      'opacity-100': canProceed,
                    }"
                  >
                    <span class="relative z-10 flex items-center justify-center gap-2">
                      <span>{{ i18n.t('detail.continueCheckout') }}</span>
                      <svg class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <!-- Shine effect -->
                    <span class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  animation: card-enter 0.4s ease-out both;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
