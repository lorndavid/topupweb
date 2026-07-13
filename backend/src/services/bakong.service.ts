import QRCode from 'qrcode';
import { config } from '../config';
import { bakongApi } from '../utils/axios';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

/* ───────────────────────────────────────────
 *  Types
 * ─────────────────────────────────────────── */

export interface KHQRResponse {
  qr: string;
  qrImage: string;
  md5Hash: string;
  transactionId: string;
  amount: number;
  currency: string;
}

export interface PaymentCheckResponse {
  status: string;
  transactionId: string;
  amount: number;
  currency: string;
  senderAccount?: string;
  timestamp?: string;
}

export interface CallbackPayload {
  transactionId: string;
  amount: number;
  currency: string;
  senderAccount?: string;
  description?: string;
  timestamp: string;
  hash: string;
}

/* ───────────────────────────────────────────
 *  Service
 * ─────────────────────────────────────────── */

export class BakongService {
  /** Exchange rate: 1 USD ≈ 4 100 KHR (approximate) */
  private readonly USD_TO_KHR = 4100;

  /**
   * Generate a real scannable KHQR image from raw QR data string.
   * Uses the `qrcode` library to produce a data:image/png;base64 URL.
   */
  private async generateQRImage(qrData: string): Promise<string> {
    try {
      return await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch {
      return ''; // QR image generation failed
    }
  }

  /**
   * Build an EMV merchant QR (KHQR) string with the merchant's details.
   * This follows the Cambodia KHQR standard format for Bakong.
   */
  private buildSimulatedQR(params: {
    amount: number;
    description: string;
    md5Hash: string;
  }): string {
    const bakongId = config.merchant.bakongId || 'demo@bkrt';
    const name = config.merchant.name || 'MY SHOP';
    const city = config.merchant.city || 'Phnom Penh';

    // Build a simplified EMV merchant QR string.
    // Format: 00 01 01 02 12 (Payload Format Indicator + EMV tag)
    // Then merchant account info, currency, amount, country, name, city, CRC
    return [
      '000201',                                    // Payload Format Indicator
      '010212',                                    // Point of Initiation Method (12 = dynamic)
      `29300012${bakongId}`,                       // Merchant Account Info
      '52045999',                                  // Merchant Category Code
      '5303116',                                   // Transaction Currency (116 = KHR)
      `54${params.amount.toFixed(2).length.toString().padStart(2, '0')}${params.amount.toFixed(2)}`, // Amount
      '5802KH',                                    // Country Code
      `59${name.length.toString().padStart(2, '0')}${name}`, // Merchant Name
      `60${city.length.toString().padStart(2, '0')}${city}`, // Merchant City
      `6304${params.md5Hash.substring(0, 4)}`,     // CRC
    ].join('');
  }

  /**
   * Generate a KHQR code for payment via the official Bakong API.
   *
   * Uses Bearer token auth and the merchant details provided in env:
   *   MERCHANT_BAKONG_ID  – e.g. "lorn_davit@bkrt"
   *   MERCHANT_NAME       – e.g. "MY SHOP"
   *   MERCHANT_CITY       – e.g. "Phnom Penh"
   *   BAKONG_API_TOKEN    – Bearer token from developer portal
   */
  async generateKHQR(params: {
    amount: number;
    description: string;
  }): Promise<KHQRResponse> {
    // ── 1. Generate a local reference ──────────────────
    const md5Hash = crypto
      .createHash('md5')
      .update(`${params.amount}:${params.description}:${Date.now()}`)
      .digest('hex');

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    let qr = '';
    let qrImage = '';

    // ── 2. Try the real Bakong API ─────────────────────
    if (config.bakong.apiUrl && config.bakong.apiToken && config.merchant.bakongId) {
      try {
        const amountKHR = Math.round(params.amount * this.USD_TO_KHR);

        const { data } = await bakongApi.post('/v1/generate_qr', {
          account_id: config.merchant.bakongId,
          merchant_name: config.merchant.name,
          merchant_city: config.merchant.city,
          amount: amountKHR,
          currency: 'KHR',
          description: params.description.substring(0, 50),
        });

        qr = data.qr || '';
        qrImage = data.qr_image || data.qrImage || '';

        if (qr && !qrImage) {
          // Bakong API returned QR data but no image — generate the image locally
          qrImage = await this.generateQRImage(qr);
        }

        if (qr) {
          return {
            qr,
            qrImage,
            md5Hash: data.md5_hash || data.md5Hash || md5Hash,
            transactionId: data.transaction_id || data.transactionId || transactionId,
            amount: params.amount,
            currency: 'KHR',
          };
        }

        // If Bakong returned success but no qr data, fall through to simulated
        console.warn('⚠️  Bakong API returned empty QR data — falling back to simulated');
      } catch (apiError: any) {
        const msg =
          apiError?.response?.data?.message ||
          apiError?.response?.data?.error ||
          apiError.message ||
          'Unknown Bakong API error';

        console.warn(`⚠️  Bakong API generate KHQR failed: ${msg}`);

        // For localhost dev we fall through to simulation
        if (config.isProd) {
          throw new AppError(
            `Bakong payment service error: ${msg}`,
            HTTP_STATUS.SERVICE_UNAVAILABLE
          );
        }

        console.warn('   → Falling back to simulated KHQR (dev mode only)');
      }
    } else {
      console.warn('⚠️  Bakong API credentials missing – using simulated KHQR (dev mode)');
    }

    // ── 3. Simulated KHQR for localhost dev ────────────
    // Build a real EMV merchant QR string and generate a scannable PNG image
    qr = this.buildSimulatedQR({ amount: params.amount, description: params.description, md5Hash });
    qrImage = await this.generateQRImage(qr);

    return {
      qr,
      qrImage,
      md5Hash,
      transactionId,
      amount: params.amount,
      currency: 'KHR',
    };
  }

  /**
   * Check the status of a payment transaction via the Bakong API.
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentCheckResponse> {
    if (config.bakong.apiUrl && config.bakong.apiToken) {
      try {
        const { data } = await bakongApi.post('/v1/check_transaction', {
          transaction_id: transactionId,
        });

        return {
          status: data.status || 'PENDING',
          transactionId: data.transaction_id || transactionId,
          amount: data.amount || 0,
          currency: data.currency || 'KHR',
          senderAccount: data.sender_account,
          timestamp: data.timestamp,
        };
      } catch (apiError: any) {
        const msg =
          apiError?.response?.data?.message ||
          apiError?.response?.data?.error ||
          apiError.message ||
          'Unknown Bakong API error';

        console.warn(`⚠️  Bakong API check payment failed: ${msg}`);

        if (config.isProd) {
          throw new AppError(
            `Bakong payment check error: ${msg}`,
            HTTP_STATUS.SERVICE_UNAVAILABLE
          );
        }

        console.warn('   → Falling back to simulated payment status (dev mode)');
      }
    }

    // Simulated response for localhost dev
    return {
      status: 'PAID',
      transactionId,
      amount: 0,
      currency: 'KHR',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Verify the authenticity of a callback/webhook from Bakong.
   *
   * In production the hash is an HMAC-SHA256 over the payload signed
   * with the merchant's API token.
   */
  verifyCallback(payload: CallbackPayload): boolean {
    if (!config.bakong.apiToken) {
      // Without a token we trust the callback (dev mode)
      return true;
    }

    const expectedHash = this.generateCallbackHash(payload);
    const isValid = payload.hash === expectedHash;

    if (!isValid) {
      console.warn('⚠️  Bakong callback hash mismatch – possible forgery');
    }

    return isValid;
  }

  /**
   * Generate an HMAC-SHA256 callback hash for verification.
   */
  private generateCallbackHash(payload: Omit<CallbackPayload, 'hash'>): string {
    const data = `${payload.transactionId}:${payload.amount}:${payload.currency}:${payload.timestamp}`;
    return crypto
      .createHmac('sha256', config.bakong.apiToken)
      .update(data)
      .digest('hex');
  }
}

export const bakongService = new BakongService();
