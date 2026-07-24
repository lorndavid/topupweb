<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import type { AnalyticsData, PageAnalyticsData, TopGameEntry } from '@/types'
import { formatUSD, formatNumber } from '@/utils/formatters'
import AppIcon from '@/components/ui/AppIcon.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import RevenueChart from '@/components/charts/RevenueChart.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const toast = useToastStore()

const activeTab = ref<'profit' | 'page'>('profit')

// ─── Profit Analytics ─────────────────────────────────
const profitLoading = ref(true)
const analytics = ref<AnalyticsData | null>(null)
const LS_KEY_PROFIT_PERIOD = 'admin_analytics_profit_period'
const profitPeriod = ref<number>(loadProfitPeriod())
const chartType = ref<'revenue' | 'orders'>('revenue')

function loadProfitPeriod(): number {
  try {
    const saved = localStorage.getItem(LS_KEY_PROFIT_PERIOD)
    if (saved) {
      const n = parseInt(saved, 10)
      if (n === 1 || n === 7 || n === 30 || n === -1) return n
    }
  } catch { /* localStorage unavailable */ }
  return 30
}

function saveProfitPeriod(period: number) {
  try {
    localStorage.setItem(LS_KEY_PROFIT_PERIOD, String(period))
  } catch { /* localStorage unavailable */ }
}

const profitPeriodOptions = [
  { id: 1, label: 'Today' },
  { id: 7, label: '7D' },
  { id: 30, label: '30D' },
  { id: -1, label: 'All Time' },
]

