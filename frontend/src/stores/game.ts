import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameCategory, GameProduct, GameDetail, OrderSummary } from '@/types'
import { getCategories, getProducts } from '@/services/api'

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
  async function fetchCategories() {
    loading.value = true
    error.value = null
    try {
      categories.value = await getCategories()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load games'
      console.error('Error fetching categories:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchProducts(gameCode: string) {
    loading.value = true
    error.value = null
    try {
      const data = await getProducts(gameCode)
      selectedGame.value = data.game
      products.value = data.products
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load products'
      console.error('Error fetching products:', err)
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
