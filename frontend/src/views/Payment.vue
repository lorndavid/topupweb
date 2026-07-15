<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import { createPayment, getPaymentStatus, cancelOrder, getResellerBalance } from '@/services/api'

const router = useRouter()
const gameStore = useGameStore()
const i18n = useI18nStore()
const toast = useToastStore()

const order = computed(() => gameStore.currentOrder)

const paymentRef = ref('')
const khqrImage = ref('')
const amount = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)
const paymentStatus = ref<'pending' | 'paid' | 'failed'>('pending')
const timeLeft = ref(5 * 60) // 5 minutes in seconds
const showCancelDialog = ref(false)
const cancelling = ref(false)
const showSuccessOverlay = ref(false)
const redirectCountdown = ref(3)

// Low-balance warning
const balanceInfo = ref<{ balance: number; available: boolean } | null>(null)
const balanceLoading = ref(false)
const showLowBalanceWarning = computed(() => {
  if (!balanceInfo.value || !balanceInfo.value.available) return false
  return balanceInfo.value.balance < amount.value
})
let pollInterval: ReturnType<typeof setInterval> | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null
let redirectInterval: ReturnType<typeof setInterval> | null = null

const isUrgent = computed(() => timeLeft.value < 60)

const formattedTime = computed(() => {
  const mins = Math.floor(timeLeft.value / 60)
  const secs = timeLeft.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const timeoutPercentage = computed(() => {
  return (timeLeft.value / (5 * 60)) * 100
})

async function initPayment() {
  if (!order.value) {
    router.replace('/')
    return
  }

  loading.value = true
  error.value = null

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
    khqrImage.value = result.khqr_image || ''
    amount.value = result.amount

    // Start polling for payment status
    startPolling()
    startTimer()

    // Non-blocking: fetch reseller balance to warn if low on stock
    checkResellerBalance()
  } catch (err) {
    error.value = err instanceof Error ? err.message : i18n.t('payment.toast.createFailed')
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

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
      // Silently retry on error
    }
  }, 3000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (redirectInterval) {
    clearInterval(redirectInterval)
    redirectInterval = null
  }
}

async function handleTimeout() {
  stopPolling()
  toast.error(i18n.t('payment.toast.timeExpired'))

  // Cancel the order on backend
  if (paymentRef.value) {
    try {
      await cancelOrder(paymentRef.value)
    } catch {
      // Silently fail — order may already be expired
    }
  }

  router.push('/')
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      handleTimeout()
    }
  }, 1000)
}

async function checkResellerBalance() {
  balanceLoading.value = true
  try {
    balanceInfo.value = await getResellerBalance()
  } catch {
    // Silently fail — balance is non-critical
    balanceInfo.value = { balance: 0, available: false }
  } finally {
    balanceLoading.value = false
  }
}

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
    const message = err instanceof Error ? err.message : ''
    if (message.toLowerCase().includes('already processed') || message.toLowerCase().includes('cancelled')) {
      toast.error(i18n.t('payment.toast.cannotCancel'))
    } else {
      toast.error(i18n.t('payment.toast.cancelFailed'))
    }
  } finally {
    cancelling.value = false
  }
}

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Ascending chime: two quick notes going up
    const now = ctx.currentTime

    // First note — C5 (523 Hz)
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

    // Second note — E5 (659 Hz) — slightly overlapping
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

    // Third note — G5 (784 Hz) — for a full major chord
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
  } catch {
    // Audio not available — silence is fine
  }
}

function onPaymentReceived() {
  stopPolling()

  // Play sound
  playSuccessSound()

  // Show celebration overlay
  showSuccessOverlay.value = true

  // Countdown + auto-redirect
  gameStore.clearOrder()
  redirectInterval = setInterval(() => {
    redirectCountdown.value--
    if (redirectCountdown.value <= 0) {
      if (redirectInterval) clearInterval(redirectInterval)
      router.push(`/order/${paymentRef.value}`)
    }
  }, 1000)
}

