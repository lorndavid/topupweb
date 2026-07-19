<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import ProductCard from '@/components/ProductCard.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import { verifyPlayer, createPayment, getPaymentStatus, cancelOrder, getOrder } from '@/services/api'
import type { GameProduct } from '@/types'
import { useSavedPlayers } from '@/composables/useSavedPlayers'
import { formatPrice } from '@/composables/useCurrency'
import { usePaymentWebSocket } from '@/composables/usePaymentWebSocket'
import ReceiptCard from '@/components/ReceiptCard.vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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
const productsContainerRef = ref<HTMLElement | null>(null)
const productsListRef = ref<HTMLElement | null>(null)
const resultRef = ref<HTMLElement | null>(null)
const verifyBtnRef = ref<HTMLElement | null>(null)
const errorRef = ref<HTMLElement | null>(null)
const serverIdRef = ref<HTMLElement | null>(null)
const proceedBtnRef = ref<HTMLElement | null>(null)
const savedChipsRef = ref<HTMLElement | null>(null)

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

// Track previous canProceed for pulse effect
const prevCanProceed = ref(false)

// Saved Players (localStorage for returning customers)
const { getByGame, save } = useSavedPlayers()
const savedForGame = ref<ReturnType<typeof getByGame>>([])

// ─── Computed ────────────────────────────────────────────────
const needsServerId = computed(() => {
  const category = gameStore.categories.find((c) => c.game_code === gameCode.value)
  return category?.game_fields?.includes('serverid') ?? false
})

const canProceed = computed(() => {
  return !!(selectedProduct.value && verified.value && playerId.value.trim())
})

const gameDisplayName = computed(() => {
  return gameStore.selectedGame?.name || gameCode.value
})

// ─── Product stagger reveal (one-shot guard prevents re-trigger flash) ───
const staggerDone = ref(false)

watch(
  () => gameStore.products,
  (products) => {
    if (products.length > 0 && !staggerDone.value) {
      staggerDone.value = true
      nextTick(() => {
        const items = productsListRef.value?.querySelectorAll('.product-card')
        if (!items || items.length === 0) return

        // Kill any existing tweens on product cards
        gsap.killTweensOf(items)

        // Stagger reveal — GSAP fromTo immediately applies the 'from' state
        // so there's no flash of visible -> hidden -> animate
        gsap.fromTo(
          items,
          { opacity: 0, y: 20, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.45,
            stagger: { each: 0.06, from: 'start', ease: 'power2.out' },
            ease: 'back.out(1.4)',
          }
        )
      })
    }
  },
  { immediate: true }
)

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

// Simple slide-in for verify success card (handled by Transition CSS)

// Smooth error slide-in
watch(verifyError, (err) => {
  if (err && errorRef.value) {
    nextTick(() => {
      gsap.set(errorRef.value, { opacity: 0, y: -8, maxHeight: 0 })
      gsap.to(errorRef.value, {
        opacity: 1, y: 0, maxHeight: 200,
        duration: 0.35,
        ease: 'power3.out',
      })
    })
  }
})

// Server ID field slide animation when it appears
watch(needsServerId, () => {
  nextTick(() => {
    if (serverIdRef.value) {
      // Apply hidden state first, then animate in — prevents flash
      gsap.set(serverIdRef.value, { opacity: 0, y: -10, maxHeight: 0 })
      gsap.to(serverIdRef.value, { opacity: 1, y: 0, maxHeight: 200, duration: 0.35, ease: 'power3.out' })
    }
  })
})

// Proceed button pulse when canProceed becomes true
watch(canProceed, (val) => {
  if (val && !prevCanProceed.value && proceedBtnRef.value) {
    nextTick(() => {
      gsap.fromTo(
        proceedBtnRef.value,
        { boxShadow: '0 0 0 rgba(37, 99, 235, 0)' },
        {
          boxShadow: '0 0 30px rgba(37, 99, 235, 0.4), 0 0 60px rgba(37, 99, 235, 0.15)',
          duration: 0.6,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        }
      )
    })
  }
  prevCanProceed.value = val
})

