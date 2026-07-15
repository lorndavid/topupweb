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
    bakongId: process.env.MERCHANT_BAKONG_ID || '',
    name: process.env.MERCHANT_NAME || 'MY SHOP',
    city: process.env.MERCHANT_CITY || 'Phnom Penh',
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  },

  bakong: {
    apiUrl: process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh',
    apiToken: process.env.BAKONG_API_TOKEN || '',
    callbackUrl:
      process.env.BAKONG_CALLBACK_URL ||
      'http://localhost:3001/api/payment/callback',
    returnUrl:
      process.env.BAKONG_RETURN_URL || 'http://localhost:5173/payment/success',
  },

  notifications: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL || '',
  },

  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;

export function validateConfig(): void {
  const required = [
    ['BAY2GAME_API_KEY', config.bay2game.apiKey],
    ['BAKONG_API_TOKEN', config.bakong.apiToken],
    ['MERCHANT_BAKONG_ID', config.merchant.bakongId],
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
