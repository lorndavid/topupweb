import app from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { orderService } from './services/order.service';
import { webSocketService } from './services/websocket.service';
import { notificationService } from './services/notification.service';
import { STOCK_RETRY_INTERVAL } from './constants';

async function start() {
  // Connect to MongoDB (non-blocking — server starts even if DB fails)
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`\n Server is running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Frontend URL: ${config.frontendUrl}`);
    console.log(`   MongoDB: ${config.mongodb.uri ? '✓ configured' : '✗ not set'}`);
    console.log(`   Health check: http://localhost:${config.port}/api/health\n`);
  });

  // ── Initialize WebSocket server (attached to the HTTP server) ──
  webSocketService.init(server);

  // ── Auto-retry scheduler for awaiting_stock orders ──────────────
  // Every 60 seconds, the system retries all orders that are stuck
  // due to insufficient Bay2Game balance. When the reseller tops up
  // their wallet, these orders will be automatically fulfilled.
  const stockRetryTimer = setInterval(async () => {
    try {
      await orderService.retryAwaitingOrders();
    } catch (err) {
      console.error('❌ Stock retry scheduler error:', err);
    }
  }, STOCK_RETRY_INTERVAL);

  console.log(`   Stock retry scheduler: every ${STOCK_RETRY_INTERVAL / 1000}s`);

  // ── Daily summary scheduler ────────────────────────────────────
  // Sends a Telegram report at 8:00 PM Cambodia time (UTC+7) every day
  // with today's stats. Checks every 60 minutes whether it's time to send.
  const DAILY_SUMMARY_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
  const DAILY_SUMMARY_HOUR = 20; // 8 PM Cambodia time
  let lastDailySummaryDate = ''; // Track which date we last sent for

  async function checkAndSendDailySummary() {
    const now = new Date();
    // Cambodia is UTC+7 — convert server time to Cambodia local time
    const cambodiaHour = (now.getUTCHours() + 7) % 24;
    const todayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

    if (cambodiaHour === DAILY_SUMMARY_HOUR && lastDailySummaryDate !== todayKey) {
      console.log('📊 Sending daily summary...');
      const sent = await notificationService.sendDailySummary();
      if (sent) {
        lastDailySummaryDate = todayKey;
      }
    }
  }

  let dailySummaryTimer: ReturnType<typeof setInterval> | undefined;

  // Schedule: send on next hour check (in case server starts near 8 PM or was down)
  setTimeout(() => {
    checkAndSendDailySummary();
    dailySummaryTimer = setInterval(checkAndSendDailySummary, DAILY_SUMMARY_CHECK_INTERVAL);
  }, 0);

  console.log(`   Daily summary scheduler: every ${DAILY_SUMMARY_CHECK_INTERVAL / 1000}s (targets ${DAILY_SUMMARY_HOUR}:00 Cambodia time)`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    clearInterval(stockRetryTimer);
    clearInterval(dailySummaryTimer);
    server.close(async () => {
      await disconnectDatabase();
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(console.error);

export default app;
