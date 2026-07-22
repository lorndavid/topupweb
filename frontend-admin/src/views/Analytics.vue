<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import type { AnalyticsData, AnalyticsDaily, AnalyticsByGame } from '@/types'
import { formatUSD, formatNumber } from '@/utils/formatters'
import AppIcon from '@/components/ui/AppIcon.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import RevenueChart from '@/components/charts/RevenueChart.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const toast = useToastStore()

const loading = ref(true)
const analytics = ref<AnalyticsData | null>(null)
const selectedDays = ref(30)
const chartType = ref<'revenue' | 'orders'>('revenue')

const daysOptions = [7, 30, 90, 365]

async function fetchData() {
  loading.value = true
  try {
    analytics.value = await adminApi.getAnalytics(selectedDays.value)
  } catch (err) {
    toast.error('Failed to load analytics', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

const chartData = computed(() => {
  if (!analytics.value) return { labels: [], values: [] }
  const data = analytics.value.daily
  const maxPoints = 90
  const startIdx = data.length > maxPoints ? data.length - maxPoints : 0
  return {
    labels: data.slice(startIdx).map((d) =>
      new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    values: data.slice(startIdx).map((d) =>
      chartType.value === 'revenue' ? d.revenue : d.orders
    ),
  }
})

const topGames = computed(() => {
  if (!analytics.value) return []
  return analytics.value.by_game.slice(0, 5)
})

const maxGameRevenue = computed(() => {
  if (topGames.value.length === 0) return 1
  return Math.max(...topGames.value.map((g) => g.revenue))
})

const totalByGameRevenue = computed(() => {
  if (!analytics.value) return 0
  return analytics.value.by_game.reduce((sum, g) => sum + g.revenue, 0)
})

const orderTrend = computed(() => {
  if (!analytics.value || analytics.value.daily.length < 2) return 'neutral'
  const half = Math.floor(analytics.value.daily.length / 2)
  const firstHalf = analytics.value.daily.slice(0, half).reduce((s, d) => s + d.orders, 0)
  const secondHalf = analytics.value.daily.slice(half).reduce((s, d) => s + d.orders, 0)
  if (secondHalf > firstHalf * 1.1) return 'up'
  if (secondHalf < firstHalf * 0.9) return 'down'
  return 'neutral'
})

const revenueTrend = computed(() => {
  if (!analytics.value || analytics.value.daily.length < 2) return 'neutral'
  const half = Math.floor(analytics.value.daily.length / 2)
  const firstHalf = analytics.value.daily.slice(0, half).reduce((s, d) => s + d.revenue, 0)
  const secondHalf = analytics.value.daily.slice(half).reduce((s, d) => s + d.revenue, 0)
  if (secondHalf > firstHalf * 1.1) return 'up'
  if (secondHalf < firstHalf * 0.9) return 'down'
  return 'neutral'
})

const periodLabel = computed(() => {
  if (selectedDays.value === 7) return 'Last 7 days'
  if (selectedDays.value === 30) return 'Last 30 days'
  if (selectedDays.value === 90) return 'Last 90 days'
  return 'Last 365 days'
})

const gameColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function getGameColor(index: number): string {
  return gameColors[index % gameColors.length]
}

onMounted(fetchData)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Profit Analytics</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Track revenue, orders, and performance trends</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Period selector -->
        <div class="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
          <button
            v-for="days in daysOptions"
            :key="days"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
            :class="selectedDays === days
              ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
            @click="selectedDays = days; fetchData()"
          >
            {{ days }}d
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <LoadingSkeleton v-for="i in 5" :key="i" type="card" />
      </div>
      <LoadingSkeleton type="card" />
    </div>

    <template v-if="analytics">
      <!-- Summary stat cards -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard
          title="Period Revenue"
          :value="formatUSD(analytics.summary.period_revenue)"
          icon="dollar"
          accent="primary"
          :trend="revenueTrend"
          :trend-value="periodLabel"
        />
        <StatsCard
          title="Period Orders"
          :value="formatNumber(analytics.summary.period_orders)"
          icon="orders"
          accent="info"
          :trend="orderTrend"
          :trend-value="periodLabel"
        />
        <StatsCard
          title="Avg Order Value"
          :value="formatUSD(analytics.summary.avg_order_value)"
          icon="dollar"
          accent="success"
        />
        <StatsCard
          title="All Time Revenue"
          :value="formatUSD(analytics.summary.total_revenue)"
          icon="profit"
          accent="warning"
        />
        <StatsCard
          title="Total Orders"
          :value="formatNumber(analytics.summary.total_orders)"
          icon="orders"
          accent="primary"
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Revenue / Orders chart -->
        <div class="lg:col-span-2">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
                {{ chartType === 'revenue' ? 'Revenue Trend' : 'Orders Trend' }}
              </h3>
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">{{ periodLabel }}</span>
                <button
                  class="px-2 py-1 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-600 transition-colors"
                  :class="chartType === 'revenue'
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'"
                  @click="chartType = 'revenue'"
                >
                  Revenue
                </button>
                <button
                  class="px-2 py-1 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-600 transition-colors"
                  :class="chartType === 'orders'
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'"
                  @click="chartType = 'orders'"
                >
                  Orders
                </button>
              </div>
            </div>
            <div class="h-[280px]">
              <RevenueChart              v-if="chartData.labels.length > 0"
              :labels="chartData.labels"
              :values="chartData.values"
              :prefix="chartType === 'orders' ? '' : '$'"
            />
              <div v-else class="flex items-center justify-center h-full text-sm text-slate-400">
                No data for this period
              </div>
            </div>
          </div>
        </div>

        <!-- Revenue by game (bar chart) -->
        <div>
          <div class="card p-5">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Revenue by Game</h3>
            <div v-if="topGames.length > 0" class="space-y-4">
              <div v-for="(game, idx) in topGames" :key="game.game_code">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="text-slate-700 dark:text-slate-300 truncate text-xs">{{ game.game_name }}</span>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ formatUSD(game.revenue) }}</span>
                    <span class="text-[10px] text-slate-400">{{ game.orders }} orders</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :style="{
                      width: Math.max((game.revenue / (totalByGameRevenue || 1)) * 100, 2) + '%',
                      backgroundColor: getGameColor(idx),
                    }"
                  />
                </div>
              </div>
              <div v-if="analytics.by_game.length > 5" class="pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <p class="text-[10px] text-slate-400 text-center">
                  +{{ analytics.by_game.length - 5 }} more games
                </p>
              </div>
            </div>
            <div v-else class="text-sm text-slate-400 text-center py-8">
              No completed orders in this period
            </div>
          </div>

          <!-- Quick stats -->
          <div class="card p-5 mt-4">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Period Summary</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">Revenue</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ formatUSD(analytics.summary.period_revenue) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">Orders</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ formatNumber(analytics.summary.period_orders) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">Avg. Order</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ formatUSD(analytics.summary.avg_order_value) }}</span>
              </div>
              <div class="border-t border-slate-100 dark:border-slate-700/50 pt-3 flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">All Time Revenue</span>
                <span class="font-semibold text-success-600 dark:text-success-400">{{ formatUSD(analytics.summary.total_revenue) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400">All Time Orders</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ formatNumber(analytics.summary.total_orders) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Per-game detail table -->
      <div class="card overflow-hidden">
        <div class="card-header">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Game Performance Detail</h3>
          <span class="text-xs text-slate-400">{{ periodLabel }}</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Game</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Orders</th>
                <th class="text-right">Avg. Order Value</th>
                <th class="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(game, idx) in analytics.by_game" :key="game.game_code">
                <td>
                  <div class="flex items-center gap-2">
                    <div
                      class="w-3 h-3 rounded-full flex-shrink-0"
                      :style="{ backgroundColor: getGameColor(idx) }"
                    />
                    <span>{{ game.game_name }}</span>
                  </div>
                </td>
                <td class="text-right font-semibold">{{ formatUSD(game.revenue) }}</td>
                <td class="text-right">{{ formatNumber(game.orders) }}</td>
                <td class="text-right text-sm text-slate-500">
                  {{ game.orders > 0 ? formatUSD(game.revenue / game.orders) : '—' }}
                </td>
                <td class="text-right">
                  <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {{ totalByGameRevenue > 0 ? ((game.revenue / totalByGameRevenue) * 100).toFixed(1) + '%' : '—' }}
                  </span>
                </td>
              </tr>
              <tr v-if="analytics.by_game.length === 0">
                <td colspan="5" class="text-center py-8 text-sm text-slate-400">
                  No completed orders in this period
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
