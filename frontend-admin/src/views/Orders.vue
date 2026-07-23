<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import type { AdminOrder, OrderStatus } from '@/types'
import { trackOrderStatusChange } from '@/composables/useAdminAnalytics'
import {
  formatUSD,
  formatDateTime,
  timeAgo,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/utils/formatters'
import { exportToCsv } from '@/utils/exportCsv'
import AppIcon from '@/components/ui/AppIcon.vue'
import DataTable from '@/components/ui/DataTable.vue'
import SlideOver from '@/components/ui/SlideOver.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const router = useRouter()
const route = useRoute()
const toast = useToastStore()

const orders = ref<AdminOrder[]>([])
const loading = ref(true)
const searchQuery = ref((route.query.search as string) || '')
const statusFilter = ref('')
const gameFilter = ref('')

const selectedOrder = ref<AdminOrder | null>(null)
const showDetail = ref(false)
const showStatusDialog = ref(false)
const newStatus = ref<OrderStatus>('completed')
const updatingStatus = ref(false)

async function fetchOrders() {
  loading.value = true
  try {
    const data = await adminApi.getOrders({
      page: 1,
      limit: 100,
      status: statusFilter.value || undefined,
      search: searchQuery.value || undefined,
    })
    orders.value = data.orders || []
  } catch (err) {
    toast.error('Failed to load orders', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

function openOrderDetail(order: AdminOrder) {
  selectedOrder.value = order
  showDetail.value = true
}

function openStatusUpdate(status: OrderStatus) {
  newStatus.value = status
  showStatusDialog.value = true
}

async function confirmStatusUpdate() {
  if (!selectedOrder.value) return
  updatingStatus.value = true
  const prevStatus = selectedOrder.value.order_status
  try {
    await adminApi.updateOrderStatus(selectedOrder.value.reference, { status: newStatus.value })
    trackOrderStatusChange(selectedOrder.value.reference, prevStatus, newStatus.value)
    toast.success('Status updated', `Order ${selectedOrder.value.reference} → ${getStatusLabel(newStatus.value)}`)
    showStatusDialog.value = false
    showDetail.value = false
    await fetchOrders()
  } catch (err) {
    toast.error('Failed to update status', err instanceof Error ? err.message : '')
  } finally {
    updatingStatus.value = false
  }
}

const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'completed', label: 'Completed', color: 'badge-success' },
  { value: 'processing', label: 'Processing', color: 'badge-info' },
  { value: 'awaiting_stock', label: 'Awaiting Stock', color: 'badge-warning' },
  { value: 'failed', label: 'Failed', color: 'badge-danger' },
  { value: 'cancelled', label: 'Cancelled', color: 'badge-neutral' },
]

const columns = [
  { key: 'reference', label: 'Reference', width: '130px' },
  { key: 'game_name', label: 'Game', sortable: true },
  { key: 'product_name', label: 'Package' },
  { key: 'player_id', label: 'Player ID', width: '140px' },
  { key: 'amount', label: 'Amount', sortable: true, align: 'right' as const },
  { key: 'order_status', label: 'Status' },
  { key: 'created_at', label: 'Date', sortable: true },
]

onMounted(fetchOrders)
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Orders</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and track all customer orders</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-500">
          <span class="font-medium text-slate-700 dark:text-slate-300">{{ orders.length }}</span>
          total
        </span>
        <button
          class="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          @click="exportToCsv('vidtopup-orders', orders as any, [
            { key: 'reference', label: 'Reference' },
            { key: 'game_name', label: 'Game' },
            { key: 'product_name', label: 'Package' },
            { key: 'player_id', label: 'Player ID' },
            { key: 'amount', label: 'Amount' },
            { key: 'payment_method', label: 'Payment' },
            { key: 'payment_status', label: 'Payment Status' },
            { key: 'order_status', label: 'Order Status' },
            { key: 'created_at', label: 'Created' },
          ])"
        >
          <AppIcon name="download" :size="14" />
          Export CSV
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-6">
      <div class="flex-1 min-w-[200px]">
        <input
          v-model="searchQuery"
          type="text"
          class="form-input"
          placeholder="Search by reference or player ID..."
          @input="fetchOrders"
        />
      </div>
      <select v-model="statusFilter" class="form-input w-auto min-w-[140px]" @change="fetchOrders">
        <option value="">All Status</option>
        <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <button
        class="px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        @click="fetchOrders"
      >
        Refresh
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card p-4">
      <LoadingSkeleton type="table" :rows="8" />
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="orders.length === 0"
      icon="inbox"
      title="No orders found"
      message="Orders will appear here once customers start making purchases."
    />

    <!-- Orders table -->
    <DataTable
      v-else
      :columns="columns"
      :rows="orders as any"
      :page-size="15"
      @row-click="openOrderDetail"
    >
      <template #cell-reference="{ value }">
        <span class="font-mono text-xs font-medium">{{ value }}</span>
      </template>
      <template #cell-amount="{ value }">
        <span class="font-semibold">{{ formatUSD(value as number) }}</span>
      </template>
      <template #cell-order_status="{ value }">
        <span :class="getStatusBadgeClass(value as string)">{{ getStatusLabel(value as string) }}</span>
      </template>
      <template #cell-created_at="{ value }">
        <span class="text-xs text-slate-400">{{ timeAgo(value as string) }}</span>
      </template>
    </DataTable>

    <!-- Order detail SlideOver -->
    <SlideOver :open="showDetail" title="Order Details" @close="showDetail = false">
      <div v-if="selectedOrder" class="space-y-6">
        <!-- Status badge -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400">Current Status</span>
          <span :class="getStatusBadgeClass(selectedOrder.order_status)" class="text-sm">
            {{ getStatusLabel(selectedOrder.order_status) }}
          </span>
        </div>

        <!-- Order info -->
        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Reference</span>
            <span class="font-mono font-medium">{{ selectedOrder.reference }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Game</span>
            <span class="font-medium">{{ selectedOrder.game_name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Package</span>
            <span>{{ selectedOrder.product_name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Player ID</span>
            <span class="font-mono">{{ selectedOrder.player_id }}</span>
          </div>
          <div v-if="selectedOrder.server_id" class="flex justify-between text-sm">
            <span class="text-slate-400">Server ID</span>
            <span class="font-mono">{{ selectedOrder.server_id }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Amount</span>
            <span class="font-semibold">{{ formatUSD(selectedOrder.amount) }}</span>
          </div>
          <div v-if="selectedOrder.cost_price" class="flex justify-between text-sm">
            <span class="text-slate-400">Cost Price</span>
            <span>{{ formatUSD(selectedOrder.cost_price) }}</span>
          </div>
          <div v-if="selectedOrder.profit" class="flex justify-between text-sm">
            <span class="text-slate-400">Profit</span>
            <span class="font-semibold text-success-600 dark:text-success-400">{{ formatUSD(selectedOrder.profit) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Payment Method</span>
            <span>{{ selectedOrder.payment_method || 'KHQR' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Payment Status</span>
            <span :class="selectedOrder.payment_status === 'paid' ? 'badge-success' : 'badge-warning'">
              {{ selectedOrder.payment_status }}
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Created</span>
            <span>{{ formatDateTime(selectedOrder.created_at) }}</span>
          </div>
          <div v-if="selectedOrder.completed_at" class="flex justify-between text-sm">
            <span class="text-slate-400">Completed</span>
            <span>{{ formatDateTime(selectedOrder.completed_at) }}</span>
          </div>
          <div v-if="selectedOrder.retry_count > 0" class="flex justify-between text-sm">
            <span class="text-slate-400">Retries</span>
            <span>{{ selectedOrder.retry_count }}</span>
          </div>
        </div>

        <!-- Update status -->
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Update Status</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              :class="selectedOrder.order_status === opt.value
                ? 'bg-primary-500 text-white border-primary-500'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'"
              @click="openStatusUpdate(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </SlideOver>

    <!-- Confirm dialog -->
    <ConfirmDialog
      :open="showStatusDialog"
      title="Update Order Status"
      :message="`Change order ${selectedOrder?.reference} status to ${getStatusLabel(newStatus)}?`"
      confirm-text="Update"
      :variant="newStatus === 'cancelled' || newStatus === 'failed' ? 'danger' : 'info'"
      @confirm="confirmStatusUpdate"
      @cancel="showStatusDialog = false"
    />
  </div>
</template>
