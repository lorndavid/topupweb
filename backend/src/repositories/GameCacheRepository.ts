import { GameCacheModel, CacheType } from '../models/GameCache';
import type { Bay2GameCategory, Bay2GameProduct } from '../types';

/** Default cache TTL: 30 minutes */
const CACHE_TTL_MS = 30 * 60 * 1000;

export type CachedGameData = Bay2GameCategory[];
export type CachedProductsData = {
  game: { game_code: string; name: string; description: string; image_url: string };
  products: Bay2GameProduct[];
};

export class GameCacheRepository {
  /**
   * Get cached categories (if fresh)
   */
  async getCategories(): Promise<CachedGameData | null> {
    const doc = await GameCacheModel.findOne({
      cache_type: 'categories',
      cache_key: 'all',
      expires_at: { $gt: new Date() },
    });
    return doc ? (doc.data as CachedGameData) : null;
  }

  /**
   * Set cached categories with TTL
   */
  async setCategories(categories: CachedGameData): Promise<void> {
    await GameCacheModel.findOneAndUpdate(
      { cache_type: 'categories', cache_key: 'all' },
      {
        $set: {
          data: categories,
          expires_at: new Date(Date.now() + CACHE_TTL_MS),
        },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Get cached products for a specific game (if fresh)
   */
  async getProducts(gameCode: string): Promise<CachedProductsData | null> {
    const doc = await GameCacheModel.findOne({
      cache_type: 'products',
      cache_key: gameCode,
      expires_at: { $gt: new Date() },
    });
    return doc ? (doc.data as CachedProductsData) : null;
  }

  /**
   * Set cached products for a specific game with TTL
   */
  async setProducts(
    gameCode: string,
    data: CachedProductsData
  ): Promise<void> {
    await GameCacheModel.findOneAndUpdate(
      { cache_type: 'products', cache_key: gameCode },
      {
        $set: {
          data,
          expires_at: new Date(Date.now() + CACHE_TTL_MS),
        },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Invalidate all cached data (useful after a known API update)
   */
  async invalidateAll(): Promise<void> {
    await GameCacheModel.deleteMany({});
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{
    categoriesCached: boolean;
    productsCached: number;
  }> {
    const [categoriesDoc, productsCount] = await Promise.all([
      GameCacheModel.findOne({ cache_type: 'categories', cache_key: 'all' }),
      GameCacheModel.countDocuments({ cache_type: 'products' }),
    ]);

    const categoriesCached =
      !!categoriesDoc && categoriesDoc.expires_at > new Date();

    return {
      categoriesCached,
      productsCached: productsCount,
    };
  }
}

export const gameCacheRepository = new GameCacheRepository();
