<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import html2canvas from 'html2canvas'
import { useToastStore } from '@/stores/toast'

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

const toast = useToastStore()

const showCard = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const khqrCaptureRef = ref<HTMLElement | null>(null)
const qrContainerRef = ref<HTMLElement | null>(null)
const checkoutBtnRef = ref<HTMLElement | null>(null)

// ─── Mobile detection ───────────────────────────────────────
const isMobile = ref(window.innerWidth < 640)
function onResize() {
  isMobile.value = window.innerWidth < 640
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// ─── Circular progress (header timer ring) ──────────────────
const progressPercent = computed(() => {
  if (!props.timeLeft || props.timeLeft <= 0) return 0
  return Math.round((props.timeLeft / 300) * 100)
})

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
}

function handleRetry() {
  emit('retry')
}

// ─── Download success sound ────────────────────────────────
function playDownloadSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    // Pleasant ascending chime
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

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1108.73, now + 0.08)
    gain2.gain.setValueAtTime(0.15, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.5)
  } catch { /* silent */ }
}

// ─── Check if native share + files are available ──────────
const canShare = computed(() => {
  try {
    return !!navigator.share && !!navigator.canShare &&
      navigator.canShare({ files: [new File([''], 't.png', { type: 'image/png' })] })
  } catch { return false }
})

// ─── Capture the clean KHQR content (header + merchant/amount + QR) ──
//     Excludes action buttons (pay/scan/download/share/cancel) from the output.
async function captureKHQRCanvas(): Promise<HTMLCanvasElement | null> {
  if (!khqrCaptureRef.value) return null
  try {
    return await html2canvas(khqrCaptureRef.value, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#ffffff',
    })
  } catch { return null }
}

