import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTION_CATALOG, calculateImpactSummary, getDefaultSelectedActionIds } from '../shared/impactEngine.js';
import { generateChatReply, generateTailoredPlan } from './advisorService.js';
import { fetchAirQualityForCity, SMOG_CITY_PRESETS } from './airQualityService.js';
import {
  sanitizeText,
  validateActionIds,
  validateChatHistory,
  validateCityQuery,
  validateProfile,
} from './validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lightweight per-IP rate limiter for AI endpoints
const aiRateBuckets = new Map<string, { count: number; resetAt: number }>();
function checkAiRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = aiRateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    aiRateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= 30) return false;
  bucket.count += 1;
  return true;
}

export function createApp() {
  const app = express();

  // Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      geminiConfiguredOnServer: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/presets', (_req: Request, res: Response) => {
    res.json({
      cities: SMOG_CITY_PRESETS.map((c) => ({
        city: c.city,
        country: c.country,
      })),
      actions: ACTION_CATALOG,
    });
  });

  app.get('/api/air-quality', async (req: Request, res: Response) => {
    const city = validateCityQuery(req.query.city);
    const snapshot = await fetchAirQualityForCity(city);
    res.json(snapshot);
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
    if (!checkAiRateLimit(req.ip || 'local')) {
      res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
      return;
    }
    const profile = validateProfile(req.body?.profile);
    const selectedActionIds = validateActionIds(req.body?.selectedActionIds);

    const aqi = await fetchAirQualityForCity(profile.city);
    const plan = await generateTailoredPlan(profile, aqi, selectedActionIds);
    res.json({ aqi, plan });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    if (!checkAiRateLimit(req.ip || 'local')) {
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

    const aqi = await fetchAirQualityForCity(profile.city);
    const result = await generateChatReply({
      question,
      history,
      profile,
      aqi,
      selectedActionIds,
    });
    res.json(result);
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
    console.log(`SmogShield AI API listening on http://localhost:${port}`);
  });
}
