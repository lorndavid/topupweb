import { Order, OrderStatus } from '../types';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { AppError } from '../middleware/errorHandler';
import { generateReference } from '../utils/generateReference';
import { bay2gameService } from './bay2game.service';
import { bakongService } from './bakong.service';

// In-memory order store (for localhost MVP)
// In production, this would be a database
const orders = new Map<string, Order>();

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

    // Generate KHQR for payment
    const khqr = await bakongService.generateKHQR({
      amount: params.amount,
      description: `Top-up ${params.productName} - ${params.gameName} - ${params.playerId}`,
    });

    const order: Order = {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    orders.set(reference, order);

    return {
      reference: order.reference,
      amount: order.amount,
      khqr_image: order.khqr_image,
      khqr_data: order.khqr_data,
      transaction_id: order.transaction_id,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
    };
  }

  /**
   * Check payment status (called by frontend polling)
   */
  async checkPaymentStatus(reference: string) {
    const order = orders.get(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // For localhost, simulate payment detection
    // In production, this would check the Bakong API
    if (order.payment_status === 'pending') {
      // Simulate payment after a few seconds for testing
      const elapsed = Date.now() - new Date(order.created_at).getTime();
      if (elapsed > 15000) {
        // Auto-mark as paid after 15 seconds for demo
        order.payment_status = 'paid';
        order.order_status = 'paid';
        order.updated_at = new Date().toISOString();
        orders.set(reference, order);

        // Process the top-up via Bay2Game
        this.processTopUp(reference).catch(console.error);
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
    const order = orders.get(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (order.payment_status !== 'paid') {
      throw new AppError(
        ERROR_MESSAGES.PAYMENT_PENDING,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }

    order.order_status = 'processing';
    order.updated_at = new Date().toISOString();
    orders.set(reference, order);

    try {
      const result = await bay2gameService.createOrder({
        productCode: order.product_code,
        gameUserId: order.player_id,
        reference: order.reference,
        gameZoneId: order.server_id,
      });

      order.order_status = 'completed';
      order.payment_status = 'paid';
      order.completed_at = result.completed_at || new Date().toISOString();
      order.updated_at = new Date().toISOString();
      orders.set(reference, order);

      return {
        success: true,
        message: 'Top-up completed successfully',
        reference: order.reference,
        product_name: result.product_name,
        game_name: result.game_name,
        amount: result.amount,
        completed_at: order.completed_at,
      };
    } catch (error) {
      order.order_status = 'failed';
      order.updated_at = new Date().toISOString();
      orders.set(reference, order);

      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrder(reference: string) {
    const order = orders.get(reference);
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
      created_at: order.created_at,
      updated_at: order.updated_at,
      completed_at: order.completed_at,
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
    // Find order by transaction ID or reference
    let order: Order | undefined;

    if (payload.reference) {
      order = orders.get(payload.reference);
    } else {
      order = Array.from(orders.values()).find(
        (o) => o.transaction_id === payload.transactionId
      );
    }

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (payload.status === 'PAID' || payload.status === 'SUCCESS') {
      order.payment_status = 'paid';
      order.order_status = 'paid';
      order.updated_at = new Date().toISOString();
      orders.set(order.reference, order);

      // Process the top-up
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
    const order = orders.get(params.reference);
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
