import { OrderModel, IOrder } from '../models/Order';

type OrderStatus = 'pending' | 'awaiting_payment' | 'paid' | 'processing' | 'awaiting_stock' | 'completed' | 'failed' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'failed';

/** Plain order data object returned by the repository (no Mongoose methods) */
export interface OrderData {
  reference: string;
  game_code: string;
  product_code: string;
  product_name: string;
  game_name: string;
  game_user_id: string;
  game_zone_id?: string;
  amount: number;
  player_id: string;
  server_id?: string;
  payment_method: 'bakong';
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  khqr_image?: string;
  khqr_data?: string;
  transaction_id?: string;
  retry_count?: number;
  next_retry_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/** Data needed when creating a new order */
export interface CreateOrderData {
  reference: string;
  game_code: string;
  product_code: string;
  product_name: string;
  game_name: string;
  game_user_id: string;
  game_zone_id?: string;
  amount: number;
  player_id: string;
  server_id?: string;
  payment_method: 'bakong';
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  khqr_image?: string;
  khqr_data?: string;
  transaction_id?: string;
}

/** Data needed to update payment/order status */
export interface UpdateStatusData {
  payment_status?: PaymentStatus;
  order_status?: OrderStatus;
  completed_at?: Date;
}

export class OrderRepository {
  async create(data: CreateOrderData): Promise<OrderData> {
    const doc = await OrderModel.create(data);
    return this.toData(doc);
  }

  async findAll(): Promise<OrderData[]> {
    const docs = await OrderModel.find().sort({ created_at: -1 });
    return docs.map((doc) => this.toData(doc));
  }

  async findByReference(reference: string): Promise<OrderData | null> {
    const doc = await OrderModel.findOne({ reference });
    return doc ? this.toData(doc) : null;
  }

  async findByTransactionId(transactionId: string): Promise<OrderData | null> {
    const doc = await OrderModel.findOne({ transaction_id: transactionId });
    return doc ? this.toData(doc) : null;
  }

  async updateStatus(
    reference: string,
    status: UpdateStatusData
  ): Promise<OrderData | null> {
    const doc = await OrderModel.findOneAndUpdate(
      { reference },
      { $set: status },
      { new: true }
    );
    return doc ? this.toData(doc) : null;
  }

  async markProcessing(reference: string): Promise<OrderData | null> {
    return this.updateStatus(reference, { order_status: 'processing' });
  }

  async markCompleted(
    reference: string,
    completedAt: Date
  ): Promise<OrderData | null> {
    return this.updateStatus(reference, {
      payment_status: 'paid',
      order_status: 'completed',
      completed_at: completedAt,
    });
  }

  async markFailed(reference: string): Promise<OrderData | null> {
    return this.updateStatus(reference, { order_status: 'failed' });
  }

  async markCancelled(reference: string): Promise<OrderData | null> {
    return this.updateStatus(reference, {
      payment_status: 'failed',
      order_status: 'cancelled',
    });
  }

  async markPaid(reference: string): Promise<OrderData | null> {
    return this.updateStatus(reference, {
      payment_status: 'paid',
      order_status: 'paid',
    });
  }

  async markAwaitingStock(
    reference: string
  ): Promise<OrderData | null> {
    const doc = await OrderModel.findOneAndUpdate(
      { reference },
      {
        $set: {
          payment_status: 'paid',
          order_status: 'awaiting_stock',
          retry_count: 0,
          next_retry_at: new Date(Date.now() + 30_000), // First retry in 30s
        },
      },
      { new: true }
    );
    return doc ? this.toData(doc) : null;
  }

  /** Find all orders awaiting stock whose next_retry_at has passed */
  async findAwaitingStock(): Promise<OrderData[]> {
    const docs = await OrderModel.find({
      order_status: 'awaiting_stock',
      next_retry_at: { $lte: new Date() },
    }).sort({ next_retry_at: 1 });
    return docs.map((doc) => this.toData(doc));
  }

  /** Increment retry count and schedule next retry (exponential backoff) */
  async incrementRetry(reference: string): Promise<OrderData | null> {
    const order = await OrderModel.findOne({ reference });
    if (!order) return null;

    const retryCount = (order.retry_count || 0) + 1;
    // Exponential backoff: 30s, 60s, 120s, 240s, ... cap at 1 hour
    const delayMs = Math.min(30_000 * Math.pow(2, retryCount - 1), 3_600_000);

    const doc = await OrderModel.findOneAndUpdate(
      { reference },
      {
        $set: {
          retry_count: retryCount,
          next_retry_at: new Date(Date.now() + delayMs),
        },
      },
      { new: true }
    );
    return doc ? this.toData(doc) : null;
  }

  private toData(doc: IOrder): OrderData {
    return {
      reference: doc.reference,
      game_code: doc.game_code,
      product_code: doc.product_code,
      product_name: doc.product_name,
      game_name: doc.game_name,
      game_user_id: doc.game_user_id,
      game_zone_id: doc.game_zone_id,
      amount: doc.amount,
      player_id: doc.player_id,
      server_id: doc.server_id,
      payment_method: doc.payment_method as 'bakong',
      payment_status: doc.payment_status as PaymentStatus,
      order_status: doc.order_status as OrderStatus,
      khqr_image: doc.khqr_image,
      khqr_data: doc.khqr_data,
      transaction_id: doc.transaction_id,
      retry_count: doc.retry_count,
      next_retry_at: doc.next_retry_at,
      completed_at: doc.completed_at,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }
}

export const orderRepository = new OrderRepository();
