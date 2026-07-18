<script setup lang="ts">
import { computed, ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import { createPayment, getPaymentStatus, cancelOrder, getResellerBalance, getOrder } from '@/services/api'
import { formatPrice } from '@/composables/useCurrency'
import { usePaymentWebSocket } from '@/composables/usePaymentWebSocket'
import KHQRCard from '@/components/KHQRCard.vue'
import ReceiptCard from '@/components/ReceiptCard.vue'
import gsap from 'gsap'

const router = useRouter()
const gameStore = useGameStore()
const i18n = useI18nStore()
const toast = useToastStore()

const order = computed(() => gameStore.currentOrder)
const paymentRef = ref('')
const qrImage = ref('')
const qrLoading = ref(false)
const qrError = ref<string | null>(null)
const paymentStatus = ref<'pending' | 'paid' | 'failed'>('pending')
const timeLeft = ref(5 * 60) // 5 minutes
const checkoutStarted = ref(false)
const showCancelDialog = ref(false)
const cancelling = ref(false)
const showSuccessOverlay = ref(false)
const redirectCountdown = ref(3)

// Receipt data (fetched from API when payment succeeds)
const checkoutOrderData = ref<{
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
const checkoutReceiptLoading = ref(false)

// Balance
const balanceInfo = ref<{ balance: number; available: boolean } | null>(null)
const balanceLoading = ref(false)

// ─── Floating bar animation ───────────────────────────────────
const floatingBarRef = ref<HTMLElement | null>(null)

function animateFloatingBarIn(el: HTMLElement) {
  // iOS-style slide-up entrance: starts below viewport, springs into place
  gsap.fromTo(
    el,
    { y: '100%', opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'power4.out',
      clearProps: 'transform',
    }
  )
}

onMounted(() => {
  // Animate the floating bar on initial mount if visible
  if (order.value && !checkoutStarted.value && floatingBarRef.value) {
    nextTick(() => {
      animateFloatingBarIn(floatingBarRef.value!)
    })
  }
})

watch(checkoutStarted, (val) => {
  // When checkout is cancelled/reset and the bar reappears, re-animate it
  if (!val && floatingBarRef.value) {
    nextTick(() => {
      animateFloatingBarIn(floatingBarRef.value!)
    })
  }
})

let pollInterval: ReturnType<typeof setInterval> | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null
let redirectInterval: ReturnType<typeof setInterval> | null = null

const isUrgent = computed(() => timeLeft.value < 60 && paymentStatus.value === 'pending')

if (!order.value) {
  router.replace('/')
}

// ─── WebSocket: Real-time payment status ─────────────────────
const wsReference = ref<string | null>(null)
const ws = usePaymentWebSocket(wsReference)

ws.setOnStatusChange((data) => {
  if (data.payment_status === 'paid') {
    paymentStatus.value = 'paid'
    onPaymentReceived()
  } else if (data.payment_status === 'failed') {
    paymentStatus.value = 'failed'
    stopPolling()
    toast.error(i18n.t('payment.toast.paymentFailed'))
  }
})

// ─── Payment Creation ─────────────────────────────────────────
async function handleCheckout() {
  if (!order.value) return

  checkoutStarted.value = true
  qrLoading.value = true

  try {
    const result = await createPayment({
      game_code: order.value.gameCode,
      product_code: order.value.productCode,
      product_name: order.value.productName,
      game_name: order.value.gameName,
      player_id: order.value.playerId,
      server_id: order.value.serverId,
      amount: order.value.amount,
    })

    paymentRef.value = result.reference
    wsReference.value = result.reference
    qrImage.value = result.khqr_image || ''
    paymentStatus.value = 'pending'

    // Start polling + timer
    startPolling()
    startTimer()
    checkResellerBalance()
  } catch (err) {
    qrError.value = err instanceof Error ? err.message : i18n.t('payment.toast.createFailed')
    toast.error(qrError.value)
  } finally {
    qrLoading.value = false
  }
}

// ─── Retry on error ───────────────────────────────────────────
function handleRetry() {
  qrError.value = null
  qrImage.value = ''
  paymentRef.value = ''
  wsReference.value = null
  paymentStatus.value = 'pending'
  timeLeft.value = 5 * 60
  handleCheckout()
}

// ─── Polling ──────────────────────────────────────────────────
function startPolling() {
  pollInterval = setInterval(async () => {
    if (!paymentRef.value) return
    try {
      const status = await getPaymentStatus(paymentRef.value)
      paymentStatus.value = status.payment_status as 'pending' | 'paid' | 'failed'

      if (status.payment_status === 'paid') {
        onPaymentReceived()
      } else if (status.payment_status === 'failed') {
        stopPolling()
        toast.error(i18n.t('payment.toast.paymentFailed'))
      }
    } catch {
      // silently retry
    }
  }, 3000)
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  if (redirectInterval) { clearInterval(redirectInterval); redirectInterval = null }
}

// ─── Timer ────────────────────────────────────────────────────
function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      stopPolling()
      toast.error(i18n.t('payment.toast.timeExpired'))
      cancelOrder(paymentRef.value).catch(() => {})
      paymentStatus.value = 'failed'
    }
  }, 1000)
}

