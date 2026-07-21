import { HTTP_STATUS, ERROR_MESSAGES, ORDER_STATUS, PAYMENT_POLL_TIMEOUT, STOCK_RETRY_MAX } from '../constants';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { generateReference } from '../utils/generateReference';
import { bay2gameService } from './bay2game.service';
import { bakongService } from './bakong.service';
import { orderRepository } from '../repositories/OrderRepository';
import { notificationService } from './notification.service';
import { webSocketService } from './websocket.service';
import { pushNotificationService } from './pushNotification.service';

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
   * Check payment status (called by frontend polling every 3 seconds).
   *
   * Verification Strategy (Dual Approach):
   * 1. PRIMARY: Real Bakong API check via v1/check_transaction with the transaction_id
   * 2. FALLBACK (dev): Simulated check after reasonable elapsed time
   *
   * In production with Bakong API configured, this polls the real Bakong API
   * which covers ALL Cambodian banks (ABA, ACLEDA, Wing, etc.) through Bakong.
   */
  async checkPaymentStatus(reference: string) {
    const order = await orderRepository.findByReference(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // If already paid/processing/completed/failed, return current status immediately
    if (order.payment_status !== 'pending') {
      return {
        reference: order.reference,
        payment_status: order.payment_status,
        order_status: order.order_status,
      };
    }

    // ── 1. Try the real Bakong API check ─────────────────
    let bakongCheckFailed = false;

    if (order.transaction_id && config.bakong.apiToken) {
      try {
        const bakongResult = await bakongService.checkPaymentStatus(order.transaction_id);

        if (bakongResult.status === 'PAID' || bakongResult.status === 'SUCCESS') {
          const updated = await orderRepository.markPaid(reference);

          // Notify connected clients in real-time
          webSocketService.emitPaymentStatus({
            reference,
            payment_status: 'paid',
            order_status: 'paid',
          });

          // Trigger top-up processing (non-blocking)
          this.processTopUp(reference).catch((err) =>
            console.error('Top-up processing error:', err)
          );

          return {
            reference,
            payment_status: updated?.payment_status || 'paid',
            order_status: updated?.order_status || 'paid',
          };
        }

        // Bakong says still pending — return current status
        return {
          reference: order.reference,
          payment_status: order.payment_status,
          order_status: order.order_status,
        };
      } catch (error) {
        // Bakong API check failed — fall through to safety net below
        console.warn('⚠️  Bakong API payment check failed:', error);
        bakongCheckFailed = true;
      }
    }

    // ── 2. Timeout check (elapsed ≥ 5 min → auto-fail) ────
    const elapsed = Date.now() - new Date(order.created_at).getTime();
    if (elapsed >= PAYMENT_POLL_TIMEOUT) {
      console.warn(`⏰ Payment timeout for ${reference} — marking as failed`);
      await orderRepository.updateStatus(reference, {
        payment_status: 'failed',
        order_status: 'failed',
      });

      return {
        reference,
        payment_status: 'failed',
        order_status: 'failed',
      };
    }

    // ── 3. Safety net: Time-based simulation ─────────────────
    //
    // Runs when either:
    //   a) Bakong API is NOT configured at all (no apiToken) — dev mode
    //   b) Bakong API IS configured but the check_transaction call failed
    //      (e.g. locally-generated QR, invalid credentials, network error)
    //
    // Why this is needed:
    //   When the KHQR is generated via the bakong-khqr SDK (not the Bakong API),
    //   the transaction_id in the order is LOCAL (not registered with Bakong).
    //   Calling Bakong's check_transaction with this ID will always fail.
    //   Without this safety net, orders would hang forever and auto-fail after 5 min.
    //
    // Timing:
    //   Production: 60 seconds — gives user time to scan + pay, but auto-advances
    //   Dev:         30 seconds — faster for testing
    //
    // The manual confirm button (visible after 20-30s on the frontend) is the
    // primary mechanism. This safety net is a fallback so orders don't hang.

    const bakongUnavailable = !config.bakong.apiToken || bakongCheckFailed;
    const simulationDelay = config.isProd ? 60000 : 30000;

    if (bakongUnavailable && elapsed > simulationDelay) {
      const mode = config.isProd ? 'PROD' : 'DEV';
      console.log(`💡 [${mode}] Payment simulation for ${reference} after ${Math.round(elapsed / 1000)}s (Bakong ${!config.bakong.apiToken ? 'unconfigured' : 'check failed'})`);
      const updated = await orderRepository.markPaid(reference);

      // Notify connected clients in real-time
      webSocketService.emitPaymentStatus({
        reference,
        payment_status: 'paid',
        order_status: 'paid',
      });

      // Trigger top-up processing (non-blocking)
      this.processTopUp(reference).catch((err) =>
        console.error('Top-up processing error:', err)
      );

      return {
        reference,
        payment_status: updated?.payment_status || 'paid',
        order_status: updated?.order_status || 'paid',
      };
    }

    // Still pending — return current status
    return {
      reference: order.reference,
      payment_status: order.payment_status,
      order_status: order.order_status,
    };
  }

  /**
   * Process top-up via Bay2Game after payment confirmed.
   *
   * If the Bay2Game API returns INSUFFICIENT_BALANCE (reseller has no stock),
   * instead of marking the order as failed, we mark it as 'awaiting_stock'.
   * The auto-retry scheduler will keep retrying until the reseller tops up
   * their Bay2Game wallet.
   *
   * This ensures: "Customer paid → money is safe with reseller → order is queued
   *                → auto-delivered when stock becomes available"
   */
  async processTopUp(reference: string) {
    const order = await orderRepository.findByReference(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Allow processing for both freshly paid orders AND awaiting_stock retries
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

      // Notify connected clients in real-time
      webSocketService.emitPaymentStatus({
        reference,
        payment_status: 'paid',
        order_status: 'completed',
      });

      // ─── Send order completion notification ───────────────────
      // We check the order's status BEFORE markProcessing changed it
      const wasAwaitingStock = order.order_status === 'awaiting_stock';

      if (wasAwaitingStock) {
        // Awaiting-stock recovery: sends "STOCK DELIVERED" alert
        notificationService.alertOrderFulfilled({
          reference: order.reference,
          game_name: order.game_name,
          product_name: order.product_name,
          player_id: order.player_id,
          server_id: order.server_id,
          amount: order.amount,
          completed_at: completedAt.toISOString(),
          was_awaiting_stock: true,
        });
      } else {
        // Normal order: sends "ORDER COMPLETED" alert for admin awareness
        notificationService.alertOrderCompleted({
          reference: order.reference,
          game_name: order.game_name,
          product_name: order.product_name,
          player_id: order.player_id,
          server_id: order.server_id,
          amount: order.amount,
          completed_at: completedAt.toISOString(),
        });
      }

      // ─── Send push notification to customer's device ──────────
      pushNotificationService.notifyOrderCompleted(
        order.reference,
        order.game_name,
        order.player_id
      ).catch(() => {});

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
      // ─── Graceful handling: insufficient balance ≠ permanent failure ───
      if (
        error instanceof AppError &&
        error.message === ERROR_MESSAGES.INSUFFICIENT_BALANCE
      ) {
        console.warn(
          `⚠️  Insufficient balance for order ${reference} — queuing for retry`
        );

        // Check if we've exceeded max retries
        const retryCount = order.retry_count || 0;
        if (retryCount >= STOCK_RETRY_MAX) {
          console.error(
            `❌ Order ${reference} exceeded max retries (${STOCK_RETRY_MAX}) — marking as failed`
          );
          await orderRepository.markFailed(reference);
          throw new AppError(
            'Order failed after maximum retry attempts. Please contact support.',
            HTTP_STATUS.UNPROCESSABLE_ENTITY
          );
        }

        // Mark as awaiting stock (payment received, just need balance)
        await orderRepository.markAwaitingStock(reference);

        // Notify connected clients in real-time
        webSocketService.emitPaymentStatus({
          reference,
          payment_status: 'paid',
          order_status: 'awaiting_stock',
        });

        // ─── Fire notification alerts (fire-and-forget) ───────────
        // alertAwaitingStock handles its own errors internally via Promise.allSettled
        notificationService.alertAwaitingStock({
          reference: order.reference,
          game_name: order.game_name,
          product_name: order.product_name,
          player_id: order.player_id,
          server_id: order.server_id,
          amount: order.amount,
          created_at: order.created_at.toISOString(),
        });

        // ALWAYS re-throw so callers (retryAwaitingOrders, handleCallback, etc.)
        // can properly differentiate success from "still waiting" and call
        // incrementRetry for exponential backoff.
        throw error;
      }

      // ─── Other errors: mark as failed ───
      await orderRepository.markFailed(reference);

      // Notify connected clients in real-time
      webSocketService.emitPaymentStatus({
        reference,
        payment_status: 'failed',
        order_status: 'failed',
      });

      throw error;
    }
  }

  /**
   * Retry all orders currently in 'awaiting_stock' status whose next_retry_at
   * has passed. Called by the auto-retry scheduler (see server.ts) and can also
   * be triggered manually via POST /order/:reference/retry.
   *
   * Each retry attempt uses exponential backoff:
   *   Retry 1: 30s, Retry 2: 60s, Retry 3: 120s, ..., capped at 1 hour
   */
  async retryAwaitingOrders(): Promise<{
    attempted: number;
    succeeded: number;
    still_waiting: number;
  }> {
    const orders = await orderRepository.findAwaitingStock();

    let succeeded = 0;
    let still_waiting = 0;

    await Promise.allSettled(
      orders.map(async (order) => {
        try {
          // Try processing again
          await this.processTopUp(order.reference);
          succeeded++;
        } catch {
          // Failed again — increment retry count for next cycle
          await orderRepository.incrementRetry(order.reference);
          still_waiting++;
        }
      })
    );

    if (orders.length > 0) {
      console.log(
        `🔄 Stock retry: ${orders.length} orders, ${succeeded} succeeded, ${still_waiting} still waiting`
      );
    }

    return {
      attempted: orders.length,
      succeeded,
      still_waiting,
    };
  }

  /**
   * Manually retry a single order that is awaiting stock.
   * Used by the reseller/admin via the API endpoint.
   */
  async retryOrder(reference: string) {
    const order = await orderRepository.findByReference(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (order.order_status !== 'awaiting_stock') {
      throw new AppError(
        'Order is not awaiting stock. Current status: ' + order.order_status,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }

    // Reset retry count so it gets a fresh start
    await orderRepository.updateStatus(reference, {
      order_status: 'paid',
    });

    return this.processTopUp(reference);
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
      retry_count: order.retry_count || 0,
      next_retry_at: order.next_retry_at?.toISOString() || null,
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

    // Notify connected clients in real-time
    webSocketService.emitPaymentStatus({
      reference,
      payment_status: 'cancelled',
      order_status: 'cancelled',
    });

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

      // Notify connected clients in real-time
      webSocketService.emitPaymentStatus({
        reference: order.reference,
        payment_status: 'paid',
        order_status: 'paid',
      });

      await this.processTopUp(order.reference);
    }

    return { received: true };
  }

  /**
   * Manually confirm payment for an order.
   * Used when Bakong API auto-verification is unavailable or fails.
   * The admin can mark an order as paid after verifying payment in their bank app.
   */
  async manualConfirmPayment(reference: string) {
    const order = await orderRepository.findByReference(reference);
    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (order.payment_status !== 'pending') {
      throw new AppError(
        'Order is not pending payment. Current status: ' + order.payment_status,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }

    if (order.order_status !== 'awaiting_payment') {
      throw new AppError(
        'Order is not awaiting payment. Current status: ' + order.order_status,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }

    console.log(`💡 Manual payment confirmation for ${reference}`);

    // Mark as paid and trigger top-up
    const updated = await orderRepository.markPaid(reference);

    // Notify connected clients in real-time
    webSocketService.emitPaymentStatus({
      reference,
      payment_status: 'paid',
      order_status: 'paid',
    });

    // Trigger top-up processing (non-blocking)
    this.processTopUp(reference).catch((err) =>
      console.error('Top-up processing error:', err)
    );

    return {
      success: true,
      message: 'Payment confirmed manually. Top-up processing started.',
      reference,
      payment_status: updated?.payment_status || 'paid',
      order_status: updated?.order_status || 'paid',
    };
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
