import {
  classifyAqiSeverity,
  computeInversionRisk,
  findVentilationWindow,
} from '../shared/impactEngine.js';
import type { AirQualitySnapshot, HourlyAqiPoint } from '../shared/types.js';
import { validateCityQuery } from './validation.js';

interface CacheEntry {
  expiresAt: number;
  data: AirQualitySnapshot;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const aqiCache = new Map<string, CacheEntry>();

export interface CityPreset {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  basePm25: number;
  basePm10: number;
  usAqi: number;
  tempC: number;
  windKmh: number;
  humidityPct: number;
}

export const SMOG_CITY_PRESETS: CityPreset[] = [
  {
    city: 'Lahore',
    country: 'Pakistan',
    latitude: 31.558,
    longitude: 74.3507,
    basePm25: 148,
    basePm10: 196,
    usAqi: 215,
    tempC: 11.4,
    windKmh: 4.2,
    humidityPct: 78,
  },
  {
    city: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    basePm25: 174,
    basePm10: 242,
    usAqi: 248,
    tempC: 13.0,
    windKmh: 3.8,
    humidityPct: 74,
  },
  {
    city: 'Beijing',
    country: 'China',
    latitude: 39.9042,
    longitude: 116.4074,
    basePm25: 88,
    basePm10: 118,
    usAqi: 168,
    tempC: 2.5,
    windKmh: 6.1,
    humidityPct: 62,
  },
  {
    city: 'Salt Lake City',
    country: 'United States',
    latitude: 40.7608,
    longitude: -111.891,
    basePm25: 56,
    basePm10: 74,
    usAqi: 151,
    tempC: -1.8,
    windKmh: 3.5,
    humidityPct: 76,
  },
  {
    city: 'Sarajevo',
    country: 'Bosnia and Herzegovina',
    latitude: 43.8563,
    longitude: 18.4131,
    basePm25: 112,
    basePm10: 142,
    usAqi: 184,
    tempC: 1.2,
    windKmh: 3.2,
    humidityPct: 83,
  },
  {
    city: 'London',
    country: 'United Kingdom',
    latitude: 51.5072,
    longitude: -0.1276,
    basePm25: 28,
    basePm10: 38,
    usAqi: 84,
    tempC: 6.8,
    windKmh: 11.5,
    humidityPct: 81,
  },
];

function buildDiurnalSmogCurve(basePm25: number, baseAqi: number): HourlyAqiPoint[] {
  // Typical winter thermal-inversion diurnal multiplier: peaks 07-09h and 20-23h, dips 13-16h
  const multipliers = [
    1.18, 1.15, 1.12, 1.08, 1.1, 1.18, 1.28, 1.35, 1.3, 1.12, 0.92, 0.78,
    0.68, 0.62, 0.6, 0.65, 0.78, 0.95, 1.14, 1.26, 1.32, 1.3, 1.25, 1.2,
  ];
  const now = new Date();
  return multipliers.map((mult, hour) => {
    const dt = new Date(now);
    dt.setHours(hour, 0, 0, 0);
    const pm25 = Math.max(8, Math.round(basePm25 * mult));
    return {
      time: dt.toISOString(),
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      pm25,
      pm10: Math.round(pm25 * 1.32),
      usAqi: Math.max(25, Math.round(baseAqi * (0.35 + 0.65 * mult))),
    };
  });
}

export function buildOfflineSnapshot(cityName: string): AirQualitySnapshot {
  const lower = cityName.toLowerCase();
  const matched =
    SMOG_CITY_PRESETS.find((p) => p.city.toLowerCase() === lower) ?? {
      ...SMOG_CITY_PRESETS[0],
      city: cityName,
      country: 'Urban Monitoring Profile',
      basePm25: 96,
      basePm10: 132,
      usAqi: 172,
    };

  const hourly = buildDiurnalSmogCurve(matched.basePm25, matched.usAqi);
  return {
    city: matched.city,
    country: matched.country,
    latitude: matched.latitude,
    longitude: matched.longitude,
    source: 'offline-scenario',
    fetchedAt: new Date().toISOString(),
    current: {
      pm25: matched.basePm25,
      pm10: matched.basePm10,
      no2: 64,
      co: 1850,
      so2: 24,
      o3: 31,
      usAqi: matched.usAqi,
      europeanAqi: Math.min(100, Math.round(matched.usAqi * 0.42)),
      temperatureC: matched.tempC,
      windSpeedKmh: matched.windKmh,
      humidityPct: matched.humidityPct,
    },
    severity: classifyAqiSeverity(matched.usAqi),
    inversionRisk: computeInversionRisk({
      windSpeedKmh: matched.windKmh,
      temperatureC: matched.tempC,
      pm25: matched.basePm25,
      humidityPct: matched.humidityPct,
    }),
    ventilationWindow: findVentilationWindow(hourly),
    hourly,
  };
}

function setCached(key: string, data: AirQualitySnapshot): void {
  if (aqiCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = aqiCache.keys().next().value;
    if (oldestKey) aqiCache.delete(oldestKey);
  }
  aqiCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data,
  });
}

