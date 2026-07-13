import { Request, Response, NextFunction } from 'express';
import { bay2gameService } from '../services/bay2game.service';
import { verifyPlayerSchema } from '../validators';
import { HTTP_STATUS } from '../constants';
import { AppError } from '../middleware/errorHandler';

export async function verifyPlayer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = verifyPlayerSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.errors.map((e) => e.message).join(', '),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { game_code, player_id, server_id } = validation.data;
    const result = await bay2gameService.verifyPlayer({
      gameCode: game_code,
      playerId: player_id,
      serverId: server_id,
    });

    if (!result.verified) {
      res.status(HTTP_STATUS.OK).json({
        success: false,
        message: 'Player verification failed',
        data: result,
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Player verified successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
