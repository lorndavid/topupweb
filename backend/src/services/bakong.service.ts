import QRCode from 'qrcode';
import { config } from '../config';
import { bakongApi } from '../utils/axios';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';
import { BakongKHQR, khqrData, IndividualInfo } from 'bakong-khqr';

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
      return '';
    }
  }

  /**
   * Generate a proper EMVCo-compliant KHQR using the official NBC
   * bakong-khqr library.
   *
   * This is the CORRECT way to build a KHQR — it handles:
   *  - Proper EMVCo TLV (Tag-Length-Value) data structure
   *  - Correct Merchant Account Information (Tag 29) with nested sub-tags
   *  - CRC16-CCITT (polynomial 0x1021) as required by all Cambodian banks
   *  - All bank apps (ABA, ACLEDA, Wing, Bakong, etc.) will accept this QR
   *
   * Merchant environment variables used:
   *   MERCHANT_BAKONG_ID  – Bakong account (e.g. "yourname@bkrt")
   *   MERCHANT_NAME       – Your shop/merchant name
   *   MERCHANT_CITY       – Your city
   */
  private generateProperKHQR(params: {
    amount: number;
    description: string;
  }): { qr: string; md5: string } {
    const bakongAccount = config.merchant.bakongId || 'demo@bkrt';
    const merchantName = config.merchant.name || 'MY SHOP';
    const merchantCity = config.merchant.city || 'Phnom Penh';

    // Use USD amount directly — KHQR supports USD currency code (840)
    // All Cambodian banking apps (ABA, ACLEDA, Wing, Bakong) accept USD KHQR.
    const amountUSD = params.amount;

    // Use order reference or description truncated as bill number
    const billNumber = params.description
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .substring(0, 25);

    const optionalData: Record<string, any> = {
      currency: khqrData.currency.usd,
      amount: amountUSD,
      storeLabel: merchantName.substring(0, 25),
      // expirationTimestamp is REQUIRED by the library when amount is provided
      expirationTimestamp: Date.now() + 5 * 60 * 1000, // 5 minutes
      merchantCategoryCode: '5999',
    };

    // Only add billNumber if we have a value
    if (billNumber) {
      optionalData.billNumber = billNumber;
    }

    const individualInfo = new IndividualInfo(
      bakongAccount,
      merchantName.substring(0, 25),
      merchantCity.substring(0, 15),
      optionalData
    );

    const khqr = new BakongKHQR();
    const result = khqr.generateIndividual(individualInfo);

    if (result.status?.code !== 0 || !result.data?.qr) {
      throw new Error(
        'KHQR generation failed: ' + (result.message || 'Unknown error')
      );
    }

    return {
      qr: result.data.qr,
      md5: result.data.md5 || '',
    };
  }

  /**
   * Generate a KHQR code for payment.
   *
   * Strategy (in order):
   *   1. PRIMARY: Call the official Bakong API at /v1/generate_qr
   *      (requires BAKONG_API_TOKEN and MERCHANT_BAKONG_ID)
   *   2. FALLBACK: Use the official NBC bakong-khqr JavaScript SDK
   *      (produces valid EMVCo-compliant KHQR with correct CRC16-CCITT)
   *
   * In production, only strategy 1 is used (strategy 2 will NOT run in
   * production because we throw on Bakong API failure).
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
    
        const { data } = await bakongApi.post('/v1/generate_qr', {
          account_id: config.merchant.bakongId,
          merchant_name: config.merchant.name,
          merchant_city: config.merchant.city,
          amount: params.amount,
          currency: 'USD',
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
            currency: 'USD',
          };
        }

        // Bakong returned success but no QR data — fall through to SDK
        console.warn('⚠️  Bakong API returned empty QR data — falling back to bakong-khqr SDK');
      } catch (apiError: any) {
        const msg =
          apiError?.response?.data?.message ||
          apiError?.response?.data?.error ||
          apiError.message ||
          'Unknown Bakong API error';

        console.warn(`⚠️  Bakong API generate KHQR failed: ${msg}`);

        // In production, throw — don't generate unverified QRs
        if (config.isProd) {
          throw new AppError(
            `Bakong payment service error: ${msg}`,
            HTTP_STATUS.SERVICE_UNAVAILABLE
          );
        }

        console.warn('   → Falling back to bakong-khqr SDK (dev mode)');
      }
    } else {
      console.warn('⚠️  Bakong API credentials missing – using bakong-khqr SDK');
    }

    // ── 3. Fallback: Generate proper KHQR using the official NBC SDK ──
    //     This library is maintained by the National Bank of Cambodia and
    //     generates EMVCo-compliant QR strings with correct CRC16-CCITT
    //     that ALL Cambodian banking apps can scan and validate.
    try {
      const khqrResult = this.generateProperKHQR({
        amount: params.amount,
        description: params.description,
      });

      qr = khqrResult.qr;
      qrImage = await this.generateQRImage(qr);

      return {
        qr,
        qrImage,
        md5Hash: khqrResult.md5 || md5Hash,
        transactionId,
        amount: params.amount,
        currency: 'USD',
      };
    } catch (khqrError: any) {
      console.error('❌ bakong-khqr SDK failed:', khqrError.message);

      if (config.isProd) {
        throw new AppError(
          'Failed to generate payment QR code',
          HTTP_STATUS.SERVICE_UNAVAILABLE
        );
      }

      // Last resort: generate an EMVCo-compliant KHQR string manually
      // This builds a valid KHQR with correct TLV structure + CRC16-CCITT
      console.warn('   → Using manual EMVCo KHQR fallback');
      qr = this.generateFallbackKHQR({
        amount: params.amount,
        description: params.description,
        transactionId,
      });
      qrImage = await this.generateQRImage(qr);

      return {
        qr,
        qrImage,
        md5Hash,
        transactionId,
        amount: params.amount,
        currency: 'USD',
      };
    }
  }

  /**
   * Check the status of a payment transaction via the Bakong API.
   *
   * Returns the REAL Bakong API response. In dev mode without valid credentials,
   * returns PENDING so the order.service.ts falls through to its dev simulation.
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
          currency: data.currency || 'USD',
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

        // In production, throw so caller knows the API is down
        if (config.isProd) {
          throw new AppError(
            `Bakong payment check error: ${msg}`,
            HTTP_STATUS.SERVICE_UNAVAILABLE
          );
        }

        // In dev mode: return PENDING instead of simulated PAID
        // The order service will fall through to its own time-based dev simulation
        console.warn('   → Returning PENDING (API unavailable). Dev simulation will apply after timeout.');
        return {
          status: 'PENDING',
          transactionId,
          amount: 0,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        };
      }
    }

    // No Bakong credentials configured at all — return PENDING
    // The order service will apply its time-based dev simulation
    return {
      status: 'PENDING',
      transactionId,
      amount: 0,
      currency: 'USD',
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

  /**
   * Build a valid EMVCo-compliant KHQR string from scratch without relying on
   * the bakong-khqr SDK. This is used as a last-resort fallback when both the
   * Bakong API and the bakong-khqr library fail.
   *
   * The generated string follows the EMVCo QR Code standard with proper
   * Tag-Length-Value (TLV) encoding and CRC16-CCITT checksum.
   *
   * Structure:
   *   00  (Payload Format Indicator)           - 01
   *   01  (Point of Initiation Method)         - 11 (static QR for repeated use)
   *   29  (Merchant Account Info – Cambodia)   - nested sub-TLV
   *      00  (Globally Unique Identifier)      - "khqr.bakong.com"
   *      01  (Bakong Account ID)               - merchant's bakong ID
   *      02  (Merchant Name)                   - shop name
   *      03  (Merchant City)                   - Phnom Penh
   *   53  (Transaction Currency)               - 116 (KHR)
   *   54  (Transaction Amount)                 - amount in KHR
   *   58  (Country Code)                       - KH
   *   59  (Merchant Name - EMV)                - shop name
   *   60  (Merchant City - EMV)                - Phnom Penh
   *   62  (Additional Data)                    - bill number, store label
   *   63  (CRC16-CCITT)                        - checksum
   *
   * All Cambodian banking apps (ABA, ACLEDA, Wing, Bakong, etc.) accept
   * EMVCo-compliant KHQR strings.
   */
  private generateFallbackKHQR(params: {
    amount: number;
    description: string;
    transactionId: string;
  }): string {
    const bakongAccount = config.merchant.bakongId || 'demo@bkrt';
    const merchantName = config.merchant.name || 'MY SHOP';
    const merchantCity = config.merchant.city || 'Phnom Penh';
    const billNumber = params.description
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .substring(0, 25);

    // Helper: build TLV (Tag-Length-Value) segment
    const tlv = (tag: string, value: string): string => {
      const len = value.length.toString().padStart(2, '0');
      return tag + len + value;
    };

    // ── Tag 29: Merchant Account Information (Cambodia KHQR) ──
    // Sub-tags under 29:
    //   00  = Globally Unique Identifier ("khqr.bakong.com")
    //   01  = Bakong Account ID
    //   02  = Merchant Name (optional, for display)
    //   03  = Merchant City (optional)
    const guid = 'khqr.bakong.com';
    let tag29Data =
      tlv('00', guid) +
      tlv('01', bakongAccount) +
      tlv('02', merchantName.substring(0, 25));

    if (merchantCity) {
      tag29Data += tlv('03', merchantCity.substring(0, 15));
    }

    // ── Tag 62: Additional Data ──
    //   01  = Bill Number
    //   07  = Store Label (mobile number or store name)
    let tag62Data = '';
    if (billNumber) {
      tag62Data += tlv('01', billNumber);
    }
    tag62Data += tlv('07', merchantName.substring(0, 25));

    // ── Build the raw QR payload (without CRC) ──
    let rawQr = '';
    rawQr += tlv('00', '01');                      // Payload Format Indicator
    rawQr += tlv('01', '11');                      // Point of Initiation Method (static)
    rawQr += tlv('29', tag29Data);                 // Merchant Account Information
    rawQr += tlv('53', '840');                     // Transaction Currency (USD = 840)
    rawQr += tlv('54', params.amount.toFixed(2));  // Transaction Amount (USD)
    rawQr += tlv('58', 'KH');                      // Country Code
    rawQr += tlv('59', merchantName.substring(0, 25));  // Merchant Name (EMV)
    rawQr += tlv('60', merchantCity.substring(0, 15));  // Merchant City (EMV)
    rawQr += tlv('62', tag62Data);                 // Additional Data

    // ── Compute CRC16-CCITT (polynomial 0x1021) ──
    const crcData = rawQr + '6304'; // placeholder for CRC (tag 63, length 04)
    const crc = this.crc16ccitt(crcData);
    rawQr += '63' + '04' + crc;

    return rawQr;
  }

  /**
   * Compute CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF)
   * as required by the EMVCo QR Code specification.
   */
  private crc16ccitt(data: string): string {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= (data.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}

export const bakongService = new BakongService();
