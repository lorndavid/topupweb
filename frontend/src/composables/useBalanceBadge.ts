import { ref, onMounted, onUnmounted } from 'vue'
import { getResellerBalance } from '@/services/api'

/**
 * Reactive wallet balance with auto-polling every 30 seconds.
 * Exposes balance, loading state, and a computed status label.
 */
export function useBalanceBadge() {
  const balance = ref(0)
  const loading = ref(true)
  const error = ref<string | null>(null)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchBalance() {
    try {
      const result = await getResellerBalance()
      balance.value = result.balance ?? 0
      error.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch balance'
      console.warn('[useBalanceBadge]', error.value)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchBalance()
    // Poll every 30 seconds for real-time updates
    pollTimer = setInterval(fetchBalance, 30000)
  })

  onUnmounted(() => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  })

  return {
    balance,
    loading,
    error,
    refresh: fetchBalance,
  }
}
