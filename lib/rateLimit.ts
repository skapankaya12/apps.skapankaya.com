/**
 * Small fixed-window rate limiter for API routes.
 *
 * Deliberately in-memory and dependency-free. Be clear about what that buys:
 * on Vercel each serverless instance keeps its own counter, so a request spread
 * across many cold instances is counted separately, and counters reset on
 * redeploy. It reliably stops the case that actually happens — one script
 * hammering an endpoint from one place — and it costs nothing. It is not a
 * defence against a distributed flood; that needs a shared store (Upstash,
 * Vercel KV) or a WAF rule, worth adding when traffic justifies it.
 *
 * Note this cannot protect Storage uploads at all: the browser uploads straight
 * to Firebase Storage and never touches a Next.js route. The controls there are
 * storage.rules and Firebase App Check.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

/** Drop expired entries so the map can't grow without bound on a warm instance. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Suitable for a Retry-After header. */
  retryAfter: number;
}

/**
 * Count one hit against `key`. Returns ok:false once `limit` is exceeded
 * within `windowMs`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  hit.count += 1;
  if (hit.count > limit) {
    return { ok: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort client IP. Vercel sets x-forwarded-for; the first entry is the
 * client. Falls back to a shared bucket, which means unknown-IP callers are
 * rate-limited together — the safe direction to fail.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** 429 with Retry-After, for when a limit is hit. */
export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { ok: false, error: "rate-limited" },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}
