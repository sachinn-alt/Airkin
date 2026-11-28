import { describe, expect, it } from 'vitest';
import { buildWeatherCardProps, mapWmoCodeToCondition } from '../src/lib/weatherMapper';
import { landDots, rotate, slerp, toVec } from '../src/components/ui/route-globe-utils/globe';
import { buildOfflineIndiaFeed, buildOfflineSnapshot } from '../server/airQualityService.js';

describe('weatherMapper & offline India presets', () => {
  it('maps WMO codes cleanly to WeatherCondition values', () => {
    expect(mapWmoCodeToCondition(0, 6, 45)).toBe('clear');
    expect(mapWmoCodeToCondition(0, 6, 220)).toBe('fog');
    expect(mapWmoCodeToCondition(2, 6, 90)).toBe('partly-cloudy');
    expect(mapWmoCodeToCondition(45, 5, 160)).toBe('fog');
    expect(mapWmoCodeToCondition(63, 10, 80)).toBe('rain');
    expect(mapWmoCodeToCondition(73, 8, 40)).toBe('snow');
    expect(mapWmoCodeToCondition(95, 18, 90)).toBe('storm');
  });

  it('builds complete WeatherCardProps for any Indian city including loading fallback', () => {
    expect(buildWeatherCardProps(null)).toEqual({ loading: true });

    const srinagar = buildOfflineSnapshot('Srinagar');
    const card = buildWeatherCardProps(srinagar);
    expect(card.location).toBe('Srinagar, IN');
    expect(card.hourly?.length).toBe(7);
    expect(card.daily?.length).toBe(4);
    expect(card.daily?.[0].today).toBe(true);
  });

  it('includes Jammu, Srinagar, and Leh in the 34-city India live feed', () => {
    const feed = buildOfflineIndiaFeed();
    const names = new Set(feed.cities.map((c) => c.city));
    expect(feed.cities.length).toBe(34);
    expect(names.has('Srinagar')).toBe(true);
    expect(names.has('Jammu')).toBe(true);
    expect(names.has('Leh')).toBe(true);
  });
});

describe('RouteGlobe spherical geometry utilities', () => {
  it('converts coordinates to unit vectors and rotates cleanly', () => {
    const delhi = toVec(77.21, 28.61);
    const mag = Math.hypot(delhi[0], delhi[1], delhi[2]);
    expect(mag).toBeCloseTo(1, 5);

    const rot = rotate(delhi, (77.21 * Math.PI) / 180, (18 * Math.PI) / 180);
    expect(rot[0]).toBeCloseTo(0, 3);
    expect(rot[2]).toBeGreaterThan(0.95);
  });

  it('interpolates great-circle midpoints and samples world land dots', () => {
    const a = toVec(77.21, 28.61);
    const b = toVec(72.88, 19.08);
    const mid = slerp(a, b, 0.5);
    expect(Math.hypot(mid[0], mid[1], mid[2])).toBeCloseTo(1, 5);

    const dots = landDots(2500);
    expect(dots.length).toBeGreaterThan(400);
    expect(dots.length).toBeLessThan(1500);
  });
});
