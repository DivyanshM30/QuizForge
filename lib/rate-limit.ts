/**
 * Simple in-memory rate limiter.
 *
 * NOTE: This is per-instance (resets on redeploy / cold start) which is fine
 * for Vercel serverless — it still protects against rapid-fire abuse within a
 * single warm instance. For stricter limits, swap in a Redis-backed solution.
 */

const store = new Map<string, { count: number; resetTime: number }>();

/** Periodically evict expired entries so the map doesn't grow unbounded. */
const CLEANUP_INTERVAL = 60_000; // 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now > record.resetTime) store.delete(key);
  }
}, CLEANUP_INTERVAL);

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

/**
 * Check rate limit for a given key.
 *
 * @param key       Unique identifier (e.g. user ID, IP)
 * @param limit     Max requests allowed in the window
 * @param windowMs  Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: limit - record.count };
}
