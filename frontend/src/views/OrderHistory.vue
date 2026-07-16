<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { getOrdersByPlayer } from '@/services/api'
import type { OrderResponse } from '@/types'
import gsap from 'gsap'

const router = useRouter()
const i18n = useI18nStore()

const playerIdInput = ref('')
const orders = ref<OrderResponse[]>([])
const loading = ref(false)
const searched = ref(false)
const error = ref<string | null>(null)

const hasOrders = computed(() => orders.value.length > 0)
const totalSpent = computed(() =>
  orders.value.reduce((sum, o) => sum + o.amount, 0)
)

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'paid':
    case 'processing': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'pending':
    case 'awaiting_payment': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'awaiting_stock': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'failed':
    case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
    default: return 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
  }
}

async function handleSearch() {
  const id = playerIdInput.value.trim()
  if (!id) return

  loading.value = true
  error.value = null
  searched.value = true

  try {
    orders.value = await getOrdersByPlayer(id)
    // Animate results after render
    setTimeout(() => {
      const cards = document.querySelectorAll('.order-card')
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
        )
      }
    }, 50)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load orders'
    orders.value = []
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- Dark ambient background -->
    <div class="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div class="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[140px]"></div>
      <div class="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-emerald-600/8 blur-[140px]"></div>
    </div>

    <div class="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <!-- Back -->
      <button
        @click="router.push('/')"
        class="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-amber-300 mb-6 transition-all duration-200 group"
      >
        <svg class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </button>

      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm mb-4">
          <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span class="text-xs font-medium text-white/50 uppercase tracking-widest">Order History</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white mb-2">My Orders</h1>
        <p class="text-white/40 text-sm">Enter your Player ID to view all your past top-up orders</p>
      </div>

      <!-- Search Card -->
      <div class="mb-8 p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
        <div class="flex items-center gap-3">
          <div class="relative flex-1">
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              v-model="playerIdInput"
              type="text"
              inputmode="numeric"
              placeholder="Enter your Player ID (e.g. 262856740)"
              class="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/10 hover:border-white/20 focus:border-amber-500/50 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none transition-all duration-200"
              @keyup.enter="handleSearch"
            />
          </div>
          <button
            @click="handleSearch"
            :disabled="loading || !playerIdInput.trim()"
            class="shrink-0 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-amber-800 disabled:to-amber-800 disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition-all duration-200 active:scale-[0.97] flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <template v-if="loading">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching...
            </template>
            <template v-else>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </template>
          </button>
        </div>
        <p class="mt-2 text-[10px] text-white/20 text-center">
          Enter the Player ID you used when making your purchase
        </p>
      </div>

      <!-- Error -->
      <div v-if="error && !hasOrders" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mb-4">
          <svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-white/50 text-sm mb-2">{{ error }}</p>
        <p class="text-white/20 text-xs">Check your Player ID and try again</p>
      </div>

      <!-- No Results -->
      <div v-else-if="searched && !hasOrders && !loading" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 mb-4">
          <svg class="w-7 h-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-white/40 text-sm mb-1">No orders found for this Player ID</p>
        <p class="text-white/20 text-xs">Make sure you entered your exact Player ID</p>
      </div>

      <!-- Orders List -->
      <div v-if="hasOrders" class="space-y-5">
        <!-- Summary Bar -->
        <div class="flex items-center justify-between px-5 py-3 rounded-xl bg-white/[0.04] border border-white/10">
          <div class="flex items-center gap-2 text-sm text-white/40">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>{{ orders.length }} order{{ orders.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="text-sm">
            <span class="text-white/30">Total spent: </span>
            <span class="font-bold text-amber-300">${{ totalSpent.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Order Cards -->
        <div
          v-for="order in orders"
          :key="order.reference"
          class="order-card rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden cursor-pointer hover:bg-white/[0.06]"
          @click="router.push(`/order/${order.reference}`)"
        >
          <div class="p-5">
            <!-- Top row: Game + Status -->
            <div class="flex items-start justify-between mb-3">
              <div class="min-w-0 flex-1 mr-3">
                <p class="font-semibold text-white/90 truncate">{{ order.game_name }}</p>
                <p class="text-xs text-white/40 mt-0.5 truncate">{{ order.product_name }}</p>
              </div>
              <span
                :class="[
                  'shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border capitalize',
                  statusColor(order.order_status)
                ]"
              >
                {{ order.order_status.replace('_', ' ') }}
              </span>
            </div>

            <!-- Details grid -->
            <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <span class="text-white/30">Reference</span>
                <p class="font-mono text-white/60 mt-0.5 truncate">{{ order.reference }}</p>
              </div>
              <div class="text-right">
                <span class="text-white/30">Amount</span>
                <p class="font-bold text-amber-300 mt-0.5">${{ order.amount.toFixed(2) }}</p>
              </div>
              <div>
                <span class="text-white/30">Player ID</span>
                <p class="font-mono text-white/60 mt-0.5 truncate">{{ order.player_id }}</p>
              </div>
              <div class="text-right">
                <span class="text-white/30">Date</span>
                <p class="text-white/60 mt-0.5">{{ formatDate(order.created_at) }}</p>
              </div>
            </div>

            <!-- Server ID if exists -->
            <div v-if="order.server_id" class="mt-2 pt-2 border-t border-white/5">
              <span class="text-[10px] text-white/30">Server: </span>
              <span class="font-mono text-[10px] text-white/50">{{ order.server_id }}</span>
            </div>
          </div>

          <!-- Bottom arrow hint -->
          <div class="px-5 pb-3 flex justify-end">
            <span class="text-[10px] text-white/20 flex items-center gap-1 hover:text-amber-300/50 transition-colors">
              View details
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