export async function fetchAirQualityForCity(rawCity: string): Promise<AirQualitySnapshot> {
  const cityQuery = validateCityQuery(rawCity);
  const cacheKey = cityQuery.toLowerCase();
  const cached = aqiCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityQuery
    )}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl, { signal: controller.signal });
    if (!geoRes.ok) throw new Error(`Geocoding status ${geoRes.status}`);
    const geoJson = (await geoRes.json()) as {
      results?: Array<{
        name: string;
        country?: string;
        latitude: number;
        longitude: number;
      }>;
    };

    const place = geoJson.results?.[0];
    if (!place) {
      clearTimeout(timer);
      const fallback = buildOfflineSnapshot(cityQuery);
      setCached(cacheKey, fallback);
      return fallback;
    }

    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi&hourly=pm10,pm2_5,us_aqi&forecast_days=1&timezone=auto`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;

    const [aqiRes, weatherRes] = await Promise.all([
      fetch(aqiUrl, { signal: controller.signal }),
      fetch(weatherUrl, { signal: controller.signal }),
    ]);
    clearTimeout(timer);

    if (!aqiRes.ok) throw new Error(`AQI status ${aqiRes.status}`);
    const aqiJson = (await aqiRes.json()) as {
      current?: Record<string, number>;
      hourly?: {
        time?: string[];
        pm2_5?: number[];
        pm10?: number[];
        us_aqi?: number[];
      };
    };

    const weatherJson = weatherRes.ok
      ? ((await weatherRes.json()) as { current?: Record<string, number> })
      : { current: {} };

    const cur = aqiJson.current ?? {};
    const wCur = weatherJson.current ?? {};

    const pm25 = Number((cur.pm2_5 ?? 45).toFixed(1));
    const pm10 = Number((cur.pm10 ?? pm25 * 1.3).toFixed(1));
    const usAqi = Math.round(cur.us_aqi ?? 110);
    const temperatureC = Number((wCur.temperature_2m ?? 9.5).toFixed(1));
    const windSpeedKmh = Number((wCur.wind_speed_10m ?? 6.5).toFixed(1));
    const humidityPct = Math.round(wCur.relative_humidity_2m ?? 70);

    const times = aqiJson.hourly?.time ?? [];
    const hPm25 = aqiJson.hourly?.pm2_5 ?? [];
    const hPm10 = aqiJson.hourly?.pm10 ?? [];
    const hAqi = aqiJson.hourly?.us_aqi ?? [];

    const hourly: HourlyAqiPoint[] = times.slice(0, 24).map((t, idx) => {
      const hourStr = t.includes('T') ? t.split('T')[1].slice(0, 5) : `${String(idx).padStart(2, '0')}:00`;
      return {
        time: t,
        hourLabel: hourStr,
        pm25: Math.round(hPm25[idx] ?? pm25),
        pm10: Math.round(hPm10[idx] ?? pm10),
        usAqi: Math.round(hAqi[idx] ?? usAqi),
      };
    });

    const snapshot: AirQualitySnapshot = {
      city: place.name,
      country: place.country ?? '',
      latitude: place.latitude,
      longitude: place.longitude,
      source: 'open-meteo-live',
      fetchedAt: new Date().toISOString(),
      current: {
        pm25,
        pm10,
        no2: Math.round(cur.nitrogen_dioxide ?? 0),
        co: Math.round(cur.carbon_monoxide ?? 0),
        so2: Math.round(cur.sulphur_dioxide ?? 0),
        o3: Math.round(cur.ozone ?? 0),
        usAqi,
        europeanAqi: Math.round(cur.european_aqi ?? 0),
        temperatureC,
        windSpeedKmh,
        humidityPct,
      },
      severity: classifyAqiSeverity(usAqi),
      inversionRisk: computeInversionRisk({
        windSpeedKmh,
        temperatureC,
        pm25,
        humidityPct,
      }),
      ventilationWindow: findVentilationWindow(hourly),
      hourly,
    };

    setCached(cacheKey, snapshot);
    return snapshot;
  } catch {
    const fallback = buildOfflineSnapshot(cityQuery);
    setCached(cacheKey, fallback);
    return fallback;
  }
}
