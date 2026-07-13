import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  bay2game: {
    apiUrl: process.env.BAY2GAME_API_URL || 'https://api.bay2game.xyz',
    apiKey: process.env.BAY2GAME_API_KEY || '',
  },

  bakong: {
    apiUrl: process.env.BAKONG_API_URL || '',
    apiKey: process.env.BAKONG_API_KEY || '',
    accountId: process.env.BAKONG_ACCOUNT_ID || '',
    merchantId: process.env.BAKONG_MERCHANT_ID || '',
    callbackUrl:
      process.env.BAKONG_CALLBACK_URL ||
      'http://localhost:3001/api/payment/callback',
    returnUrl:
      process.env.BAKONG_RETURN_URL || 'http://localhost:5173/payment/success',
  },

  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;

export function validateConfig(): void {
  const required = [
    ['BAY2GAME_API_KEY', config.bay2game.apiKey],
    ['BAKONG_API_KEY', config.bakong.apiKey],
    ['BAKONG_ACCOUNT_ID', config.bakong.accountId],
    ['BAKONG_MERCHANT_ID', config.bakong.merchantId],
  ];

  const missing = required.filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(', ')}`
    );
    console.warn('The app will start but some features may not work.');
  }
}
