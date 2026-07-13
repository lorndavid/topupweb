<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const gameStore = useGameStore()
const toast = useToastStore()
const processing = ref(false)

const order = computed(() => gameStore.currentOrder)

if (!order.value) {
  router.replace('/')
}

async function proceedToPayment() {
  if (!order.value) return

  processing.value = true
  try {
    router.push('/payment')
  } catch (err) {
    toast.error('Failed to proceed to payment')
    processing.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back Button -->
    <button
      @click="router.back()"
      class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-6 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <div class="animate-fade-in" v-if="order">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100">Order Summary</h1>
        <p class="mt-1 text-surface-500 dark:text-surface-400">Please review your order before proceeding to payment.</p>
      </div>

      <!-- Order Details -->
      <div class="card p-6 space-y-5">
        <!-- Game Info -->
        <div class="flex items-center gap-4 pb-5 border-b border-surface-200 dark:border-surface-700">
          <div class="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
            <svg class="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">Game</p>
            <p class="font-semibold text-surface-900 dark:text-surface-100">{{ order.gameName }}</p>
          </div>
        </div>

        <!-- Package -->
        <div class="flex items-center justify-between pb-5 border-b border-surface-200 dark:border-surface-700">
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">Package</p>
            <p class="font-semibold text-surface-900 dark:text-surface-100">{{ order.productName }}</p>
          </div>
          <span class="text-lg font-bold text-primary-500 dark:text-primary-400">
            ${{ order.amount.toFixed(2) }}
          </span>
        </div>

        <!-- Player ID -->
        <div class="flex items-center justify-between pb-5 border-b border-surface-200 dark:border-surface-700">
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">Player ID</p>
            <p class="font-mono font-semibold text-surface-900 dark:text-surface-100">{{ order.playerId }}</p>
          </div>
          <button class="text-xs text-primary-500 hover:text-primary-600 font-medium">
            Edit
          </button>
        </div>

        <!-- Server ID (if present) -->
        <div v-if="order.serverId" class="flex items-center justify-between pb-5 border-b border-surface-200 dark:border-surface-700">
          <div>
            <p class="text-sm text-surface-500 dark:text-surface-400">Server ID</p>
            <p class="font-mono font-semibold text-surface-900 dark:text-surface-100">{{ order.serverId }}</p>
          </div>
        </div>

        <!-- Total -->
        <div class="flex items-center justify-between pt-2">
          <p class="text-lg font-semibold text-surface-900 dark:text-surface-100">Total</p>
          <p class="text-2xl font-bold text-primary-500 dark:text-primary-400">
            ${{ order.amount.toFixed(2) }}
          </p>
        </div>

        <!-- Payment Info -->
        <div class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-xs text-amber-700 dark:text-amber-400">
          <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <p>Payment is processed through Bakong KHQR. You'll scan the QR code with your banking app to complete the payment.</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          @click="router.back()"
          class="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          @click="proceedToPayment"
          :disabled="processing"
          class="btn-primary flex-1"
        >
          <svg v-if="processing" class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ processing ? 'Processing...' : 'Proceed to Payment' }}
        </button>
      </div>
    </div>
  </div>
</template>
