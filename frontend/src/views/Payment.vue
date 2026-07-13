<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import { createPayment, getPaymentStatus } from '@/services/api'

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
const timeLeft = ref(30 * 60) // 30 minutes in seconds
let pollInterval: ReturnType<typeof setInterval> | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null

const formattedTime = computed(() => {
  const mins = Math.floor(timeLeft.value / 60)
  const secs = timeLeft.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const timeoutPercentage = computed(() => {
  return (timeLeft.value / (30 * 60)) * 100
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
        stopPolling()
        toast.success(i18n.t('payment.toast.paymentReceived'))
        gameStore.clearOrder()
        router.push(`/order/${paymentRef.value}`)
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
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      stopPolling()
      toast.error(i18n.t('payment.toast.timeExpired'))
      router.push('/')
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
              timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-surface-900 dark:text-surface-100'
            ]">
              {{ formattedTime }}
            </span>
          </div>
          <div class="w-full h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000"
              :class="timeLeft < 60 ? 'bg-red-500' : timeLeft < 300 ? 'bg-amber-500' : 'bg-primary-500'"
              :style="{ width: `${timeoutPercentage}%` }"
            ></div>
          </div>
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
  </div>
</template>
