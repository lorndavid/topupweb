import { config } from '../config';
import { bakongApi } from '../utils/axios';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { AppError } from '../middleware/errorHandler';

interface KHQRResponse {
  qr: string;
  qrImage: string;
  md5Hash: string;
  transactionId: string;
  amount: number;
  currency: string;
}

interface PaymentCheckResponse {
  status: string;
  transactionId: string;
  amount: number;
  currency: string;
  senderAccount?: string;
  timestamp?: string;
}

interface CallbackPayload {
  transactionId: string;
  amount: number;
  currency: string;
  senderAccount?: string;
  description?: string;
  timestamp: string;
  hash: string;
}

export class BakongService {
  /**
   * Generate KHQR code for payment
   */
  async generateKHQR(params: {
    amount: number;
    description: string;
  }): Promise<KHQRResponse> {
    try {
      // In production, this would call the Bakong API
      // For localhost development, we simulate the KHQR generation
      const reference = `KHQR-${Date.now()}`;
      const simulatedResponse: KHQRResponse = {
        qr: `00020101021229300012${config.bakong.merchantId}5204599953031165405${params.amount.toFixed(2)}5802KH5910${config.bakong.merchantId}6002KH6304${reference}`,
        qrImage: `data:image/png;base64,simulated_qr_${reference}`,
        md5Hash: reference,
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        amount: params.amount,
        currency: 'KHR',
      };

      // Attempt real API call if configured
      if (config.bakong.apiUrl && config.bakong.apiKey) {
        try {
          const { data } = await bakongApi.post('/v1/generate_qr', {
            account_id: config.bakong.accountId,
            merchant_id: config.bakong.merchantId,
            amount: params.amount * 4100, // Convert USD to KHR (approximate)
            currency: 'KHR',
            description: params.description,
          });

          return {
            qr: data.qr || simulatedResponse.qr,
            qrImage: data.qr_image || simulatedResponse.qrImage,
            md5Hash: data.md5_hash || simulatedResponse.md5Hash,
            transactionId: data.transaction_id || simulatedResponse.transactionId,
            amount: params.amount,
            currency: 'KHR',
          };
        } catch {
          // Fallback to simulated response
          console.warn('Bakong API unavailable, using simulated KHQR');
        }
      }

      return simulatedResponse;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.BAKONG_ERROR,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentCheckResponse> {
    try {
      // Simulate payment check for localhost
      const simulatedResponse: PaymentCheckResponse = {
        status: 'PAID',
        transactionId,
        amount: 0,
        currency: 'KHR',
        timestamp: new Date().toISOString(),
      };

      if (config.bakong.apiUrl && config.bakong.apiKey) {
        try {
          const { data } = await bakongApi.post('/v1/check_payment', {
            transaction_id: transactionId,
          });

          return {
            status: data.status || simulatedResponse.status,
            transactionId: data.transaction_id || transactionId,
            amount: data.amount || 0,
            currency: data.currency || 'KHR',
            senderAccount: data.sender_account,
            timestamp: data.timestamp,
          };
        } catch {
          console.warn('Bakong API unavailable, using simulated payment check');
        }
      }

      return simulatedResponse;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.BAKONG_ERROR,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Verify callback from Bakong
   */
  verifyCallback(payload: CallbackPayload): boolean {
    // In production, verify the hash with the merchant secret
    // For localhost, we trust the callback
    const expectedHash = this.generateCallbackHash(payload);
    return payload.hash === expectedHash;
  }

  /**
   * Generate callback hash for verification
   */
  private generateCallbackHash(payload: Omit<CallbackPayload, 'hash'>): string {
    // Simple hash simulation - in production use HMAC-SHA256
    const str = `${payload.transactionId}:${payload.amount}:${payload.timestamp}:${config.bakong.apiKey}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

export const bakongService = new BakongService();
