import axios from 'axios'
import type {
  ApiResponse,
  GameCategory,
  ProductsResponse,
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  OrderResponse,
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
}): Promise<{ verified: boolean; nickname?: string; playerId: string; provider?: string }> {
  const { data } = await api.post<ApiResponse<{ verified: boolean; nickname?: string; playerId: string; provider?: string }>>('/verify-player', params)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Player verification failed')
  }
  return data.data
}

export async function getOrder(reference: string): Promise<OrderResponse> {
  const { data } = await api.get<ApiResponse<OrderResponse>>(`/order/${reference}`)
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to get order')
  }
  return data.data
}

export default api
