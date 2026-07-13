import mongoose from 'mongoose';
import { config } from './index';

export async function connectDatabase(): Promise<void> {
  if (!config.mongodb.uri) {
    console.warn('⚠️  MONGODB_URI not set — skipping database connection.');
    return;
  }

  try {
    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB connected — database: "${config.mongodb.dbName}"`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.warn('The server will continue without a database — orders will NOT persist.');
  }
}

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected gracefully');
  }
}
