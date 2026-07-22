import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  mongodb: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB_NAME || 'gametopup',
  },

  bay2game: {
    apiUrl: process.env.BAY2GAME_API_URL || 'https://api.bay2game.xyz',
    apiKey: process.env.BAY2GAME_API_KEY || '',
  },

  gameApis: {
    riotApiKey: process.env.RIOT_API_KEY || '',
    gameskinboApiKey: process.env.GAMESKINBO_API_KEY || '',
  },

  merchant: {
    name: process.env.MERCHANT_NAME || 'MY SHOP',
    city: process.env.MERCHANT_CITY || 'Phnom Penh',
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  },

  cutluy: {
    apiKey: process.env.CUTLUY_API_KEY || '',
    apiUrl: process.env.CUTLUY_API_URL || 'https://cutluy.com/v1',
    webhookSecret: process.env.CUTLUY_WEBHOOK_SECRET || '',
    returnUrl:
      process.env.CUTLUY_RETURN_URL || 'http://localhost:5173/payment/success',
  },

  notifications: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL || '',
  },

  push: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@vidtopup.com',
  },

  admin: {
    jwtSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-secret-change-in-production',
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;

export function validateConfig(): void {
  const required = [
    ['BAY2GAME_API_KEY', config.bay2game.apiKey],
    ['CUTLUY_API_KEY', config.cutluy.apiKey],
    ['MONGODB_URI', config.mongodb.uri],
  ];

  const missing = required.filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(', ')}`
    );
    console.warn('The app will start but some features may not work.');
    console.warn('Set them in the .env file at backend/.env');
  }
}
