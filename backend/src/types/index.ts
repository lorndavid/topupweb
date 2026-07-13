export interface Bay2GameUser {
  id: number;
  telegram_id: number;
  username: string;
  balance: number;
  status: string;
  role: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Bay2GameCategory {
  game_code: string;
  name: string;
  description: string;
  image_url: string;
  game_fields: string[];
}

export interface Bay2GameProduct {
  id: number;
  product_code: string;
  name: string;
  sell_price: number;
  status: string;
}

export interface Bay2GameOrder {
  status: string;
  message: string;
  reference: string;
  product_name: string;
  game_name: string;
  game_user_id: string;
  game_zone_id?: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
  completed_at: string;
}

export interface Bay2GameCheckOrder {
  status: string;
  order: {
    transaction_id: string;
    product_name: string;
    product_code: string;
    game_name: string;
    game_code: string;
    game_user_id: string;
    game_zone_id?: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    status: string;
    created_at: string;
    completed_at: string;
  };
}

export type OrderStatus = 'pending' | 'awaiting_payment' | 'paid' | 'processing' | 'completed' | 'failed';

export interface Order {
  reference: string;
  game_code: string;
  product_code: string;
  product_name: string;
  game_name: string;
  game_user_id: string;
  game_zone_id?: string;
  amount: number;
  player_id: string;
  server_id?: string;
  payment_method: 'bakong';
  payment_status: 'pending' | 'paid' | 'failed';
  order_status: OrderStatus;
  khqr_image?: string;
  khqr_data?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface PaymentRequest {
  game_code: string;
  product_code: string;
  player_id: string;
  server_id?: string;
  amount: number;
}

export interface CreateOrderRequest {
  reference: string;
  game_code: string;
  product_code: string;
  player_id: string;
  server_id?: string;
  amount: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
