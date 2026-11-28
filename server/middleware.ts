import type { CorsOptions } from 'cors';
import type { NextFunction, Request, Response } from 'express';

const MAX_RATE_BUCKETS = 2000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Bounded per-IP fixed-window rate limiter preventing memory growth under distributed traffic.
 */
export function checkRateLimit(
  bucketKey: string,
  limitPerMinute = 30
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  if (rateBuckets.size > MAX_RATE_BUCKETS) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
    if (rateBuckets.size > MAX_RATE_BUCKETS) {
      const oldestKey = rateBuckets.keys().next().value;
      if (oldestKey) rateBuckets.delete(oldestKey);
    }
  }

  const bucket = rateBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: Math.max(0, limitPerMinute - 1) };
  }
  if (bucket.count >= limitPerMinute) {
    return { allowed: false, remaining: 0 };
  }
  bucket.count += 1;
  return { allowed: true, remaining: Math.max(0, limitPerMinute - bucket.count) };
}

/**
 * Reusable Express rate-limiting middleware emitting standard X-RateLimit headers.
 */
export function createRateLimiter(prefix: string, limitPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rl = checkRateLimit(`${prefix}:${req.ip || 'local'}`, limitPerMinute);
    res.setHeader('X-RateLimit-Limit', String(limitPerMinute));
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    if (!rl.allowed) {
      res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
      return;
    }
    next();
  };
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  const custom = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return custom.includes(origin);
}

export const STRICT_CORS_OPTIONS: CorsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) callback(null, true);
    else callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
};

/**
 * Applies strict transport, framing, content-type, cross-origin, and CSP headers on every response.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/**
 * Sanitizes Express errors, returning HTTP 400 on malformed JSON instead of exposing stack traces.
 */
export function apiErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }
  res.status(500).json({ error: 'Internal server error.' });
}
