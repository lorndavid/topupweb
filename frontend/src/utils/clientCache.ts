/**
 * VidTopUp High-Performance Client Cache
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements a multi-tier Stale-While-Revalidate (SWR) cache strategy:
 * - L1: Reactive In-Memory Cache (< 0.1ms access)
 * - L2: Persistent LocalStorage Cache (Instant offline / page reload access)
 * - SWR: Delivers cached data immediately to eliminate loading delays,
 *        then revalidates in the background if the TTL has expired.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface CacheEnvelope<T> {
  data: T
  timestamp: number
  expiresAt: number
  version: string
}

const CACHE_VERSION = 'v1.2'
const memoryCache = new Map<string, CacheEnvelope<any>>()

export interface CacheResult<T> {
  data: T
  isStale: boolean
  ageMs: number
}

export const clientCache = {
  /**
   * Get cached data synchronously.
   * Returns data immediately with an `isStale` flag indicating if background refresh is recommended.
   */
  get<T>(key: string): CacheResult<T> | null {
    const fullKey = `topup_cache_${CACHE_VERSION}_${key}`
    const now = Date.now()

    // 1. Check L1 Memory Cache
    if (memoryCache.has(fullKey)) {
      const entry = memoryCache.get(fullKey)!
      return {
        data: entry.data as T,
        isStale: now > entry.expiresAt,
        ageMs: now - entry.timestamp,
      }
    }

    // 2. Check L2 LocalStorage
    if (typeof window === 'undefined' || !window.localStorage) return null

    try {
      const raw = localStorage.getItem(fullKey)
      if (!raw) return null

      const entry: CacheEnvelope<T> = JSON.parse(raw)
      if (entry.version !== CACHE_VERSION) {
        localStorage.removeItem(fullKey)
        return null
      }

      // Populate L1 cache for fast subsequent lookups
      memoryCache.set(fullKey, entry)

      return {
        data: entry.data,
        isStale: now > entry.expiresAt,
        ageMs: now - entry.timestamp,
      }
    } catch {
      return null
    }
  },

  /**
   * Save data into L1 (memory) and L2 (localStorage) with a specified TTL.
   * Default TTL: 15 minutes.
   */
  set<T>(key: string, data: T, ttlMs = 15 * 60 * 1000): void {
    const fullKey = `topup_cache_${CACHE_VERSION}_${key}`
    const now = Date.now()
    const entry: CacheEnvelope<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
      version: CACHE_VERSION,
    }

    // Set L1
    memoryCache.set(fullKey, entry)

    // Set L2
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(fullKey, JSON.stringify(entry))
      } catch {
        // If quota exceeded, prune old entries and retry
        this.pruneExpired()
        try {
          localStorage.setItem(fullKey, JSON.stringify(entry))
        } catch { /* silent fallback to memory */ }
      }
    }
  },

  /**
   * Invalidate a specific cache entry
   */
  remove(key: string): void {
    const fullKey = `topup_cache_${CACHE_VERSION}_${key}`
    memoryCache.delete(fullKey)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(fullKey)
      } catch { /* silent */ }
    }
  },

  /**
   * Clear all VidTopUp cached entries
   */
  clear(): void {
    memoryCache.clear()
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keys = Object.keys(localStorage)
        for (const k of keys) {
          if (k.startsWith('topup_cache_')) {
            localStorage.removeItem(k)
          }
        }
      } catch { /* silent */ }
    }
  },

  /**
   * Remove expired or outdated version entries
   */
  pruneExpired(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const now = Date.now()
      const keys = Object.keys(localStorage)
      for (const k of keys) {
        if (k.startsWith('topup_cache_')) {
          const raw = localStorage.getItem(k)
          if (raw) {
            const entry = JSON.parse(raw)
            if (now > entry.expiresAt || entry.version !== CACHE_VERSION) {
              localStorage.removeItem(k)
            }
          }
        }
      }
    } catch { /* silent */ }
  },
}
