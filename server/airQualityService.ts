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

export class CityNotFoundError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'CityNotFoundError';
  }
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

export const INDIAN_CITY_PRESETS: CityPreset[] = [
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
    city: 'Gurugram',
    country: 'India',
    latitude: 28.4595,
    longitude: 77.0266,
    basePm25: 158,
    basePm10: 215,
    usAqi: 228,
    tempC: 13.2,
    windKmh: 4.1,
    humidityPct: 72,
  },
  {
    city: 'Noida',
    country: 'India',
    latitude: 28.5355,
    longitude: 77.391,
    basePm25: 168,
    basePm10: 229,
    usAqi: 239,
    tempC: 12.8,
    windKmh: 3.6,
    humidityPct: 75,
  },
  {
    city: 'Lucknow',
    country: 'India',
    latitude: 26.8467,
    longitude: 80.9462,
    basePm25: 142,
    basePm10: 194,
    usAqi: 208,
    tempC: 14.1,
    windKmh: 4.5,
    humidityPct: 76,
  },
  {
    city: 'Patna',
    country: 'India',
    latitude: 25.5941,
    longitude: 85.1376,
    basePm25: 154,
    basePm10: 210,
    usAqi: 224,
    tempC: 14.8,
    windKmh: 4.0,
    humidityPct: 79,
  },
  {
    city: 'Kanpur',
    country: 'India',
    latitude: 26.4499,
    longitude: 80.3319,
    basePm25: 149,
    basePm10: 204,
    usAqi: 216,
    tempC: 13.7,
    windKmh: 4.3,
    humidityPct: 75,
  },
  {
    city: 'Jaipur',
    country: 'India',
    latitude: 26.9124,
    longitude: 75.7873,
    basePm25: 98,
    basePm10: 144,
    usAqi: 174,
    tempC: 15.2,
    windKmh: 6.2,
    humidityPct: 58,
  },
  {
    city: 'Kolkata',
    country: 'India',
    latitude: 22.5726,
    longitude: 88.3639,
    basePm25: 118,
    basePm10: 162,
    usAqi: 186,
    tempC: 18.6,
    windKmh: 5.4,
    humidityPct: 77,
  },
];

function buildDiurnalSmogCurve(basePm25: number, baseAqi: number): HourlyAqiPoint[] {
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
    INDIAN_CITY_PRESETS.find((p) => p.city.toLowerCase() === lower) ?? {
      ...INDIAN_CITY_PRESETS[0],
      city: cityName,
      country: 'India',
      basePm25: 116,
      basePm10: 158,
      usAqi: 184,
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
      no2: 68,
      co: 1920,
      so2: 26,
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
    )}&count=8&countryCode=IN&language=en&format=json`;
    const geoRes = await fetch(geoUrl, { signal: controller.signal });
    if (!geoRes.ok) throw new Error(`Geocoding status ${geoRes.status}`);
    const geoJson = (await geoRes.json()) as {
      results?: Array<{
        name: string;
        country?: string;
        country_code?: string;
        latitude: number;
        longitude: number;
      }>;
    };

    const indianPlaces = (geoJson.results ?? []).filter(
      (r) => r.country_code === 'IN' || r.country?.toLowerCase() === 'india'
    );
    const place = indianPlaces[0];

    if (!place) {
      clearTimeout(timer);
      const presetMatch = INDIAN_CITY_PRESETS.find(
        (p) => p.city.toLowerCase() === cacheKey
      );
      if (presetMatch) {
        const fallback = buildOfflineSnapshot(presetMatch.city);
        setCached(cacheKey, fallback);
        return fallback;
      }
      throw new CityNotFoundError(
        `"${cityQuery}" was not found in India. AirKin tracks Indian cities only (e.g., Delhi, Gurugram, Noida, Lucknow, Patna, Kanpur, Jaipur, Kolkata, Mumbai).`
      );
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
    const temperatureC = Number((wCur.temperature_2m ?? 14.0).toFixed(1));
    const windSpeedKmh = Number((wCur.wind_speed_10m ?? 5.0).toFixed(1));
    const humidityPct = Math.round(wCur.relative_humidity_2m ?? 70);

    const times = aqiJson.hourly?.time ?? [];
    const hPm25 = aqiJson.hourly?.pm2_5 ?? [];
    const hPm10 = aqiJson.hourly?.pm10 ?? [];
    const hAqi = aqiJson.hourly?.us_aqi ?? [];

    const hourly: HourlyAqiPoint[] = times.slice(0, 24).map((t, idx) => {
      const hourStr = t.includes('T')
        ? t.split('T')[1].slice(0, 5)
        : `${String(idx).padStart(2, '0')}:00`;
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
      country: 'India',
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
  } catch (err) {
    if (err instanceof CityNotFoundError) throw err;
    const fallback = buildOfflineSnapshot(cityQuery);
    setCached(cacheKey, fallback);
    return fallback;
  }
}
