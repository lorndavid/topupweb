import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants';
import { notificationService } from '../services/notification.service';

/**
 * In-memory store for recent webhook notifications.
 * The admin dashboard can read these to show alert history.
 */
export const recentAlerts: Array<{
  id: string;
  event: string;
  timestamp: string;
  data: any;
}> = [];

const MAX_ALERTS = 50;

/**
 * POST /api/webhook/stock-alert
 *
 * This endpoint receives stock alert notifications from the
 * notification service and stores them in memory.
 *
 * Put this URL in your .env as NOTIFICATION_WEBHOOK_URL:
 *   Local:    http://localhost:3001/api/webhook/stock-alert
 *   Live:     https://yourdomain.com/api/webhook/stock-alert
 *
 * The admin dashboard at /admin can display recent alerts.
 */
export async function receiveStockAlert(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    event: req.body.event || 'order.awaiting_stock',
    timestamp: new Date().toISOString(),
    data: req.body.data || req.body,
  };

  // Store in memory (keep last 50)
  recentAlerts.unshift(alert);
  if (recentAlerts.length > MAX_ALERTS) {
    recentAlerts.length = MAX_ALERTS;
  }

  // Log to console
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  📢 STOCK ALERT RECEIVED');
  console.log('═══════════════════════════════════════════');
  console.log(`  Event:     ${alert.event}`);
  console.log(`  Time:      ${alert.timestamp}`);
  console.log(`  Reference: ${alert.data?.reference || 'N/A'}`);
  console.log(`  Game:      ${alert.data?.game_name || 'N/A'}`);
  console.log(`  Package:   ${alert.data?.product_name || 'N/A'}`);
  console.log(`  Player:    ${alert.data?.player_id || 'N/A'}`);
  console.log(`  Amount:    $${alert.data?.amount?.toFixed(2) || '0.00'}`);
  console.log('═══════════════════════════════════════════');
  console.log('');

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Alert received',
    alert_id: alert.id,
  });
}

/**
 * GET /api/webhook/recent-alerts
 *
 * Returns recent stock alerts for the admin dashboard.
 */
export async function getRecentAlerts(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: recentAlerts,
  });
}

/**
 * POST /api/webhook/test
 *
 * Sends a test notification to both Telegram and the webhook URL
 * to verify the notification config is working properly.
 * Returns detailed results for each channel.
 */
export async function testNotification(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const result = await notificationService.sendTestNotification();

  const allConfigured = result.telegram.configured || result.webhook.configured;
  const allSent = result.telegram.sent || result.webhook.sent;

  res.status(HTTP_STATUS.OK).json({
    success: allConfigured,
    message: allSent
      ? 'Test notification sent successfully'
      : !allConfigured
        ? 'No notification channels configured. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID and/or NOTIFICATION_WEBHOOK_URL in .env'
        : 'Test notification had errors — see details below',
    data: result,
  });
}
