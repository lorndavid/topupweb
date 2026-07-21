import axios from 'axios'
import type {
  ApiResponse,
  GameCategory,
  CambodiaGamesResponse,
  ProductsResponse,
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  OrderResponse,
  VerifyPlayerResult,
  CheckGameIdResponse,
  AdminDashboardData,
  BalanceInfo,
  NewProductsConfig,
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

import { incrementApiRequest, decrementApiRequest } from '@/stores/loading'

// ─── Request interceptor: track in-flight API calls for loading bar ──
api.interceptors.request.use(
  (config) => {
    incrementApiRequest()
    return config
  },
  (error) => {
    decrementApiRequest()
    return Promise.reject(error)
  }
)

// ─── Response interceptor: track in-flight API calls + error handling ──
api.interceptors.response.use(
  (response) => {
    decrementApiRequest()
    return response
  },
  (error) => {
    decrementApiRequest()
    if (error.response) {
      const message = error.response.data?.message || 'An error occurred'
      return Promise.reject(new Error(message))
    }
    if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'))
    }
    return Promise.reject(error)
  }
)

export async function getCategories(): Promise<GameCategory[]> {
  const { data } = await api.get<ApiResponse<GameCategory[]>>('/categories')
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to fetch categories')
  }
  return data.data
}

export async function getCambodiaGames(): Promise<CambodiaGamesResponse> {
  const { data } = await api.get<ApiResponse<CambodiaGamesResponse>>('/cambodia-games')
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to fetch Cambodia games')
  }
  return data.data
}

export async function getProducts(gameCode: string): Promise<ProductsResponse> {
  const { data } = await api.get<ApiResponse<ProductsResponse>>(`/products/${gameCode}`)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to fetch products')
  }
  return data.data
}

export async function createPayment(payload: PaymentRequest): Promise<PaymentResponse> {
  const { data } = await api.post<ApiResponse<PaymentResponse>>('/payment/create', payload)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to create payment')
  }
  return data.data
}

export async function getPaymentStatus(reference: string): Promise<PaymentStatus> {
  const { data } = await api.get<ApiResponse<PaymentStatus>>(`/payment/status/${reference}`)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to get payment status')
  }
  return data.data
}

export async function createOrder(params: {
  reference: string
  game_code: string
  product_code: string
  player_id: string
  server_id?: string
  amount: number
}): Promise<OrderResponse> {
  const { data } = await api.post<ApiResponse<OrderResponse>>('/order', params)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to create order')
  }
  return data.data
}

export async function verifyPlayer(params: {
  game_code: string
  player_id: string
  server_id?: string
}): Promise<VerifyPlayerResult> {
  const { data } = await api.post<ApiResponse<VerifyPlayerResult>>('/verify-player', params)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Player verification failed')
  }
  return data.data
}

export async function checkGameId(params: {
  game: string
  userid: string
  serverid?: string
}): Promise<CheckGameIdResponse> {
  const { data } = await api.get<CheckGameIdResponse>('/check-id', { params })
  return data
}

export async function getOrder(reference: string): Promise<OrderResponse> {
  const { data } = await api.get<ApiResponse<OrderResponse>>(`/order/${reference}`)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to get order')
  }
  return data.data
}

export async function cancelOrder(reference: string): Promise<{ success: boolean; message: string; reference: string }> {
  const { data } = await api.post<ApiResponse<{ success: boolean; message: string; reference: string }>>(`/order/${reference}/cancel`)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to cancel order')
  }
  return data.data
}

export async function retryOrder(reference: string): Promise<{
  success: boolean
  message: string
  awaiting_stock?: boolean
}> {
  const { data } = await api.post<ApiResponse<{ success: boolean; message: string; awaiting_stock?: boolean }>>(`/order/${reference}/retry`)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to retry order')
  }
  return data.data
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const { data } = await api.get<ApiResponse<AdminDashboardData>>('/admin/dashboard')
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to load admin dashboard')
  }
  return data.data
}

export async function manualConfirmPayment(reference: string): Promise<{
  success: boolean
  message: string
  reference: string
  payment_status: string
  order_status: string
}> {
  const { data } = await api.post<ApiResponse<{
    success: boolean
    message: string
    reference: string
    payment_status: string
    order_status: string
  }>>(`/payment/manual-confirm/${reference}`)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to confirm payment')
  }
  return data.data
}

export async function getOrdersByPlayer(playerId: string): Promise<OrderResponse[]> {
  const { data } = await api.get<ApiResponse<OrderResponse[]>>(`/orders/player/${encodeURIComponent(playerId)}`)
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch orders')
  }
  return data.data || []
}

export async function getNewProductsConfig(): Promise<NewProductsConfig> {
  const { data } = await api.get<ApiResponse<NewProductsConfig>>('/config/new-products')
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to fetch new products config')
  }
  return data.data
}

export async function getPriceDropsByGame(gameCode: string): Promise<Record<string, number>> {
  const { data } = await api.get<ApiResponse<Record<string, number>>>(`/price-drops/${gameCode}`)
  if (!data.success || !data.data) {
    return {}
  }
  return data.data
}

export async function getResellerBalance(): Promise<BalanceInfo> {
  const { data } = await api.get<ApiResponse<BalanceInfo>>('/balance')
  if (!data.success || !data.data) {
    return { balance: 0, username: '', available: false }
  }
  return data.data
}

export default api
