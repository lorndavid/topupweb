import mongoose, { Schema, Document } from 'mongoose';
import type { OrderStatus } from '../types';

export interface IOrder extends Document {
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
  retry_count?: number;
  next_retry_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    game_code: { type: String, required: true },
    product_code: { type: String, required: true },
    product_name: { type: String, required: true },
    game_name: { type: String, required: true },
    game_user_id: { type: String, required: true },
    game_zone_id: { type: String },
    amount: { type: Number, required: true },
    player_id: { type: String, required: true },
    server_id: { type: String },
    payment_method: {
      type: String,
      enum: ['bakong'],
      default: 'bakong',
    },
    payment_status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    order_status: {
      type: String,
      enum: [
        'pending',
        'awaiting_payment',
        'paid',
        'processing',
        'awaiting_stock',
        'completed',
        'failed',
        'cancelled',
      ],
      default: 'awaiting_payment',
    },
    khqr_image: { type: String },
    khqr_data: { type: String },
    transaction_id: {
      type: String,
      index: true,
      sparse: true,
    },
    retry_count: { type: Number, default: 0 },
    next_retry_at: { type: Date },
    completed_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'orders',
  }
);

// Compound index for common queries
OrderSchema.index({ reference: 1, transaction_id: 1 });

// Index for stock retry queries (findAwaitingStock)
OrderSchema.index({ order_status: 1, next_retry_at: 1 });

// Index for order history queries (findByPlayerId)
OrderSchema.index({ player_id: 1, created_at: -1 });

export const OrderModel = mongoose.model<IOrder>('Order', OrderSchema);
