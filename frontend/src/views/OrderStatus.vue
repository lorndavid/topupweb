<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { getOrder } from '@/services/api'
import type { OrderResponse } from '@/types'
import ReceiptCard from '@/components/ReceiptCard.vue'

const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()

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
        label: i18n.t('order.status.awaiting_payment'),
        pulse: true,
        badge: 'badge-warning',
      }
    case 'paid':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        label: i18n.t('order.status.paid'),
        pulse: true,
        badge: 'badge-primary',
      }
    case 'awaiting_stock':
      return {
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-100 dark:bg-purple-900/20',
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        label: i18n.t('order.status.awaiting_stock'),
        pulse: true,
        badge: 'badge-primary',
      }
    case 'processing':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        label: i18n.t('order.status.processing'),
        pulse: true,
        badge: 'badge-primary',
      }
    case 'completed':
      return {
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/20',
        icon: 'M5 13l4 4L19 7',
        label: i18n.t('order.status.completed'),
        pulse: false,
        badge: 'badge-success',
      }
    case 'failed':
      return {
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/20',
        icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        label: i18n.t('order.status.failed'),
        pulse: false,
        badge: 'badge-error',
      }
    case 'cancelled':
      return {
        color: 'text-surface-500 dark:text-surface-400',
        bg: 'bg-surface-100 dark:bg-surface-800',
        icon: 'M6 18L18 6M6 6l12 12',
        label: i18n.t('order.status.cancelled'),
        pulse: false,
        badge: 'badge-error',
      }
    default:
      return {
        color: 'text-surface-600 dark:text-surface-400',
        bg: 'bg-surface-100 dark:bg-surface-800',
        icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        label: status || i18n.t('order.status.unknown'),
        pulse: false,
        badge: 'badge-warning',
      }
  }
})

async function fetchOrder() {
  if (!reference.value) {
    error.value = i18n.t('order.noReference')
    loading.value = false
    return
  }

  loading.value = true
  error.value = null

  try {
    order.value = await getOrder(reference.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : i18n.t('order.fetchError')
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
      <p class="text-surface-500 dark:text-surface-400">{{ i18n.t('order.loading') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16 animate-fade-in">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-surface-500 dark:text-surface-400 mb-4">{{ error }}</p>
      <button @click="fetchOrder" class="btn-primary text-sm">{{ i18n.t('order.tryAgain') }}</button>
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
        {{ i18n.t('order.backToHome') }}
      </button>

      <!-- Status Header -->
      <div class="card p-6 sm:p-8 text-center mb-6">
        <div :class="['inline-flex items-center justify-center w-20 h-20 rounded-full mb-5', statusConfig.bg]">
          <svg :class="['w-10 h-10', statusConfig.color, { 'animate-pulse': statusConfig.pulse }]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="statusConfig.icon" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">{{ i18n.t('order.topUpPrefix') }} {{ statusConfig.label }}</h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 font-mono">
          Reference: {{ order.reference }}
        </p>
      </div>

      <!-- Order Details -->
      <div class="card p-6 space-y-4">
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('order.game') }}</span>
          <span class="font-medium text-surface-900 dark:text-surface-100">{{ order.game_name }}</span>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('order.package') }}</span>
          <span class="font-medium text-surface-900 dark:text-surface-100">{{ order.product_name }}</span>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('order.playerId') }}</span>
          <span class="font-mono font-medium text-surface-900 dark:text-surface-100">{{ order.player_id }}</span>
        </div>
        <div v-if="order.server_id" class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('order.server') }}</span>
          <span class="font-mono font-medium text-surface-900 dark:text-surface-100">{{ order.server_id }}</span>
        </div>
        <div v-if="order.order_status === 'awaiting_stock'" class="pb-4 border-b border-surface-200 dark:border-surface-700">
          <div class="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <p class="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>{{ i18n.t('order.awaitingStockTitle') }}</strong><br>
                {{ i18n.t('order.awaitingStockMessage') }}
              </span>
            </p>
          </div>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('order.amount') }}</span>
          <span class="text-lg font-bold text-primary-500 dark:text-primary-400">
            ${{ order.amount.toFixed(2) }}
          </span>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-surface-200 dark:border-surface-700">
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('order.payment') }}</span>
          <span :class="[
            'badge',
            order.payment_status === 'paid' ? 'badge-success' : 'badge-warning'
          ]">
            {{ order.payment_status }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('order.status') }}</span>
          <span :class="['badge', statusConfig.badge]">
            {{ order.order_status }}
          </span>
        </div>
        <div v-if="order.completed_at" class="flex justify-between items-center pt-2">
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ i18n.t('order.completed') }}</span>
          <span class="text-sm text-surface-500 dark:text-surface-400">{{ new Date(order.completed_at).toLocaleString() }}</span>
        </div>
      </div>

      <!-- Receipt (completed or paid orders) -->
      <div
        v-if="order.order_status === 'completed' || order.order_status === 'paid'"
        class="mt-6"
      >
        <ReceiptCard
          :reference="order.reference"
          :game-name="order.game_name"
          :product-name="order.product_name"
          :player-id="order.player_id"
          :server-id="order.server_id || null"
          :amount="order.amount"
          :payment-status="order.payment_status"
          :order-status="order.order_status"
          :created-at="order.created_at"
          :completed-at="order.completed_at || null"
        />
      </div>

      <!-- Actions -->
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <router-link to="/" class="btn-primary flex-1 text-center">
          {{ i18n.t('order.topUpAgain') }}
        </router-link>
        <button @click="fetchOrder" class="btn-secondary flex-1">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ i18n.t('order.refreshStatus') }}
        </button>
      </div>
    </div>
  </div>
</template>
