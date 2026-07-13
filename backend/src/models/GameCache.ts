import mongoose, { Schema, Document } from 'mongoose';

export type CacheType = 'categories' | 'products';

export interface IGameCache extends Document {
  cache_type: CacheType;
  cache_key: string; // 'all' for categories, game_code for products
  data: unknown;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

const GameCacheSchema = new Schema<IGameCache>(
  {
    cache_type: {
      type: String,
      enum: ['categories', 'products'],
      required: true,
    },
    cache_key: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index — MongoDB auto-deletes expired docs
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'game_cache',
  }
);

// Compound index for efficient lookups
GameCacheSchema.index({ cache_type: 1, cache_key: 1 }, { unique: true });

export const GameCacheModel = mongoose.model<IGameCache>(
  'GameCache',
  GameCacheSchema
);