async function fetchProfitAnalytics() {
  profitLoading.value = true
  try {
    analytics.value = await adminApi.getAnalytics(profitPeriod.value)
  } catch (err) {
    toast.error('Failed to load analytics', err instanceof Error ? err.message : '')
  } finally {
    profitLoading.value = false
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

const profitPeriodLabel = computed(() => {
  const opt = profitPeriodOptions.find(o => o.id === profitPeriod.value)
  return opt ? opt.label : '30D'
})

// ─── Page Analytics ──────────────────────────────────
const pageLoading = ref(true)
const pageStats = ref<PageAnalyticsData | null>(null)
const LS_KEY_SCOPE = 'admin_analytics_page_scope'
const LS_KEY_PERIOD = 'admin_analytics_page_period'
const pageScope = ref<'all' | 'public' | 'admin'>(loadScope())
const pagePeriod = ref<number>(loadPeriod())

function loadScope(): 'all' | 'public' | 'admin' {
  try {
    const saved = localStorage.getItem(LS_KEY_SCOPE)
    if (saved === 'all' || saved === 'public' || saved === 'admin') return saved
  } catch { /* localStorage unavailable */ }
  return 'all'
}

function saveScope(scope: 'all' | 'public' | 'admin') {
  try {
    localStorage.setItem(LS_KEY_SCOPE, scope)
  } catch { /* localStorage unavailable */ }
}

function loadPeriod(): number {
  try {
    const saved = localStorage.getItem(LS_KEY_PERIOD)
    if (saved) {
      const n = parseInt(saved, 10)
      if (n === 1 || n === 7 || n === 30 || n === -1) return n
    }
  } catch { /* localStorage unavailable */ }
  return 30
}

function savePeriod(period: number) {
  try {
    localStorage.setItem(LS_KEY_PERIOD, String(period))
  } catch { /* localStorage unavailable */ }
}

const pagePeriodOptions = [
  { id: 1, label: 'Today' },
  { id: 7, label: '7D' },
  { id: 30, label: '30D' },
  { id: -1, label: 'All Time' },
]

async function fetchPageAnalytics() {
  pageLoading.value = true
  try {
    pageStats.value = await adminApi.getPageAnalyticsStats(pageScope.value, pagePeriod.value)
  } catch (err) {
    toast.error('Failed to load page analytics', err instanceof Error ? err.message : '')
  } finally {
    pageLoading.value = false
  }
}

// Conversion rate helpers
const pagePeriodLabel = computed(() => {
  const opt = pagePeriodOptions.find(o => o.id === pagePeriod.value)
  return opt ? opt.label : '30D'
})

const conversionRate = computed(() => {
  if (!pageStats.value) return 0
  const initiated = pageStats.value.conversions.payment_initiated
  const completed = pageStats.value.conversions.payment_completed
  if (initiated === 0) return 0
  return Math.round((completed / initiated) * 100)
})

const failureRate = computed(() => {
  if (!pageStats.value) return 0
  const initiated = pageStats.value.conversions.payment_initiated
  const failed = pageStats.value.conversions.payment_failed
  if (initiated === 0) return 0
  return Math.round((failed / initiated) * 100)
})

// Top games color palette
const gameColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4']

function getGameColor(index: number): string {
  return gameColors[index % gameColors.length]
}

function maxGameCount(entries: TopGameEntry[]): number {
  if (entries.length === 0) return 1
  return Math.max(...entries.map((e) => e.count))
}

// Daily page views chart data
const pageChartData = computed(() => {
  if (!pageStats.value) return { labels: [], values: [] }
  const data = pageStats.value.daily_views || []
  const maxPoints = 90
  const startIdx = data.length > maxPoints ? data.length - maxPoints : 0
  return {
    labels: data.slice(startIdx).map((d) =>
      new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    values: data.slice(startIdx).map((d) => d.count),
  }
})

// Computed max counts for bar widths
const maxGameClicks = computed(() => maxGameCount(pageStats.value?.top_games_clicked || []))
const maxGameViews = computed(() => maxGameCount(pageStats.value?.top_games_viewed || []))

// ─── CSV Export ────────────────────────────────────────

/**
 * Escape a CSV value (handle commas, quotes, newlines).
 */
function csvEscape(val: unknown): string {
  const str = val == null ? '' : String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Trigger a browser download of CSV content.
 */
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportProfitCSV() {
  if (!analytics.value) return
  const a = analytics.value
  const period = profitPeriodLabel.value
  const rows: string[][] = []

  // ── Section 1: Daily Trend ──
  const dailyHeaders = ['Date', 'Revenue (USD)', 'Orders']
  const dailyRows = a.daily.map((d) => [
    new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    d.revenue.toFixed(2),
    String(d.orders),
  ])
  rows.push(['=== Daily Trend (' + period + ') ===', '', ''])
  rows.push(dailyHeaders)
  rows.push(...dailyRows)
  rows.push([])

  // ── Section 2: Summary ──
  rows.push(['=== Summary ===', '', ''])
  rows.push(['Metric', 'Value', ''])
  rows.push(['Period Revenue', a.summary.period_revenue.toFixed(2), ''])
  rows.push(['Period Orders', String(a.summary.period_orders), ''])
  rows.push(['Avg Order Value', a.summary.avg_order_value.toFixed(2), ''])
  rows.push(['All Time Revenue', a.summary.total_revenue.toFixed(2), ''])
  rows.push(['Total Orders', String(a.summary.total_orders), ''])
  rows.push([])

  // ── Section 3: Game Performance ──
  const gameHeaders = ['Game', 'Revenue (USD)', 'Orders', 'Avg Order Value', 'Revenue Share (%)']
  const totalRev = a.by_game.reduce((s, g) => s + g.revenue, 0)
  const gameRows = a.by_game.map((g) => [
    g.game_name || g.game_code,
    g.revenue.toFixed(2),
    String(g.orders),
    g.orders > 0 ? (g.revenue / g.orders).toFixed(2) : '0.00',
    totalRev > 0 ? ((g.revenue / totalRev) * 100).toFixed(1) : '0.0',
  ])
  rows.push(['=== Game Performance (' + period + ') ===', '', '', '', ''])
  rows.push(gameHeaders)
  rows.push(...gameRows)

  toast.success('Profit analytics exported as CSV')
  const filename = `profit-analytics-${period.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  downloadCSV(filename, rows[0] || ['', '', '', '', ''], rows.slice(1))
}

function exportPageCSV() {
  if (!pageStats.value) return
  const s = pageStats.value
  const period = pagePeriodLabel.value
  const scope = pageScope.value === 'all' ? 'all-events' : pageScope.value === 'public' ? 'public' : 'admin'
  const rows: string[][] = []

  // ── Section 1: Overview ──
  rows.push(['=== Overview ===', '', '', '', ''])
  rows.push(['Metric', 'Total', 'Today', 'This Week', ''])
  rows.push(['Page Views', String(s.overview.total_page_views), String(s.overview.today_page_views), String(s.overview.weekly_page_views), ''])
  rows.push(['Unique Visitors', String(s.overview.total_visitors), String(s.overview.today_visitors), '', ''])
  rows.push(['Views per Visitor', s.overview.total_visitors > 0 ? (s.overview.total_page_views / s.overview.total_visitors).toFixed(1) : '', '', '', ''])
  rows.push([])

  // ── Section 2: Top Games Clicked ──
  rows.push(['=== Top Games (Clicked) — ' + period + ' ===', '', ''])
  rows.push(['Rank', 'Game Code', 'Clicks'])
  s.top_games_clicked.forEach((g, i) => {
    rows.push([String(i + 1), g.game_code, String(g.count)])
  })
  if (s.top_games_clicked.length === 0) rows.push(['No data', '', ''])
  rows.push([])

  // ── Section 3: Top Games Viewed ──
  rows.push(['=== Top Games (Viewed) — ' + period + ' ===', '', ''])
  rows.push(['Rank', 'Game Code', 'Views'])
  s.top_games_viewed.forEach((g, i) => {
    rows.push([String(i + 1), g.game_code, String(g.count)])
  })
  if (s.top_games_viewed.length === 0) rows.push(['No data', '', ''])
  rows.push([])

  // ── Section 4: Conversion Funnel ──
  rows.push(['=== Conversion Funnel ===', '', ''])
  rows.push(['Stage', 'Count', 'Rate (%)'])
  const initiated = s.conversions.payment_initiated
  const completed = s.conversions.payment_completed
  const failed = s.conversions.payment_failed
  rows.push(['Initiated', String(initiated), '100.0'])
  rows.push(['Completed', String(completed), initiated > 0 ? ((completed / initiated) * 100).toFixed(1) : '0.0'])
  rows.push(['Failed', String(failed), initiated > 0 ? ((failed / initiated) * 100).toFixed(1) : '0.0'])

  toast.success('Page analytics exported as CSV')
  const filename = `page-analytics-${scope}-${period.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  downloadCSV(filename, rows[0] || ['', '', ''], rows.slice(1))
}

// Tab switch handler — fetch lazy
function onTabChange(tab: 'profit' | 'page') {
  activeTab.value = tab
  if (tab === 'profit' && !analytics.value && !profitLoading.value) {
    fetchProfitAnalytics()
  } else if (tab === 'page' && !pageStats.value && !pageLoading.value) {
    fetchPageAnalytics()
  }
}

onMounted(() => {
  fetchProfitAnalytics()
  // Lazy-load page analytics only when tab is first activated
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Analytics</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ activeTab === 'profit' ? 'Track revenue, orders, and performance trends' : 'Monitor page views, visitor engagement, and conversion funnels' }}</p>
      </div>
      <div class="flex items-center gap-2" v-if="activeTab === 'profit'">
        <!-- Period selector -->
        <div class="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
          <button
            v-for="opt in profitPeriodOptions"
            :key="opt.id"
            class="relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
            :class="profitPeriod === opt.id
              ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
            @click="profitPeriod = opt.id; saveProfitPeriod(opt.id); fetchProfitAnalytics()"
          >
            {{ opt.label }}
          </button>
        </div>
        <!-- Export CSV -->
        <button
          v-if="analytics"
          @click="exportProfitCSV()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-150"
          title="Export CSV"
        >
          <AppIcon name="download" :size="14" />
          Export
        </button>
      </div>
    </div>

    <!-- Tab switcher -->
    <div class="flex items-center gap-1 mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 w-fit shadow-sm">
      <button
        v-for="tab in ([{ id: 'profit' as const, label: 'Profit Analytics', icon: 'dollar' }, { id: 'page' as const, label: 'Page Analytics', icon: 'chart' }])"
        :key="tab.id"
        @click="onTabChange(tab.id)"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
        :class="activeTab === tab.id
          ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'"
      >
        <AppIcon :name="tab.icon" :size="16" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ─── Profit Analytics Tab ──────────────────────────── -->
    <template v-if="activeTab === 'profit'">
      <!-- Loading -->
      <div v-if="profitLoading" class="space-y-4">
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
            :trend-value="profitPeriodLabel"
          />
          <StatsCard
            title="Period Orders"
            :value="formatNumber(analytics.summary.period_orders)"
            icon="orders"
            accent="info"
            :trend="orderTrend"
            :trend-value="profitPeriodLabel"
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
                  <span class="text-xs text-slate-400">{{ profitPeriodLabel }}</span>
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
                <RevenueChart                v-if="chartData.labels.length > 0"
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
            <span class="text-xs text-slate-400">{{ profitPeriodLabel }}</span>
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
    </template>

    <!-- ─── Page Analytics Tab ─────────────────────────────── -->
    <template v-if="activeTab === 'page'">
      <!-- Scope + Period filter toggles -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Scope filter -->
          <div class="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
            <button
              v-for="opt in ([{ id: 'all' as const, label: 'All Events', desc: 'Public + Admin' }, { id: 'public' as const, label: 'Public Events', desc: 'Customer activity' }, { id: 'admin' as const, label: 'Admin Events', desc: 'Dashboard actions' }])"
              :key="opt.id"
              @click="pageScope = opt.id; saveScope(opt.id); fetchPageAnalytics()"
              class="relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
              :class="pageScope === opt.id
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
              :title="opt.desc"
            >
              {{ opt.label }}
            </button>
          </div>
          <!-- Period filter -->
          <div class="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
            <button
              v-for="opt in pagePeriodOptions"
              :key="opt.id"
              @click="pagePeriod = opt.id; savePeriod(opt.id); fetchPageAnalytics()"
              class="relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
              :class="pagePeriod === opt.id
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <span v-if="pageStats" class="text-[10px] text-slate-400 dark:text-slate-500">
          Showing: <span class="font-medium text-slate-500 dark:text-slate-400">{{ pageScope === 'all' ? 'All Events' : pageScope === 'public' ? 'Public Events Only' : 'Admin Events Only' }}</span>
          ·
          <span class="font-medium text-slate-500 dark:text-slate-400">{{ pagePeriodOptions.find(o => o.id === pagePeriod)?.label || '30D' }}</span>
        </span>
        <!-- Export CSV -->
        <button
          v-if="pageStats"
          @click="exportPageCSV()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-150"
          title="Export CSV"
        >
          <AppIcon name="download" :size="14" />
          Export
        </button>
      </div>

      <!-- Loading -->
      <div v-if="pageLoading" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <LoadingSkeleton v-for="i in 5" :key="i" type="card" />
        </div>
        <LoadingSkeleton type="card" />
      </div>

      <template v-if="pageStats">
        <!-- Overview cards -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard
            title="Total Page Views"
            :value="formatNumber(pageStats.overview.total_page_views)"
            icon="chart"
            accent="primary"
          />
          <StatsCard
            title="Today Views"
            :value="formatNumber(pageStats.overview.today_page_views)"
            icon="trending-up"
            accent="info"
          />
          <StatsCard
            title="Weekly Views"
            :value="formatNumber(pageStats.overview.weekly_page_views)"
            icon="clock"
            accent="success"
          />
          <StatsCard
            title="Total Visitors"
            :value="formatNumber(pageStats.overview.total_visitors)"
            icon="overview"
            accent="warning"
          />
          <StatsCard
            title="Today Visitors"
            :value="formatNumber(pageStats.overview.today_visitors)"
            icon="lightning"
            accent="primary"
          />
        </div>

        <!-- Daily Page Views Trend Chart -->
        <div class="mb-6">
          <RevenueChart
            :labels="pageChartData.labels"
            :values="pageChartData.values"
            prefix=""
            label="Page Views"
          >
            <template #header>
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Daily Page Views — {{ pagePeriodLabel }}</h3>
                <span class="text-xs text-slate-400">{{ pageStats.overview.total_page_views }} total views</span>
              </div>
            </template>
          </RevenueChart>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <!-- Top Games Clicked -->
          <div class="lg:col-span-2">
            <div class="card p-5">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Top Games (Clicked) — {{ pagePeriodLabel }}</h3>
              <div v-if="pageStats.top_games_clicked.length > 0" class="space-y-3">
                <div
                  v-for="(game, idx) in pageStats.top_games_clicked"
                  :key="game.game_code"
                  class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" :style="{ backgroundColor: getGameColor(idx) }">
                    {{ idx + 1 }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{{ game.game_code }}</span>
                      <span class="text-xs font-semibold text-slate-900 dark:text-white ml-2">{{ formatNumber(game.count) }}</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-700 ease-out"
                        :style="{
                          width: Math.max((game.count / maxGameClicks) * 100, 3) + '%',
                          backgroundColor: getGameColor(idx),
                        }"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-400 text-center py-8">
                <AppIcon name="chart" :size="32" class="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p>No game click data yet</p>
              </div>
            </div>
          </div>

          <!-- Conversion Funnel -->
          <div>
            <div v-if="pageScope !== 'admin'" class="card p-5">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Conversion Funnel</h3>
              <p class="text-[10px] text-slate-400 mb-4">{{ pagePeriodLabel }} — from payment initiation to completion</p>

              <!-- Funnel visual -->
              <div class="space-y-4">
                <!-- Initiated -->
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Initiated</span>
                    <span class="font-semibold text-slate-900 dark:text-white">{{ formatNumber(pageStats.conversions.payment_initiated) }}</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-primary-500 transition-all duration-700 ease-out"
                      :style="{ width: '100%' }"
                    />
                  </div>
                </div>

                <!-- Completed -->
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-emerald-600 dark:text-emerald-400 font-medium">Completed</span>
                    <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ formatNumber(pageStats.conversions.payment_completed) }}</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                      :style="{ width: pageStats.conversions.payment_initiated > 0 ? Math.max((pageStats.conversions.payment_completed / pageStats.conversions.payment_initiated) * 100, 2) + '%' : '0%' }"
                    />
                  </div>
                </div>

                <!-- Failed -->
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-red-500 dark:text-red-400 font-medium">Failed</span>
                    <span class="font-semibold text-red-500 dark:text-red-400">{{ formatNumber(pageStats.conversions.payment_failed) }}</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-red-500 transition-all duration-700 ease-out"
                      :style="{ width: pageStats.conversions.payment_initiated > 0 ? Math.max((pageStats.conversions.payment_failed / pageStats.conversions.payment_initiated) * 100, 2) + '%' : '0%' }"
                    />
                  </div>
                </div>
              </div>

              <!-- Conversion rate metrics -->
              <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Conversion Rate</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{{ conversionRate }}%</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Failure Rate</span>
                  <span class="font-bold text-red-500 dark:text-red-400 text-sm">{{ failureRate }}%</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Total Initiated</span>
                  <span class="font-semibold text-slate-900 dark:text-white">{{ formatNumber(pageStats.conversions.payment_initiated) }}</span>
                </div>
              </div>
            </div>

            <!-- Admin scope note -->
            <div v-if="pageScope === 'admin'" class="card p-5">
              <div class="flex flex-col items-center justify-center py-6 text-center">
                <AppIcon name="chart" :size="32" class="mb-3 text-slate-300 dark:text-slate-600" />
                <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Conversion data not available</h3>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 max-w-[200px]">
                  Admin events don't include payment conversion data. Switch to "Public Events" or "All Events" to view the conversion funnel.
                </p>
              </div>
            </div>

            <!-- Top Games Viewed -->
            <div class="card p-5 mt-4">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Top Games (Viewed)</h3>
              <div v-if="pageStats.top_games_viewed.length > 0" class="space-y-3">
                <div
                  v-for="(game, idx) in pageStats.top_games_viewed"
                  :key="game.game_code"
                  class="flex items-center gap-3"
                >
                  <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" :style="{ backgroundColor: getGameColor(idx) }">
                    {{ idx + 1 }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{{ game.game_code }}</span>
                      <span class="text-xs font-semibold text-slate-900 dark:text-white ml-2">{{ formatNumber(game.count) }}</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-700 ease-out"
                        :style="{
                          width: Math.max((game.count / maxGameViews) * 100, 3) + '%',
                          backgroundColor: getGameColor(idx),
                        }"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-400 text-center py-6">
                <AppIcon name="chart" :size="28" class="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p>No view data yet</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Engagement summary table -->
        <div class="card overflow-hidden">
          <div class="card-header">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Engagement Summary</h3>
            <span class="text-xs text-slate-400">All time</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th class="text-right">Value</th>
                  <th class="text-right">Today</th>
                  <th class="text-right">This Week</th>
                  <th class="text-right">Engagement Ratio</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div class="flex items-center gap-2">
                      <AppIcon name="chart" :size="14" class="text-primary-500" />
                      <span class="font-medium">Page Views</span>
                    </div>
                  </td>
                  <td class="text-right font-semibold">{{ formatNumber(pageStats.overview.total_page_views) }}</td>
                  <td class="text-right">{{ formatNumber(pageStats.overview.today_page_views) }}</td>
                  <td class="text-right">{{ formatNumber(pageStats.overview.weekly_page_views) }}</td>
                  <td class="text-right">
                    <span class="text-xs text-slate-500 dark:text-slate-400">
                      {{ pageStats.overview.total_visitors > 0 ? (pageStats.overview.total_page_views / pageStats.overview.total_visitors).toFixed(1) + ' per visitor' : '—' }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="flex items-center gap-2">
                      <AppIcon name="overview" :size="14" class="text-warning-500" />
                      <span class="font-medium">Unique Visitors</span>
                    </div>
                  </td>
                  <td class="text-right font-semibold">{{ formatNumber(pageStats.overview.total_visitors) }}</td>
                  <td class="text-right">{{ formatNumber(pageStats.overview.today_visitors) }}</td>
                  <td class="text-right">—</td>
                  <td class="text-right">
                    <span class="text-xs text-slate-500 dark:text-slate-400">
                      {{ pageStats.overview.total_visitors > 0 ? (pageStats.overview.today_visitors / pageStats.overview.total_visitors * 100).toFixed(1) + '% of all' : '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
