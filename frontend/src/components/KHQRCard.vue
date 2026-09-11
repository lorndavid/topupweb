<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import html2canvas from 'html2canvas'
import { useToastStore } from '@/stores/toast'
import { ANIM_TIMING } from '@/composables/useAnimationTiming'

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const props = withDefaults(
  defineProps<{
    merchantName: string
    productLabel?: string
    amount: number
    qrImage?: string
    paymentRef?: string
    loading?: boolean
    error?: string | null
    paymentStatus?: 'pending' | 'scanned' | 'paid' | 'failed'
    timeLeft?: number
    isUrgent?: boolean
  }>(),
  {
    productLabel: '',
    qrImage: '',
    paymentRef: '',
    loading: false,
    error: null,
    paymentStatus: 'pending',
    timeLeft: undefined,
    isUrgent: false,
  }
)

const emit = defineEmits<{
  checkout: []
  retry: []
  cancel: []
}>()

const toast = useToastStore()

const showCard = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const khqrCaptureRef = ref<HTMLElement | null>(null)
const qrContainerRef = ref<HTMLElement | null>(null)
const checkoutBtnRef = ref<HTMLElement | null>(null)
const copied = ref(false)

// ─── Mobile detection ───────────────────────────────────────
const isMobile = ref(window.innerWidth < 640)
function onResize() {
  isMobile.value = window.innerWidth < 640
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// ─── Expiry countdown ───────────────────────────────────────
const countdownDisplay = computed(() => {
  if (props.timeLeft === undefined || props.timeLeft === null) return null
  return formatCountdown(props.timeLeft)
})

const isExpired = computed(() => {
  return props.timeLeft !== undefined && props.timeLeft !== null && props.timeLeft <= 0
})

// Per CutLuy docs: never leave a live QR on screen after it is paid,
// expired, or scanned — swap the QR for a status panel instead.
const showQr = computed(() => {
  return !props.error && props.paymentStatus === 'pending' && !isExpired.value
})

// ─── Copy reference ─────────────────────────────────────────
async function copyReference() {
  if (!props.paymentRef) return
  try {
    await navigator.clipboard.writeText(props.paymentRef)
    copied.value = true
    toast.success('Reference copied to clipboard')
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    toast.error('Failed to copy')
  }
}

// ─── Checkout ───────────────────────────────────────────────
function handleCheckout() {
  if (showCard.value) return
  if (checkoutBtnRef.value) {
    gsap.to(checkoutBtnRef.value, { scale: 0.95, duration: 0.1 })
  }
  showCard.value = true
  emit('checkout')

  // Desktop: GSAP fade-in animation
  if (!isMobile.value) {
    nextTick(() => {
      if (cardRef.value) {
        gsap.fromTo(
          cardRef.value,
          { opacity: 0, y: 30, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: ANIM_TIMING.enterDuration, ease: 'back.out(1.7)' }
        )
      }
      if (qrContainerRef.value) {
        gsap.fromTo(
          qrContainerRef.value,
          { opacity: 0, scale: 0.85 },
          { opacity: 1, scale: 1, duration: ANIM_TIMING.enterDuration, delay: 0.25, ease: 'back.out(1.7)' }
        )
      }
    })
  }
}

function handleRetry() {
  emit('retry')
}

// ─── Download success chime ────────────────────────────────
function playDownloadSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    gain1.gain.setValueAtTime(0.2, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.4)
  } catch {
    /* silent */
  }
}

// ─── Capture the clean KHQR content (header + merchant/amount + QR) ──
//     Excludes action buttons from the downloaded image.
async function captureKHQRCanvas(): Promise<HTMLCanvasElement | null> {
  if (!khqrCaptureRef.value) return null
  try {
    return await html2canvas(khqrCaptureRef.value, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#ffffff',
    })
  } catch {
    return null
  }
}

