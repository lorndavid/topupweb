import { OrderModel as Order } from '../models/Order';
import { ORDER_STATUS } from '../constants';

export interface AdminOrderQuery {
  page: number;
  limit: number;
  status?: string;
  gameCode?: string;
  search?: string;
}

export class OrderRepository {
  async create(data: any) {
    const order = new Order(data);
    return order.save();
  }

  async findByReference(reference: string) {
    return Order.findOne({ reference });
  }

  async findByTransactionId(transactionId: string) {
    return Order.findOne({ transaction_id: transactionId });
  }

  async findByPlayerId(playerId: string) {
    return Order.find({ player_id: playerId }).sort({ created_at: -1 });
  }

  async findAll() {
    return Order.find().sort({ created_at: -1 }).lean();
  }

  async findAwaitingStock() {
    return Order.find({
      order_status: ORDER_STATUS.AWAITING_STOCK,
      $or: [
        { next_retry_at: { $lte: new Date() } },
        { next_retry_at: { $exists: false } },
        { next_retry_at: null },
      ],
      retry_count: { $lte: 1440 },
    })
      .sort({ retry_count: 1, created_at: 1 })
      .lean();
  }

  async updateStatus(reference: string, updates: any) {
    const setFields: any = { updated_at: new Date(), ...updates };
    if (updates.payment_status) setFields.payment_status = updates.payment_status;
    if (updates.order_status) setFields.order_status = updates.order_status;
    return Order.findOneAndUpdate({ reference }, { $set: setFields }, { returnDocument: 'after' });
  }