// ─── Balance Check ────────────────────────────────────────────
async function checkResellerBalance() {
  balanceLoading.value = true
  try {
    balanceInfo.value = await getResellerBalance()
  } catch {
    balanceInfo.value = { balance: 0, available: false }
  } finally {
    balanceLoading.value = false
  }
}

// ─── Cancel Order ─────────────────────────────────────────────
async function handleCancelOrder() {
  if (!paymentRef.value) return
  cancelling.value = true
  try {
    await cancelOrder(paymentRef.value)
    showCancelDialog.value = false
    stopPolling()
    toast.success(i18n.t('payment.toast.cancelSuccess'))
    router.push('/')
  } catch (err) {
    showCancelDialog.value = false
    const msg = err instanceof Error ? err.message : ''
    if (msg.toLowerCase().includes('already processed') || msg.toLowerCase().includes('cancelled')) {
      toast.error(i18n.t('payment.toast.cannotCancel'))
    } else {
      toast.error(i18n.t('payment.toast.cancelFailed'))
    }
  } finally {
    cancelling.value = false
  }
}

// ─── Success ──────────────────────────────────────────────────
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523, now)
    gain1.gain.setValueAtTime(0.25, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659, now + 0.12)
    gain2.gain.setValueAtTime(0.25, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.5)
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(784, now + 0.24)
    gain3.gain.setValueAtTime(0.2, now + 0.24)
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
    osc3.connect(gain3)
    gain3.connect(ctx.destination)
    osc3.start(now + 0.24)
    osc3.stop(now + 0.6)
  } catch { /* silent */ }
}

function onPaymentReceived() {
  if (showSuccessOverlay.value) return
  stopPolling()
  playSuccessSound()
  showSuccessOverlay.value = true
  redirectCountdown.value = 3
  fetchCheckoutOrderData()
  gameStore.clearOrder()
  redirectInterval = setInterval(() => {
    redirectCountdown.value--
    if (redirectCountdown.value <= 0) {
      if (redirectInterval) clearInterval(redirectInterval)
      router.push(`/order/${paymentRef.value}`)
    }
  }, 1000)
}

