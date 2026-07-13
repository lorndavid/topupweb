import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { paymentCreateSchema, paymentCallbackSchema } from '../validators';
import { HTTP_STATUS } from '../constants';
import { AppError } from '../middleware/errorHandler';

export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = paymentCreateSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.errors.map((e) => e.message).join(', '),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { game_code, product_code, product_name, game_name, player_id, server_id, amount } = validation.data;
    const result = await orderService.createPaymentRequest({
      gameCode: game_code,
      productCode: product_code,
      productName: product_name,
      gameName: game_name,
      playerId: player_id,
      serverId: server_id,
      amount,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Payment request created',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { reference } = req.params;

    if (!reference) {
      throw new AppError('Reference is required', HTTP_STATUS.BAD_REQUEST);
    }

    const status = await orderService.checkPaymentStatus(reference);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Payment status retrieved',
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = paymentCallbackSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError('Invalid callback payload', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await orderService.handleCallback(validation.data);

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    next(error);
  }
}
