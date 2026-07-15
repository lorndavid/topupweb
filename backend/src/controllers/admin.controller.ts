import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { bay2gameService } from '../services/bay2game.service';
import { orderRepository } from '../repositories/OrderRepository';
import { HTTP_STATUS } from '../constants';
import { AppError } from '../middleware/errorHandler';

/**
 * Get the admin dashboard data:
 *   - Bay2Game profile (balance, username, etc.)
 *   - Order stats (total orders by status)
 *   - All awaiting_stock orders with retry info
 */
export async function getAdminDashboard(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ── 1. Fetch Bay2Game profile ───────────────────────
    let profile = null;
    try {
      profile = await bay2gameService.getUserProfile();
    } catch {
      // Profile fetch may fail if API key is invalid — that's okay
      console.warn('⚠️  Could not fetch Bay2Game profile for admin dashboard');
    }

    // ── 2. Fetch order stats ────────────────────────────
    const allOrders = await orderRepository.findAll();

    const totalOrders = allOrders.length;
    const awaitingStock = allOrders.filter((o) => o.order_status === 'awaiting_stock');
    const completed = allOrders.filter((o) => o.order_status === 'completed');
    const failed = allOrders.filter((o) => o.order_status === 'failed');
    const awaitingPayment = allOrders.filter((o) => o.order_status === 'awaiting_payment');
    const processing = allOrders.filter((o) => o.order_status === 'processing');
    const cancelled = allOrders.filter((o) => o.order_status === 'cancelled');

    const totalRevenue = completed.reduce((sum, o) => sum + o.amount, 0);
    const pendingRevenue = awaitingStock.reduce((sum, o) => sum + o.amount, 0);

    // ── 3. Respond ──────────────────────────────────────
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Admin dashboard data retrieved',
      data: {
        profile: profile
          ? {
              username: profile.username,
              balance: profile.balance,
              total_orders: profile.total_orders,
              total_spent: profile.total_spent,
            }
          : null,
        stats: {
          total_orders: totalOrders,
          awaiting_stock: awaitingStock.length,
          completed: completed.length,
          failed: failed.length,
          awaiting_payment: awaitingPayment.length,
          processing: processing.length,
          cancelled: cancelled.length,
          total_revenue: totalRevenue,
          pending_revenue: pendingRevenue,
        },
        awaiting_stock_orders: awaitingStock.map((o) => ({
          reference: o.reference,
          game_code: o.game_code,
          product_name: o.product_name,
          game_name: o.game_name,
          player_id: o.player_id,
          server_id: o.server_id,
          amount: o.amount,
          retry_count: o.retry_count || 0,
          next_retry_at: o.next_retry_at?.toISOString() || null,
          created_at: o.created_at.toISOString(),
          updated_at: o.updated_at.toISOString(),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
