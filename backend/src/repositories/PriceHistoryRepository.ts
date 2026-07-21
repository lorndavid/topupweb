import { PriceHistoryModel } from '../models/PriceHistory';
import type { Bay2GameProduct } from '../types';

export interface PriceDrop {
  product_code: string;
  product_name: string;
  old_price: number;
  new_price: number;
  drop_amount: number;
}

export class PriceHistoryRepository {
  /**
   * Detect price drops for a set of products by comparing current prices
   * with the last known prices stored in the database.
   *
   * - Updates stored prices to the current values after comparison.
   * - Returns only products whose price has decreased.
   */
  async detectAndRecordDrops(
    gameCode: string,
    products: Bay2GameProduct[]
  ): Promise<PriceDrop[]> {
    const drops: PriceDrop[] = [];

    for (const product of products) {
      const currentPrice = product.sell_price;
      const existing = await PriceHistoryModel.findOne({
        product_code: product.product_code,
      }).lean();

      if (existing) {
        const oldPrice = existing.current_price;
        const diff = oldPrice - currentPrice;

        // Price dropped by at least $0.01
        if (diff > 0.005) {
          drops.push({
            product_code: product.product_code,
            product_name: product.name,
            old_price: Math.round(oldPrice * 100) / 100,
            new_price: Math.round(currentPrice * 100) / 100,
            drop_amount: Math.round(diff * 100) / 100,
          });

          // Update the stored price to current
          await PriceHistoryModel.updateOne(
            { product_code: product.product_code },
            {
              $set: {
                game_code: gameCode,
                product_name: product.name,
                old_price: oldPrice,
                current_price: currentPrice,
              },
            }
          );
        } else if (diff < -0.005) {
          // Price went UP — update the stored price without recording a drop
          await PriceHistoryModel.updateOne(
            { product_code: product.product_code },
            {
              $set: {
                game_code: gameCode,
                product_name: product.name,
                old_price: currentPrice,
                current_price: currentPrice,
              },
            }
          );
        }
        // else: no meaningful change, skip
      } else {
        // First time seeing this product — store as baseline, no drop
        await PriceHistoryModel.create({
          game_code: gameCode,
          product_code: product.product_code,
          product_name: product.name,
          old_price: currentPrice,
          current_price: currentPrice,
        });
      }
    }

    return drops;
  }

  /**
   * Get recent price drops (within the last N minutes) for a specific game.
   * This is the "stored" view — these drops were detected on a previous API call.
   */
  async getRecentDrops(gameCode: string): Promise<PriceDrop[]> {
    const docs = await PriceHistoryModel.find({
      game_code: gameCode,
    }).lean();

    const drops: PriceDrop[] = [];
    for (const doc of docs) {
      const diff = doc.old_price - doc.current_price;
      if (diff > 0.005) {
        drops.push({
          product_code: doc.product_code,
          product_name: doc.product_name,
          old_price: Math.round(doc.old_price * 100) / 100,
          new_price: Math.round(doc.current_price * 100) / 100,
          drop_amount: Math.round(diff * 100) / 100,
        });
      }
    }

    return drops;
  }
}

export const priceHistoryRepository = new PriceHistoryRepository();
