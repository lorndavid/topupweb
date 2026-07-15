import { Request, Response, NextFunction } from 'express';
import { bay2gameService } from '../services/bay2game.service';
import { HTTP_STATUS } from '../constants';

// Cambodia-only game codes — these are the top games in Cambodia
const CAMBODIA_GAME_CODES = ['mlbb', 'freefire_sgmy', 'pubgm', 'hok'];

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
    const cambodiaGames = categories.filter((g) =>
      CAMBODIA_GAME_CODES.includes(g.game_code)
    );

    // Sort in the same order as the CAMBODIA_GAME_CODES array
    const sorted = CAMBODIA_GAME_CODES.map(
      (code) => cambodiaGames.find((g) => g.game_code === code)
    ).filter(Boolean);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Cambodia games fetched successfully',
      data: sorted,
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