function copyReference() {
  navigator.clipboard.writeText(paymentRef.value).then(() => {
    toast.success(i18n.t('payment.toast.copySuccess'))
  }).catch(() => {
    toast.error(i18n.t('payment.toast.copyFailed'))
  })
}

onMounted(() => {
  initPayment()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-16 space-y-4">
      <div class="w-16 h-16 mx-auto rounded-full border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 animate-spin"></div>
      <p class="text-surface-500 dark:text-surface-400">{{ i18n.t('payment.generatingQR') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-surface-500 dark:text-surface-400 mb-4">{{ error }}</p>
      <button @click="initPayment" class="btn-primary text-sm">{{ i18n.t('payment.tryAgain') }}</button>
    </div>

    <!-- Payment QR -->
    <div v-else class="animate-fade-in">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100">{{ i18n.t('payment.scanToPay') }}</h1>
        <p class="mt-1 text-surface-500 dark:text-surface-400">{{ i18n.t('payment.scanHint') }}</p>
      </div>

      <div class="card p-6 sm:p-8">
        <!-- Timer -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('payment.expiresIn') }}</span>
            <span :class="[
              'text-lg font-mono font-bold',
              isUrgent ? 'text-red-500 animate-pulse' : 'text-surface-900 dark:text-surface-100'
            ]">
              {{ formattedTime }}
            </span>
          </div>
          <div class="w-full h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000"
              :class="isUrgent ? 'bg-red-500' : timeLeft < 120 ? 'bg-amber-500' : 'bg-emerald-500'"
              :style="{ width: `${timeoutPercentage}%` }"
            ></div>
          </div>
        </div>

        <!-- Urgent Warning -->
        <div
          v-if="isUrgent"
          class="flex items-center justify-center gap-2 mb-4 text-red-500 dark:text-red-400 animate-pulse"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs font-semibold">{{ i18n.t('payment.urgentWarning') }}</span>
        </div>

        <!-- QR Code -->
        <div class="flex justify-center mb-6">
          <div class="relative p-4 bg-white rounded-2xl shadow-sm border border-surface-200">
            <div class="w-56 h-56 bg-surface-100 dark:bg-surface-800 rounded-xl flex items-center justify-center">
              <img
                v-if="khqrImage"
                :src="khqrImage"
                alt="KHQR Code"
                class="w-full h-full object-contain"
              />
              <div v-else class="text-center text-surface-400">
                <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p class="text-sm">KHQR Code</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Low Balance Warning -->
        <div
          v-if="showLowBalanceWarning"
          class="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 animate-fade-in"
        >
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {{ i18n.t('payment.lowBalanceTitle') }}
              </p>
              <p class="text-xs text-amber-600 dark:text-amber-500 mt-1">
                {{ i18n.t('payment.lowBalanceMessage') }}
              </p>
            </div>
          </div>
        </div>
        <div
          v-else-if="balanceLoading"
          class="mb-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 animate-pulse"
        >
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 skeleton rounded"></div>
            <div class="flex-1">
              <div class="h-3 skeleton w-3/4 mb-1"></div>
              <div class="h-3 skeleton w-1/2"></div>
            </div>
          </div>
        </div>

        <!-- Amount -->
        <div class="text-center mb-6">
          <p class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('payment.amountToPay') }}</p>
          <p class="text-3xl font-bold text-surface-900 dark:text-surface-100">
            ${{ amount.toFixed(2) }}
          </p>
          <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">
            ≈ {{ (amount * 4100).toLocaleString() }} KHR
          </p>
        </div>

        <!-- Reference -->
        <div class="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-surface-500 dark:text-surface-400">{{ i18n.t('payment.reference') }}</p>
              <p class="text-sm font-mono font-medium text-surface-900 dark:text-surface-100">{{ paymentRef }}</p>
            </div>
            <button
              @click="copyReference"
              class="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-all"
              :title="i18n.t('payment.copyReference')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Payment Status -->
      <div class="mt-6 card p-4">
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <p class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ i18n.t('payment.status') }}</p>
            <p class="text-xs text-surface-500 dark:text-surface-400">{{ i18n.t('payment.waiting') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span class="text-sm text-amber-600 dark:text-amber-400 font-medium">{{ i18n.t('payment.awaiting') }}</span>
          </div>
        </div>
      </div>

      <!-- Cancel Order -->
      <div class="mt-6">
        <button
          @click="showCancelDialog = true"
          class="w-full py-3 px-4 rounded-xl border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200"
        >
          {{ i18n.t('payment.cancelOrder') }}
        </button>
      </div>

      <!-- Instructions -->
      <div class="mt-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl space-y-2">
        <div class="flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
          <p class="text-sm text-surface-600 dark:text-surface-400">{{ i18n.t('payment.instruction1') }}</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
          <p class="text-sm text-surface-600 dark:text-surface-400">{{ i18n.t('payment.instruction2') }}</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
          <p class="text-sm text-surface-600 dark:text-surface-400">{{ i18n.t('payment.instruction3') }}</p>
        </div>
        <div class="flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
          <p class="text-sm text-surface-600 dark:text-surface-400">{{ i18n.t('payment.instruction4') }}</p>
        </div>
      </div>
    </div>

    <!-- Cancel Confirmation Dialog -->
    <Teleport to="body">
      <div
        v-if="showCancelDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showCancelDialog = false"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>

        <!-- Dialog -->
        <div class="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
          <div class="text-center">
            <!-- Warning Icon -->
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h3 class="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2">
              {{ i18n.t('payment.cancelConfirmTitle') }}
            </h3>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">
              {{ i18n.t('payment.cancelConfirmMessage') }}
            </p>

            <div class="flex flex-col gap-3">
              <button
                @click="handleCancelOrder"
                :disabled="cancelling"
                class="w-full py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-800 text-white font-medium text-sm transition-all duration-200"
              >
                <svg v-if="cancelling" class="w-4 h-4 animate-spin inline mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ cancelling ? i18n.t('payment.cancelling') : i18n.t('payment.cancelConfirmYes') }}
              </button>
              <button
                @click="showCancelDialog = false"
                :disabled="cancelling"
                class="w-full py-2.5 px-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 font-medium text-sm hover:bg-surface-50 dark:hover:bg-surface-700/50 disabled:opacity-50 transition-all duration-200"
              >
                {{ i18n.t('payment.cancelConfirmNo') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Celebration Overlay -->
    <Teleport to="body">
      <div
        v-if="showSuccessOverlay"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop with gradient -->
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/90 via-emerald-600/85 to-teal-700/90 backdrop-blur-md"></div>

        <!-- Confetti Particles -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            v-for="i in 30"
            :key="i"
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

        <!-- Content -->
        <div class="relative text-center animate-scale-in">
          <!-- Animated Checkmark -->
          <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mb-8 animate-bounce-in">
            <svg class="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
              <path
                class="animate-draw-check"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 class="text-3xl font-bold text-white mb-2">
            {{ i18n.t('payment.successTitle') }}
          </h2>
          <p class="text-emerald-100 text-lg mb-2">
            {{ i18n.t('payment.successMessage') }}
          </p>

          <!-- Amount -->
          <p class="text-2xl font-bold text-white mb-6">
            ${{ amount.toFixed(2) }}
          </p>

          <!-- Reference -->
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-emerald-100 text-sm font-mono mb-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {{ paymentRef }}
          </div>

          <!-- Countdown Bar -->
          <div class="max-w-xs mx-auto">
            <div class="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
              <div
                class="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
                :style="{ width: `${(redirectCountdown / 3) * 100}%` }"
              ></div>
            </div>
            <p class="text-emerald-200 text-sm">
              {{ i18n.t('payment.redirectingIn') }} {{ redirectCountdown }}...
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
