import { Request, Response, NextFunction } from 'express';
import { bay2gameService } from '../services/bay2game.service';
import { HTTP_STATUS } from '../constants';
import { priceHistoryRepository } from '../repositories/PriceHistoryRepository';
import type { Bay2GameProduct } from '../types';

/**
 * Reseller profit margin applied to every product.
 * Bay2Game returns the wholesale price; we add $0.20 for our retail markup.
 */
const PROFIT_MARGIN = 0.20;

/**
 * Apply the profit margin to a product's sell_price.
 * Rounds to 2 decimal places (cents).
 */
function applyProfit(product: Bay2GameProduct): Bay2GameProduct {
  return {
    ...product,
    sell_price: Math.round((product.sell_price + PROFIT_MARGIN) * 100) / 100,
  };
}

/**
 * Detect and record price drops by comparing current prices with stored history.
 * Runs non-blocking after products are fetched.
 */
function trackPricesAsync(gameCode: string, products: Bay2GameProduct[]): void {
  priceHistoryRepository.detectAndRecordDrops(gameCode, products).catch(() => {
    // Silent — price tracking is non-critical
  });
}

// Featured top game codes — these are the top games in Cambodia
const FEATURED_GAME_CODES = ['mlbb', 'freefire_sgmy', 'pubgm', 'hok'];

export async function getCategories(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await bay2gameService.getCategories();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Categories fetched successfully',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCambodiaGames(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await bay2gameService.getCategories();

    // Sort featured games to the top, maintain order
    const featured = FEATURED_GAME_CODES.map(
      (code) => categories.find((g) => g.game_code === code)
    ).filter(Boolean) as typeof categories;

    // All other games (non-featured)
    const others = categories.filter(
      (g) => !FEATURED_GAME_CODES.includes(g.game_code)
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'All games fetched successfully',
      data: {
        featured,
        others,
        total: categories.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductsByGame(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { gameCode } = req.params;
    const { game, products } = await bay2gameService.getProductsWithGame(gameCode);

    // Apply $0.20 profit margin to each product
    const productsWithMargin = products.map(applyProfit);

    // Track price changes (non-blocking — runs in background)
    trackPricesAsync(gameCode, productsWithMargin);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Products fetched successfully',
      data: {
        game,
        products: productsWithMargin,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get recent price drops for a specific game.
 */
export async function getPriceDropsByGame(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { gameCode } = req.params;
    const drops = await priceHistoryRepository.getRecentDrops(gameCode);

    // Convert to a flat map: { product_code: drop_amount }
    const dropMap: Record<string, number> = {};
    for (const d of drops) {
      dropMap[d.product_code] = d.drop_amount;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: drops.length > 0 ? 'Price drops found' : 'No recent price drops',
      data: dropMap,
    });
  } catch (error) {
    next(error);
  }
}
