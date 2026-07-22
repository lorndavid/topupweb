import { Request, Response } from 'express';
import { bay2gameService } from '../services/bay2game.service';
import { HTTP_STATUS } from '../constants';
import { ProductOverrideModel } from '../models/ProductOverride';

// Store profit margin configuration in memory
let profitMargins: Record<string, { type: 'percentage' | 'fixed'; value: number; min_profit?: number; max_profit?: number }> = {};

/**
 * GET /admin/products
 * Returns all products with Bay2Game cost prices and calculated sell prices based on profit margins
 * Any product with a custom price override in MongoDB will use that instead.
 */
export async function getProducts(req: Request, res: Response) {
  try {
    const { game_code } = req.query;
    const categories = await bay2gameService.getCategories();
    const games = game_code ? categories.filter((c: any) => c.game_code === game_code) : categories;

    // Fetch all price overrides from DB
    const overrides = await ProductOverrideModel.find().lean();
    const overrideMap = new Map(overrides.map((o) => [o.product_code, o.sell_price]));

    const allProducts: any[] = [];

    for (const game of games) {
      try {
        const gameData = await bay2gameService.getProductsWithGame(game.game_code);
        const margin = profitMargins[game.game_code];

        for (const product of gameData.products || []) {
          const costPrice = product.sell_price || 0; // Bay2Game's sell_price is our cost price

          // Check for custom price override
          const customPrice = overrideMap.get(product.product_code);
          let sellPrice: number;

          if (customPrice !== undefined) {
            sellPrice = customPrice;
          } else {
            // Calculate from profit margin
            let profit = 0;
            if (margin) {
              if (margin.type === 'percentage') {
                profit = costPrice * (margin.value / 100);
              } else {
                profit = margin.value;
              }
              if (margin.min_profit !== undefined && profit < margin.min_profit) profit = margin.min_profit;
              if (margin.max_profit !== undefined && profit > margin.max_profit) profit = margin.max_profit;
            } else {
              profit = costPrice * 0.15; // Default 15%
            }
            sellPrice = costPrice + profit;
          }

          const profitAmount = sellPrice - costPrice;

          allProducts.push({
            id: product.id,
            product_code: product.product_code,
            name: product.name,
            game_code: game.game_code,
            game_name: game.name,
            cost_price: Math.round(costPrice * 100) / 100,
            sell_price: Math.round(sellPrice * 100) / 100,
            profit_amount: Math.round(profitAmount * 100) / 100,
            profit_percent: costPrice > 0 ? Math.round((profitAmount / costPrice) * 1000) / 10 : 0,
            status: product.status || 'active',
            currency: 'USD',
            has_override: customPrice !== undefined,
          });
        }
      } catch (err) {
        console.warn(`Could not fetch products for ${game.game_code}:`, err);
      }
    }

    return res.json({
      success: true,
      message: 'Products fetched successfully',
      data: allProducts,
    });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
}

/**
 * PUT /admin/products/profit
 * Update the sell price for a specific product — persisted to MongoDB.
 */
export async function updateProductProfit(req: Request, res: Response) {
  try {
    const { product_code, sell_price, game_code } = req.body;

    if (!product_code || sell_price === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Product code and sell price are required',
      });
    }

    // Upsert the price override in MongoDB
    await ProductOverrideModel.findOneAndUpdate(
      { product_code },
      {
        product_code,
        game_code: game_code || '',
        sell_price,
        notes: `Manual override set by admin`,
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[Admin] Price override saved — ${product_code} → $${sell_price}`);

    return res.json({
      success: true,
      message: `Product ${product_code} sell price updated to $${sell_price}`,
    });
  } catch (error) {
    console.error('Error updating product profit:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update product profit',
    });
  }
}

/**
 * DELETE /admin/products/override/:productCode
 * Remove a custom price override so the product falls back to auto-calculated profit margin.
 */
export async function deleteProductOverride(req: Request, res: Response) {
  try {
    const { productCode } = req.params;
    const result = await ProductOverrideModel.deleteOne({ product_code: productCode });

    if (result.deletedCount === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'No override found for this product',
      });
    }

    console.log(`[Admin] Price override removed — ${productCode}`);

    return res.json({
      success: true,
      message: `Price override removed for ${productCode}. Will use auto-calculated margin.`,
    });
  } catch (error) {
    console.error('Error deleting product override:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to remove price override',
    });
  }
}

/**
 * GET /admin/profit-margins
 * Returns current profit margin settings for all games
 */
export async function getProfitMargins(_req: Request, res: Response) {
  try {
    const categories = await bay2gameService.getCategories();
    const margins = categories.map((cat: any) => ({
      game_code: cat.game_code,
      game_name: cat.name,
      type: profitMargins[cat.game_code]?.type || 'percentage',
      value: profitMargins[cat.game_code]?.value || 15,
      min_profit: profitMargins[cat.game_code]?.min_profit,
      max_profit: profitMargins[cat.game_code]?.max_profit,
    }));

    return res.json({
      success: true,
      message: 'Profit margins fetched successfully',
      data: margins,
    });
  } catch (error) {
    console.error('Error fetching profit margins:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch profit margins',
    });
  }
}

/**
 * POST /admin/profit-margins
 * Save profit margin for a specific game
 */
export async function saveProfitMargin(req: Request, res: Response) {
  try {
    const { game_code, type, value, min_profit, max_profit } = req.body;

    if (!game_code || !type || value === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Game code, type, and value are required',
      });
    }

    profitMargins[game_code] = { type, value, min_profit, max_profit };
    console.log(`[Admin] Profit margin for ${game_code}: ${type} ${value}${min_profit ? ` (min $${min_profit})` : ''}${max_profit ? ` (max $${max_profit})` : ''}`);

    return res.json({
      success: true,
      message: `Profit margin saved for ${game_code}`,
    });
  } catch (error) {
    console.error('Error saving profit margin:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to save profit margin',
    });
  }
}

/**
 * POST /admin/profit-margins/batch
 * Save multiple profit margins at once
 */
export async function saveProfitMarginsBatch(req: Request, res: Response) {
  try {
    const { margins } = req.body;

    if (!Array.isArray(margins) || margins.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Margins array is required',
      });
    }

    margins.forEach((m: any) => {
      if (m.game_code && m.type && m.value !== undefined) {
        profitMargins[m.game_code] = {
          type: m.type,
          value: m.value,
          min_profit: m.min_profit,
          max_profit: m.max_profit,
        };
      }
    });

    console.log(`[Admin] Batch updated ${margins.length} profit margins`);
    return res.json({
      success: true,
      message: `${margins.length} profit margins saved successfully`,
    });
  } catch (error) {
    console.error('Error saving profit margins batch:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to save profit margins',
    });
  }
}

/**
 * GET /admin/games
 * Returns all games with summary stats
 */
export async function getGames(_req: Request, res: Response) {
  try {
    const categories = await bay2gameService.getCategories();

    const games = categories.map((cat: any) => {
      const margin = profitMargins[cat.game_code];
      return {
        game_code: cat.game_code,
        name: cat.name,
        description: cat.description || '',
        image_url: cat.image_url || '',
        status: 'active',
        total_products: 0,
        total_orders: 0,
        revenue: 0,
        profit_margin: margin || null,
      };
    });

    return res.json({
      success: true,
      message: 'Games fetched successfully',
      data: games,
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch games',
    });
  }
}
