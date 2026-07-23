import { Request, Response, NextFunction } from 'express';
import { bay2gameService } from '../services/bay2game.service';
import { HTTP_STATUS } from '../constants';
import type { Bay2GameCategory } from '../types';

const SITE_URL = 'https://topup.lorndavid.online';

/**
 * Static routes that should be included in the sitemap.
 * Each entry has path, change frequency, priority, and a static label.
 * Game-detail pages are added dynamically below.
 */
const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/orders', changefreq: 'weekly', priority: '0.3' },
] as const;

/**
 * Escapes XML-sensitive characters in a string.
 * Prevents malformed XML from game names/descriptions.
 */
function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Returns today's date in W3C Datetime format (YYYY-MM-DD).
 * Used for <lastmod> tags in the sitemap.
 */
function todayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Build a <url> XML block for a single sitemap entry.
 */
function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string): string {
  const dateEl = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>${dateEl}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * GET /sitemap.xml
 *
 * Generates a dynamic XML sitemap that includes:
 *   - Home page (priority 1.0, daily)
 *   - Every game page from Bay2Game categories (priority 0.9, weekly)
 *   - Static pages (priority 0.3–0.5, weekly)
 *
 * If the Bay2Game API is unavailable, the sitemap is served with just
 * the static routes so Googlebot never sees a broken response.
 *
 * A 1-hour cache is recommended via Cache-Control header.
 */
export async function generateSitemap(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Graceful degradation: if Bay2Game API is unavailable, serve
    // a sitemap with static routes only — never return a 500 to crawlers.
    let categories: Bay2GameCategory[] = [];
    try {
      categories = await bay2gameService.getCategories();
    } catch {
      console.warn('⚠️  Sitemap: Bay2Game API unavailable — serving static routes only');
    }

    const today = todayDate();

    // ─── Build URL entries ─────────────────────────────────
    const entries: string[] = [];

    // 1. Static routes
    for (const route of STATIC_ROUTES) {
      entries.push(urlEntry(SITE_URL + route.path, route.changefreq, route.priority, today));
    }

    // 2. Game detail pages (dynamic from Bay2Game categories)
    for (const game of categories) {
      entries.push(
        urlEntry(
          `${SITE_URL}/game/${game.game_code}`,
          'weekly',
          '0.9',
          today
        )
      );
    }

    // ─── Assemble XML ───────────────────────────────────────
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

    res
      .status(HTTP_STATUS.OK)
      .set('Content-Type', 'application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(xml);
  } catch (error) {
    // Last-resort fallback: serve static-only sitemap on unexpected errors
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${xmlEscape(SITE_URL)}/</loc>
    <lastmod>${todayDate()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    res
      .status(HTTP_STATUS.OK)
      .set('Content-Type', 'application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(fallbackXml);
  }
}
