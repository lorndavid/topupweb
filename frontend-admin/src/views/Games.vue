<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import type { AdminGame } from '@/types'
import { formatUSD, formatNumber } from '@/utils/formatters'
import DataTable from '@/components/ui/DataTable.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'

const toast = useToastStore()
const games = ref<AdminGame[]>([])
const loading = ref(true)

async function fetchGames() {
  loading.value = true
  try {
    games.value = await adminApi.getGames()
  } catch (err) {
    toast.error('Failed to load games', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    active: 'badge-success',
    inactive: 'badge-neutral',
    maintenance: 'badge-warning',
  }
  return map[status] || 'badge-neutral'
}

const columns = [
  { key: 'name', label: 'Game', sortable: true },
  { key: 'game_code', label: 'Code', width: '100px' },
  { key: 'total_products', label: 'Products', sortable: true, align: 'right' as const },
  { key: 'total_orders', label: 'Orders', sortable: true, align: 'right' as const },
  { key: 'revenue', label: 'Revenue', sortable: true, align: 'right' as const },
  { key: 'status', label: 'Status' },
]

onMounted(fetchGames)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Games</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your game catalog</p>
      </div>
    </div>

    <div v-if="loading" class="card p-4">
      <LoadingSkeleton type="table" :rows="6" />
    </div>

    <DataTable
      v-else
      :columns="columns"
      :rows="games as any"
    >
      <template #cell-name="{ value }">
        <span class="font-medium">{{ value }}</span>
      </template>
      <template #cell-game_code="{ value }">
        <span class="text-xs font-mono text-slate-500">{{ value }}</span>
      </template>
      <template #cell-revenue="{ value }">
        <span class="font-semibold">{{ formatUSD(value as number) }}</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="getStatusBadge(value as string)" class="capitalize">{{ value }}</span>
      </template>
    </DataTable>
  </div>
</template>
