import QRCode from 'qrcode';
import crypto from 'crypto';
import { config } from '../config';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { AppError } from '../middleware/errorHandler';
import { cutluyApi } from '../utils/axios';

/* ───────────────────────────────────────────
 *  Types
 * ─────────────────────────────────────────── */

export interface CutLuyPaymentResponse {
  id: string;
  status: 'pending' | 'scanned' | 'paid' | 'expired' | 'failed';
  amount: string;
  currency: string;
  reference_id: string | null;
  qr_string: string;
  checkout_url: string;
  metadata: Record<string, any> | null;
  approved_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface CutLuyCreatePaymentResult {
  cutluyPaymentId: string;
  status: string;
  amount: number;
  qr_string: string;
  qrImage: string;
  checkout_url: string;
  expires_at: string;
}

export interface CutLuyPaymentCheckResult {
  status: string;
  cutluyPaymentId: string;
  amount: number;
  currency: string;
  reference_id: string | null;
  approved_at: string | null;
}

export interface CutLuyWebhookPayload {
  id: string;
  type: 'payment.completed' | 'payment.scanned' | 'payment.expired' | 'payment.failed';
  created: string;
  data: {
    payment: {
      id: string;
      status: string;
      amount: string;
      currency: string;
      reference_id: string | null;
      metadata: Record<string, any> | null;
      approved_at: string | null;
    };
  };
}

/* ───────────────────────────────────────────
 *  Service
 * ─────────────────────────────────────────── */

export class CutLuyService {
  private readonly API_BASE = 'https://cutluy.com/v1';

  /**
   * Generate a QR code PNG (data URL) from a raw KHQR string.
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
      return '';
    }
  }

  /**
   * Create a new CutLuy payment for the given amount and reference.
   *
   * CutLuy automatically uses the store's configured payment link (ABA PayWay)
   * to generate a valid KHQR that customers can scan with any Cambodian banking app.
   *
   * The payment link the user provided:
   *   https://link.payway.com.kh/ABAPAY7a479793u
   *
   * This is the ABA PayWay payment link configured in the CutLuy store settings.
   * CutLuy handles the ABA PayWay integration internally — we just send amount + reference.
   */
  async createPayment(params: {
    amount: number;
    reference_id: string;
    metadata?: Record<string, any>;
  }): Promise<CutLuyCreatePaymentResult> {
    if (!config.cutluy.apiKey) {
      throw new AppError(
        'CutLuy API key is not configured',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }

    try {
      const { data } = await cutluyApi.post<CutLuyPaymentResponse>('/payments', {
        amount: params.amount,
        reference_id: params.reference_id,
        metadata: params.metadata || null,
      });

      // Generate a QR image from the raw KHQR string
      let qrImage = '';
      if (data.qr_string) {
        qrImage = await this.generateQRImage(data.qr_string);
      }

      return {
        cutluyPaymentId: data.id,
        status: data.status,
        amount: parseFloat(data.amount),
        qr_string: data.qr_string,
        qrImage,
        checkout_url: data.checkout_url,
        expires_at: data.expires_at,
      };
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        'Unknown CutLuy API error';

      console.error('❌ CutLuy create payment failed:', msg);

      // Map CutLuy errors to our error codes
      if (error?.response?.data?.error === 'quota_exceeded') {
        throw new AppError(
          'Payment service quota exceeded — please contact support',
          HTTP_STATUS.UNPROCESSABLE_ENTITY
        );
      }

      throw new AppError(
        `Payment service error: ${msg}`,
        HTTP_STATUS.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Retrieve the current status of a CutLuy payment.
   */
  async retrievePayment(paymentId: string): Promise<CutLuyPaymentCheckResult> {
    try {
      const { data } = await cutluyApi.get<CutLuyPaymentResponse>(`/payments/${paymentId}`);

      return {
        status: data.status,
        cutluyPaymentId: data.id,
        amount: parseFloat(data.amount),
        currency: data.currency,
        reference_id: data.reference_id,
        approved_at: data.approved_at,
      };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * Verify the authenticity of a CutLuy webhook event.
   *
   * The X-CutLuy-Signature header is in the format: t=<timestamp>,v1=<hex>
   * We compute HMAC-SHA256 of `${t}.${rawBody}` using the webhook secret.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!config.cutluy.webhookSecret) {
      console.warn('⚠️  CutLuy webhook secret not configured — skipping signature verification');
      return true; // Dev mode: trust all webhooks
    }

    try {
      const parts = Object.fromEntries(
        signatureHeader.split(',').map((p) => p.split('='))
      );

      const timestamp = parts.t;
      const signature = parts.v1;

      if (!timestamp || !signature) {
        console.warn('⚠️  CutLuy webhook: missing timestamp or signature');
        return false;
      }

      // Reject webhooks older than 5 minutes
      const age = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (age > 300) {
        console.warn('⚠️  CutLuy webhook: signature too old');
        return false;
      }

      const expected = crypto
        .createHmac('sha256', config.cutluy.webhookSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch (err) {
      console.warn('⚠️  CutLuy webhook signature verification failed:', err);
      return false;
    }
  }

  /**
   * Check if a CutLuy payment status is a terminal paid state.
   */
  isPaid(status: string): boolean {
    return status === 'paid';
  }

  /**
   * Check if a CutLuy payment status is terminal (no more state changes expected).
   */
  isTerminal(status: string): boolean {
    return ['paid', 'expired', 'failed'].includes(status);
  }

  /**
   * Map CutLuy status to our internal payment_status.
   */
  mapStatus(status: string): 'pending' | 'paid' | 'failed' {
    switch (status) {
      case 'paid':
        return 'paid';
      case 'expired':
      case 'failed':
        return 'failed';
      case 'pending':
      case 'scanned':
      default:
        return 'pending';
    }
  }
}

export const cutluyService = new CutLuyService();
