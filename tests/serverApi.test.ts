import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/index.js';
import { buildDeterministicChatReply, buildDeterministicPlan } from '../server/advisorService.js';
import { buildOfflineSnapshot } from '../server/airQualityService.js';
import { validateProfile } from '../server/validation.js';

let baseUrl = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

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

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe('AirKin API & Decision Engine', () => {
  it('returns health metadata without leaking secrets', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('ok');
    expect(typeof body.geminiConfiguredOnServer).toBe('boolean');
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

  it('generates 4 tailored pillar cards in the deterministic atmospheric model', () => {
    const aqi = buildOfflineSnapshot('Lahore');
    const profile = validateProfile({
      city: 'Lahore',
      heatingSource: 'wood_coal',
      purifierType: 'none',
      hasChildren: true,
    });
    const plan = buildDeterministicPlan(profile, aqi);
    expect(plan.recommendations).toHaveLength(4);
    const categories = new Set(plan.recommendations.map((r) => r.category));
    expect(categories).toEqual(
      new Set(['routine', 'indoor_hack', 'sustainable_swap', 'community'])
    );
  });

  it('responds dynamically to chat questions with local AQI and mass-balance numbers', () => {
    const aqi = buildOfflineSnapshot('Delhi');
    const profile = validateProfile({ city: 'Delhi', purifierType: 'none' });
    const reply = buildDeterministicChatReply(
      'How do I lower indoor PM2.5 with a DIY Corsi-Rosenthal filter?',
      profile,
      aqi,
      ['diy_corsi_rosenthal']
    );
    expect(reply).toContain('MERV-13');
    expect(reply).toContain('µg/m³');
  });

  it('rejects empty chat questions with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('calculates impact via /api/impact/calculate endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/impact/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: { city: 'Beijing', householdSize: 3, commuteMode: 'solo_car' },
        outdoorPm25: 135,
        selectedActionIds: ['diy_corsi_rosenthal', 'transit_carpool_swap'],
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { optimizedIndoorPm25: number; baselineIndoorPm25: number };
    expect(data.optimizedIndoorPm25).toBeLessThan(data.baselineIndoorPm25);
  });
});