async function fetchCheckoutOrderData() {
  if (!paymentRef.value) return
  checkoutReceiptLoading.value = true
  try {
    const data = await getOrder(paymentRef.value)
    checkoutOrderData.value = {
      reference: data.reference,
      game_name: data.game_name,
      product_name: data.product_name,
      player_id: data.player_id,
      server_id: data.server_id || null,
      amount: data.amount,
      payment_status: data.payment_status,
      order_status: data.order_status,
      created_at: data.created_at,
      completed_at: data.completed_at || null,
    }
  } catch {
    // Fallback to local data if API fetch fails
    checkoutOrderData.value = {
      reference: paymentRef.value,
      game_name: order.value?.gameName || '',
      product_name: order.value?.productName || '',
      player_id: order.value?.playerId || '',
      server_id: order.value?.serverId || null,
      amount: order.value?.amount || 0,
      payment_status: 'paid',
      order_status: 'paid',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }
  } finally {
    checkoutReceiptLoading.value = false
  }
}

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-950 dark:to-surface-900">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <!-- Back Button -->
      <button
        @click="checkoutStarted ? (showCancelDialog = true) : router.back()"
        class="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 mb-6 transition-all duration-200 group"
      >
        <svg class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {{ checkoutStarted ? i18n.t('payment.cancelOrder') : i18n.t('checkout.cancel') }}
      </button>

      <div v-if="order" class="animate-fade-in">
        <!-- Header -->
        <div class="mb-6 sm:mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-100">
            {{ checkoutStarted ? i18n.t('payment.scanToPay') : i18n.t('checkout.title') }}
          </h1>
          <p class="mt-1.5 text-sm text-surface-400 dark:text-surface-500">
            {{ checkoutStarted ? i18n.t('payment.scanHint') : i18n.t('checkout.subtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          <!-- ─── LEFT COLUMN (changes based on state) ─── -->
          <div class="lg:col-span-2 space-y-4">
            <!-- Before Checkout: Compact Order Summary -->
            <div v-if="!checkoutStarted" class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
              <div class="p-5 space-y-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-surface-400 dark:text-surface-500">{{ i18n.t('checkout.game') }}</p>
                    <p class="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{{ order.gameName }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-lg font-bold text-primary-600 dark:text-primary-400">{{ formatPrice(order.amount).formatted }}</p>
                    <p class="text-[10px] text-surface-400 uppercase">{{ formatPrice(order.amount).code }}</p>
                  </div>
                </div>
                <div class="h-px bg-surface-100 dark:bg-surface-800"></div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-surface-500 dark:text-surface-400">{{ i18n.t('checkout.package') }}</span>
                  <span class="font-semibold text-surface-900 dark:text-surface-100">{{ order.productName }}</span>
                </div>
                <div class="h-px bg-surface-100 dark:bg-surface-800"></div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-surface-500 dark:text-surface-400">{{ i18n.t('checkout.playerId') }}</span>
                  <span class="font-mono font-semibold text-surface-900 dark:text-surface-100">
                    {{ order.playerId }}<span v-if="order.serverId" class="text-surface-400 ml-1">({{ order.serverId }})</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- After Checkout: Order Details Sidebar -->
            <template v-if="checkoutStarted">
              <div class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
                <div class="p-5 space-y-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs text-surface-400 dark:text-surface-500">{{ i18n.t('checkout.game') }}</p>
                      <p class="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{{ order.gameName }}</p>
                    </div>
                  </div>
                  <div class="h-px bg-surface-100 dark:bg-surface-800"></div>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-xs text-surface-400 dark:text-surface-500">{{ i18n.t('checkout.package') }}</p>
                      <p class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ order.productName }}</p>
                    </div>
                    <span class="text-base font-bold text-primary-600 dark:text-primary-400">{{ formatPrice(order.amount).formatted }}</span>
                  </div>
                  <div class="h-px bg-surface-100 dark:bg-surface-800"></div>
                  <div>
                    <p class="text-xs text-surface-400 dark:text-surface-500">{{ i18n.t('checkout.playerId') }}</p>
                    <p class="text-sm font-mono font-semibold text-surface-900 dark:text-surface-100">
                      {{ order.playerId }}
                      <span v-if="order.serverId" class="text-surface-400">({{ order.serverId }})</span>
                    </p>
                  </div>
                  <div class="pt-2 border-t border-surface-100 dark:border-surface-800">
                    <div class="flex items-center justify-between">
                      <p class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ i18n.t('checkout.total') }}</p>
                      <p class="text-xl font-bold text-primary-600 dark:text-primary-400">
                        {{ formatPrice(order.amount).formatted }} <span class="text-[10px] text-surface-400 font-normal">{{ formatPrice(order.amount).code }}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Low Balance Warning -->
              <div
                v-if="balanceInfo && balanceInfo.available && balanceInfo.balance < order.amount && paymentStatus === 'pending'"
                class="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30 animate-fade-in"
              >
                <div class="flex items-start gap-2.5">
                  <svg class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p class="text-xs font-semibold text-amber-700 dark:text-amber-400">{{ i18n.t('payment.lowBalanceTitle') }}</p>
                    <p class="text-[10px] text-amber-600 dark:text-amber-500 mt-1">{{ i18n.t('payment.lowBalanceMessage') }}</p>
                  </div>
                </div>
              </div>

              <!-- Payment Status Indicator -->
              <div
                v-if="paymentStatus === 'pending' && timeLeft > 0"
                class="p-4 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm"
              >
                <div class="flex items-center gap-3">
                  <div class="relative w-10 h-10 shrink-0">
                    <svg class="w-10 h-10 -rotate-90 animate-spin-slow" viewBox="0 0 36 36">
                      <path
                        class="text-surface-100 dark:text-surface-800"
                        fill="none" stroke="currentColor" stroke-width="3"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        :class="isUrgent ? 'text-amber-400' : 'text-primary-400'"
                        fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                        :stroke-dasharray="`${((timeLeft / 300) * 100)}, 100`"
                        class="transition-all duration-1000 ease-linear"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-surface-500">
                      {{ Math.floor(timeLeft / 60) }}:{{ String(timeLeft % 60).padStart(2, '0') }}
                    </span>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-surface-700 dark:text-surface-300">Awaiting Payment</p>
                    <p class="text-[10px] text-surface-400 dark:text-surface-500 mt-0.5">Scan & pay with your banking app</p>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- ─── RIGHT COLUMN: KHQR Card (always rendered) ─── -->
          <div class="lg:col-span-3">
            <KHQRCard
              :merchant-name="'GameTopUp Store'"
              :amount="order.amount"
              :qr-image="qrImage"
              :payment-ref="paymentRef"
              :loading="qrLoading"
              :error="qrError"
              :payment-status="paymentStatus"
              :time-left="timeLeft"
              :is-urgent="isUrgent"
              @checkout="handleCheckout"
              @retry="handleRetry"
              @cancel="showCancelDialog = true"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ iOS-style Floating Checkout Bar (mobile only, before checkout) ═══ -->
    <div
      ref="floatingBarRef"
      v-if="order && !checkoutStarted"
      class="fixed bottom-0 left-0 right-0 z-40 block lg:hidden safe-bottom"
    >
      <!-- Background blur -->
      <div class="absolute inset-0 bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl border-t border-surface-200 dark:border-surface-700"></div>
      <!-- Content -->
      <div class="relative flex items-center justify-between px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]">
        <div>
          <p class="text-[10px] text-surface-400 dark:text-surface-500 uppercase tracking-wider font-medium">Total</p>
          <p class="text-xl font-bold text-surface-900 dark:text-white">
            {{ formatPrice(order.amount).formatted }}
            <span class="text-xs text-surface-400 font-normal ml-0.5">{{ formatPrice(order.amount).code }}</span>
          </p>
        </div>
        <button
          @click="handleCheckout"
          class="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-2xl shadow-lg shadow-primary-500/30 active:scale-[0.97] transition-all duration-200 text-sm"
        >
          {{ i18n.t('checkout.payNow') }}
        </button>
      </div>
    </div>

    <!-- Spacer for mobile floating bar -->
    <div v-if="order && !checkoutStarted" class="h-20 lg:hidden"></div>

    <!-- Cancel Dialog -->
    <Teleport to="body">
      <div
        v-if="showCancelDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showCancelDialog = false"
      >
        <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">{{ i18n.t('payment.cancelConfirmTitle') }}</h3>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">{{ i18n.t('payment.cancelConfirmMessage') }}</p>
            <div class="flex flex-col gap-3">
              <button
                @click="handleCancelOrder"
                :disabled="cancelling"
                class="w-full py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-800 text-white font-medium text-sm transition-all duration-200"
              >
                <svg v-if="cancelling" class="w-4 h-4 animate-spin inline mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ cancelling ? i18n.t('payment.cancelling') : i18n.t('payment.cancelConfirmYes') }}
              </button>
              <button
                @click="showCancelDialog = false"
                :disabled="cancelling"
                class="w-full py-2.5 px-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 font-medium text-sm hover:bg-surface-50 dark:hover:bg-surface-700/50 disabled:opacity-50 transition-all duration-200"
              >{{ i18n.t('payment.cancelConfirmNo') }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Celebration Overlay -->
    <Teleport to="body">
      <div
        v-if="showSuccessOverlay"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/90 via-emerald-600/85 to-teal-700/90 backdrop-blur-md"></div>
        <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            v-for="i in 30" :key="i"
            class="absolute w-2.5 h-2.5 rounded-sm animate-confetti"
            :style="{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              backgroundColor: ['#10B981', '#34D399', '#6EE7B7', '#FCD34D', '#F472B6', '#818CF8', '#FBBF24'][i % 7],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              width: `${8 + Math.random() * 8}px`,
              height: `${8 + Math.random() * 8}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }"
          ></div>
        </div>
        <div class="relative text-center animate-scale-in">
          <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mb-8 animate-bounce-in">
            <svg class="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
              <path class="animate-draw-check" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-white mb-2">{{ i18n.t('payment.successTitle') }}</h2>
          <p class="text-emerald-100 text-lg mb-2">{{ i18n.t('payment.successMessage') }}</p>
          <p class="text-2xl font-bold text-white mb-6">{{ formatPrice(order?.amount || 0).formatted }}</p>
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-emerald-100 text-sm font-mono mb-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {{ paymentRef }}
          </div>

          <!-- Receipt download -->
          <div v-if="checkoutOrderData" class="mt-6 max-w-sm mx-auto text-left">
            <ReceiptCard
              :reference="checkoutOrderData.reference"
              :game-name="checkoutOrderData.game_name"
              :product-name="checkoutOrderData.product_name"
              :player-id="checkoutOrderData.player_id"
              :server-id="checkoutOrderData.server_id"
              :amount="checkoutOrderData.amount"
              :payment-status="checkoutOrderData.payment_status"
              :order-status="checkoutOrderData.order_status"
              :created-at="checkoutOrderData.created_at"
              :completed-at="checkoutOrderData.completed_at"
            />
          </div>
          <div v-else-if="checkoutReceiptLoading" class="mt-6 flex justify-center">
            <svg class="w-6 h-6 text-white/60 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>

          <div class="max-w-xs mx-auto mt-6">
            <div class="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
              <div
                class="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
                :style="{ width: `${(redirectCountdown / 3) * 100}%` }"
              ></div>
            </div>
            <p class="text-emerald-200 text-sm">{{ i18n.t('payment.redirectingIn') }} {{ redirectCountdown }}...</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
