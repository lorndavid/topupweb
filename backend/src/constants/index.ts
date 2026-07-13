export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  AWAITING_PAYMENT: 'awaiting_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
} as const;

export const BAY2GAME_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;

export const ERROR_MESSAGES = {
  INVALID_PRODUCT: 'Invalid product code',
  INSUFFICIENT_BALANCE: 'Insufficient balance in reseller account',
  ORDER_NOT_FOUND: 'Order not found',
  PAYMENT_FAILED: 'Payment verification failed',
  PAYMENT_PENDING: 'Payment is still pending',
  INVALID_PLAYER_ID: 'Invalid player ID',
  SERVER_ERROR: 'Internal server error',
  API_TIMEOUT: 'Bay2Game API timeout',
  API_FAILURE: 'Bay2Game API failure',
  DUPLICATE_REFERENCE: 'Duplicate order reference',
  BAKONG_ERROR: 'Bakong payment error',
} as const;

export const REFERENCE_PREFIX = 'TUP';

export const PAYMENT_POLL_INTERVAL = 3000; // 3 seconds
export const PAYMENT_POLL_TIMEOUT = 5 * 60 * 1000; // 5 minutes
export const API_TIMEOUT = 10000; // 10 seconds
