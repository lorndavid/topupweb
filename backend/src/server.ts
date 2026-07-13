import app from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';

async function start() {
  // Connect to MongoDB (non-blocking — server starts even if DB fails)
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`\n🚀 Server is running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Frontend URL: ${config.frontendUrl}`);
    console.log(`   MongoDB: ${config.mongodb.uri ? '✓ configured' : '✗ not set'}`);
    console.log(`   Health check: http://localhost:${config.port}/api/health\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
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
