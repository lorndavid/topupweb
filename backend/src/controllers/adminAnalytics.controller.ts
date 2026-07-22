import { Request, Response } from 'express';
import { orderRepository } from '../repositories/OrderRepository';

/**
 * GET /admin/analytics
 * Returns revenue analytics: daily time series, per-game breakdown, and summary.
 * Query params:
 *   - days (number, default 30): number of days to look back
 */
export async function getAnalytics(req: Request, res: Response) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);

    const data = await orderRepository.getRevenueAnalytics(days);

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
