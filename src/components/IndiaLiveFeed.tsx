import { lazy, Suspense, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Globe2 } from 'lucide-react';
import { Activity, Location } from 'react-iconly';
import type { CpcbAqiInfo, IndiaLiveFeedResponse, IndiaRegion } from '@shared/types';
import { IndiaAqiMap } from './IndiaAqiMap';
import { SpotlightCard } from './ui/AceternityPrimitives';
import type { GlobeTheme, Place } from './ui/route-globe';

const LazyRouteGlobe = lazy(() => import('./ui/route-globe'));

const AIRKIN_DAY_GLOBE: GlobeTheme = {
  ground: '#f1f7f4',
  land: '#0f766e',
  arc: '#d97706',
  glow: 'rgb(13 148 136 / 0.16)',
  text: '#0f172a',
  muted: '#475569',
};

interface IndiaLiveFeedProps {
  feed: IndiaLiveFeedResponse | null;
  activeCity: string;
  onSelectCity: (city: string) => void;
}

const REGIONS: Array<'All' | IndiaRegion> = ['All', 'North', 'West', 'East', 'Central', 'South'];

export const CPCB_CITY_STYLES: Record<
  CpcbAqiInfo['colorToken'],
  { card: string; badge: string; dot: string }
> = {
  emerald: {
    card: 'border-emerald-300/90 bg-emerald-50/85 hover:bg-emerald-50 text-emerald-950',
    badge: 'bg-emerald-600 text-white border-emerald-700',
    dot: 'bg-emerald-600',
  },
  lime: {
    card: 'border-lime-300/90 bg-lime-50/85 hover:bg-lime-50 text-lime-950',
    badge: 'bg-lime-600 text-white border-lime-700',
    dot: 'bg-lime-600',
  },
  amber: {
    card: 'border-amber-300/90 bg-amber-50/85 hover:bg-amber-50 text-amber-950',
    badge: 'bg-amber-600 text-white border-amber-700',
    dot: 'bg-amber-600',
  },
  orange: {
    card: 'border-orange-300/90 bg-orange-50/85 hover:bg-orange-50 text-orange-950',
    badge: 'bg-orange-600 text-white border-orange-700',
    dot: 'bg-orange-600',
  },
  red: {
    card: 'border-red-300/90 bg-red-50/85 hover:bg-red-50 text-red-950',
    badge: 'bg-red-600 text-white border-red-700',
    dot: 'bg-red-600',
  },
  rose: {
    card: 'border-rose-400/90 bg-rose-100/80 hover:bg-rose-100 text-rose-950',
    badge: 'bg-rose-700 text-white border-rose-800',
    dot: 'bg-rose-700',
  },
};

const CPCB_LEGEND: Array<{ label: string; range: string; token: CpcbAqiInfo['colorToken'] }> = [
  { label: 'Good', range: '0–50', token: 'emerald' },
  { label: 'Satisfactory', range: '51–100', token: 'lime' },
  { label: 'Moderate', range: '101–200', token: 'amber' },
  { label: 'Poor', range: '201–300', token: 'orange' },
  { label: 'Very Poor', range: '301–400', token: 'red' },
  { label: 'Severe', range: '401+', token: 'rose' },
];

