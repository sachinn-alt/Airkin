import {
  classifyAqiSeverity,
  computeInversionRisk,
  findVentilationWindow,
} from '../shared/impactEngine.js';
import type {
  AirQualitySnapshot,
  HourlyAqiPoint,
  IndiaFeedCity,
  IndiaLiveFeedResponse,
  IndiaRegion,
} from '../shared/types.js';
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
let indiaFeedCache: { expiresAt: number; data: IndiaLiveFeedResponse } | null = null;

export interface CityPreset {
  city: string;
  state: string;
  region: IndiaRegion;
  country: string;
  latitude: number;
  longitude: number;
  basePm25: number;
  basePm10: number;
  usAqi: number;
  tempC: number;
  windKmh: number;
  humidityPct: number;
  weatherCode: number;
}

export const INDIAN_CITY_PRESETS: CityPreset[] = [
  { city: 'Delhi', state: 'Delhi NCR', region: 'North', country: 'India', latitude: 28.6139, longitude: 77.209, basePm25: 174, basePm10: 242, usAqi: 248, tempC: 13.0, windKmh: 3.8, humidityPct: 74, weatherCode: 45 },
  { city: 'Gurugram', state: 'Haryana', region: 'North', country: 'India', latitude: 28.4595, longitude: 77.0266, basePm25: 158, basePm10: 215, usAqi: 228, tempC: 13.2, windKmh: 4.1, humidityPct: 72, weatherCode: 45 },
  { city: 'Noida', state: 'Uttar Pradesh', region: 'North', country: 'India', latitude: 28.5355, longitude: 77.391, basePm25: 168, basePm10: 229, usAqi: 239, tempC: 12.8, windKmh: 3.6, humidityPct: 75, weatherCode: 45 },
  { city: 'Lucknow', state: 'Uttar Pradesh', region: 'North', country: 'India', latitude: 26.8467, longitude: 80.9462, basePm25: 142, basePm10: 194, usAqi: 208, tempC: 14.1, windKmh: 4.5, humidityPct: 76, weatherCode: 45 },
  { city: 'Kanpur', state: 'Uttar Pradesh', region: 'North', country: 'India', latitude: 26.4499, longitude: 80.3319, basePm25: 149, basePm10: 204, usAqi: 216, tempC: 13.7, windKmh: 4.3, humidityPct: 75, weatherCode: 45 },
  { city: 'Patna', state: 'Bihar', region: 'East', country: 'India', latitude: 25.5941, longitude: 85.1376, basePm25: 154, basePm10: 210, usAqi: 224, tempC: 14.8, windKmh: 4.0, humidityPct: 79, weatherCode: 45 },
  { city: 'Chandigarh', state: 'Chandigarh', region: 'North', country: 'India', latitude: 30.7333, longitude: 76.7794, basePm25: 92, basePm10: 126, usAqi: 170, tempC: 12.1, windKmh: 5.5, humidityPct: 68, weatherCode: 2 },
  { city: 'Jaipur', state: 'Rajasthan', region: 'North', country: 'India', latitude: 26.9124, longitude: 75.7873, basePm25: 98, basePm10: 144, usAqi: 174, tempC: 15.2, windKmh: 6.2, humidityPct: 58, weatherCode: 1 },
  { city: 'Kolkata', state: 'West Bengal', region: 'East', country: 'India', latitude: 22.5726, longitude: 88.3639, basePm25: 118, basePm10: 162, usAqi: 186, tempC: 18.6, windKmh: 5.4, humidityPct: 77, weatherCode: 2 },
  { city: 'Bhubaneswar', state: 'Odisha', region: 'East', country: 'India', latitude: 20.2961, longitude: 85.8245, basePm25: 62, basePm10: 88, usAqi: 154, tempC: 21.4, windKmh: 7.4, humidityPct: 69, weatherCode: 1 },
  { city: 'Guwahati', state: 'Assam', region: 'East', country: 'India', latitude: 26.1445, longitude: 91.7362, basePm25: 84, basePm10: 112, usAqi: 166, tempC: 16.5, windKmh: 3.9, humidityPct: 84, weatherCode: 45 },
  { city: 'Mumbai', state: 'Maharashtra', region: 'West', country: 'India', latitude: 19.076, longitude: 72.8777, basePm25: 54, basePm10: 82, usAqi: 146, tempC: 26.4, windKmh: 11.2, humidityPct: 56, weatherCode: 0 },
  { city: 'Pune', state: 'Maharashtra', region: 'West', country: 'India', latitude: 18.5204, longitude: 73.8567, basePm25: 48, basePm10: 71, usAqi: 132, tempC: 22.1, windKmh: 8.6, humidityPct: 52, weatherCode: 0 },
  { city: 'Ahmedabad', state: 'Gujarat', region: 'West', country: 'India', latitude: 23.0225, longitude: 72.5714, basePm25: 76, basePm10: 108, usAqi: 161, tempC: 21.8, windKmh: 7.1, humidityPct: 48, weatherCode: 1 },
  { city: 'Bhopal', state: 'Madhya Pradesh', region: 'Central', country: 'India', latitude: 23.2599, longitude: 77.4126, basePm25: 68, basePm10: 96, usAqi: 157, tempC: 17.5, windKmh: 6.4, humidityPct: 59, weatherCode: 1 },
  { city: 'Bengaluru', state: 'Karnataka', region: 'South', country: 'India', latitude: 12.9716, longitude: 77.5946, basePm25: 29, basePm10: 44, usAqi: 87, tempC: 21.2, windKmh: 10.4, humidityPct: 64, weatherCode: 2 },
  { city: 'Hyderabad', state: 'Telangana', region: 'South', country: 'India', latitude: 17.385, longitude: 78.4867, basePm25: 44, basePm10: 66, usAqi: 122, tempC: 22.6, windKmh: 8.8, humidityPct: 55, weatherCode: 1 },
  { city: 'Chennai', state: 'Tamil Nadu', region: 'South', country: 'India', latitude: 13.0827, longitude: 80.2707, basePm25: 34, basePm10: 51, usAqi: 97, tempC: 26.8, windKmh: 13.2, humidityPct: 73, weatherCode: 2 },
];

