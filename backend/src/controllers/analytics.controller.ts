import { Request, Response, NextFunction } from 'express';
import { AnalyticsEventModel, type AnalyticsEventType } from '../models/AnalyticsEvent';
import { HTTP_STATUS } from '../constants';

// ─── In-memory rate limiter for /track ─────────────────────
// Prevents a single client from flooding the analytics endpoint.
// A simple sliding-window per-IP tracker.

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60;         // max events per window
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Periodically clear stale entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60_000);

// ─── Helpers ────────────────────────────────────────────────

/**
 * Anonymize an IP address by keeping only the first 3 octets.
 * Keeps enough data for geo-region analysis without violating privacy.
 */
function anonymizeIp(ip: string): string {
  // Handle IPv4
  const ipv4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  const parts = ipv4.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  // For IPv6, store a generic placeholder instead of raw address
  return 'ipv6';
}

/**
 * Validate that an event_type is one of the known types.
 */
const VALID_EVENT_TYPES = new Set<AnalyticsEventType>([
  'page_view',
  'game_click',
  'product_select',
  'verify_player',
  'payment_initiated',
  'payment_completed',
  'payment_failed',
  'search',
  'admin_page_view',
  'admin_order_status_change',
  'admin_product_price_change',
]);

function isValidEventType(t: string): t is AnalyticsEventType {
  return VALID_EVENT_TYPES.has(t as AnalyticsEventType);
}

// ─── Handlers ───────────────────────────────────────────────

/**
 * POST /api/analytics/track
 *
 * Accepts a single analytics event or an array of events (batch mode).
 * The endpoint is unauthenticated by design — it's called from the
 * frontend on every page view and user interaction.
 *
 * Rate-limited to 60 requests/min per IP.
 */
export async function trackEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      // Silently drop excess events — no need to penalize the client
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Rate limited',
      });
      return;
    }

    const body = req.body;
    const events = Array.isArray(body) ? body : [body];

    if (events.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No events provided',
      });
      return;
    }

    const ipAnon = anonymizeIp(clientIp);
    const referrer = (req.headers.referer || req.headers.referrer || '') as string;
    const userAgent = ((req.headers['user-agent'] || '') as string).slice(0, 200);

    const docs = events
      .filter((e: any) => e && e.event_type && isValidEventType(e.event_type))
      .map((e: any) => ({
        event_type: e.event_type as AnalyticsEventType,
        event_data: e.event_data || {},
        page: e.page || req.headers['x-page'] || '',
        game_code: e.game_code || null,
        product_code: e.product_code || null,
        session_id: e.session_id || 'anon',
        ip_anon: ipAnon,
        referrer,
        user_agent: userAgent,
      }));

    if (docs.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No valid events found',
      });
      return;
    }

    // Batch insert (ordered: false allows partial success)
    await AnalyticsEventModel.insertMany(docs, { ordered: false });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Tracked ${docs.length} event(s)`,
      data: { tracked: docs.length },
    });
  } catch (error) {
    // Silently swallow analytics errors — non-critical to app function
    console.warn('⚠️  Analytics track error:', error instanceof Error ? error.message : error);
    res.status(HTTP_STATUS.OK).json({
      success: false,
      message: 'Analytics temporarily unavailable',
    });
  }
}

/**
 * GET /api/analytics/stats
 *
 * Returns aggregated analytics for the admin dashboard.
 * Protected by JWT auth middleware.
 */
export async function getStats(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel for speed
    const [
      totalPageViews,
      todayPageViews,
      weeklyPageViews,
      totalVisitors,
      todayVisitors,
      gameClicks,
      topGames,
    ] = await Promise.all([
      AnalyticsEventModel.countDocuments({ event_type: 'page_view' }),
      AnalyticsEventModel.countDocuments({
        event_type: 'page_view',
        created_at: { $gte: todayStart },
      }),
      AnalyticsEventModel.countDocuments({
        event_type: 'page_view',
        created_at: { $gte: weekAgo },
      }),
      AnalyticsEventModel.distinct('session_id', {
        event_type: 'page_view',
      }).then((s: string[]) => s.length),
      AnalyticsEventModel.distinct('session_id', {
        event_type: 'page_view',
        created_at: { $gte: todayStart },
      }).then((s: string[]) => s.length),
      AnalyticsEventModel.aggregate([
        { $match: { event_type: 'game_click', created_at: { $gte: monthAgo } } },
        { $group: { _id: '$game_code', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { game_code: '$_id', count: 1, _id: 0 } },
      ]),
      AnalyticsEventModel.aggregate([
        {
          $match: {
            event_type: 'page_view',
            game_code: { $nin: [null, ''] },
            created_at: { $gte: monthAgo },
          },
        },
        { $group: { _id: '$game_code', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { game_code: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    // Conversion counts (separate to avoid Aggregate type conflicts)
    const conversionTypes = ['payment_initiated', 'payment_completed', 'payment_failed'] as const;
    const conversionResults = await Promise.all(
      conversionTypes.map(async (eventType) => ({
        event_type: eventType,
        count: await AnalyticsEventModel.countDocuments({
          event_type: eventType,
          created_at: { $gte: monthAgo },
        }),
      }))
    );
    const conversionCounts: Record<string, number> = {};
    for (const r of conversionResults) {
      conversionCounts[r.event_type] = r.count;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Analytics stats fetched',
      data: {
        overview: {
          total_page_views: totalPageViews,
          today_page_views: todayPageViews,
          weekly_page_views: weeklyPageViews,
          total_visitors: totalVisitors,
          today_visitors: todayVisitors,
        },
        top_games_clicked: gameClicks,
        top_games_viewed: topGames,
        conversions: conversionCounts,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown analytics error');
    console.warn('⚠️  Analytics stats error:', err.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch analytics',
    });
  }
}
