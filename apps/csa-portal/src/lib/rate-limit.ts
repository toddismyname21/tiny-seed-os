/**
 * Naive in-memory rate limiter for SSR endpoints.
 *
 * Keyed by an arbitrary string (e.g. `magic-link:<ip>`). Stores up to
 * `max` events per `windowMs`. When the count exceeds `max`, returns
 * `{ ok: false, retryAfterSeconds }`.
 *
 * Caveats:
 *   - Per-instance memory only. Vercel's serverless functions can spawn
 *     multiple instances, so this is a "best-effort" floor — under burst
 *     traffic, an attacker could get up to N × max requests through.
 *     Acceptable for Day 5 (single magic-link form, low volume). For
 *     production-grade rate limiting we'd back this with Upstash Redis
 *     or Supabase Auth's built-in rate limit (which already throttles
 *     OTP requests per email at 1 / 60s).
 *   - Map grows unbounded if we don't prune. We sweep expired entries
 *     on every check; at low volume this is fine.
 */

interface Bucket {
  /** Timestamps (ms epoch) of recent hits, oldest first. */
  hits: number[];
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  const bucket = store.get(key) ?? { hits: [] };
  // Drop hits outside the window.
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0];
    const retryAfterMs = Math.max(0, opts.windowMs - (now - oldest));
    store.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  bucket.hits.push(now);
  store.set(key, bucket);

  // Cheap occasional sweep: 1% chance per call to prune empty buckets.
  if (Math.random() < 0.01) {
    for (const [k, b] of store) {
      const stillFresh = b.hits.filter((t) => t > cutoff);
      if (stillFresh.length === 0) {
        store.delete(k);
      } else {
        b.hits = stillFresh;
      }
    }
  }

  return {
    ok: true,
    remaining: opts.max - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client IP extraction. Vercel sets `x-forwarded-for` —
 * we take the first IP (the client) and ignore the proxy chain.
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    return fwd.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