export function mapWeatherCode(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code === 45 || code === 48) return 'Winter Fog / Mist';
  if (code >= 51 && code <= 67) return 'Light Rain';
  if (code >= 71 && code <= 77) return 'Snow / Frost';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Haze';
}

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
      weatherCode: 45,
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
      weatherCode: matched.weatherCode,
      weatherLabel: mapWeatherCode(matched.weatherCode),
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
      const presetMatch = INDIAN_CITY_PRESETS.find((p) => p.city.toLowerCase() === cacheKey);
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
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;

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
    const weatherCode = Math.round(wCur.weather_code ?? (usAqi > 150 ? 45 : 1));

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
        weatherCode,
        weatherLabel: mapWeatherCode(weatherCode),
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

export function buildOfflineIndiaFeed(): IndiaLiveFeedResponse {
  return {
    source: 'offline-scenario',
    fetchedAt: new Date().toISOString(),
    cities: INDIAN_CITY_PRESETS.map((p) => {
      const inv = computeInversionRisk({
        windSpeedKmh: p.windKmh,
        temperatureC: p.tempC,
        pm25: p.basePm25,
        humidityPct: p.humidityPct,
      });
      return {
        city: p.city,
        state: p.state,
        region: p.region,
        latitude: p.latitude,
        longitude: p.longitude,
        usAqi: p.usAqi,
        pm25: p.basePm25,
        pm10: p.basePm10,
        temperatureC: p.tempC,
        windSpeedKmh: p.windKmh,
        humidityPct: p.humidityPct,
        weatherCode: p.weatherCode,
        weatherLabel: mapWeatherCode(p.weatherCode),
        severity: classifyAqiSeverity(p.usAqi),
        inversionScore: inv.score,
        inversionLabel: inv.label,
      };
    }),
  };
}

/**
 * Fetches live air quality and meteorological telemetry for 18 Indian cities
 * across North, East, West, Central, and South India in two batched Open-Meteo requests.
 */
export async function fetchIndiaLiveFeed(): Promise<IndiaLiveFeedResponse> {
  if (indiaFeedCache && indiaFeedCache.expiresAt > Date.now()) {
    return indiaFeedCache.data;
  }

  try {
    const lats = INDIAN_CITY_PRESETS.map((c) => c.latitude).join(',');
    const lons = INDIAN_CITY_PRESETS.map((c) => c.longitude).join(',');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5,pm10,us_aqi`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;

    const [aqiRes, weatherRes] = await Promise.all([
      fetch(aqiUrl, { signal: controller.signal }),
      fetch(weatherUrl, { signal: controller.signal }),
    ]);
    clearTimeout(timer);

    if (!aqiRes.ok || !weatherRes.ok) {
      throw new Error('Batch Open-Meteo failed');
    }

    const aqiList = (await aqiRes.json()) as Array<{ current?: Record<string, number> }>;
    const weatherList = (await weatherRes.json()) as Array<{ current?: Record<string, number> }>;

    const cities: IndiaFeedCity[] = INDIAN_CITY_PRESETS.map((preset, idx) => {
      const ac = aqiList[idx]?.current ?? {};
      const wc = weatherList[idx]?.current ?? {};
      const pm25 = Number((ac.pm2_5 ?? preset.basePm25).toFixed(1));
      const pm10 = Number((ac.pm10 ?? preset.basePm10).toFixed(1));
      const usAqi = Math.round(ac.us_aqi ?? preset.usAqi);
      const temperatureC = Number((wc.temperature_2m ?? preset.tempC).toFixed(1));
      const windSpeedKmh = Number((wc.wind_speed_10m ?? preset.windKmh).toFixed(1));
      const humidityPct = Math.round(wc.relative_humidity_2m ?? preset.humidityPct);
      const weatherCode = Math.round(wc.weather_code ?? preset.weatherCode);
      const inv = computeInversionRisk({ windSpeedKmh, temperatureC, pm25, humidityPct });

      return {
        city: preset.city,
        state: preset.state,
        region: preset.region,
        latitude: preset.latitude,
        longitude: preset.longitude,
        usAqi,
        pm25,
        pm10,
        temperatureC,
        windSpeedKmh,
        humidityPct,
        weatherCode,
        weatherLabel: mapWeatherCode(weatherCode),
        severity: classifyAqiSeverity(usAqi),
        inversionScore: inv.score,
        inversionLabel: inv.label,
      };
    });

    const data: IndiaLiveFeedResponse = {
      source: 'open-meteo-live',
      fetchedAt: new Date().toISOString(),
      cities,
    };
    indiaFeedCache = { expiresAt: Date.now() + CACHE_TTL_MS, data };
    return data;
  } catch {
    const fallback = buildOfflineIndiaFeed();
    indiaFeedCache = { expiresAt: Date.now() + CACHE_TTL_MS, data: fallback };
    return fallback;
  }
}
