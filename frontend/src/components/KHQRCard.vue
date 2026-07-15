<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import gsap from 'gsap'

const props = defineProps<{
  merchantName: string
  amount: number
  qrImage?: string
  paymentRef?: string
  loading?: boolean
  error?: string | null
  paymentStatus?: 'pending' | 'paid' | 'failed'
  timeLeft?: number
  isUrgent?: boolean
}>()

const emit = defineEmits<{
  checkout: []
  retry: []
  cancel: []
}>()

const showCard = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const qrContainerRef = ref<HTMLElement | null>(null)
const checkoutBtnRef = ref<HTMLElement | null>(null)

function handleCheckout() {
  if (showCard.value) return
  if (checkoutBtnRef.value) {
    gsap.to(checkoutBtnRef.value, { scale: 0.95, duration: 0.1 })
  }
  showCard.value = true
  emit('checkout')
  nextTick(() => {
    if (cardRef.value) {
      gsap.fromTo(
        cardRef.value,
        { opacity: 0, y: 30, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      )
    }
    if (qrContainerRef.value) {
      gsap.fromTo(
        qrContainerRef.value,
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: 0.4, delay: 0.25, ease: 'back.out(1.7)' }
      )
    }
  })
}

function handleRetry() {
  // Keep card visible — parent will reset error + re-fetch QR
  emit('retry')
}

