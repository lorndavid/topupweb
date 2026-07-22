<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import type { AdminProduct } from '@/types'
import { formatUSD } from '@/utils/formatters'
import { exportToCsv } from '@/utils/exportCsv'
import AppIcon from '@/components/ui/AppIcon.vue'
import DataTable from '@/components/ui/DataTable.vue'
import SlideOver from '@/components/ui/SlideOver.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const toast = useToastStore()
const products = ref<AdminProduct[]>([])
const loading = ref(true)
const gameFilter = ref('')
const selectedProduct = ref<AdminProduct | null>(null)
const showEditProfit = ref(false)
const editSellPrice = ref(0)
const savingProfit = ref(false)
const resetConfirm = ref<string | null>(null)
const editInline = ref<Record<string, { active: boolean; value: number }>>({})
const savingInline = ref<string | null>(null)

// ─── Wallet balance ─────────────────────────────
const balance = ref<number | null>(null)
const balanceLoading = ref(false)

async function fetchBalance() {
  balanceLoading.value = true
  try {
    const result = await adminApi.getBalanceAlert()
    balance.value = result.balance
  } catch {
    balance.value = null
  } finally {
    balanceLoading.value = false
  }
}

// ─── Data fetching ─────────────────────────────────────

async function fetchProducts() {
  loading.value = true
  try {
    products.value = await adminApi.getProducts(gameFilter.value || undefined)
  } catch (err) {
    toast.error('Failed to load products', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

// ─── Computed ──────────────────────────────────────────

const uniqueGames = computed(() => {
  const games = new Map<string, string>()
  products.value.forEach((p) => games.set(p.game_code, p.game_name))
  return Array.from(games.entries()).map(([code, name]) => ({ code, name }))
})

const totalCostValue = computed(() => products.value.reduce((sum, p) => sum + p.cost_price, 0))
const totalSellValue = computed(() => products.value.reduce((sum, p) => sum + p.sell_price, 0))
const totalProfitValue = computed(() => totalSellValue.value - totalCostValue.value)
const overallMargin = computed(() =>
  totalCostValue.value > 0 ? ((totalProfitValue.value / totalCostValue.value) * 100).toFixed(1) : '0.0'
)

const productsWithOverride = computed(() => products.value.filter((p) => (p as any).has_override))
const customPricedCount = computed(() => productsWithOverride.value.length)

// ─── Price editing (slide-over) ────────────────────────

function openEditProfit(product: AdminProduct) {
  selectedProduct.value = product
  editSellPrice.value = product.sell_price
  showEditProfit.value = true
}

async function saveProfit() {
  if (!selectedProduct.value) return
  savingProfit.value = true
  try {
    const result = await adminApi.updateProductProfit(
      selectedProduct.value.product_code,
      editSellPrice.value,
      selectedProduct.value.game_code
    )
    if (result.success) {
      toast.success('Price updated', `${selectedProduct.value.name} → ${formatUSD(editSellPrice.value)}`)
      showEditProfit.value = false
      await fetchProducts()
    } else {
      toast.error('Failed to update', result.message)
    }
  } catch (err) {
    toast.error('Error saving price', err instanceof Error ? err.message : '')
  } finally {
    savingProfit.value = false
  }
}

// ─── Inline quick edit ─────────────────────────────────

function startInlineEdit(product: AdminProduct) {
  // Close any other open inline edits
  editInline.value = {}
  editInline.value[product.product_code] = { active: true, value: product.sell_price }
}

async function saveInlineEdit(product: AdminProduct) {
  const inline = editInline.value[product.product_code]
  if (!inline || inline.value === product.sell_price) {
    delete editInline.value[product.product_code]
    return
  }

  savingInline.value = product.product_code
  try {
    const result = await adminApi.updateProductProfit(product.product_code, inline.value, product.game_code)
    if (result.success) {
      toast.success('Price updated', `${product.name} → ${formatUSD(inline.value)}`)
      delete editInline.value[product.product_code]
      await fetchProducts()
    } else {
      toast.error('Failed to update', result.message)
    }
  } catch (err) {
    toast.error('Error saving price', err instanceof Error ? err.message : '')
  } finally {
    savingInline.value = null
  }
}

function cancelInlineEdit(productCode: string) {
  delete editInline.value[productCode]
}

// ─── Reset override ────────────────────────────────────

async function confirmReset(productCode: string) {
  try {
    await adminApi.deleteProductOverride(productCode)
    toast.success('Override removed', 'Product will use auto-calculated margin')
    await fetchProducts()
  } catch (err) {
    toast.error('Failed to remove override', err instanceof Error ? err.message : '')
  } finally {
    resetConfirm.value = null
  }
}

// ─── Profit color helpers ──────────────────────────────

function profitColor(amount: number, percent: number): string {
  if (percent <= 0) return 'text-red-600 dark:text-red-400'
  if (percent < 10) return 'text-amber-600 dark:text-amber-400'
  if (percent < 25) return 'text-emerald-600 dark:text-emerald-400'
  return 'text-success-600 dark:text-success-400'
}

function profitBarWidth(percent: number): string {
  const clamped = Math.max(0, Math.min(percent, 60))
  return clamped + '%'
}

function profitBarColor(percent: number): string {
  if (percent <= 0) return 'bg-red-400'
  if (percent < 10) return 'bg-amber-400'
  if (percent < 25) return 'bg-emerald-400'
  return 'bg-green-400'
}

// ─── Columns ───────────────────────────────────────────

const columns = [
  { key: 'product_code', label: 'Code', width: '100px' },
  { key: 'name', label: 'Product Name' },
  { key: 'game_name', label: 'Game' },
  { key: 'cost_price', label: 'Cost (Bay2Game)', align: 'right' as const, sortable: true },
  { key: 'sell_price', label: 'Your Price', align: 'right' as const, sortable: true },
  { key: 'profit_percent', label: 'Margin', align: 'right' as const, sortable: true },
  { key: 'actions', label: '', width: '60px' },
]

onMounted(async () => {
  await Promise.all([fetchProducts(), fetchBalance()])
})
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Product Pricing</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Compare Bay2Game cost prices vs your sell prices. Edit any price directly.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          @click="exportToCsv('vidtopup-products', products as any, [
            { key: 'product_code', label: 'Code' },
            { key: 'name', label: 'Product Name' },
            { key: 'game_name', label: 'Game' },
            { key: 'cost_price', label: 'Cost Price (Bay2Game)' },
            { key: 'sell_price', label: 'Sell Price' },
            { key: 'profit_amount', label: 'Profit' },
            { key: 'profit_percent', label: 'Margin %' },
            { key: 'status', label: 'Status' },
          ])"
        >
          <AppIcon name="download" :size="14" />
          Export CSV
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      <div class="card p-4">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-sky-400" />
          Bay2Game Cost
        </p>
        <p class="text-lg font-bold text-slate-900 dark:text-white mt-1">{{ formatUSD(totalCostValue) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-primary-400" />
          Your Sell Total
        </p>
        <p class="text-lg font-bold text-slate-900 dark:text-white mt-1">{{ formatUSD(totalSellValue) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :class="totalProfitValue >= 0 ? 'bg-emerald-400' : 'bg-red-400'" />
          Total Profit
        </p>
        <p class="text-lg font-bold mt-1" :class="totalProfitValue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
          {{ formatUSD(totalProfitValue) }}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Overall Margin</p>
        <p class="text-lg font-bold mt-1" :class="parseFloat(overallMargin) >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
          {{ overallMargin }}%
        </p>
      </div>
      <div class="card p-4">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Products</p>
        <p class="text-lg font-bold text-slate-900 dark:text-white mt-1">
          {{ products.length }}
          <span v-if="customPricedCount > 0" class="text-xs font-normal text-primary-500 ml-1">({{ customPricedCount }} custom)</span>
        </p>
      </div>

      <!-- Wallet balance card -->
      <div class="card p-4 relative overflow-hidden">
        <!-- Background decoration -->
        <div
          class="absolute -top-2 -right-2 w-16 h-16 rounded-full opacity-10"
          :class="balance !== null && balance >= 50 ? 'bg-emerald-500' : balance !== null && balance >= 10 ? 'bg-amber-500' : 'bg-red-500'"
        />
        <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Wallet Balance
        </p>
        <div class="mt-1 flex items-center gap-2">
          <div v-if="balanceLoading" class="flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
            <span class="text-xs text-slate-400">Checking...</span>
          </div>
          <template v-else>
            <p
              v-if="balance !== null"
              class="text-lg font-bold font-mono"
              :class="balance >= 50 ? 'text-emerald-600 dark:text-emerald-400' : balance >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'"
            >
              ${{ balance.toFixed(2) }}
            </p>
            <p v-else class="text-sm text-slate-400">
              <span class="text-xs">Unavailable</span>
            </p>
            <button
              class="ml-auto p-1 rounded text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0"
              title="Refresh balance"
              @click="fetchBalance"
            >
              <svg
                class="w-3.5 h-3.5"
                :class="{ 'animate-spin': balanceLoading }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </template>
        </div>
        <!-- Low balance indicator dot -->
        <div
          v-if="balance !== null && balance < 10"
          class="mt-1 flex items-center gap-1"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span class="text-[9px] text-red-500 dark:text-red-400 font-medium">Low — top up soon</span>
        </div>
        <div
          v-else-if="balance !== null && balance < 50"
          class="mt-1 flex items-center gap-1"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span class="text-[9px] text-amber-500 dark:text-amber-400 font-medium">Moderate</span>
        </div>
        <div
          v-else-if="balance !== null"
          class="mt-1 flex items-center gap-1"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span class="text-[9px] text-emerald-500 dark:text-emerald-400 font-medium">Healthy</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <select v-model="gameFilter" class="form-input w-auto min-w-[160px]" @change="fetchProducts">
        <option value="">All Games</option>
        <option v-for="game in uniqueGames" :key="game.code" :value="game.code">{{ game.name }}</option>
      </select>
      <span class="text-xs text-slate-400">{{ products.length }} products loaded</span>

      <!-- Legend -->
      <div class="ml-auto flex items-center gap-4 text-[10px] text-slate-400">
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-sky-400" /> Bay2Game cost
        </span>
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-primary-400" /> Your sell price
        </span>
        <span class="flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-emerald-400" /> Profit
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card p-4">
      <LoadingSkeleton type="table" :rows="10" />
    </div>

    <!-- Products table -->
    <DataTable v-else :columns="columns" :rows="products as any" :page-size="20">
      <!-- Cost price cell -->
      <template #cell-cost_price="{ value }">
        <div class="flex items-center justify-end gap-1.5">
          <span class="font-mono text-xs text-sky-600 dark:text-sky-400">{{ formatUSD(value as number) }}</span>
          <span class="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded-full bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">Bay2Game</span>
        </div>
      </template>

      <!-- Sell price cell (editable inline) -->
      <template #cell-sell_price="{ value, row }">
        <div class="flex items-center justify-end gap-2">
          <!-- Inline edit mode -->
          <template v-if="editInline[(row as any).product_code]?.active">
            <div class="flex items-center gap-1">
              <span class="text-xs text-slate-400">$</span>
              <input
                v-model.number="editInline[(row as any).product_code].value"
                type="number"
                step="0.01"
                min="0"
                class="w-20 px-2 py-0.5 text-xs font-mono font-semibold rounded border border-primary-400 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                autofocus
                @keydown.enter="saveInlineEdit(row as any)"
                @keydown.esc="cancelInlineEdit((row as any).product_code)"
                @click.stop
              />
            </div>
            <button
              class="p-0.5 rounded text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
              :disabled="savingInline === (row as any).product_code"
              @click.stop="saveInlineEdit(row as any)"
            >
              <span v-if="savingInline === (row as any).product_code" class="block w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              class="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              @click.stop="cancelInlineEdit((row as any).product_code)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </template>

          <!-- Display mode -->
          <template v-else>
            <span
              class="font-mono font-semibold cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              :class="{
                'text-primary-600 dark:text-primary-400': (row as any).has_override,
                'text-slate-900 dark:text-white': !(row as any).has_override,
              }"
              @click.stop="startInlineEdit(row as any)"
            >
              {{ formatUSD(value as number) }}
            </span>

            <!-- Override badge or edit pencil -->
            <button
              v-if="(row as any).has_override"
              class="p-0.5 rounded text-primary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
              :title="'Custom price set. Click to edit.'"
              @click.stop="startInlineEdit(row as any)"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              v-else
              class="p-0.5 rounded text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all"
              @click.stop="startInlineEdit(row as any)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </template>
        </div>
      </template>

      <!-- Profit percent cell with visual bar -->
      <template #cell-profit_percent="{ value, row }">
        <div class="flex items-center justify-end gap-2">
          <div class="flex flex-col items-end">
            <span
              class="text-xs font-semibold font-mono"
              :class="profitColor((row as any).profit_amount, value as number)"
            >
              {{ (value as number).toFixed(1) }}%
            </span>
            <span
              class="text-[9px] font-mono"
              :class="profitColor((row as any).profit_amount, value as number)"
            >
              {{ formatUSD((row as any).profit_amount) }}
            </span>
          </div>
          <!-- Mini profit bar -->
          <div class="w-12 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="profitBarColor(value as number)"
              :style="{ width: profitBarWidth(value as number) }"
            />
          </div>
        </div>
      </template>

      <!-- Actions cell -->
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-0.5">
          <button
            class="p-1 rounded text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Edit price details"
            @click.stop="openEditProfit(row as any)"
          >
            <AppIcon name="edit" :size="14" />
          </button>
          <button
            v-if="(row as any).has_override"
            class="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Reset to auto-calculated margin"
            @click.stop="resetConfirm = (row as any).product_code"
          >
            <AppIcon name="refresh" :size="14" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- Edit Profit SlideOver -->
    <SlideOver :open="showEditProfit" title="Set Product Price" @close="showEditProfit = false">
      <div v-if="selectedProduct" class="space-y-6">
        <!-- Product info -->
        <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-2">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white">{{ selectedProduct.name }}</h3>
          <p class="text-xs text-slate-500">{{ selectedProduct.game_name }} · {{ selectedProduct.product_code }}</p>
        </div>

        <!-- Price comparison card -->
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 rounded-lg bg-sky-50 dark:bg-sky-500/5 border border-sky-100 dark:border-sky-500/10">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-sky-400" />
              <span class="text-sm text-sky-700 dark:text-sky-300">Bay2Game Cost</span>
            </div>
            <span class="text-sm font-bold font-mono text-sky-700 dark:text-sky-300">{{ formatUSD(selectedProduct.cost_price) }}</span>
          </div>

          <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary-400" />
              <span class="text-sm text-slate-700 dark:text-slate-300">Current Sell Price</span>
            </div>
            <span class="text-sm font-bold font-mono text-primary-600 dark:text-primary-400">{{ formatUSD(selectedProduct.sell_price) }}</span>
          </div>

          <div
            class="flex items-center justify-between p-3 rounded-lg border"
            :class="selectedProduct.profit_amount > 0
              ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
              : 'bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10'"
          >
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="selectedProduct.profit_amount > 0 ? 'bg-emerald-400' : 'bg-red-400'" />
              <span class="text-sm" :class="selectedProduct.profit_amount > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'">
                {{ selectedProduct.profit_amount > 0 ? 'Profit' : 'Loss' }}
              </span>
            </div>
            <span
              class="text-sm font-bold font-mono"
              :class="selectedProduct.profit_amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ selectedProduct.profit_amount > 0 ? '+' : '' }}{{ formatUSD(selectedProduct.profit_amount) }}
              <span class="text-xs font-normal opacity-75">({{ selectedProduct.profit_percent.toFixed(1) }}%)</span>
            </span>
          </div>

          <!-- Visual comparison bar -->
          <div class="relative h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
            <div
              class="absolute inset-y-0 left-0 bg-sky-400/30 dark:bg-sky-500/20 transition-all duration-300"
              :style="{ width: Math.min((selectedProduct.cost_price / Math.max(selectedProduct.sell_price, 0.01)) * 100, 100) + '%' }"
            />
            <div
              class="absolute inset-y-0 left-0 bg-primary-400/30 dark:bg-primary-500/20 transition-all duration-300"
              :style="{ width: Math.min((selectedProduct.sell_price / Math.max(selectedProduct.sell_price, 0.01)) * 100, 100) + '%' }"
            />
            <div class="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono font-semibold">
              <span class="text-sky-600 dark:text-sky-400">Cost: {{ formatUSD(selectedProduct.cost_price) }}</span>
              <span class="text-primary-600 dark:text-primary-400">Sell: {{ formatUSD(selectedProduct.sell_price) }}</span>
            </div>
          </div>
        </div>

        <hr class="border-slate-200 dark:border-slate-700" />

        <!-- Edit price -->
        <div>
          <label class="form-label">New Sell Price (USD)</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input
              v-model.number="editSellPrice"
              type="number"
              step="0.01"
              min="0"
              class="form-input pl-7 font-mono font-semibold text-lg"
            />
          </div>

          <!-- Price feedback -->
          <div class="mt-3 space-y-1">
            <div v-if="editSellPrice < selectedProduct.cost_price" class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AppIcon name="warning" :size="12" />
              <span>Below cost! You'll lose {{ formatUSD(selectedProduct.cost_price - editSellPrice) }} per sale.</span>
            </div>
            <div v-else class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <AppIcon name="check" :size="12" />
              <span>Profit: {{ formatUSD(editSellPrice - selectedProduct.cost_price) }}
                ({{ selectedProduct.cost_price > 0 ? ((editSellPrice - selectedProduct.cost_price) / selectedProduct.cost_price * 100).toFixed(1) : '0.0' }}% margin)
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button
            class="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="savingProfit || editSellPrice < 0"
            @click="saveProfit"
          >
            <span v-if="savingProfit" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ savingProfit ? 'Saving...' : 'Save Price' }}
          </button>
          <button
            v-if="(selectedProduct as any).has_override"
            class="px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            @click="resetConfirm = selectedProduct.product_code; showEditProfit = false"
          >
            Reset to Auto
          </button>
        </div>
      </div>
    </SlideOver>

    <!-- Reset override confirm dialog -->
    <ConfirmDialog
      :open="!!resetConfirm"
      title="Reset to Auto-Calculated Price"
      message="Remove the custom price override so this product uses the default profit margin instead."
      variant="warning"
      confirm-label="Reset to Auto"
      @confirm="resetConfirm ? confirmReset(resetConfirm) : null"
      @cancel="resetConfirm = null"
    />
  </div>
</template>
