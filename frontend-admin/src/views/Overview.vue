<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import type { DashboardStats, AdminOrder } from '@/types'
import { formatUSD, formatNumber, timeAgo, getStatusBadgeClass, getStatusLabel } from '@/utils/formatters'
import AppIcon from '@/components/ui/AppIcon.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import RevenueChart from '@/components/charts/RevenueChart.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const router = useRouter()
const toast = useToastStore()
const stats = ref<DashboardStats | null>(null)
const recentOrders = ref<AdminOrder[]>([])
const loading = ref(true)
const refreshing = ref(false)

async function fetchData() {
  try {
    refreshing.value = !loading.value
    const data = await adminApi.getDashboard()
    stats.value = data

    // Fetch recent orders
    const orderData = await adminApi.getOrders({ limit: 5, status: '' })
    recentOrders.value = orderData.orders || []
  } catch (err) {
    toast.error('Failed to load dashboard', err instanceof Error ? err.message : 'Unknown error')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function handleRowClick(order: AdminOrder) {
  router.push(`/orders?search=${order.reference}`)
}

onMounted(fetchData)
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Dashboard Overview</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor your store's performance at a glance</p>
      </div>
      <button
        class="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        :class="refreshing ? 'opacity-50 cursor-not-allowed' : ''"
        :disabled="refreshing"
        @click="fetchData"
      >
        <svg class="w-3.5 h-3.5" :class="refreshing ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
    </div>

    <!-- Dashboard content -->
    <template v-if="stats">
      <!-- Stats cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-fade-in">
        <StatsCard
          title="Total Revenue"
          :value="formatUSD(stats.total_revenue)"
          icon="dollar"
          accent="primary"
          :trend="stats.today_revenue > 0 ? 'up' : 'neutral'"
          :trend-value="'$' + stats.today_revenue.toFixed(2) + ' today'"
        />
        <StatsCard
          title="Total Orders"
          :value="formatNumber(stats.total_orders)"
          icon="orders"
          accent="info"
          :trend="stats.orders_by_status.completed > 0 ? 'up' : 'neutral'"
          :trend-value="stats.today_orders + ' today'"
        />
        <StatsCard
          title="Completed"
          :value="formatNumber(stats.orders_by_status.completed)"
          icon="check"
          accent="success"
          :trend-value="stats.orders_by_status.completed > 0 ? (stats.orders_by_status.completed / stats.total_orders * 100).toFixed(1) + '% success rate' : ''"
        />
        <StatsCard
          title="Awaiting Stock"
          :value="formatNumber(stats.orders_by_status.awaiting_stock)"
          icon="clock"
          accent="warning"
          :trend="stats.orders_by_status.awaiting_stock > 0 ? 'down' : 'neutral'"
          :trend-value="stats.orders_by_status.awaiting_stock > 0 ? 'Needs attention' : 'All fulfilled'"
        />
      </div>

      <!-- Charts + quick actions -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Revenue chart -->
        <div class="lg:col-span-2">
          <RevenueChart
            :labels="stats.revenue_chart?.labels || []"
            :values="stats.revenue_chart?.values || []"
          />
        </div>

        <!-- Quick actions -->
        <div>
          <div class="card p-5">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
            <div class="space-y-2">
              <button
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                @click="router.push('/orders')"
              >
                <AppIcon name="clipboard" :size="18" />
                <span>View All Orders</span>
              </button>
              <button
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                @click="router.push('/products')"
              >
                <AppIcon name="tag" :size="18" />
                <span>Manage Products</span>
              </button>
              <button
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                @click="router.push('/profit-settings')"
              >
                <AppIcon name="dollar" :size="18" />
                <span>Set Profit Margins</span>
              </button>
              <button
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                @click="router.push('/games')"
              >
                <AppIcon name="gamepad" :size="18" />
                <span>Manage Games</span>
              </button>
            </div>
          </div>

          <!-- Order status breakdown -->
          <div class="card p-5 mt-4">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Order Status</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">Completed</span>
                <span class="font-semibold text-success-600 dark:text-success-400">{{ stats.orders_by_status.completed }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">Processing</span>
                <span class="font-semibold text-info-600 dark:text-info-400">{{ stats.orders_by_status.processing }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">Awaiting Stock</span>
                <span class="font-semibold text-warning-600 dark:text-warning-400">{{ stats.orders_by_status.awaiting_stock }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">Failed</span>
                <span class="font-semibold text-danger-600 dark:text-danger-400">{{ stats.orders_by_status.failed }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">Cancelled</span>
                <span class="font-semibold text-slate-600 dark:text-slate-400">{{ stats.orders_by_status.cancelled }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent orders table -->
      <div>
        <div class="card overflow-hidden">
          <div class="card-header">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Recent Orders</h3>
            <button
              class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              @click="router.push('/orders')"
            >
              View all →
            </button>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Game</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in recentOrders"
                  :key="order.reference"
                  class="cursor-pointer"
                  @click="handleRowClick(order)"
                >
                  <td class="font-mono text-xs">{{ order.reference }}</td>
                  <td>{{ order.game_name }}</td>
                  <td class="text-xs">{{ order.product_name }}</td>
                  <td class="font-medium">{{ formatUSD(order.amount) }}</td>
                  <td>
                    <span :class="getStatusBadgeClass(order.order_status)">{{ getStatusLabel(order.order_status) }}</span>
                  </td>
                  <td class="text-xs text-slate-400">{{ timeAgo(order.created_at) }}</td>
                </tr>
                <tr v-if="recentOrders.length === 0">
                  <td colspan="6" class="text-center py-8 text-sm text-slate-400">No orders yet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
