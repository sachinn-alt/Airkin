import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, Location } from 'react-iconly';
import type { IndiaFeedCity, IndiaLiveFeedResponse, IndiaRegion } from '@shared/types';
import { SpotlightCard } from './ui/AceternityPrimitives';

interface IndiaLiveFeedProps {
  feed: IndiaLiveFeedResponse | null;
  activeCity: string;
  onSelectCity: (city: string) => void;
}

const REGIONS: Array<'All' | IndiaRegion> = ['All', 'North', 'West', 'East', 'Central', 'South'];

const AQI_PILL: Record<IndiaFeedCity['severity']['colorToken'], string> = {
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  purple: 'bg-purple-50 text-purple-800 border-purple-200',
  rose: 'bg-rose-50 text-rose-800 border-rose-200',
};

export function IndiaLiveFeed({ feed, activeCity, onSelectCity }: IndiaLiveFeedProps) {
  const [region, setRegion] = useState<'All' | IndiaRegion>('All');
  const [sortBy, setSortBy] = useState<'aqi_desc' | 'aqi_asc'>('aqi_desc');

  const filtered = useMemo(() => {
    if (!feed) return [];
    const base =
      region === 'All' ? feed.cities : feed.cities.filter((c) => c.region === region);
    return [...base].sort((a, b) =>
      sortBy === 'aqi_desc' ? b.usAqi - a.usAqi : a.usAqi - b.usAqi
    );
  }, [feed, region, sortBy]);

  if (!feed) {
    return (
      <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-4" />
    );
  }

  return (
    <SpotlightCard className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Activity set="two-tone" size="small" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              All-India Live Weather & Smog Feed ({feed.cities.length} Cities)
            </h2>
            <p className="text-[11px] text-slate-500">
              Click any city to load its tailored Gemini plan ·{' '}
              {feed.source === 'open-meteo-live' ? 'Live Open-Meteo Telemetry' : 'Offline India Presets'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                aria-pressed={region === r}
                className={`rounded-md px-2 py-0.5 font-medium transition cursor-pointer ${
                  region === r
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSortBy((s) => (s === 'aqi_desc' ? 'aqi_asc' : 'aqi_desc'))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 hover:border-teal-400 cursor-pointer"
          >
            {sortBy === 'aqi_desc' ? 'Sort: Highest AQI' : 'Sort: Cleanest First'}
          </button>
        </div>
      </div>

      {/* Horizontal / Compact Grid of Live Indian Cities */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {filtered.map((item) => {
          const isCurrent = item.city.toLowerCase() === activeCity.toLowerCase();
          return (
            <motion.button
              key={item.city}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onSelectCity(item.city)}
              aria-pressed={isCurrent}
              className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                isCurrent
                  ? 'border-teal-600 bg-teal-50/70 shadow-xs'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 truncate">
                  <Location set="light" size={12} primaryColor="#0f766e" />
                  {item.city}
                </span>
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                    AQI_PILL[item.severity.colorToken]
                  }`}
                >
                  {item.usAqi}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
                <span className="truncate">{item.weatherLabel}</span>
                <span className="font-semibold text-slate-800">{item.temperatureC}°C</span>
              </div>

              <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
                <span>PM2.5 {item.pm25}</span>
                <span>{item.windSpeedKmh} km/h</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </SpotlightCard>
  );
}