// ─── Download clean KHQR card as image ───────────────────────
async function handleDownloadQR() {
  const canvas = await captureKHQRCanvas()
  if (!canvas) return
  try {
    const link = document.createElement('a')
    const name = props.merchantName.replace(/\s+/g, '-').toLowerCase()
    link.download = 'khqr-payment-' + name + '.png'
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    playDownloadSound()
    toast.success('KHQR card downloaded successfully')
  } catch {
    // silent
  }
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
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M14 14h3v3h-3zM17 17h4v4h-4z" />
          </svg>
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

    <!-- ─── KHQR CARD (when shown) ─── -->
    <!-- Mobile: backdrop overlay with fade transition -->
    <Transition name="khqr-bg">
      <div
        v-if="showCard && isMobile"
        key="backdrop"
        class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        @click="emit('cancel')"
      ></div>
    </Transition>

    <!-- Card (shared between mobile + desktop) with slide-up transition -->
    <Transition name="khqr-bs">
      <div
        v-if="showCard"
        key="card"
        ref="cardRef"
        :class="[
          isMobile
            ? 'fixed inset-x-0 bottom-0 z-50 flex justify-center'
            : 'mx-auto w-full max-w-[360px]',
        ]"
      >
        <div
          class="w-full max-w-[360px] overflow-hidden rounded-[2rem] bg-white font-sans shadow-2xl"
          :class="isMobile ? 'rounded-b-none pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]' : ''"
        >
          <!-- ═══ CAPTURE CONTENT (header + merchant/amount + QR) ═══ -->
          <div ref="khqrCaptureRef" class="bg-white">
            <!-- 1. Red KHQR header: centered wordmark + close button -->
            <div class="relative flex h-14 items-center justify-center bg-[#e41e26] px-6">
              <button
                aria-label="Close"
                class="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                @click="emit('cancel')"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
              <span class="select-none text-2xl font-black italic tracking-wide text-white drop-shadow-sm">KHQR</span>
            </div>

            <!-- 2. Merchant/product + amount, dashed "tear" line, folded corner -->
            <div class="relative border-b border-dashed border-gray-300 px-6 pt-4 pb-3">
              <div
                class="absolute -top-px right-0 h-0 w-0 border-t-[24px] border-l-[24px] border-l-transparent border-t-[#e41e26]"
                aria-hidden="true"
              ></div>
              <div class="flex items-center gap-2">
                <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-gray-900">
                  <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 class="truncate text-sm text-slate-700">{{ productLabel || merchantName }}</h3>
              </div>
              <div class="flex items-end gap-2">
                <h2 class="text-2xl font-bold text-gray-800">{{ amount.toFixed(2) }}</h2>
                <span class="mb-1 text-sm font-medium text-slate-600">USD</span>
              </div>
            </div>

            <!-- 3. QR / status area -->
            <div class="flex min-h-[240px] flex-col items-center justify-center px-6 pb-8">
              <div class="flex w-full flex-col items-center">
                <!-- QR (only while payment is pending & unscanned) -->
                <div v-if="showQr" ref="qrContainerRef" class="relative mt-5 aspect-square w-full">
                  <template v-if="loading">
                    <div class="flex h-full w-full items-center justify-center">
                      <div class="text-center">
                        <svg class="mx-auto h-10 w-10 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p class="mt-2 text-[10px] text-gray-400">Generating QR...</p>
                      </div>
                    </div>
                  </template>
                  <template v-else-if="qrImage">
                    <img :src="qrImage" alt="KHQR Code" class="h-full w-full object-contain" />
                    <!-- KHQR medallion — only rendered while the QR shows -->
                    <div class="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-gray-900 text-sm font-bold text-white">
                        $
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="flex h-full w-full items-center justify-center rounded-xl bg-gray-50">
                      <svg class="h-16 w-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                        <path d="M14 14h3v3h-3zM17 17h4v4h-4z" />
                      </svg>
                    </div>
                  </template>
                </div>

                <!-- Status panels (replace the QR — never show a live QR
                     after scanned/paid/expired/failed) -->
                <div v-else class="mt-5 w-full">
                  <!-- Scanned -->
                  <div v-if="paymentStatus === 'scanned' && !isExpired" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                    <div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                      <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p class="text-base font-bold text-emerald-700">QR Scanned</p>
                    <p class="mt-1 text-xs text-emerald-600">Confirm the payment in your banking app</p>
                  </div>

                  <!-- Paid -->
                  <div v-else-if="paymentStatus === 'paid'" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                    <div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                      <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p class="text-base font-bold text-emerald-700">Payment Received</p>
                    <p class="mt-1 text-xs text-emerald-600">Processing your top-up…</p>
                  </div>

                  <!-- Expired -->
                  <div v-else-if="isExpired" class="rounded-2xl border border-orange-200 bg-orange-50 p-6 text-center">
                    <div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-500">
                      <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" stroke-width="2" />
                        <path stroke-linecap="round" stroke-width="2" d="M12 7v5l3 3" />
                      </svg>
                    </div>
                    <p class="text-base font-bold text-orange-700">Payment Expired</p>
                    <p class="mt-1 text-xs text-orange-600">This QR code is no longer valid</p>
                  </div>

                  <!-- Failed -->
                  <div v-else-if="paymentStatus === 'failed'" class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500">
                      <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p class="text-base font-bold text-red-700">Payment Failed</p>
                    <p class="mt-1 text-xs text-red-600">Something went wrong — please try again</p>
                  </div>

                  <!-- Error -->
                  <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500">
                      <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p class="text-sm font-bold text-red-700">Something went wrong</p>
                    <p class="mt-1 text-xs text-red-600">{{ error }}</p>
                  </div>
                </div>

                <!-- Expiry pill (rounded, pulsing green dot) -->
                <div
                  v-if="showQr && countdownDisplay !== null"
                  class="mt-3 flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1"
                >
                  <div
                    class="h-1.5 w-1.5 rounded-full bg-green-500"
                    :class="isUrgent ? 'animate-pulse bg-red-500' : 'animate-pulse'"
                  ></div>
                  <span class="text-xs font-medium text-gray-600">
                    <template v-if="isUrgent">Expires in {{ countdownDisplay }}</template>
                    <template v-else>Expires in {{ countdownDisplay }}</template>
                  </span>
                </div>
                <div
                  v-else-if="showQr"
                  class="mt-3 flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1"
                >
                  <div class="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></div>
                  <span class="text-xs font-medium text-gray-600">Waiting for payment…</span>
                </div>

                <!-- Reference + copy -->
                <button
                  v-if="paymentRef"
                  @click="copyReference"
                  class="group mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 transition-colors hover:text-gray-600"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="!copied" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="font-mono">{{ paymentRef }}</span>
                  <span class="underline underline-offset-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {{ copied ? 'Copied' : 'Copy' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Powered-by footer (captured) -->
            <p class="pb-4 text-center text-[10px] font-medium text-gray-400">
              Powered by VidTopUp Store
            </p>
          </div>

          <!-- ═══ NON-CAPTURED CONTENT (action buttons only) ═══ -->
          <div class="bg-white px-6 pb-5">
            <!-- Pending actions -->
            <div v-if="paymentStatus === 'pending' && !isExpired" class="space-y-3 text-center">
              <p class="text-xs font-medium text-gray-500">Scan with any KHQR-enabled banking app</p>
              <div class="flex items-center justify-center">
                <button
                  @click="handleDownloadQR"
                  class="group inline-flex items-center gap-2 rounded-xl border-2 border-red-500/20 bg-red-50 px-5 py-2.5 transition-all duration-200 hover:border-red-500/40 hover:bg-red-100"
                >
                  <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span class="text-sm font-semibold text-red-600 transition-colors group-hover:text-red-700">Download QR</span>
                </button>
              </div>
            </div>

            <!-- Expired state with retry -->
            <div v-else-if="isExpired" class="text-center">
              <button
                @click="handleRetry"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-600 active:scale-95"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>

            <!-- Failed state with retry -->
            <div v-else-if="paymentStatus === 'failed'" class="text-center">
              <button
                @click="handleRetry"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-600 active:scale-95"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>

            <!-- Cancel (only while pending & unscanned) -->
            <div v-if="paymentStatus === 'pending' && paymentRef && !isExpired" class="mt-3 text-center">
              <button @click="emit('cancel')" class="text-xs text-gray-400 underline underline-offset-2 transition-colors duration-200 hover:text-red-500">
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mobile: drag handle (outside capture ref) -->
    <div v-if="showCard && isMobile" class="flex justify-center bg-white py-3">
      <div class="h-1 w-10 rounded-full bg-gray-300"></div>
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

/* ─── Unified mobile bottom-sheet enter/leave transitions ─── */
@media (max-width: 639px) {
  /* Backdrop fade */
  .khqr-bg-enter-active {
    transition: opacity var(--anim-backdrop-duration) ease-out;
  }
  .khqr-bg-leave-active {
    transition: opacity var(--anim-leave-duration) var(--anim-leave-ease);
  }
  .khqr-bg-enter-from,
  .khqr-bg-leave-to {
    opacity: 0;
  }
  .khqr-bg-enter-to {
    opacity: 1;
  }

  /* Bottom sheet slide (includes opacity) */
  .khqr-bs-enter-active {
    transition: transform var(--anim-enter-duration) var(--anim-enter-ease),
                opacity var(--anim-enter-duration) var(--anim-enter-ease);
  }
  .khqr-bs-leave-active {
    transition: transform var(--anim-leave-duration) var(--anim-leave-ease),
                opacity var(--anim-leave-duration) var(--anim-leave-ease);
  }
  .khqr-bs-enter-from {
    transform: translateY(100%);
    opacity: 0;
  }
  .khqr-bs-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }
  .khqr-bs-enter-to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Desktop: GSAP handles the enter animation */
</style>
