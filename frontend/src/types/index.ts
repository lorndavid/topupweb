export interface GameCategory {
  game_code: string
  name: string
  description: string
  image_url: string
  game_fields: string[]
}

export interface GameProduct {
  id: number
  product_code: string
  name: string
  sell_price: number
  status: string
}

export interface GameDetail {
  game_code: string
  name: string
  description: string
  image_url: string
}

export interface ProductsResponse {
  game: GameDetail
  products: GameProduct[]
}

export interface PaymentRequest {
  game_code: string
  product_code: string
  product_name: string
  game_name: string
  player_id: string
  server_id?: string
  amount: number
}

export interface PaymentResponse {
  reference: string
  amount: number
  khqr_image?: string
  khqr_data?: string
  transaction_id?: string
  expires_at: string
}

export interface PaymentStatus {
  reference: string
  payment_status: 'pending' | 'paid' | 'failed'
  order_status: string
}

export interface OrderResponse {
  reference: string
  game_code: string
  product_code: string
  product_name: string
  game_name: string
  player_id: string
  server_id?: string
  amount: number
  payment_method: string
  payment_status: string
  order_status: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface OrderSummary {
  gameName: string
  gameCode: string
  productName: string
  productCode: string
  amount: number
  playerId: string
  serverId?: string
  verifyProvider?: string
}
