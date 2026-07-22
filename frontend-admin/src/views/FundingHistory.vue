<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import { formatUSD } from '@/utils/formatters'

const toast = useToastStore()
const loading = ref(true)
const fundingData = ref<{
  currentBalance: number
  totalSpent: number
  totalOrders: number
  username: string
  history: any[]
} | null>(null)

async function fetchFunding() {
  loading.value = true
  try {
    const res = await adminApi.getFundingHistory()
    fundingData.value = res as any
  } catch (err) {
    toast.error('Failed to load funding history', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

onMounted(fetchFunding)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Funding History</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Track your Bay2Game balance and spending</p>
      </div>
      <button class="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors" @click="fetchFunding">
        Refresh
      </button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <LoadingSkeleton v-for="i in 3" :key="i" type="card" />
    </div>

    <template v-if="fundingData">
      <!-- Balance cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="card p-5">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Current Balance</p>
          <p class="text-2xl font-bold text-success-600 dark:text-success-400 mt-1">{{ formatUSD(fundingData.currentBalance) }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Total Spent</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ formatUSD(fundingData.totalSpent) }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Total Orders</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ fundingData.totalOrders }}</p>
        </div>
      </div>

      <!-- Account info -->
      <div class="card p-5 mb-6">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">Bay2Game Account</h3>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
            {{ fundingData.username?.[0]?.toUpperCase() || '?' }}
          </div>
          <div>
            <p class="text-sm font-medium text-slate-900 dark:text-white">{{ fundingData.username }}</p>
            <p class="text-xs text-slate-400">Connected via API Key</p>
          </div>
        </div>
      </div>

      <!-- History placeholder -->
      <div class="card p-8 text-center">
        <AppIcon name="chart" :size="36" class="mb-3 text-slate-300 dark:text-slate-600" />
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Funding History Coming Soon</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto">
          Historical balance change tracking will be available once the backend records balance snapshots over time.
          Your current balance and spending totals are shown above from the live Bay2Game API.
        </p>
      </div>
    </template>
  </div>
</template>
