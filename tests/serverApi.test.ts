import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
  Type: {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
  },
}));

import { scoreInterventionsForContext } from '../server/advisorService.js';
import {
  buildOfflineIndiaFeed,
  buildOfflineSnapshot,
  INDIAN_CITY_PRESETS,
  mapWeatherCode,
} from '../server/airQualityService.js';
import { createApp } from '../server/index.js';
import { validateProfile } from '../server/validation.js';

vi.mock('../server/airQualityService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../server/airQualityService.js')>();
  return {
    ...actual,
    fetchAirQualityForCity: vi.fn(async (city: string) => actual.buildOfflineSnapshot(city)),
    fetchIndiaLiveFeed: vi.fn(async () => actual.buildOfflineIndiaFeed()),
  };
});

let baseUrl = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;
const originalGeminiKey = process.env.GEMINI_API_KEY;

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

beforeEach(() => {
  mockGenerateContent.mockReset();
  delete process.env.GEMINI_API_KEY;
});

afterAll(async () => {
  if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey;
  else delete process.env.GEMINI_API_KEY;

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe('AirKin API & GenAI Decision Engine', () => {
  it('returns health metadata without leaking secrets', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('ok');
    expect(body.geminiConfiguredOnServer).toBe(false);
    expect(body).not.toHaveProperty('apiKey');
  });

  it('sanitizes and clamps invalid household profile inputs', () => {
    const clean = validateProfile({
      city: 'Delhi\n<script>',
      householdSize: 999,
      commuteKmRoundTrip: -40,
      commuteMode: 'jetpack',
      heatingSource: 'wood_coal',
    });
    expect(clean.householdSize).toBe(15);
    expect(clean.commuteKmRoundTrip).toBe(0);
    expect(clean.commuteMode).toBe('solo_car');
    expect(clean.heatingSource).toBe('wood_coal');
  });

  it('restricts preset hotspots to Indian cities and returns all-India live feed', async () => {
    expect(INDIAN_CITY_PRESETS.length).toBeGreaterThanOrEqual(30);
    expect(INDIAN_CITY_PRESETS.every((c) => c.country === 'India')).toBe(true);
    expect(mapWeatherCode(45)).toBe('Winter Fog / Mist');
    expect(buildOfflineIndiaFeed().cities.length).toBe(INDIAN_CITY_PRESETS.length);

    const res = await fetch(`${baseUrl}/api/india-feed`);
    expect(res.status).toBe(200);
    const feed = (await res.json()) as {
      cities: Array<{ region: string; indianAqi: number; cpcbCategory: string }>;
    };
    expect(feed.cities.length).toBeGreaterThanOrEqual(30);
    expect(feed.cities.every((c) => typeof c.indianAqi === 'number' && Boolean(c.cpcbCategory))).toBe(true);
    const regions = new Set(feed.cities.map((c) => c.region));
    expect(regions.has('North')).toBe(true);
    expect(regions.has('South')).toBe(true);
    expect(regions.has('West')).toBe(true);
    expect(regions.has('East')).toBe(true);
    expect(regions.has('Central')).toBe(true);
  });

  it('ranks wood heating and filtration interventions higher for high-risk households', () => {
    const aqi = buildOfflineSnapshot('Delhi');
    const profile = validateProfile({
      city: 'Delhi',
      heatingSource: 'wood_coal',
      purifierType: 'none',
      hasChildren: true,
    });
    const ranked = scoreInterventionsForContext(profile, aqi);
    expect(ranked.length).toBeGreaterThanOrEqual(4);
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(ranked[ranked.length - 1].relevanceScore);
  });

  it('returns HTTP 503 with live AQI when server GEMINI_API_KEY is not configured', async () => {
    const res = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { city: 'Delhi' } }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { aqi?: { city: string }; error?: string };
    expect(body.aqi?.city).toBe('Delhi');
    expect(body.error).toContain('GEMINI_API_KEY');
  });

  it('generates a grounded Gemini 3.8 Flash plan when GEMINI_API_KEY is configured', async () => {
    process.env.GEMINI_API_KEY = 'test-server-key-123456';
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        headline: 'Severe Winter Smog Plan for Delhi',
        situationSummary: 'Delhi is under a high nocturnal inversion.',
        riskAlert: 'Protect children indoors below 15 µg/m³.',
        recommendations: [
          {
            id: 'rec-1',
            category: 'routine',
            priority: 'Immediate',
            title: 'Shift Window Airing to 14:00',
            timingOrEffort: 'Free · 15 mins',
            steps: ['Keep windows sealed during morning inversion.'],
            directImpactHeadline: '-22% infiltration exposure',
            directImpactDetail: 'Avoids morning PM2.5 spike.',
            scienceWhy: 'Afternoon solar mixing lifts the boundary layer.',
          },
        ],
      }),
    });

    const res = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { city: 'Delhi', householdSize: 4 } }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { plan: { mode: string; headline: string } };
    expect(data.plan.mode).toBe('gemini-live');
    expect(data.plan.headline).toContain('Delhi');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('returns Gemini chat reply when GEMINI_API_KEY is configured and rejects empty questions', async () => {
    const badRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '   ' }),
    });
    expect(badRes.status).toBe(400);

    process.env.GEMINI_API_KEY = 'test-server-key-123456';
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Air out briefly between 14:00 and 16:00 when inversion weakens.',
    });

    const okRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'When should I open windows today?',
        profile: { city: 'Lucknow' },
      }),
    });
    expect(okRes.status).toBe(200);
    const body = (await okRes.json()) as { mode: string; reply: string };
    expect(body.mode).toBe('gemini-live');
    expect(body.reply).toContain('14:00');
  });

  it('calculates impact via /api/impact/calculate endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/impact/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: { city: 'Patna', householdSize: 3, commuteMode: 'solo_car' },
        outdoorPm25: 135,
        selectedActionIds: ['diy_corsi_rosenthal', 'transit_carpool_swap'],
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { optimizedIndoorPm25: number; baselineIndoorPm25: number };
    expect(data.optimizedIndoorPm25).toBeLessThan(data.baselineIndoorPm25);
  });
});
