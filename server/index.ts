import 'dotenv/config';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import cors from 'cors';
import express, { type Request, type Response } from 'express';
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
  apiErrorHandler,
  createRateLimiter,
  securityHeadersMiddleware,
  STRICT_CORS_OPTIONS,
} from './middleware.js';
import {
  sanitizeText,
  validateActionIds,
  validateChatHistory,
  validateCityQuery,
  validateProfile,
} from './validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resolveCityAqi(city: string, res: Response) {
  try {
    return await fetchAirQualityForCity(city);
  } catch (err) {
    if (err instanceof CityNotFoundError) {
      res.status(err.statusCode).json({ error: err.message });
      return null;
    }
    throw err;
  }
}

/**
 * Builds and configures the AirKin Express application with hardened security headers,
 * origin-validated CORS, bounded rate limiting, and API routes.
 */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeadersMiddleware);
  app.use(cors(STRICT_CORS_OPTIONS));
  app.use(express.json({ limit: '100kb' }));

  const aqiRateLimit = createRateLimiter('aqi', 60);
  const aiRateLimit = createRateLimiter('ai', 30);

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

  app.get('/api/air-quality', aqiRateLimit, async (req: Request, res: Response) => {
    try {
      const city = validateCityQuery(req.query.city);
      const snapshot = await resolveCityAqi(city, res);
      if (!snapshot) return;
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.json(snapshot);
    } catch {
      res.status(500).json({ error: 'Unable to fetch air quality data.' });
    }
  });

  app.post('/api/impact/calculate', (req: Request, res: Response) => {
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

  app.post('/api/plan', aiRateLimit, async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const profile = validateProfile(req.body?.profile);
    const selectedActionIds = validateActionIds(req.body?.selectedActionIds);

    const aqi = await resolveCityAqi(profile.city, res);
    if (!aqi) return;

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

  app.post('/api/chat', aiRateLimit, async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const question = sanitizeText(req.body?.question, 1000);
    if (!question) {
      res.status(400).json({ error: 'Please enter a non-empty question.' });
      return;
    }

    const profile = validateProfile(req.body?.profile);
    const selectedActionIds = validateActionIds(req.body?.selectedActionIds);
    const history = validateChatHistory(req.body?.history);

    const aqi = await resolveCityAqi(profile.city, res);
    if (!aqi) return;

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

  const distDir = path.resolve(__dirname, '../../dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(apiErrorHandler);
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
