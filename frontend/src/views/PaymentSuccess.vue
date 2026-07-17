<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import { formatPrice } from '@/composables/useCurrency'

const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()
const toast = useToastStore()

const reference = ref(route.query.reference as string || '')
const amount = ref(parseFloat(route.query.amount as string || '0'))

// ─── Confetti colors ────────────────────────────────────────
const confettiColors = ['#10B981', '#34D399', '#6EE7B7', '#FCD34D', '#F472B6', '#818CF8', '#FBBF24', '#60A5FA', '#A78BFA']
const confettiCount = 40

// Generate stable random values per index
function confettiStyle(i: number) {
  const left = ((i * 37 + 13) % 100)
  const delay = ((i * 7) % 30) / 10
  const duration = 2 + ((i * 3) % 20) / 10
  const size = 8 + ((i * 5) % 12)
  return {
    left: `${left}%`,
    top: `-${((i * 11) % 20)}%`,
    backgroundColor: confettiColors[i % confettiColors.length],
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: i % 3 === 0 ? '50%' : '2px',
  }
}

onMounted(() => {
  if (reference.value) {
    toast.success(i18n.t('success.toast.message'))
    setTimeout(() => {
      router.push(`/order/${reference.value}`)
    }, 3000)
  }
  // Play success chime
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain()
    osc1.type = 'sine'; osc1.frequency.setValueAtTime(523, now); gain1.gain.setValueAtTime(0.2, now); gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    osc1.connect(gain1); gain1.connect(ctx.destination); osc1.start(now); osc1.stop(now + 0.4)
    const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(659, now + 0.12); gain2.gain.setValueAtTime(0.2, now + 0.12); gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
    osc2.connect(gain2); gain2.connect(ctx.destination); osc2.start(now + 0.12); osc2.stop(now + 0.5)
    const osc3 = ctx.createOscillator(); const gain3 = ctx.createGain()
    osc3.type = 'sine'; osc3.frequency.setValueAtTime(784, now + 0.24); gain3.gain.setValueAtTime(0.15, now + 0.24); gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
    osc3.connect(gain3); gain3.connect(ctx.destination); osc3.start(now + 0.24); osc3.stop(now + 0.6)
  } catch { /* silent */ }
})
</script>

<template>
  <div class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-surface-950 dark:to-teal-950/30">
    <!-- Confetti Layer -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        v-for="i in confettiCount" :key="i"
        class="absolute animate-confetti"
        :style="confettiStyle(i)"
      ></div>
    </div>

    <div class="relative z-10 max-w-lg mx-auto px-4 py-16 text-center">
      <!-- Animated checkmark -->
      <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6 animate-bounce-in shadow-lg shadow-emerald-500/10">
        <svg class="w-14 h-14 text-emerald-500 animate-draw-check" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 class="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-surface-100 mb-3 animate-fade-in">
        {{ i18n.t('success.title') }}
      </h1>

      <p class="text-surface-500 dark:text-surface-400 mb-2 animate-fade-in" style="animation-delay: 0.2s;">
        {{ i18n.t('success.message') }}
      </p>

      <!-- Amount -->
      <p v-if="amount > 0" class="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-6 animate-scale-in">
        {{ formatPrice(amount).formatted }}
      </p>

      <!-- Spinner + Reference -->
      <div class="animate-fade-in" style="animation-delay: 0.4s;">
        <div class="w-8 h-8 mx-auto border-[3px] border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
        <p v-if="reference" class="mt-4 text-sm text-surface-400 dark:text-surface-500 font-mono">
          {{ i18n.t('success.reference') }}: {{ reference }}
        </p>
        <p class="mt-2 text-xs text-surface-400 dark:text-surface-500">Redirecting to order status...</p>
      </div>
    </div>
  </div>
</template>
