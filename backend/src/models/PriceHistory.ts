import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistory extends Document {
  game_code: string;
  product_code: string;
  product_name: string;
  old_price: number;
  current_price: number;
  updated_at: Date;
}

const PriceHistorySchema = new Schema<IPriceHistory>(
  {
    game_code: { type: String, required: true, index: true },
    product_code: { type: String, required: true },
    product_name: { type: String, required: true },
    old_price: { type: Number, required: true },
    current_price: { type: Number, required: true },
  },
  {
    timestamps: { updatedAt: 'updated_at', createdAt: false },
    collection: 'price_history',
  }
);

// Compound index: one doc per product_code
PriceHistorySchema.index({ product_code: 1 }, { unique: true });

export const PriceHistoryModel = mongoose.model<IPriceHistory>(
  'PriceHistory',
  PriceHistorySchema
);
