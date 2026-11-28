import 'dotenv/config';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACTION_CATALOG,
  calculateImpactSummary,
  getDefaultSelectedActionIds,
} from '../shared/impactEngine.js';
import { AiServiceError, generateChatReply, generateTailoredPlan } from './advisorService.js';
import {
  CityNotFoundError,
  fetchAirQualityForCity,
  fetchIndiaLiveFeed,
  INDIAN_CITY_PRESETS,
} from './airQualityService.js';
import {
  sanitizeText,
  validateActionIds,
  validateChatHistory,
  validateCityQuery,
  validateProfile,
} from './validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bounded per-IP rate limiter with stale-bucket pruning for security & memory efficiency
const MAX_RATE_BUCKETS = 2000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

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

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
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
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (isOriginAllowed(origin)) callback(null, true);
        else callback(null, false);
      },
      methods: ['GET', 'POST', 'OPTIONS'],
    })
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      geminiConfiguredOnServer: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/presets', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({
      cities: INDIAN_CITY_PRESETS.map((c) => ({
        city: c.city,
        country: c.country,
      })),
      actions: ACTION_CATALOG,
    });
  });

  app.get('/api/india-feed', async (_req: Request, res: Response) => {
    const feed = await fetchIndiaLiveFeed();
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json(feed);
  });

  app.get('/api/air-quality', async (req: Request, res: Response) => {
    const rl = checkRateLimit(`aqi:${req.ip || 'local'}`, 60);
    res.setHeader('X-RateLimit-Limit', '60');
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    if (!rl.allowed) {
      res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
      return;
    }

    try {
      const city = validateCityQuery(req.query.city);
      const snapshot = await fetchAirQualityForCity(city);
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.json(snapshot);
    } catch (err) {
      if (err instanceof CityNotFoundError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Unable to fetch air quality data.' });
    }
  });

  app.post('/api/impact/calculate', async (req: Request, res: Response) => {
    const profile = validateProfile(req.body?.profile);
    const outdoorPm25 =
      typeof req.body?.outdoorPm25 === 'number' && Number.isFinite(req.body.outdoorPm25)
        ? Math.max(1, Math.min(1000, req.body.outdoorPm25))
        : 120;
    const selectedActionIds = validateActionIds(req.body?.selectedActionIds);
    const ids =
      selectedActionIds.length > 0 ? selectedActionIds : getDefaultSelectedActionIds(profile);

    res.json(calculateImpactSummary(profile, outdoorPm25, ids));
  });

  app.post('/api/plan', async (req: Request, res: Response) => {
    const rl = checkRateLimit(`ai:${req.ip || 'local'}`, 30);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-RateLimit-Limit', '30');
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    if (!rl.allowed) {
      res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
      return;
    }
    const profile = validateProfile(req.body?.profile);
    const selectedActionIds = validateActionIds(req.body?.selectedActionIds);

    let aqi;
    try {
      aqi = await fetchAirQualityForCity(profile.city);
    } catch (err) {
      if (err instanceof CityNotFoundError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }

    try {
      const plan = await generateTailoredPlan(profile, aqi, selectedActionIds);
      res.json({ aqi, plan });
    } catch (err) {
      const status = err instanceof AiServiceError ? err.statusCode : 500;
      const message =
        err instanceof AiServiceError ? err.message : 'Unable to generate tailored AI plan.';
      res.status(status).json({ aqi, error: message });
    }
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const rl = checkRateLimit(`ai:${req.ip || 'local'}`, 30);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-RateLimit-Limit', '30');
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    if (!rl.allowed) {
      res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
      return;
    }

    const question = sanitizeText(req.body?.question, 1000);
    if (!question) {
      res.status(400).json({ error: 'Please enter a non-empty question.' });
      return;
    }

    const profile = validateProfile(req.body?.profile);
    const selectedActionIds = validateActionIds(req.body?.selectedActionIds);
    const history = validateChatHistory(req.body?.history);

    let aqi;
    try {
      aqi = await fetchAirQualityForCity(profile.city);
    } catch (err) {
      if (err instanceof CityNotFoundError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }

    try {
      const result = await generateChatReply({
        question,
        history,
        profile,
        aqi,
        selectedActionIds,
      });
      res.json(result);
    } catch (err) {
      const status = err instanceof AiServiceError ? err.statusCode : 500;
      const message =
        err instanceof AiServiceError ? err.message : 'Unable to generate AI response.';
      res.status(status).json({ error: message });
    }
  });

  // Serve built frontend in production if dist/ exists
  const distDir = path.resolve(__dirname, '../../dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
  const port = Number(process.env.PORT) || 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`AirKin API listening on http://localhost:${port}`);
  });
}
