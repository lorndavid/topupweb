import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const username = ref<string | null>(localStorage.getItem('admin_username'))
  const loginMethod = ref<string | null>(localStorage.getItem('admin_login_method'))
  const bay2gameBalance = ref<number | null>(null)
  const bay2gameTotalOrders = ref<number | null>(null)
  const bay2gameTotalSpent = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isApiKeyLogin = computed(() => loginMethod.value === 'apikey')

  // Load stored Bay2Game profile on init
  const storedBalance = localStorage.getItem('admin_bay2game_balance')
  const storedOrders = localStorage.getItem('admin_bay2game_orders')
  const storedSpent = localStorage.getItem('admin_bay2game_spent')
  if (storedBalance) bay2gameBalance.value = parseFloat(storedBalance)
  if (storedOrders) bay2gameTotalOrders.value = parseInt(storedOrders)
  if (storedSpent) bay2gameTotalSpent.value = parseFloat(storedSpent)

  function saveSession(data: {
    token: string
    username: string
    loginMethod: string
    balance?: number
    totalOrders?: number
    totalSpent?: number
  }) {
    token.value = data.token
    username.value = data.username
    loginMethod.value = data.loginMethod
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_username', data.username)
    localStorage.setItem('admin_login_method', data.loginMethod)

    if (data.balance !== undefined) {
      bay2gameBalance.value = data.balance
      localStorage.setItem('admin_bay2game_balance', String(data.balance))
    }
    if (data.totalOrders !== undefined) {
      bay2gameTotalOrders.value = data.totalOrders
      localStorage.setItem('admin_bay2game_orders', String(data.totalOrders))
    }
    if (data.totalSpent !== undefined) {
      bay2gameTotalSpent.value = data.totalSpent
      localStorage.setItem('admin_bay2game_spent', String(data.totalSpent))
    }

    router.push('/')
  }

  async function login(credentials: { username: string; password: string }) {
    loading.value = true
    error.value = null
    try {
      const { default: adminApi } = await import('@/services/api')
      const response = await adminApi.login(credentials)
      if (response.success && response.data) {
        saveSession({
          token: response.data.token,
          username: response.data.username,
          loginMethod: 'password',
        })
      } else {
        error.value = response.message || 'Login failed'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
    } finally {
      loading.value = false
    }
  }

  async function loginWithApiKey(apiKey: string) {
    loading.value = true
    error.value = null
    try {
      const { default: adminApi } = await import('@/services/api')
      const response = await adminApi.loginWithApiKey({ apiKey })
      if (response.success && response.data) {
        // Also store the API key for future requests
        localStorage.setItem('admin_api_key', apiKey)
        saveSession({
          token: response.data.token,
          username: response.data.username,
          loginMethod: 'apikey',
          balance: response.data.profile?.balance,
          totalOrders: response.data.profile?.totalOrders,
          totalSpent: response.data.profile?.totalSpent,
        })
      } else {
        error.value = response.message || 'API key login failed'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'API key login failed. Check your key and connection.'
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    username.value = null
    loginMethod.value = null
    bay2gameBalance.value = null
    bay2gameTotalOrders.value = null
    bay2gameTotalSpent.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
    localStorage.removeItem('admin_login_method')
    localStorage.removeItem('admin_api_key')
    localStorage.removeItem('admin_bay2game_balance')
    localStorage.removeItem('admin_bay2game_orders')
    localStorage.removeItem('admin_bay2game_spent')
    router.push('/login')
  }

  function clearError() {
    error.value = null
  }

  return {
    token,
    username,
    loginMethod,
    bay2gameBalance,
    bay2gameTotalOrders,
    bay2gameTotalSpent,
    loading,
    error,
    isAuthenticated,
    isApiKeyLogin,
    login,
    loginWithApiKey,
    logout,
    clearError,
  }
})
