import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { orderCreateSchema } from '../validators';
import { HTTP_STATUS } from '../constants';
import { AppError } from '../middleware/errorHandler';
import { orderRepository } from '../repositories/OrderRepository';

export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = orderCreateSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.errors.map((e) => e.message).join(', '),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { reference, game_code, product_code, player_id, server_id, amount } = validation.data;
    const result = await orderService.createOrder({
      reference,
      gameCode: game_code,
      productCode: product_code,
      playerId: player_id,
      serverId: server_id,
      amount,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Order created and top-up processed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { reference } = req.params;

    if (!reference) {
      throw new AppError('Reference is required', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await orderService.cancelOrder(reference);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order cancelled successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { reference } = req.params;

    if (!reference) {
      throw new AppError('Reference is required', HTTP_STATUS.BAD_REQUEST);
    }

    const order = await orderService.getOrder(reference);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all orders for a specific player ID.
 * Used by the Order History page so customers can look up their past orders.
 */
export async function getOrdersByPlayer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { playerId } = req.params;

    if (!playerId) {
      throw new AppError('Player ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const orders = await orderRepository.findByPlayerId(playerId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: orders.length > 0 ? 'Orders retrieved successfully' : 'No orders found for this player ID',
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually retry an order that is awaiting stock.
 * The reseller can call this after topping up their Bay2Game wallet.
 */
export async function retryOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { reference } = req.params;

    if (!reference) {
      throw new AppError('Reference is required', HTTP_STATUS.BAD_REQUEST);
    }

    const result = await orderService.retryOrder(reference);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message || 'Order retry initiated',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
