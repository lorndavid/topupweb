import { Request, Response } from 'express';
import { orderRepository } from '../repositories/OrderRepository';

/**
 * GET /admin/analytics
 * Returns revenue analytics: daily time series, per-game breakdown, and summary.
 * Query params:
 *   - period (number, default 30): 1=Today, 7=7D, 30=30D, -1=All Time
 *   - days (number, fallback): legacy support (1-365)
 */
export async function getAnalytics(req: Request, res: Response) {
  try {
    // Parse period — prefer 'period' param, fall back to 'days' for backward compat
    const period = parseInt(req.query.period as string) ||
                   parseInt(req.query.days as string) || 30;

    let startDate: Date;
    if (period <= 0) {
      // All time — use epoch (all completed orders)
      startDate = new Date(0);
    } else if (period === 1) {
      // Today — start from midnight
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      // N days back (clamped to 365)
      const days = Math.min(period, 365);
      const now = new Date();
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const data = await orderRepository.getRevenueAnalytics(startDate);

    return res.json({
      success: true,
      message: 'Analytics fetched',
      data,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
    });
  }
}
