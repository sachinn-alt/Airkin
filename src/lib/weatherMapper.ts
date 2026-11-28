import type { AirQualitySnapshot } from '@shared/types';
import type {
  WeatherCardProps,
  WeatherCondition,
  WeatherDay,
  WeatherHour,
} from '@/components/ui/weather-card';

export function mapWmoCodeToCondition(
  code?: number,
  windSpeedKmh = 6,
  usAqi = 100
): WeatherCondition {
  if (code === 0) return usAqi > 180 ? 'fog' : 'clear';
  if (code !== undefined && code >= 1 && code <= 3) return 'partly-cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code !== undefined && code >= 51 && code <= 67) return 'rain';
  if (code !== undefined && code >= 71 && code <= 77) return 'snow';
  if (code !== undefined && code >= 80 && code <= 82) return 'rain';
  if (code !== undefined && code >= 85 && code <= 86) return 'snow';
  if (code !== undefined && code >= 95) return 'storm';
  if (windSpeedKmh >= 24) return 'wind';
  return usAqi > 170 ? 'fog' : 'cloudy';
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildWeatherCardProps(
  aqi: AirQualitySnapshot | null
): WeatherCardProps {
  if (!aqi) {
    return { loading: true };
  }

  const baseCondition = mapWmoCodeToCondition(
    aqi.current.weatherCode,
    aqi.current.windSpeedKmh,
    aqi.current.usAqi
  );

  const curTemp = aqi.current.temperatureC;
  const temps = aqi.hourly
    .map((h) => h.temperatureC)
    .filter((t): t is number => typeof t === 'number');
  const computedHigh = temps.length
    ? Math.max(curTemp, ...temps)
    : Math.round(curTemp + 5);
  const computedLow = temps.length
    ? Math.min(curTemp, ...temps)
    : Math.round(curTemp - 4);

  const currentHour = new Date().getHours();
  const hourlyStrip: WeatherHour[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const idx = (currentHour + offset) % Math.max(1, aqi.hourly.length);
    const pt = aqi.hourly[idx];
    if (!pt) continue;
    const isNight = idx >= 19 || idx <= 5;
    let cond = baseCondition;
    if (cond === 'clear' && isNight) cond = 'clear-night';
    if (cond === 'fog' && !isNight && offset >= 2 && offset <= 4 && idx >= 12 && idx <= 16) {
      cond = 'partly-cloudy';
    }
    const precip =
      cond === 'rain' ? 70 : cond === 'storm' ? 85 : cond === 'cloudy' ? 20 : undefined;

    hourlyStrip.push({
      time: offset === 0 ? 'Now' : pt.hourLabel,
      temp: typeof pt.temperatureC === 'number' ? pt.temperatureC : curTemp,
      condition: cond,
      precip,
    });
  }

  const todayDow = new Date().getDay();
  const daily: WeatherDay[] = [
    {
      day: 'Today',
      low: Math.round(computedLow),
      high: Math.round(computedHigh),
      condition: baseCondition,
      precip: baseCondition === 'rain' ? 75 : undefined,
      today: true,
    },
    {
      day: WEEKDAYS[(todayDow + 1) % 7],
      low: Math.round(computedLow - 1),
      high: Math.round(computedHigh + 1),
      condition: aqi.current.windSpeedKmh > 14 ? 'wind' : 'partly-cloudy',
    },
    {
      day: WEEKDAYS[(todayDow + 2) % 7],
      low: Math.round(computedLow),
      high: Math.round(computedHigh + 2),
      condition: aqi.current.usAqi > 200 ? 'fog' : 'clear',
    },
    {
      day: WEEKDAYS[(todayDow + 3) % 7],
      low: Math.round(computedLow + 1),
      high: Math.round(computedHigh + 1),
      condition: 'partly-cloudy',
    },
  ];

  const fetched = new Date(aqi.fetchedAt);
  const hhmm = Number.isNaN(fetched.getTime())
    ? 'Live'
    : `${String(fetched.getHours()).padStart(2, '0')}:${String(fetched.getMinutes()).padStart(2, '0')}`;

  return {
    location: `${aqi.city}, IN`,
    updated: aqi.source === 'open-meteo-live' ? `Updated ${hhmm}` : 'Scenario',
    unit: 'C',
    temp: curTemp,
    condition: baseCondition,
    summary: aqi.current.weatherLabel ?? 'Urban Haze',
    high: computedHigh,
    low: computedLow,
    feelsLike:
      aqi.current.windSpeedKmh > 12
        ? Math.round(curTemp - 1.5)
        : Math.round(curTemp),
    humidity: aqi.current.humidityPct,
    wind: `${Math.round(aqi.current.windSpeedKmh)} km/h`,
    hourly: hourlyStrip,
    daily,
  };
}
