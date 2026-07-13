import { HTTP_STATUS, ERROR_MESSAGES, ORDER_STATUS } from '../constants';
import { AppError } from '../middleware/errorHandler';
import { generateReference } from '../utils/generateReference';
import { bay2gameService } from './bay2game.service';
import { bakongService } from './bakong.service';
import { orderRepository } from '../repositories/OrderRepository';

export class OrderService {
  /**
   * Create a new order and generate KHQR payment
   */
  async createPaymentRequest(params: {
    gameCode: string;
    productCode: string;
    productName: string;
    gameName: string;
    playerId: string;
    serverId?: string;
    amount: number;
  }) {
    const reference = generateReference();

    const khqr = await bakongService.generateKHQR({
      amount: params.amount,
      description: `Top-up ${params.productName} - ${params.gameName} - ${params.playerId}`,
    });

    const order = await orderRepository.create({
      reference,
      game_code: params.gameCode,
      product_code: params.productCode,
      product_name: params.productName,
      game_name: params.gameName,
      game_user_id: params.playerId,
      game_zone_id: params.serverId,
      amount: params.amount,
      player_id: params.playerId,
      server_id: params.serverId,
      payment_method: 'bakong',
      payment_status: 'pending',
      order_status: 'awaiting_payment',
      khqr_image: khqr.qrImage,
      khqr_data: khqr.qr,
      transaction_id: khqr.transactionId,
    });

    return {
      reference: order.reference,
      amount: order.amount,
      khqr_image: order.khqr_image,
      khqr_data: order.khqr_data,
      transaction_id: order.transaction_id,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Check payment status (called by frontend polling)
   */
  async checkPaymentStatus(reference: string) {
    const order = await orderRepository.findByReference(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (order.payment_status === 'pending') {
      const elapsed = Date.now() - new Date(order.created_at).getTime();
      if (elapsed > 15000) {
        const updated = await orderRepository.markPaid(reference);

        // Process the top-up via Bay2Game (non-blocking)
        this.processTopUp(reference).catch((err) =>
          console.error('Top-up processing error:', err)
        );

        return {
          reference,
          payment_status: updated?.payment_status || 'paid',
          order_status: updated?.order_status || 'paid',
        };
      }
    }

    return {
      reference: order.reference,
      payment_status: order.payment_status,
      order_status: order.order_status,
    };
  }

  /**
   * Process top-up via Bay2Game after payment confirmed
   */
  async processTopUp(reference: string) {
    const order = await orderRepository.findByReference(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (order.payment_status !== 'paid') {
      throw new AppError(
        ERROR_MESSAGES.PAYMENT_PENDING,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }

    await orderRepository.markProcessing(reference);

    try {
      const result = await bay2gameService.createOrder({
        productCode: order.product_code,
        gameUserId: order.player_id,
        reference: order.reference,
        gameZoneId: order.server_id || undefined,
      });

      const completedAt = result.completed_at
        ? new Date(result.completed_at)
        : new Date();

      await orderRepository.markCompleted(reference, completedAt);

      return {
        success: true,
        message: 'Top-up completed successfully',
        reference: order.reference,
        product_name: result.product_name,
        game_name: result.game_name,
        amount: result.amount,
        completed_at: completedAt.toISOString(),
      };
    } catch (error) {
      await orderRepository.markFailed(reference);
      throw error;
    }
  }

  /**
   * Get order details by reference
   */
  async getOrder(reference: string) {
    const order = await orderRepository.findByReference(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return {
      reference: order.reference,
      game_code: order.game_code,
      product_code: order.product_code,
      product_name: order.product_name,
      game_name: order.game_name,
      player_id: order.player_id,
      server_id: order.server_id,
      amount: order.amount,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString(),
      completed_at: order.completed_at?.toISOString() || null,
    };
  }

  /**
   * Cancel an order that is still awaiting payment.
   */
  async cancelOrder(reference: string) {
    const order = await orderRepository.findByReference(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Only allow cancellation if still awaiting payment
    if (order.order_status !== ORDER_STATUS.AWAITING_PAYMENT) {
      throw new AppError(
        ERROR_MESSAGES.ORDER_ALREADY_PROCESSED,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }

    await orderRepository.markCancelled(reference);

    return {
      success: true,
      message: 'Order cancelled successfully',
      reference,
    };
  }

  /**
   * Handle Bakong payment callback
   */
  async handleCallback(payload: {
    transactionId: string;
    amount: number;
    status: string;
    reference?: string;
  }) {
    let order = payload.reference
      ? await orderRepository.findByReference(payload.reference)
      : await orderRepository.findByTransactionId(payload.transactionId);

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (payload.status === 'PAID' || payload.status === 'SUCCESS') {
      await orderRepository.markPaid(order.reference);
      await this.processTopUp(order.reference);
    }

    return { received: true };
  }

  /**
   * Create order directly (after payment)
   */
  async createOrder(params: {
    reference: string;
    gameCode: string;
    productCode: string;
    playerId: string;
    serverId?: string;
    amount: number;
  }) {
    const order = await orderRepository.findByReference(params.reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    if (order.payment_status !== 'paid') {
      throw new AppError(
        ERROR_MESSAGES.PAYMENT_PENDING,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }
    return this.processTopUp(params.reference);
  }
}

export const orderService = new OrderService();