export function IndiaLiveFeed({ feed, activeCity, onSelectCity }: IndiaLiveFeedProps) {
  const [region, setRegion] = useState<'All' | IndiaRegion>('All');
  const [sortBy, setSortBy] = useState<'aqi_desc' | 'aqi_asc'>('aqi_desc');
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'globe' | 'grid'>('split');

  const filtered = useMemo(() => {
    if (!feed) return [];
    const base =
      region === 'All' ? feed.cities : feed.cities.filter((c) => c.region === region);
    return [...base].sort((a, b) =>
      sortBy === 'aqi_desc' ? b.indianAqi - a.indianAqi : a.indianAqi - b.indianAqi
    );
  }, [feed, region, sortBy]);

  if (!feed) {
    return (
      <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white/80 p-4" />
    );
  }

  return (
    <SpotlightCard className="p-4" contentClassName="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Activity set="two-tone" size="small" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              All-India Live Weather & Public CPCB AQI Feed ({feed.cities.length} Cities)
            </h2>
            <p className="text-[11px] text-slate-500">
              Interactive India CPCB NAQI map & city tiles ·{' '}
              {feed.source === 'open-meteo-live'
                ? 'Live Station & Satellite Assimilation'
                : 'Offline India Presets'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {(['split', 'map', 'globe', 'grid'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 capitalize font-medium transition cursor-pointer ${
                  viewMode === mode
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'globe' && <Globe2 size={11} />}
                <span>{mode === 'split' ? 'Map + Grid' : mode}</span>
              </button>
            ))}
          </div>

          <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-100 p-0.5">
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
            {sortBy === 'aqi_desc' ? 'Highest AQI' : 'Cleanest First'}
          </button>
        </div>
      </div>

      {/* Compact Indian CPCB AQI Color Legend */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
        {CPCB_LEGEND.map((item) => {
          const style = CPCB_CITY_STYLES[item.token];
          return (
            <span
              key={item.label}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-2 py-0.5"
            >
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <strong className="text-slate-800">{item.label}</strong>
              <span className="text-slate-600">{item.range}</span>
            </span>
          );
        })}
      </div>

      {/* Map / 3D Globe / Color-Coded City Grid */}
      {viewMode === 'globe' ? (
        (() => {
          const hubCity =
            feed.cities.find((c) => c.city.toLowerCase() === activeCity.toLowerCase()) ??
            filtered[0] ??
            feed.cities[0];
          const hubPlace: Place = hubCity
            ? {
                name: hubCity.city,
                lon: hubCity.longitude,
                lat: hubCity.latitude,
                note: `CPCB ${hubCity.indianAqi} · ${hubCity.cpcbCategory}`,
              }
            : { name: 'Delhi', lon: 77.21, lat: 28.61 };
          const corridorPlaces: Place[] = filtered
            .filter((c) => c.city.toLowerCase() !== hubPlace.name.toLowerCase())
            .slice(0, 14)
            .map((c) => ({
              name: c.city,
              lon: c.longitude,
              lat: c.latitude,
              note: `CPCB ${c.indianAqi} (${c.cpcbCategory}) · ${c.temperatureC}°C`,
            }));

          return (
            <div className="relative h-[400px] sm:h-[440px] w-full overflow-hidden rounded-2xl border border-teal-200/80 bg-[#f1f7f4]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs font-medium text-teal-800">
                    Loading interactive 3D atmospheric globe...
                  </div>
                }
              >
                <LazyRouteGlobe
                  hub={hubPlace}
                  places={corridorPlaces}
                  theme={AIRKIN_DAY_GLOBE}
                  className="h-full w-full"
                />
              </Suspense>
              <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/80 bg-white/90 px-3 py-2 backdrop-blur-md shadow-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-800">
                  Atmospheric Corridor · {hubPlace.name} ({corridorPlaces.length} Cities)
                </p>
                <p className="text-xs font-bold text-slate-900">
                  Drag to spin · Hover destinations for live CPCB AQI
                </p>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {(viewMode === 'split' || viewMode === 'map') && (
            <div className={viewMode === 'map' ? 'lg:col-span-12' : 'lg:col-span-4'}>
              <IndiaAqiMap
                cities={filtered}
                activeCity={activeCity}
                onSelectCity={onSelectCity}
              />
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'grid') && (
            <div
              className={`${
                viewMode === 'grid' ? 'lg:col-span-12' : 'lg:col-span-8'
              } grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${
                viewMode === 'grid' ? 'xl:grid-cols-8' : 'xl:grid-cols-4'
              } gap-2 content-start`}
            >
            {filtered.map((item) => {
              const isCurrent = item.city.toLowerCase() === activeCity.toLowerCase();
              const style = CPCB_CITY_STYLES[item.cpcbColorToken];

              return (
                <motion.button
                  key={item.city}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => onSelectCity(item.city)}
                  aria-pressed={isCurrent}
                  className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${style.card} ${
                    isCurrent ? 'ring-2 ring-slate-900 ring-offset-1 shadow-sm' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 text-xs font-bold truncate">
                      <Location set="light" size={11} />
                      {item.city}
                    </span>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${style.badge}`}
                      title={`India CPCB NAQI ${item.indianAqi} (${item.cpcbCategory}) · US AQI ${item.usAqi}`}
                    >
                      {item.indianAqi}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] font-medium opacity-85">
                    <span className="truncate">{item.cpcbCategory}</span>
                    <span>{item.temperatureC}°C</span>
                  </div>

                  <div className="mt-0.5 flex items-center justify-between text-[10px] opacity-75">
                    <span className="truncate">{item.weatherLabel}</span>
                    <span>{item.windSpeedKmh}k</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
        </div>
      )}
    </SpotlightCard>
  );
}
