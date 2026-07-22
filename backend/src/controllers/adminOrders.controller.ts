import { Request, Response } from 'express';
import { OrderRepository } from '../repositories/OrderRepository';
import { HTTP_STATUS } from '../constants';

const orderRepo = new OrderRepository();

export async function getOrders(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '50',
      status,
      game_code,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));

    const result = await orderRepo.findAllAdmin({
      page: pageNum,
      limit: limitNum,
      status: status as string | undefined,
      gameCode: game_code as string | undefined,
      search: search as string | undefined,
    });

    return res.json({
      success: true,
      message: 'Orders fetched successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
}

export async function getOrderDetail(req: Request, res: Response) {
  try {
    const { reference } = req.params;
    const order = await orderRepo.findByReference(reference);

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({
      success: true,
      message: 'Order fetched successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch order',
    });
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { reference } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = ['pending', 'awaiting_payment', 'paid', 'processing', 'awaiting_stock', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await orderRepo.findByReference(reference);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    await orderRepo.updateStatus(reference, status);

    console.log(`[Admin] Order ${reference} status → ${status}${note ? ` (${note})` : ''}`);

    return res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: { reference, status },
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update order status',
    });
  }
}

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const stats = await orderRepo.getDashboardStats();

    return res.json({
      success: true,
      message: 'Dashboard stats fetched successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
    });
  }
}
