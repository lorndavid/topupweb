import app from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { orderService } from './services/order.service';
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

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    clearInterval(stockRetryTimer);
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