// ─── Share card via native share sheet ─────────────────────
async function handleShareQR() {
  const canvas = await captureKHQRCanvas()
  if (!canvas) return
  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    )
    if (!blob) return
    const file = new File(
      [blob],
      'khqr-payment-' + props.merchantName.replace(/\s+/g, '-').toLowerCase() + '.png',
      { type: 'image/png' }
    )
    await navigator.share({
      title: 'KHQR Payment - ' + props.merchantName,
      text: 'Pay $' + props.amount.toFixed(2) + ' with any Cambodian banking app',
      files: [file],
    })
    toast.success('KHQR card shared successfully')
  } catch (err: any) {
    // User cancelled share — not an error
    if (err?.name !== 'AbortError') {
      toast.error('Failed to share: ' + (err?.message || 'unknown error'))
    }
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

    <!-- ─── KHQR CARD (when shown) ─── -->
    <template v-if="showCard">
      <!-- Mobile: backdrop overlay -->
      <div
        v-if="isMobile"
        class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        @click="emit('cancel')"
      ></div>

      <!-- Card (shared between mobile + desktop) -->
      <div
        ref="cardRef"
        :class="[
          isMobile
            ? 'fixed inset-x-0 bottom-0 z-50 bottom-sheet-up'
            : 'mx-auto max-w-sm'
        ]"
      >
        <div
          class="bg-white overflow-hidden border border-gray-100"
          :class="isMobile ? 'rounded-t-2xl shadow-2xl' : 'rounded-2xl shadow-2xl'"
        >
          <!-- ═══ CAPTURE CONTENT (header + merchant/amount + QR) ═══ -->
          <!--     This section is captured by html2canvas for download/share.
               It contains ONLY the KHQR header, merchant name, amount, and QR code.
               Action buttons (pay/scan/download/share/cancel) stay OUTSIDE this ref
               so they never appear in the downloaded image. -->
          <div ref="khqrCaptureRef">
            <!-- Red Header with KHQR icon -->
            <div class="bg-gradient-to-r from-red-600 to-red-500 px-6 pt-6 pb-5 text-center relative overflow-hidden">
              <div class="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5"></div>
              <div class="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5"></div>
              <div class="flex justify-center">
                <img
                  src="https://checkout.payway.com.kh/images/khqr-icon.svg"
                  alt="KHQR"
                  class="w-14 h-14 brightness-0 invert"
                />
              </div>
              <div v-if="timeLeft !== undefined && timeLeft !== null" class="absolute top-3 right-3">
                <svg class="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <path class="text-white/20" fill="none" stroke="currentColor" stroke-width="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    :class="isUrgent ? 'text-red-300 animate-pulse' : 'text-white/90'"
                    fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                    :stroke-dasharray="`${progressPercent}, 100`"
                    class="transition-all duration-1000 ease-linear"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            </div>

            <!-- Dashed Separator -->
            <div class="relative px-6">
              <div class="border-t-2 border-dashed border-gray-200 -mx-6"></div>
              <div class="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-gray-50"></div>
              <div class="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gray-50"></div>
            </div>

            <!-- White Body: Merchant + Amount + QR -->
            <div class="px-6 pb-5 pt-4 bg-white">
              <div class="flex items-center justify-between mb-4">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-bold text-gray-800 truncate">{{ merchantName }}</p>
                </div>
                <div class="text-right shrink-0 ml-4">
                  <p class="text-xl font-extrabold text-gray-900">${{ amount.toFixed(2) }}</p>
                </div>
              </div>
              <div ref="qrContainerRef" class="flex justify-center">
                <div class="relative p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div class="w-52 h-52 flex items-center justify-center">
                    <template v-if="loading">
                      <div class="text-center">
                        <svg class="w-10 h-10 mx-auto text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p class="text-[10px] text-gray-400 mt-2">Generating QR...</p>
                      </div>
                    </template>
                    <template v-else-if="qrImage">
                      <img :src="qrImage" alt="KHQR Code" class="w-full h-full object-contain" />
                    </template>
                    <template v-else>
                      <div class="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <img src="https://checkout.payway.com.kh/images/usd-khqr-logo.svg" alt="USD-KHQR" class="w-24 h-24 opacity-30" />
                      </div>
                    </template>
                  </div>
                  <div v-if="qrImage" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center p-1.5">
                      <img src="https://checkout.payway.com.kh/images/usd-khqr-logo.svg" alt="USD-KHQR" class="w-full h-full" />
                    </div>
                  </div>
                </div>
              </div>
              <!-- Powered By footer (captured) -->
              <p class="text-center text-[10px] text-gray-400 mt-4 font-medium">
                Powered by VidTopUp Store
              </p>
            </div>
          </div>

          <!-- ═══ NON-CAPTURED CONTENT (action buttons only, never in download) ═══ -->
          <div class="px-6 pb-5 bg-white">
            <!-- Payment Status Indicator -->
            <div v-if="paymentStatus && paymentStatus !== 'pending'" class="mb-3">
              <div v-if="paymentStatus === 'paid'" class="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-sm font-semibold text-emerald-700">Payment Received!</span>
              </div>
              <div v-if="paymentStatus === 'failed'" class="flex items-center justify-center gap-2 p-2.5 bg-red-50 rounded-xl border border-red-200">
                <div class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span class="text-sm font-semibold text-red-700">Payment Failed</span>
              </div>
            </div>

            <!-- Three-row Actions Section (only show when pending) -->
            <div v-if="paymentStatus === 'pending' || !paymentStatus" class="text-center space-y-3">
              <p class="text-xs text-gray-500 font-medium">Pay with any Cambodian banking app</p>
              <div class="flex items-center gap-3">
                <div class="flex-1 h-px bg-gray-200"></div>
                <span class="text-[10px] text-gray-300 uppercase tracking-wider font-medium">or</span>
                <div class="flex-1 h-px bg-gray-200"></div>
              </div>
              <div class="flex items-center justify-center gap-2">
                <button
                  @click="handleDownloadQR"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group"
                >
                  <img
                    src="https://checkout.payway.com.kh/images/download-icon-khqr.svg"
                    alt="Download"
                    class="w-4 h-4 opacity-50 group-hover:opacity-80 transition-opacity"
                  />
                  <span class="text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Download QR</span>
                </button>
                <button
                  v-if="canShare"
                  @click="handleShareQR"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group"
                >
                  <svg class="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span class="text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Share</span>
                </button>
              </div>
            </div>

            <!-- Error with Retry -->
            <div v-if="error" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
              <p class="text-xs text-red-600 mb-2">{{ error }}</p>
              <button @click="handleRetry" class="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-all duration-200 active:scale-95">
                Try Again
              </button>
            </div>

            <!-- Cancel Button (only when pending) -->
            <div v-if="paymentStatus === 'pending' && paymentRef" class="mt-3 text-center">
              <button @click="emit('cancel')" class="text-xs text-gray-400 hover:text-red-500 transition-colors duration-200 underline underline-offset-2">
                Cancel Order
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Mobile: drag handle (outside capture ref) -->
      <div v-if="isMobile" class="flex justify-center py-3 bg-white">
        <div class="w-10 h-1 rounded-full bg-gray-300"></div>
      </div>
    </template>
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

/* ─── Mobile bottom-sheet animation ─── */
@media (max-width: 639px) {
  .bottom-sheet-up {
    animation: slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
}


</style>