  async markPaid(reference: string) {
    return Order.findOneAndUpdate(
      { reference },
      {
        $set: {
          payment_status: 'paid',
          order_status: 'paid',
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  async markProcessing(reference: string) {
    return Order.findOneAndUpdate(
      { reference },
      {
        $set: {
          order_status: 'processing',
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  async markCompleted(reference: string, completedAt: Date) {
    return Order.findOneAndUpdate(
      { reference },
      {
        $set: {
          order_status: 'completed',
          completed_at: completedAt,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  async markFailed(reference: string) {
    return Order.findOneAndUpdate(
      { reference },
      {
        $set: {
          payment_status: 'failed',
          order_status: 'failed',
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  async markCancelled(reference: string) {
    return Order.findOneAndUpdate(
      { reference },
      {
        $set: {
          order_status: 'cancelled',
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  async markAwaitingStock(reference: string) {
    return Order.findOneAndUpdate(
      { reference },
      {
        $set: {
          order_status: 'awaiting_stock',
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  async incrementRetry(reference: string) {
    const order = await Order.findOne({ reference });
    const retryCount = (order?.retry_count || 0) + 1;
    const backoff = Math.min(1000 * 60 * Math.pow(2, retryCount - 1), 1000 * 60 * 60);
    const nextRetryAt = new Date(Date.now() + backoff);

    return Order.findOneAndUpdate(
      { reference },
      {
        $set: {
          retry_count: retryCount,
          next_retry_at: nextRetryAt,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  // ─── Analytics ────────────────────────────────────────

  /**
   * Get revenue analytics aggregated by day for a date range.
   * Returns daily revenue, order count, and per-game breakdown.
   */
  async getRevenueAnalytics(days: number = 30) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // ── Daily revenue time series ──
    const dailyPipeline = [
      {
        $match: {
          order_status: ORDER_STATUS.COMPLETED,
          created_at: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            day: { $dayOfMonth: '$created_at' },
          },
          date: { $first: '$created_at' },
          revenue: { $sum: '$amount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ] as any[];

    const dailyData = await Order.aggregate(dailyPipeline);

    // ── Per-game breakdown ──
    const gamePipeline = [
      {
        $match: {
          order_status: ORDER_STATUS.COMPLETED,
          created_at: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$game_code',
          game_name: { $first: '$game_name' },
          revenue: { $sum: '$amount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ] as any[];

    const gameData = await Order.aggregate(gamePipeline);

    // ── Overall summary (all time + period) ──
    const [summaryResult] = await Order.aggregate([
      {
        $match: {
          order_status: ORDER_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: '$amount' },
          total_orders: { $sum: 1 },
          period_revenue: {
            $sum: {
              $cond: [{ $gte: ['$created_at', startDate] }, '$amount', 0],
            },
          },
          period_orders: {
            $sum: {
              $cond: [{ $gte: ['$created_at', startDate] }, 1, 0],
            },
          },
        },
      },
    ]);

    const summary = summaryResult || {
      total_revenue: 0,
      total_orders: 0,
      period_revenue: 0,
      period_orders: 0,
    };

    return {
      daily: dailyData.map((d: any) => ({
        date: d.date,
        revenue: Math.round(d.revenue * 100) / 100,
        orders: d.orders,
      })),
      by_game: gameData.map((g: any) => ({
        game_code: g._id,
        game_name: g.game_name,
        revenue: Math.round(g.revenue * 100) / 100,
        orders: g.orders,
      })),
      summary: {
        total_revenue: Math.round(summary.total_revenue * 100) / 100,
        total_orders: summary.total_orders,
        period_revenue: Math.round(summary.period_revenue * 100) / 100,
        period_orders: summary.period_orders,
        avg_order_value:
          summary.period_orders > 0
            ? Math.round((summary.period_revenue / summary.period_orders) * 100) / 100
            : 0,
      },
    };
  }

  // ─── Admin methods ─────────────────────────────────────

  async findAllAdmin(query: AdminOrderQuery) {
    const filter: any = {};

    if (query.status) {
      filter.order_status = query.status;
    }
    if (query.gameCode) {
      filter.game_code = query.gameCode;
    }
    if (query.search) {
      filter.$or = [
        { reference: { $regex: query.search, $options: 'i' } },
        { player_id: { $regex: query.search, $options: 'i' } },
        { product_name: { $regex: query.search, $options: 'i' } },
      ];
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ created_at: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean();

    return {
      orders,
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
    };
  }

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      total_orders,
      today_orders,
      completed,
      processing,
      awaiting_stock,
      failed,
      cancelled,
      pending,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ created_at: { $gte: todayStart } }),
      Order.countDocuments({ order_status: ORDER_STATUS.COMPLETED }),
      Order.countDocuments({ order_status: ORDER_STATUS.PROCESSING }),
      Order.countDocuments({ order_status: ORDER_STATUS.AWAITING_STOCK }),
      Order.countDocuments({ order_status: ORDER_STATUS.FAILED }),
      Order.countDocuments({ order_status: ORDER_STATUS.CANCELLED }),
      Order.countDocuments({ order_status: ORDER_STATUS.PENDING }),
    ]);

    const revenueResult = await Order.aggregate([
      { $match: { order_status: ORDER_STATUS.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const total_revenue = revenueResult[0]?.total || 0;

    const todayRevenueResult = await Order.aggregate([
      { $match: { order_status: ORDER_STATUS.COMPLETED, created_at: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const today_revenue = todayRevenueResult[0]?.total || 0;

    const pendingRevenueResult = await Order.aggregate([
      { $match: { order_status: { $in: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const pending_revenue = pendingRevenueResult[0]?.total || 0;

    // Generate revenue chart data (last 7 days)
    const revenueChart: { labels: string[]; values: number[] } = { labels: [], values: [] };
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const dayResult = await Order.aggregate([
        { $match: { order_status: ORDER_STATUS.COMPLETED, created_at: { $gte: dayStart, $lt: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      revenueChart.labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      revenueChart.values.push(dayResult[0]?.total || 0);
    }

    return {
      total_orders,
      total_revenue,
      pending_revenue,
      today_orders,
      today_revenue,
      active_users: 0,
      orders_by_status: {
        completed,
        processing,
        awaiting_stock,
        failed,
        cancelled,
        pending,
      },
      revenue_chart: revenueChart,
    };
  }
}

export const orderRepository = new OrderRepository();
