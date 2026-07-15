import { Request, Response, NextFunction } from 'express';
import { bay2gameService } from '../services/bay2game.service';
import { HTTP_STATUS } from '../constants';

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

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Products fetched successfully',
      data: {
        game,
        products,
      },
    });
  } catch (error) {
    next(error);
  }
}
