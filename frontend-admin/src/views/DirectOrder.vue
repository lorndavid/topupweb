<script setup lang="ts">
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import adminApi from '@/services/api'
import { formatUSD } from '@/utils/formatters'
import AppIcon from '@/components/ui/AppIcon.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const toast = useToastStore()

interface Game {
  game_code: string
  name: string
  description: string
  game_fields: string[]
}

interface Product {
  id: number
  product_code: string
  name: string
  cost_price: number
  status: string
}

// Steps
const step = ref<'select-game' | 'select-product' | 'confirm'>('select-game')
const games = ref<Game[]>([])
const products = ref<Product[]>([])
const selectedGame = ref<Game | null>(null)
const selectedProduct = ref<Product | null>(null)
const playerId = ref('')
const serverId = ref('')
const orderReference = ref('')
const loading = ref(false)
const loadingProducts = ref(false)
const showConfirm = ref(false)
const orderResult = ref<any>(null)

async function loadGames() {
  loading.value = true
  try {
    const res = await adminApi.getDirectOrderGames()
    games.value = res as any
  } catch (err) {
    toast.error('Failed to load games', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

async function selectGame(game: Game) {
  selectedGame.value = game
  step.value = 'select-product'
  loadingProducts.value = true
  try {
    const res = await adminApi.getDirectOrderProducts(game.game_code)
    products.value = (res as any)?.products || []
  } catch (err) {
    toast.error('Failed to load products', err instanceof Error ? err.message : '')
  } finally {
    loadingProducts.value = false
  }
}

function selectProduct(product: Product) {
  selectedProduct.value = product
  orderReference.value = 'DIR-' + Date.now().toString(36).toUpperCase()
  step.value = 'confirm'
}

function goBack() {
  if (step.value === 'select-product') {
    step.value = 'select-game'
    selectedGame.value = null
  } else if (step.value === 'confirm') {
    step.value = 'select-product'
    selectedProduct.value = null
  }
}

async function confirmOrder() {
  showConfirm.value = false
  loading.value = true
  try {
    const res = await adminApi.createDirectOrder({
      productCode: selectedProduct.value!.product_code,
      gameUserId: playerId.value,
      gameZoneId: serverId.value || undefined,
      reference: orderReference.value,
    })
    if (res.success) {
      orderResult.value = res.data
      toast.success('Order created!', `Reference: ${orderReference.value}`)
    } else {
      toast.error('Order failed', res.message)
    }
  } catch (err) {
    toast.error('Order creation failed', err instanceof Error ? err.message : '')
  } finally {
    loading.value = false
  }
}

function resetOrder() {
  step.value = 'select-game'
  selectedGame.value = null
  selectedProduct.value = null
  playerId.value = ''
  serverId.value = ''
  orderResult.value = null
  loadGames()
}

// Load games on mount
loadGames()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold font-heading text-slate-900 dark:text-white">Direct Order</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Create a top-up order directly — bypasses customer payment flow</p>
      </div>
    </div>

    <div class="max-w-2xl">
      <!-- Step indicator -->
      <div class="flex items-center gap-2 mb-6 text-xs">
        <span :class="step === 'select-game' ? 'text-primary-600 font-semibold' : 'text-slate-400'">1. Select Game</span>
        <svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span :class="step === 'select-product' ? 'text-primary-600 font-semibold' : 'text-slate-400'">2. Select Package</span>
        <svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span :class="step === 'confirm' ? 'text-primary-600 font-semibold' : 'text-slate-400'">3. Confirm</span>
      </div>

      <!-- Step 1: Select Game -->
      <div v-if="step === 'select-game'">
        <div v-if="loading" class="grid grid-cols-2 gap-3">
          <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
        </div>
        <div v-else class="grid grid-cols-2 gap-3">
          <button
            v-for="game in games"
            :key="game.game_code"
            class="card p-4 text-left hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-150 cursor-pointer"
            @click="selectGame(game)"
          >
            <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ game.name }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ game.game_code }}</p>
          </button>
        </div>
      </div>

      <!-- Step 2: Select Product -->
      <div v-if="step === 'select-product'">
        <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline mb-4 inline-flex items-center gap-1" @click="goBack">
          ← Back to games
        </button>
        <div v-if="selectedGame" class="mb-4">
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">{{ selectedGame.name }}</h2>
          <p class="text-xs text-slate-400">Select a package to order</p>
        </div>

        <div v-if="loadingProducts" class="space-y-2">
          <LoadingSkeleton v-for="i in 5" :key="i" type="text" />
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="product in products"
            :key="product.product_code"
            class="w-full card p-4 text-left hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-150 cursor-pointer flex items-center justify-between"
            :disabled="product.status !== 'active'"
            @click="selectProduct(product)"
          >
            <div>
              <p class="text-sm font-medium text-slate-900 dark:text-white">{{ product.name }}</p>
              <p class="text-xs text-slate-400 font-mono">{{ product.product_code }}</p>
            </div>
            <span class="font-semibold text-sm">{{ formatUSD(product.cost_price) }}</span>
          </button>
        </div>
      </div>

      <!-- Step 3: Confirm -->
      <div v-if="step === 'confirm'">
        <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline mb-4 inline-flex items-center gap-1" @click="goBack">
          ← Back to packages
        </button>

        <div class="card p-6 space-y-4">
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Game</span>
            <span class="font-medium">{{ selectedGame?.name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Package</span>
            <span class="font-medium">{{ selectedProduct?.name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Cost Price</span>
            <span class="font-semibold">{{ formatUSD(selectedProduct?.cost_price || 0) }}</span>
          </div>
          <hr class="border-slate-200 dark:border-slate-700" />
          <div>
            <label class="form-label">Player ID</label>
            <input v-model="playerId" type="text" class="form-input font-mono" placeholder="Enter player ID" />
          </div>
          <div v-if="selectedGame?.game_fields?.includes('serverid')">
            <label class="form-label">Server / Zone ID</label>
            <input v-model="serverId" type="text" class="form-input font-mono" placeholder="Enter server/zone ID" />
          </div>
          <div>
            <label class="form-label">Reference</label>
            <input :value="orderReference" type="text" class="form-input font-mono text-xs bg-slate-50 dark:bg-slate-800" readonly />
          </div>

          <div class="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <AppIcon name="warning" :size="14" class="flex-shrink-0" /> This will create a real order and deduct from your Bay2Game balance immediately.
          </div>

          <button
            class="w-full py-2.5 bg-success-600 hover:bg-success-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="loading || !playerId"
            @click="showConfirm = true"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <AppIcon v-if="!loading" name="rocket" :size="14" />
            {{ loading ? 'Creating order...' : 'Create Order' }}
          </button>
        </div>
      </div>

      <!-- Order result -->
      <Transition name="slide-up">
        <div v-if="orderResult" class="card p-6 mt-4 bg-gradient-to-r from-success-50/50 to-primary-50/50 dark:from-success-500/5 dark:to-primary-500/5">
          <div class="text-center mb-4">
            <AppIcon name="check" :size="32" class="text-success-500 mx-auto" />
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white mt-2">Order Created Successfully!</h3>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-400">Reference</span>
              <span class="font-mono font-medium">{{ orderResult.reference }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Product</span>
              <span>{{ orderResult.productName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Amount</span>
              <span class="font-semibold text-success-600 dark:text-success-400">{{ formatUSD(orderResult.amount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Balance Before</span>
              <span>{{ formatUSD(orderResult.balanceBefore) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Balance After</span>
              <span>{{ formatUSD(orderResult.balanceAfter) }}</span>
            </div>
          </div>
          <button class="w-full mt-4 py-2.5 border border-slate-200 dark:border-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" @click="resetOrder">
            Create Another Order
          </button>
        </div>
      </Transition>
    </div>

    <ConfirmDialog
      :open="showConfirm"
      title="Create Direct Order?"
      :message="`Create a direct order for ${selectedProduct?.name} (${formatUSD(selectedProduct?.cost_price || 0)}) on ${selectedGame?.name} for player ${playerId}? This will charge your Bay2Game balance immediately.`"
      confirm-text="Yes, Create Order"
      :variant="'warning'"
      @confirm="confirmOrder"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<style scoped>
.slide-up-enter-active { transition: all 0.3s ease-out; }
.slide-up-leave-active { transition: all 0.2s ease-in; }
.slide-up-enter-from { opacity: 0; transform: translateY(12px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