// ─── Saved chip entrance ────────────────────────────────────
watch(savedForGame, (chips) => {
  if (chips.length > 0) {
    nextTick(() => {
      const els = savedChipsRef.value?.querySelectorAll('.saved-chip')
      if (els && els.length > 0) {
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0.85, y: 8 },
          { opacity: 1, scale: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'back.out(2)' }
        )
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

  // Animate verify button to pressed state
  if (verifyBtnRef.value) {
    gsap.to(verifyBtnRef.value, {
      scale: 0.95,
      duration: 0.12,
      ease: 'power2.in',
    })
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

      // Save to localStorage so returning users can re-select instantly
      save({
        gameCode: gameCode.value,
        playerId: id,
        serverId: serverId.value.trim() || undefined,
        nickname: result.nickname,
        region: result.region,
        gameTitle: result.gameTitle,
      })
      // Refresh the saved players list
      loadSavedPlayers()

      // Success bounce on button (morphs to verified badge via v-if)
      if (verifyBtnRef.value) {
        gsap.to(verifyBtnRef.value, {
          scale: 1.08,
          duration: 0.25,
          ease: 'back.out(2.5)',
          onComplete: () => {
            gsap.to(verifyBtnRef.value, { scale: 1, duration: 0.15 })
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

// ─── Mobile One-Step Checkout ───────────────────────
const mobileCheckoutActive = ref(false)
const mobileQrImage = ref('')
const mobilePaymentRef = ref('')
const mobileQrLoading = ref(false)
const mobileQrError = ref<string | null>(null)
const mobilePaymentStatus = ref<'pending' | 'paid' | 'failed'>('pending')
const mobileTimeLeft = ref(5 * 60)
const mobileUrgent = computed(() => mobileTimeLeft.value < 60 && mobilePaymentStatus.value === 'pending')

// Receipt data (fetched from API when payment succeeds)
const mobileOrderData = ref<{
  reference: string
  game_name: string
  product_name: string
  player_id: string
  server_id?: string | null
  amount: number
  payment_status: string
  order_status: string
  created_at: string
  completed_at?: string | null
} | null>(null)
const mobileReceiptLoading = ref(false)

// WebSocket for real-time payment status (mobile checkout)
const mobileWsRef = ref<string | null>(null)
const mobileWs = usePaymentWebSocket(mobileWsRef)
mobileWs.setOnStatusChange((data) => {
  if (data.payment_status === 'paid') {
    mobilePaymentStatus.value = 'paid'
    stopMobilePolling()
    playSuccessSound()
    fetchMobileOrderData()
    toast.success('Payment received! Redirecting...')
    setTimeout(() => {
      router.push('/order/' + mobilePaymentRef.value)
    }, 3000)
  } else if (data.payment_status === 'failed') {
    mobilePaymentStatus.value = 'failed'
    stopMobilePolling()
    toast.error('Payment failed')
  }
})

async function fetchMobileOrderData() {
  if (!mobilePaymentRef.value) return
  mobileReceiptLoading.value = true
  try {
    const order = await getOrder(mobilePaymentRef.value)
    mobileOrderData.value = {
      reference: order.reference,
      game_name: order.game_name,
      product_name: order.product_name,
      player_id: order.player_id,
      server_id: order.server_id || null,
      amount: order.amount,
      payment_status: order.payment_status,
      order_status: order.order_status,
      created_at: order.created_at,
      completed_at: order.completed_at || null,
    }
  } catch {
    // If fetch fails, use local data as fallback
    mobileOrderData.value = {
      reference: mobilePaymentRef.value,
      game_name: gameDisplayName.value,
      product_name: selectedProduct.value?.name || '',
      player_id: playerId.value,
      server_id: serverId.value || null,
      amount: selectedProduct.value?.sell_price || 0,
      payment_status: 'paid',
      order_status: 'paid',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }
  } finally {
    mobileReceiptLoading.value = false
  }
}

let mobilePollInterval: ReturnType<typeof setInterval> | null = null
let mobileTimerInterval: ReturnType<typeof setInterval> | null = null

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    const notes = [523, 659, 784]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.12)
      gain.gain.setValueAtTime(0.2, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.4)
    })
  } catch { /* silent */ }
}

async function handleMobileCheckout() {
  if (!selectedProduct.value || !playerId.value.trim() || !verified.value) return

  // Set the order in store first
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

  if (!gameStore.currentOrder) return

  mobileCheckoutActive.value = true
  mobileQrLoading.value = true
  mobileQrError.value = null

  try {
    const result = await createPayment({
      game_code: gameCode.value,
      product_code: selectedProduct.value.product_code,
      product_name: selectedProduct.value.name,
      game_name: gameDisplayName.value,
      player_id: playerId.value.trim(),
      server_id: serverId.value.trim() || undefined,
      amount: selectedProduct.value.sell_price,
    })

    mobilePaymentRef.value = result.reference
    mobileWsRef.value = result.reference
    mobileQrImage.value = result.khqr_image || ''
    mobilePaymentStatus.value = 'pending'
    mobileTimeLeft.value = 5 * 60

    // Start polling + timer
    startMobilePolling()
    startMobileTimer()
  } catch (err) {
    mobileQrError.value = err instanceof Error ? err.message : 'Failed to create payment'
    toast.error(mobileQrError.value)
  } finally {
    mobileQrLoading.value = false
  }
}

function startMobilePolling() {
  mobilePollInterval = setInterval(async () => {
    if (!mobilePaymentRef.value) return
    try {
      const status = await getPaymentStatus(mobilePaymentRef.value)
      mobilePaymentStatus.value = status.payment_status as 'pending' | 'paid' | 'failed'
      if (status.payment_status === 'paid') {
        stopMobilePolling()
        playSuccessSound()
        fetchMobileOrderData()
        toast.success('Payment received! Redirecting...')
        setTimeout(() => router.push('/order/' + mobilePaymentRef.value), 1500)
      } else if (status.payment_status === 'failed') {
        stopMobilePolling()
        toast.error('Payment failed')
      }
    } catch { /* silent */ }
  }, 3000)
}

function stopMobilePolling() {
  if (mobilePollInterval) { clearInterval(mobilePollInterval); mobilePollInterval = null }
  if (mobileTimerInterval) { clearInterval(mobileTimerInterval); mobileTimerInterval = null }
}

function startMobileTimer() {
  mobileTimerInterval = setInterval(() => {
    mobileTimeLeft.value--
    if (mobileTimeLeft.value <= 0) {
      stopMobilePolling()
      toast.error('Payment time expired')
      cancelOrder(mobilePaymentRef.value).catch(() => {})
      mobilePaymentStatus.value = 'failed'
    }
  }, 1000)
}

function closeMobileCheckout() {
  stopMobilePolling()
  cancelOrder(mobilePaymentRef.value).catch(() => {})
  mobileCheckoutActive.value = false
  mobileQrImage.value = ''
  mobilePaymentRef.value = ''
  mobilePaymentStatus.value = 'pending'
  mobileTimeLeft.value = 5 * 60
}

// ─── Saved Players ─────────────────────────────────
/** Load previously verified player IDs for this game from localStorage. */
function loadSavedPlayers() {
  savedForGame.value = getByGame(gameCode.value)
}

/** Select a saved player: auto-fill ID, server, and restore cached verification instantly. */
function selectSavedPlayer(saved: ReturnType<typeof getByGame>[number]) {
  playerId.value = saved.playerId
  serverId.value = saved.serverId || ''
  verified.value = true
  playerNickname.value = saved.nickname
  playerRegion.value = saved.region || null
  playerGameTitle.value = saved.gameTitle || null
  verifyError.value = null
  toast.success(`Welcome back, ${saved.nickname}!`)

  // Scroll to show the verified result card
  if (resultRef.value) {
    resultRef.value.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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

  // Load saved player IDs from localStorage for this game
  loadSavedPlayers()

  // Page entrance animation
  nextTick(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // Page fade in
    tl.fromTo(
      pageRef.value,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5 }
    )

    // Header items stagger
    if (headerRef.value) {
      tl.fromTo(
        headerRef.value.querySelectorAll('.anim-item'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 },
        '-=0.2'
      )
    }

    // Form column slides in from right
    if (formRef.value) {
      tl.fromTo(
        formRef.value,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.4 },
        '-=0.1'
      )
    }

    // Products column slides in from left
    if (productsContainerRef.value) {
      tl.fromTo(
        productsContainerRef.value,
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

    // ─── Parallax: header background image ───
    if (headerRef.value) {
      const bgImg = headerRef.value.querySelector('.parallax-header-bg')
      if (bgImg) {
        gsap.to(bgImg, {
          y: 30,
          scale: 1.1,
          ease: 'none',
          scrollTrigger: {
            trigger: headerRef.value,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        })
      }
    }
  })
})

onUnmounted(() => {
  ScrollTrigger.getAll().forEach((st) => st.kill())
  gsap.killTweensOf('.bg-particle')
  gsap.killTweensOf('.product-card, .saved-chip, .result-accent-bar')
  stopMobilePolling()
})
</script>

<template>
  <div class="game-detail-root">
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
        <LoadingSkeleton variant="detail" :count="4" />
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
        <div ref="headerRef" class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950 mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8 shadow-xl max-h-[200px] sm:max-h-[260px]">
          <!-- Background image with parallax overlay -->
          <div class="parallax-header-bg absolute inset-0 opacity-10 will-change-transform">
            <img
              :src="gameStore.selectedGame.image_url"
              :alt="gameStore.selectedGame.name"
              class="w-full h-full object-cover"
            />
          </div>

          <div              class="relative flex items-center gap-4 sm:gap-5"
            >
            <!-- Game Icon -->
            <div class="anim-item w-14 h-14 sm:w-20 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-lg shrink-0 transform hover:scale-105 transition-transform duration-300">
              <img
                :src="gameStore.selectedGame.image_url"
                :alt="gameStore.selectedGame.name"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="anim-item min-w-0">
              <div class="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white/10 backdrop-blur-sm rounded-full text-[9px] sm:text-[10px] font-medium text-white/80 mb-0">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {{ gameStore.categories.find(c => c.game_code === gameCode)?.game_fields?.join(' + ') || 'ID' }}
              </div>
              <h1 class="text-lg sm:text-2xl lg:text-3xl font-bold text-white truncate">
                {{ gameStore.selectedGame.name }}
              </h1>
              <p class="mt-1 sm:mt-2 text-xs sm:text-sm text-white/60 line-clamp-1 max-w-xl">
                {{ gameStore.selectedGame.description }}
              </p>

            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <!-- Products Column (left on desktop) -->
          <div ref="productsContainerRef" class="lg:col-span-7 space-y-6 order-2 lg:order-1">
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

            <div ref="productsListRef" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              <ProductCard
                v-for="product in gameStore.products"
                :key="product.product_code"
                :product="product"
                :selected="selectedProduct?.product_code === product.product_code"
                @select="selectProduct(product)"
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
                    <label for="player-id" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      {{ i18n.t('detail.playerId') }} <span class="text-red-400">*</span>
                    </label>
                    <div class="relative">
                      <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                        </svg>
                      </div>
                      <input
                        id="player-id"
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

                    <!-- Saved Players (localStorage) -->
                    <div v-if="savedForGame.length > 0 && !verified" ref="savedChipsRef" class="pt-2">
                      <p class="text-[10px] text-surface-400 dark:text-surface-500 font-medium uppercase tracking-wider mb-2">
                        Previously Verified
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="saved in savedForGame"
                          :key="saved.playerId + (saved.serverId || '')"
                          @click="selectSavedPlayer(saved)"
                          class="saved-chip group inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 text-left"
                        >
                          <div class="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-primary-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {{ (saved.nickname[0] || '?').toUpperCase() }}
                          </div>
                          <div class="min-w-0">
                            <p class="text-xs font-semibold text-surface-800 dark:text-surface-200 truncate max-w-[120px]">
                              {{ saved.nickname }}
                            </p>
                            <p class="text-[10px] text-surface-400 dark:text-surface-500 font-mono">
                              {{ saved.playerId }}<span v-if="saved.serverId"> ({{ saved.serverId }})</span>
                            </p>
                          </div>
                          <svg class="w-3.5 h-3.5 text-surface-300 dark:text-surface-600 group-hover:text-primary-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <!-- Saved Players Badge (when verified but one exists) -->
                    <div v-if="savedForGame.length > 0 && verified" class="pt-1">
                      <span class="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        Saved for quick access on your next visit
                      </span>
                    </div>
                  </div>

                  <!-- Server / Zone ID -->
                  <div v-show="needsServerId" ref="serverIdRef" class="overflow-hidden">
                    <label for="server-id" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      {{ i18n.t('detail.serverId') }} <span class="text-red-400">*</span>
                    </label>
                    <div class="relative">
                      <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                      </div>
                      <input
                        id="server-id"
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
                    ref="errorRef"
                    class="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl overflow-hidden"
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

              <!-- Verified Player Result Card (simplified) -->
              <Transition name="result-card">
                <div
                  v-if="verified && playerNickname"
                  ref="resultRef"
                  class="overflow-hidden rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-900/10 shadow-sm"
                >
                  <div class="flex items-center gap-3 px-4 py-3">
                    <!-- Simple success checkmark -->
                    <div class="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                      <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <!-- Nickname in banner -->
                    <div class="min-w-0 flex-1">
                      <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{{ i18n.t('verify.success') }}</p>
                      <p class="font-bold text-sm text-emerald-800 dark:text-emerald-200 truncate">
                        {{ playerNickname }}
                      </p>
                    </div>
                    <!-- Region chip (compact) -->
                    <span
                      v-if="playerRegion"
                      class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-white/60 dark:bg-surface-800/60 rounded-full text-[9px] font-semibold text-surface-500 dark:text-surface-400 border border-surface-200/50 dark:border-surface-700/50"
                    >
                      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ playerRegion }}                  </span>
                  </div>
                </div>
              </Transition>

              <!-- Desktop Proceed to Checkout (hidden on mobile) -->
              <Transition name="proceed-btn">
                <button
                  ref="proceedBtnRef"
                  v-if="canProceed"
                  @click="proceedToCheckout"
                  class="hidden lg:flex w-full items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all duration-300 active:scale-[0.98] group"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  <span>{{ i18n.t('detail.continueCheckout') }}</span>
                  <svg class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                </button>
              </Transition>

            </div>
          </div>
        </div>
      </template>
    </div>
    </div>

    <!-- ═══ Mobile Floating Checkout Bar (phone only — state-aware) ═══ -->
    <Transition name="float-bar">
      <div
        v-if="gameStore.selectedGame && !mobileCheckoutActive"
        class="fixed bottom-0 left-0 right-0 z-40 block lg:hidden safe-bottom"
      >
        <div class="absolute inset-0 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl border-t border-surface-200 dark:border-surface-700 shadow-2xl shadow-black/5"></div>
        <div class="relative flex items-center justify-between px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]">
          <!-- Left: state message or total -->
          <div class="min-w-0 flex-1">
            <!-- Not verified yet -->
            <template v-if="!verified">
              <p class="text-[10px] text-surface-400 dark:text-surface-500 uppercase tracking-wider font-medium">Need to Verify</p>
              <p class="text-sm font-semibold text-surface-500 dark:text-surface-400 truncate flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Enter your Player ID first
              </p>
            </template>
            <!-- Verified but no package selected -->
            <template v-else-if="!selectedProduct">
              <p class="text-[10px] text-surface-400 dark:text-surface-500 uppercase tracking-wider font-medium">Almost Done</p>
              <p class="text-sm font-semibold text-primary-500 dark:text-primary-400 truncate flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Select a package below
              </p>
            </template>
            <!-- Verified + package selected: show total -->
            <template v-else>
              <p class="text-[10px] text-surface-400 dark:text-surface-500 uppercase tracking-wider font-medium">Total</p>
              <p class="text-xl font-bold text-surface-900 dark:text-white">
                {{ formatPrice(selectedProduct.sell_price).formatted }}
                <span class="text-xs text-surface-400 font-normal ml-0.5">{{ formatPrice(selectedProduct.sell_price).code }}</span>
              </p>
              <p v-if="playerNickname" class="text-[11px] text-surface-400 dark:text-surface-500 mt-0.5 truncate">
                {{ playerNickname }}
              </p>
            </template>
          </div>

          <!-- Right: action button -->
          <div class="shrink-0 ml-3">
            <button
              v-if="canProceed"
              @click="handleMobileCheckout"
              class="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-2xl shadow-lg shadow-primary-500/30 active:scale-[0.97] transition-all duration-200 text-sm flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pay Now
            </button>
            <button
              v-else
              :disabled="!verified"
              class="px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center gap-1.5"
              :class="verified
                ? 'bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500'
                : 'bg-primary-500/10 text-primary-500/70'
              "
            >
              <span>{{ verified ? 'Select Package' : 'Verify ID' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Spacer for mobile floating bar -->
    <div v-if="gameStore.selectedGame && !mobileCheckoutActive" class="h-20 lg:hidden"></div>

    <!-- ═══ Mobile KHQR Bottom Sheet ═══ -->
    <Teleport to="body">
      <div
        v-if="mobileCheckoutActive"
        class="fixed inset-0 z-50"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="closeMobileCheckout"
        ></div>

      <!-- Bottom Sheet -->
      <div
        class="absolute bottom-0 left-0 right-0 bg-white dark:bg-surface-900 rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        :class="{ 'animate-slide-up': true }"
      >
        <!-- Handle bar -->
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600"></div>
        </div>

        <!-- Close button -->
        <button
          @click="closeMobileCheckout"
          class="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="px-6 pb-8">
          <!-- Order Summary -->
          <div class="text-center mb-4 pt-2">
            <h3 class="text-lg font-bold text-surface-900 dark:text-surface-100">Scan to Pay</h3>
            <p class="text-sm text-surface-400 dark:text-surface-500 mt-1">Scan with any Cambodian banking app</p>
          </div>

          <!-- Game + Amount info -->
          <div class="flex items-center justify-between px-4 py-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl mb-4">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-surface-400 dark:text-surface-500 truncate">{{ gameDisplayName }}</p>
              <p v-if="playerNickname" class="text-sm font-semibold text-surface-900 dark:text-surface-100 mt-0.5 truncate">{{ playerNickname }}</p>
            </div>
            <div class="text-right shrink-0 ml-3">
              <p class="text-lg font-bold text-primary-600 dark:text-primary-400">
                {{ formatPrice(selectedProduct?.sell_price || 0).formatted }}
              </p>
              <p class="text-[10px] text-surface-400 uppercase">{{ formatPrice(selectedProduct?.sell_price || 0).code }}</p>
            </div>
          </div>

          <!-- QR Code -->
          <div class="flex justify-center mb-4">
            <div class="relative p-3 bg-white dark:bg-surface-800 rounded-xl border border-surface-100 dark:border-surface-700 shadow-sm">
              <div class="w-52 h-52 flex items-center justify-center">
                <!-- Loading -->
                <template v-if="mobileQrLoading">
                  <div class="text-center">
                    <svg class="w-10 h-10 mx-auto text-surface-300 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p class="text-[10px] text-surface-400 mt-2">Generating QR...</p>
                  </div>
                </template>
                <!-- QR Image -->
                <template v-else-if="mobileQrImage">
                  <img :src="mobileQrImage" alt="KHQR Code" class="w-full h-full object-contain" />
                </template>
                <!-- Placeholder -->
                <template v-else-if="mobileQrError">
                  <div class="text-center">
                    <p class="text-xs text-red-500 mb-2">{{ mobileQrError }}</p>
                    <button @click="handleMobileCheckout" class="text-xs text-primary-500 underline">Retry</button>
                  </div>
                </template>
              </div>
              <!-- USD-KHQR overlay logo -->
              <div v-if="mobileQrImage" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center p-1.5">
                  <img src="https://checkout.payway.com.kh/images/usd-khqr-logo.svg" alt="USD-KHQR" class="w-full h-full" />
                </div>
              </div>
            </div>
          </div>

          <!-- Timer ring -->
          <div v-if="mobilePaymentStatus === 'pending' && mobileTimeLeft > 0" class="flex justify-center mb-4">
            <div class="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>{{ Math.floor(mobileTimeLeft / 60) }}:{{ String(mobileTimeLeft % 60).padStart(2, '0') }} remaining</span>
            </div>
          </div>

          <!-- Payment instructions -->
          <div class="text-center">
            <div class="flex items-center justify-center gap-6 text-xs text-surface-500 dark:text-surface-400">
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Pay with any bank
              </span>
              <span class="text-surface-300">or</span>
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download QR
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

    <!-- Success overlay (mobile) -->
    <Teleport to="body">
      <div
        v-if="mobilePaymentStatus === 'paid'"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/90 via-emerald-600/85 to-teal-700/90 backdrop-blur-md"></div>
      <!-- Confetti particles -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          v-for="i in 40" :key="i"
          class="absolute w-2.5 h-2.5 rounded-sm animate-confetti"
          :style="{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            backgroundColor: ['#10B981', '#34D399', '#6EE7B7', '#FCD34D', '#F472B6', '#818CF8', '#FBBF24', '#F97316'][i % 8],
            animationDelay: `${Math.random() * 2.5}s`,
            animationDuration: `${2.5 + Math.random() * 2.5}s`,
            width: `${8 + Math.random() * 10}px`,
            height: `${8 + Math.random() * 10}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }"
        ></div>
      </div>
      <div class="relative text-center animate-scale-in">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6 animate-bounce-in">
          <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
            <path class="animate-draw-check" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-white mb-1">Payment Successful!</h2>
        <p class="text-emerald-100 text-sm">Redirecting to order details...</p>

        <!-- Receipt download (mobile) -->
        <div v-if="mobileOrderData" class="mt-6 max-w-sm mx-auto">
          <ReceiptCard
            :reference="mobileOrderData.reference"
            :game-name="mobileOrderData.game_name"
            :product-name="mobileOrderData.product_name"
            :player-id="mobileOrderData.player_id"
            :server-id="mobileOrderData.server_id"
            :amount="mobileOrderData.amount"
            :payment-status="mobileOrderData.payment_status"
            :order-status="mobileOrderData.order_status"
            :created-at="mobileOrderData.created_at"
            :completed-at="mobileOrderData.completed_at"
          />
        </div>
        <div v-else-if="mobileReceiptLoading" class="mt-6 flex justify-center">
          <svg class="w-6 h-6 text-white/60 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
.product-card {
  /* Initial state is set by GSAP; this ensures a static fallback */
  will-change: transform, opacity;
}

/* ─── Floating bar enter/leave transitions ─── */
.float-bar-enter-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.float-bar-leave-active {
  transition: transform 0.25s ease-in,
              opacity 0.25s ease-in;
}

.float-bar-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.float-bar-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.float-bar-enter-to {
  transform: translateY(0);
  opacity: 1;
}

/* ─── Desktop proceed button slide-up ─── */
.proceed-btn-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.proceed-btn-leave-active {
  transition: transform 0.2s ease-in,
              opacity 0.2s ease-in;
}

.proceed-btn-enter-from {
  transform: translateY(12px);
  opacity: 0;
}

.proceed-btn-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

.proceed-btn-enter-to {
  transform: translateY(0);
  opacity: 1;
}

/* ─── Verify result card slide-in ─── */
.result-card-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.result-card-leave-active {
  transition: transform 0.2s ease-in,
              opacity 0.2s ease-in;
}

.result-card-enter-from {
  transform: translateY(-12px) scale(0.97);
  opacity: 0;
}

.result-card-leave-to {
  transform: translateY(-8px) scale(0.97);
  opacity: 0;
}

.result-card-enter-to {
  transform: translateY(0) scale(1);
  opacity: 1;
}
</style>
