import { Request, Response, NextFunction } from 'express';
import { bay2gameCheckService } from '../services/bay2gameCheck.service';
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
    const result = await bay2gameCheckService.verifyPlayer({
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

export async function checkGameId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { game, userid, serverid } = req.query;

    if (!game || !userid) {
      throw new AppError(
        'Game code and user ID are required',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const result = await bay2gameCheckService.checkId({
      game: game as string,
      userid: userid as string,
      serverid: serverid as string || undefined,
    });

    res.status(HTTP_STATUS.OK).json({
      success: result.status === 'APPROVED',
      message: result.message,
      data: {
        status: result.status,
        username: result.username,
        region: result.region,
        game_title: result.game_title,
        timestamp: result.timestamp,
        developer: result.developer,
      },
    });
  } catch (error) {
    next(error);
  }
}