const formattedTime = computed(() => {
  if (props.timeLeft === undefined || props.timeLeft === null) return ''
  const mins = Math.floor(props.timeLeft / 60)
  const secs = props.timeLeft % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

function copyReference() {
  if (!props.paymentRef) return
  navigator.clipboard.writeText(props.paymentRef).catch(() => {})
}
</script>

<template>
  <div class="khqr-card-wrapper">
    <!-- ─── CHECKOUT BUTTON ─── -->
    <div v-if="!showCard" ref="checkoutBtnRef" class="text-center">
      <button
        @click="handleCheckout"
        class="group relative overflow-hidden px-10 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-lg rounded-2xl shadow-xl shadow-red-500/20 hover:shadow-red-500/30 transition-all duration-300 active:scale-[0.98]"
      >
        <span class="relative z-10 flex items-center gap-3">
          <img
            src="https://checkout.payway.com.kh/images/khqr-icon.svg"
            alt="KHQR"
            class="w-6 h-6 brightness-0 invert"
          />
          <span>Checkout with KHQR</span>
          <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
        <span class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent"></span>
      </button>
      <p class="mt-2 text-xs text-surface-400 dark:text-surface-500">
        Pay with Bakong, ABA, ACLEDA, Wing, or any Cambodian bank
      </p>
    </div>

    <!-- ─── KHQR RECEIPT CARD ─── -->
    <div v-if="showCard" ref="cardRef" class="mx-auto max-w-sm">
      <div class="bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
        <!-- ═══ RED HEADER ═══ -->
        <div class="bg-gradient-to-r from-red-600 to-red-500 px-6 pt-6 pb-5 text-center relative overflow-hidden">
          <div class="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5"></div>
          <div class="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5"></div>
          <div class="relative flex flex-col items-center gap-2">
            <img src="https://checkout.payway.com.kh/images/khqr-icon.svg" alt="KHQR" class="w-10 h-10 brightness-0 invert" />
            <h3 class="text-white/90 text-sm font-medium uppercase tracking-widest">KHQR Payment</h3>
          </div>
        </div>

        <!-- Dashed Separator -->
        <div class="relative px-6">
          <div class="border-t-2 border-dashed border-gray-200 -mx-6"></div>
          <div class="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-gray-50"></div>
          <div class="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gray-50"></div>
        </div>

        <!-- ═══ WHITE BODY ═══ -->
        <div class="px-6 pb-6 pt-4 bg-white">
          <!-- Merchant Name -->
          <div class="text-center mb-3">
            <p class="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Merchant</p>
            <p class="text-sm font-bold text-gray-800">{{ merchantName }}</p>
          </div>

          <!-- Amount -->
          <div class="text-center mb-4">
            <p class="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Amount</p>
            <p class="text-3xl font-extrabold text-gray-900">${{ amount.toFixed(2) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">USD</p>
          </div>

          <!-- Timer Bar -->
          <div v-if="timeLeft !== undefined && timeLeft !== null" class="mb-4">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] text-gray-400 uppercase tracking-wider">Time remaining</span>
              <span
                class="text-sm font-mono font-bold"
                :class="isUrgent ? 'text-red-500 animate-pulse' : 'text-gray-700'"
              >{{ formattedTime }}</span>
            </div>
            <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-1000"
                :class="isUrgent ? 'bg-red-500' : timeLeft && timeLeft < 120 ? 'bg-amber-500' : 'bg-emerald-500'"
                :style="{ width: `${((timeLeft || 0) / 300) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Urgent Warning -->
          <div
            v-if="isUrgent && paymentStatus === 'pending'"
            class="flex items-center justify-center gap-1.5 mb-3 text-red-500 animate-pulse"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-[10px] font-semibold">Time is running out — scan now!</span>
          </div>

          <!-- QR Code -->
          <div ref="qrContainerRef" class="flex justify-center mb-3">
            <div class="relative p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div class="w-52 h-52 flex items-center justify-center">
                <!-- Loading -->
                <template v-if="loading">
                  <div class="text-center">
                    <svg class="w-10 h-10 mx-auto text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p class="text-[10px] text-gray-400 mt-2">Generating QR...</p>
                  </div>
                </template>

                <!-- QR Image -->
                <template v-else-if="qrImage">
                  <img :src="qrImage" alt="KHQR Code" class="w-full h-full object-contain" />
                </template>

                <!-- Placeholder -->
                <template v-else>
                  <div class="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                    <img src="https://checkout.payway.com.kh/images/usd-khqr-logo.svg" alt="USD-KHQR" class="w-24 h-24 opacity-30" />
                  </div>
                </template>
              </div>

              <!-- USD-KHQR Logo overlay -->
              <div v-if="qrImage" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center p-1.5">
                  <img src="https://checkout.payway.com.kh/images/usd-khqr-logo.svg" alt="USD-KHQR" class="w-full h-full" />
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Status Indicator -->
          <div v-if="paymentStatus && paymentStatus !== 'pending'" class="mb-3">
            <!-- Paid -->
            <div v-if="paymentStatus === 'paid'" class="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span class="text-sm font-semibold text-emerald-700">Payment Received!</span>
            </div>
            <!-- Failed -->
            <div v-if="paymentStatus === 'failed'" class="flex items-center justify-center gap-2 p-2.5 bg-red-50 rounded-xl border border-red-200">
              <div class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span class="text-sm font-semibold text-red-700">Payment Failed</span>
            </div>
          </div>

          <!-- Reference -->
          <div v-if="paymentRef" class="mb-3 p-2.5 bg-gray-50 rounded-xl">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-[10px] text-gray-400 uppercase tracking-wider">Reference</p>
                <p class="text-xs font-mono font-medium text-gray-700">{{ paymentRef }}</p>
              </div>
              <button @click="copyReference" class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-all" title="Copy reference">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Scan Instructions (only show when pending) -->
          <div v-if="paymentStatus === 'pending' || !paymentStatus" class="text-center space-y-1">
            <p class="text-xs text-gray-500 font-medium">Scan with any Cambodian banking app</p>
            <p class="text-[10px] text-gray-400">Bakong • ABA • ACLEDA • Wing • Sathapana</p>
          </div>

          <!-- Error with Retry -->
          <div v-if="error" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
            <p class="text-xs text-red-600 mb-2">{{ error }}</p>
            <button
              @click="handleRetry"
              class="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all duration-200 active:scale-95"
            >
              Try Again
            </button>
          </div>

          <!-- Cancel Button (only when pending) -->
          <div v-if="paymentStatus === 'pending' && paymentRef" class="mt-3 text-center">
            <button
              @click="emit('cancel')"
              class="text-xs text-gray-400 hover:text-red-500 transition-colors duration-200 underline underline-offset-2"
            >
              Cancel Order
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.khqr-card-wrapper {
  animation: card-fade-in 0.3s ease-out;
}

@keyframes card-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
