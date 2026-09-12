import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameCategory, GameProduct, GameDetail, OrderSummary, ProductsResponse } from '@/types'
import { getCategories, getProducts } from '@/services/api'

import { clientCache } from '@/utils/clientCache'

export const useGameStore = defineStore('game', () => {
  // State
  const categories = ref<GameCategory[]>([])
  const selectedGame = ref<GameDetail | null>(null)
  const products = ref<GameProduct[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Order state
  const currentOrder = ref<OrderSummary | null>(null)

  // Computed
  const gameFields = computed(() => {
    if (!currentOrder.value) return { needsUserId: true, needsServerId: false }
    const category = categories.value.find(
      (c) => c.game_code === currentOrder.value?.gameCode
    )
    return {
      needsUserId: category?.game_fields?.includes('userid') ?? true,
      needsServerId: category?.game_fields?.includes('serverid') ?? false,
    }
  })

  // Actions
  async function fetchCategories(forceRefresh = false) {
    // 1. Instant cache check (0ms UI render)
    const cached = clientCache.get<GameCategory[]>('categories')
    if (cached && !forceRefresh) {
      categories.value = cached.data
      loading.value = false
      // If data is still fresh, avoid hitting the server completely
      if (!cached.isStale) return
    } else if (!categories.value.length) {
      loading.value = true
    }

    error.value = null
    try {
      const fresh = await getCategories()
      categories.value = fresh
      clientCache.set('categories', fresh, 15 * 60 * 1000) // 15 mins TTL
    } catch (err) {
      if (!categories.value.length) {
        error.value = err instanceof Error ? err.message : 'Failed to load games'
        console.error('Error fetching categories:', err)
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchProducts(gameCode: string, forceRefresh = false) {
    const cacheKey = `products_${gameCode}`
    // 1. Instant cache check (0ms UI render)
    const cached = clientCache.get<ProductsResponse>(cacheKey)
    if (cached && !forceRefresh) {
      selectedGame.value = cached.data.game
      products.value = cached.data.products
      loading.value = false
      // If data is still fresh, avoid hitting the server completely
      if (!cached.isStale) return
    } else if (selectedGame.value?.game_code !== gameCode || !products.value.length) {
      loading.value = true
    }

    error.value = null
    try {
      const data = await getProducts(gameCode)
      selectedGame.value = data.game
      products.value = data.products
      clientCache.set(cacheKey, data, 10 * 60 * 1000) // 10 mins TTL
    } catch (err) {
      if (selectedGame.value?.game_code !== gameCode) {
        error.value = err instanceof Error ? err.message : 'Failed to load products'
        console.error('Error fetching products:', err)
      }
    } finally {
      loading.value = false
    }
  }

  function setOrder(summary: OrderSummary) {
    currentOrder.value = summary
  }

  function clearOrder() {
    currentOrder.value = null
  }

  function reset() {
    categories.value = []
    selectedGame.value = null
    products.value = []
    loading.value = false
    error.value = null
    currentOrder.value = null
  }

  return {
    categories,
    selectedGame,
    products,
    loading,
    error,
    currentOrder,
    gameFields,
    fetchCategories,
    fetchProducts,
    setOrder,
    clearOrder,
    reset,
  }
})
