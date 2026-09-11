import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants';

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Extracts the real client IP, respecting Cloudflare headers
 * (CF-Connecting-IP) and X-Forwarded-For when behind proxy/tunnel.
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp) {
    return cfIp.trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Creates an in-memory sliding window rate limiting middleware.
 * Automatically evicts expired IP tracking entries.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests from this IP. Please wait a moment and try again.',
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Periodic cleanup of stale IPs every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
      if (record.timestamps.length === 0) {
        hits.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref(); // unref so timer doesn't prevent graceful process exit

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const now = Date.now();

    let record = hits.get(ip);
    if (!record) {
      record = { timestamps: [] };
      hits.set(ip, record);
    }

    // Retain only timestamps inside the sliding window
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

    const count = record.timestamps.length;

    // Headers
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - count - 1));
    const oldestTimestamp = record.timestamps[0] || now;
    const resetTimeSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    res.setHeader('RateLimit-Reset', Math.max(0, resetTimeSeconds));

    if (count >= max) {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message,
        retryAfter: resetTimeSeconds,
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}

/**
 * 1. Global API rate limiter:
 * 150 requests per minute per IP for general endpoints.
 */
export const globalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 150,
  message: 'API rate limit exceeded. Please slow down your requests.',
});

/**
 * 2. Admin login rate limiter:
 * Max 5 attempts per 15 minutes to prevent brute-force attacks.
 */
export const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
});

/**
 * 3. Payment creation rate limiter:
 * Max 10 payment creations per minute per IP. Prevents order flooding / bot spam.
 */
export const paymentCreateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many payment requests. Please wait a moment before creating a new order.',
});

/**
 * 4. Player verification rate limiter:
 * Max 30 lookups per minute per IP. Prevents automated account scraping.
 */
export const playerVerifyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many player ID checks. Please wait a moment.',
});

/**
 * 5. Analytics tracking rate limiter:
 * Max 60 events per minute per IP.
 */
export const analyticsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Analytics rate limit exceeded.',
});
