<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useToastStore } from '@/stores/toast'
import { getAdminDashboard, retryOrder } from '@/services/api'
import type { AdminDashboardData } from '@/types'

const router = useRouter()
const i18n = useI18nStore()
const toast = useToastStore()

const loading = ref(true)
const error = ref<string | null>(null)
const dashboard = ref<AdminDashboardData | null>(null)
const retryingRef = ref<string | null>(null)

async function fetchDashboard() {
  loading.value = true
  error.value = null
  try {
    dashboard.value = await getAdminDashboard()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
}

async function handleRetry(reference: string) {
  retryingRef.value = reference
  try {
    await retryOrder(reference)
    toast.success(i18n.t('admin.retrySuccess'))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Retry failed'
    toast.error(msg)
  } finally {
    // Always refresh to show updated retry_count and status
    await fetchDashboard()
    retryingRef.value = null
  }
}

function viewOrder(reference: string) {
  router.push(`/order/${reference}`)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

onMounted(fetchDashboard)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100">
          {{ i18n.t('admin.title') }}
        </h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {{ i18n.t('admin.subtitle') }}
        </p>
      </div>
      <button
        @click="fetchDashboard"
        class="btn-secondary text-sm flex items-center gap-2"
        :disabled="loading"
      >
        <svg
          :class="{ 'animate-spin': loading }"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ i18n.t('common.refresh') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && !dashboard" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="card p-5 animate-pulse">
          <div class="h-4 skeleton w-20 mb-3"></div>
          <div class="h-8 skeleton w-16"></div>
        </div>
      </div>
      <div class="card p-6 animate-pulse">
        <div class="h-6 skeleton w-40 mb-4"></div>
        <div class="h-4 skeleton w-full mb-2"></div>
        <div class="h-4 skeleton w-full mb-2"></div>
        <div class="h-4 skeleton w-3/4"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error && !dashboard" class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-surface-500 dark:text-surface-400 mb-4">{{ error }}</p>
      <button @click="fetchDashboard" class="btn-primary text-sm">{{ i18n.t('common.tryAgain') }}</button>
    </div>

    <!-- Dashboard Content -->
    <template v-else-if="dashboard">
      <!-- Balance Card -->
      <div
        v-if="dashboard.profile"
        class="card p-5 mb-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-primary-100 text-sm font-medium">{{ i18n.t('admin.balance') }}</p>
            <p class="text-3xl font-bold mt-1">
              ${{ dashboard.profile.balance.toFixed(2) }}
            </p>
            <div class="flex items-center gap-4 mt-3 text-primary-100 text-xs">
              <span>{{ i18n.t('admin.username') }}: {{ dashboard.profile.username }}</span>
              <span>{{ i18n.t('admin.totalOrdersProfile') }}: {{ dashboard.profile.total_orders }}</span>
            </div>
          </div>
          <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- No Profile Warning -->
      <div
        v-else
        class="card p-5 mb-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
      >
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-amber-700 dark:text-amber-400">
            {{ i18n.t('admin.noProfile') }}
          </p>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div class="card p-4 text-center">
          <p class="text-2xl font-bold text-surface-900 dark:text-surface-100">{{ dashboard.stats.total_orders }}</p>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">{{ i18n.t('admin.statTotal') }}</p>
        </div>
        <div class="card p-4 text-center border-l-4 border-l-purple-500">
          <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ dashboard.stats.awaiting_stock }}</p>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">{{ i18n.t('admin.statAwaitingStock') }}</p>
        </div>
        <div class="card p-4 text-center border-l-4 border-l-emerald-500">
          <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ dashboard.stats.completed }}</p>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">{{ i18n.t('admin.statCompleted') }}</p>
        </div>
        <div class="card p-4 text-center border-l-4 border-l-blue-500">
          <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ dashboard.stats.processing }}</p>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">{{ i18n.t('admin.statProcessing') }}</p>
        </div>
        <div class="card p-4 text-center border-l-4 border-l-red-500">
          <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ dashboard.stats.failed }}</p>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">{{ i18n.t('admin.statFailed') }}</p>
        </div>
        <div class="card p-4 text-center">
          <p class="text-lg font-bold text-primary-600 dark:text-primary-400">${{ dashboard.stats.total_revenue.toFixed(2) }}</p>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-1">{{ i18n.t('admin.statRevenue') }}</p>
          <p v-if="dashboard.stats.pending_revenue > 0" class="text-xs text-amber-500 mt-1">
            +${{ dashboard.stats.pending_revenue.toFixed(2) }} {{ i18n.t('admin.statPending') }}
          </p>
        </div>
      </div>

      <!-- Awaiting Stock Orders Table -->
      <div class="card overflow-hidden">
        <div class="p-5 border-b border-surface-200 dark:border-surface-700">
          <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ i18n.t('admin.awaitingStockTitle') }}
            <span v-if="dashboard.awaiting_stock_orders.length > 0" class="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {{ dashboard.awaiting_stock_orders.length }}
            </span>
          </h2>
        </div>

        <!-- Empty State -->
        <div v-if="dashboard.awaiting_stock_orders.length === 0" class="p-8 text-center">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/20 mb-3">
            <svg class="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p class="text-surface-500 dark:text-surface-400">{{ i18n.t('admin.noAwaitingStock') }}</p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-surface-50 dark:bg-surface-800/50">
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">{{ i18n.t('admin.tableReference') }}</th>
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">{{ i18n.t('admin.tableGame') }}</th>
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">{{ i18n.t('admin.tablePackage') }}</th>
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">{{ i18n.t('admin.tablePlayer') }}</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400">{{ i18n.t('admin.tableAmount') }}</th>
                <th class="text-center px-4 py-3 font-medium text-surface-500 dark:text-surface-400">{{ i18n.t('admin.tableRetries') }}</th>
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">{{ i18n.t('admin.tableTime') }}</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400">{{ i18n.t('admin.tableActions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
              <tr
                v-for="order in dashboard.awaiting_stock_orders"
                :key="order.reference"
                class="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
              >
                <td class="px-4 py-3">
                  <button
                    @click="viewOrder(order.reference)"
                    class="font-mono text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {{ order.reference }}
                  </button>
                </td>
                <td class="px-4 py-3 text-surface-900 dark:text-surface-100">{{ order.game_name }}</td>
                <td class="px-4 py-3 text-surface-700 dark:text-surface-300">{{ order.product_name }}</td>
                <td class="px-4 py-3">
                  <span class="font-mono text-xs">{{ order.player_id }}</span>
                  <span v-if="order.server_id" class="text-xs text-surface-400 ml-1">({{ order.server_id }})</span>
                </td>
                <td class="px-4 py-3 text-right font-medium">{{ formatCurrency(order.amount) }}</td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="inline-flex items-center gap-1 text-xs"
                    :class="order.retry_count > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-surface-500 dark:text-surface-400'"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {{ order.retry_count }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-surface-400" :title="formatDate(order.created_at)">
                  {{ timeAgo(order.created_at) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      @click="handleRetry(order.reference)"
                      :disabled="retryingRef === order.reference"
                      class="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <svg
                        v-if="retryingRef === order.reference"
                        class="w-3.5 h-3.5 animate-spin mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span v-else>{{ i18n.t('admin.retry') }}</span>
                    </button>
                    <button
                      @click="viewOrder(order.reference)"
                      class="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
                      :title="i18n.t('admin.viewOrder')"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
