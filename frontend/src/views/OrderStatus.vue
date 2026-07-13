<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrder } from '@/services/api'
import type { OrderResponse } from '@/types'

const route = useRoute()
const router = useRouter()

const reference = computed(() => route.params.reference as string)
const order = ref<OrderResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const statusConfig = computed(() => {
  if (!order.value) return { color: '', bg: '', icon: '', label: '', pulse: false, badge: '' }

  const status = order.value.order_status
  switch (status) {
    case 'awaiting_payment':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/20',
        icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        label: 'Awaiting Payment',
        pulse: true,
        badge: 'badge-warning',
      }
    case 'paid':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        label: 'Payment Received - Processing',
        pulse: true,
        badge: 'badge-primary',
      }
    case 'processing':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        label: 'Processing Top-Up',
        pulse: true,
        badge: 'badge-primary',
      }
    case 'completed':
      return {
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/20',
        icon: 'M5 13l4 4L19 7',
        label: 'Completed',
        pulse: false,
        badge: 'badge-success',
      }
    case 'failed':
      return {
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/20',
        icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        label: 'Failed',
        pulse: false,
        badge: 'badge-error',
      }
    default:
      return {
        color: 'text-surface-600 dark:text-surface-400',
        bg: 'bg-surface-100 dark:bg-surface-800',
        icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        label: status || 'Unknown',
        pulse: false,
        badge: 'badge-warning',
      }
  }
})

async function fetchOrder() {
  if (!reference.value) {
    error.value = 'No reference provided'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null

  try {
    order.value = await getOrder(reference.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch order'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOrder()
})
</script>

<template>
  <div class="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 space-y-4 animate-fade-in">
      <div class="w-16 h-16 mx-auto rounded-full border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 animate-spin"></div>
      <p class="text-surface-500 dark:text-surface-400">Loading order details...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16 animate-fade-in">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-surface-500 dark:text-surface-400 mb-4">{{ error }}</p>
      <button @click="fetchOrder" class="btn-primary text-sm">Try Again</button>
    </div>

    <!-- Order Status -->
    <div v-else-if="order" class="animate-fade-in">
      <!-- Back -->
      <button
        @click="router.push('/')"
        class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-6 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Back to Home
      </button>

      <!-- Status Header -->
      <div class="card p-6 sm:p-8 text-center mb-6">
        <div :class="['inline-flex items-center justify-center w-20 h-20 rounded-full mb-5', statusConfig.bg]">
          <svg :class="['w-10 h-10', statusConfig.color]" :class="{ 'animate-pulse': statusConfig.pulse }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="statusConfig.icon" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">Top-Up {{ statusConfig.label }}</h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 font-mono">
          Reference: {{ order.reference }}
        </p>
      </div>

      <!-- Order Details -->
      <div class="card p-6 space-y-4">
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">Game</span>
          <span class="font-medium text-surface-900 dark:text-surface-100">{{ order.game_name }}</span>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">Package</span>
          <span class="font-medium text-surface-900 dark:text-surface-100">{{ order.product_name }}</span>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">Player ID</span>
          <span class="font-mono font-medium text-surface-900 dark:text-surface-100">{{ order.player_id }}</span>
        </div>
        <div v-if="order.server_id" class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">Server</span>
          <span class="font-mono font-medium text-surface-900 dark:text-surface-100">{{ order.server_id }}</span>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">Amount</span>
          <span class="text-lg font-bold text-primary-500 dark:text-primary-400">
            ${{ order.amount.toFixed(2) }}
          </span>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">Payment</span>
          <span :class="[
            'badge',
            order.payment_status === 'paid' ? 'badge-success' : 'badge-warning'
          ]">
            {{ order.payment_status }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-surface-500 dark:text-surface-400">Status</span>
          <span :class="['badge', statusConfig.badge]">
            {{ order.order_status }}
          </span>
        </div>
        <div v-if="order.completed_at" class="flex justify-between items-center pt-2">
          <span class="text-sm text-surface-500 dark:text-surface-400">Completed</span>
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ new Date(order.completed_at).toLocaleString() }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <router-link to="/" class="btn-primary flex-1 text-center">
          Top Up Again
        </router-link>
        <button @click="fetchOrder" class="btn-secondary flex-1">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Status
        </button>
      </div>
    </div>
  </div>
</template>
