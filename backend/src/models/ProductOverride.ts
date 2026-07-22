import mongoose, { Schema, Document } from 'mongoose';

export interface IProductOverride extends Document {
  product_code: string;
  game_code: string;
  sell_price: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const ProductOverrideSchema = new Schema<IProductOverride>(
  {
    product_code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    game_code: {
      type: String,
      required: true,
      index: true,
    },
    sell_price: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'product_overrides',
  }
);

export const ProductOverrideModel = mongoose.model<IProductOverride>(
  'ProductOverride',
  ProductOverrideSchema
);
