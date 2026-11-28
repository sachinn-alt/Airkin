import { motion } from 'motion/react';
import { Chart } from 'react-iconly';
import type {
  AirQualitySnapshot,
  ImpactSummary,
  IndiaLiveFeedResponse,
  TailoredPlanResponse,
} from '@shared/types';
import { IndiaLiveFeed } from './IndiaLiveFeed';
import { PlanCards } from './PlanCards';
import { SmogChart } from './SmogChart';
import { WeatherVisualScene } from './WeatherVisualScene';
import { AnimatedCounter, AqiGaugeRing, SpotlightCard } from './ui/AceternityPrimitives';
import { WeatherCard } from './ui/weather-card';
import { buildWeatherCardProps } from '@/lib/weatherMapper';

const SEVERITY_BADGE_STYLES: Record<AirQualitySnapshot['severity']['colorToken'], string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  orange: 'border-orange-200 bg-orange-50 text-orange-800',
  red: 'border-red-200 bg-red-50 text-red-800',
  purple: 'border-purple-200 bg-purple-50 text-purple-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
};

interface OverviewSectionProps {
  aqi: AirQualitySnapshot | null;
  liveImpact: ImpactSummary;
  indiaFeed: IndiaLiveFeedResponse | null;
  activeCity: string;
  plan: TailoredPlanResponse | null;
  isLoadingPlan: boolean;
  planError: string | null;
  onSelectCity: (city: string) => void;
}

/**
 * Primary overview page combining CPCB gauge telemetry, interactive atmospheric scene,
 * 24-hour smog curve, 34-city India map & 3D globe feed, live WeatherCard, and Gemini plan cards.
 */
export function OverviewSection({
  aqi,
  liveImpact,
  indiaFeed,
  activeCity,
  plan,
  isLoadingPlan,
  planError,
  onSelectCity,
}: OverviewSectionProps) {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {aqi && (
        <section
          aria-label="Current Local Air Quality and Thermal Inversion Status"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
        >
          {/* Col 1-4: AQI Ring Gauge + Metrics */}
          <SpotlightCard
            className="lg:col-span-4 p-4 h-full"
            contentClassName="justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-3">
              <AqiGaugeRing
                aqi={aqi.current.usAqi}
                label={aqi.severity.label}
                colorToken={aqi.severity.colorToken}
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="truncate font-medium text-slate-800">{aqi.city}, India</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                    {aqi.source === 'open-meteo-live' ? 'Live' : 'Preset'}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold ${
                    SEVERITY_BADGE_STYLES[aqi.severity.colorToken]
                  }`}
                >
                  <Chart set="two-tone" size={13} />
                  {aqi.severity.label}
                </span>
                <div className="text-[11px] text-slate-700">
                  India CPCB:{' '}
                  <strong className="text-slate-900">
                    {aqi.current.indianAqi ?? aqi.current.usAqi}
                  </strong>{' '}
                  ({aqi.current.cpcbCategory ?? aqi.severity.label}) · RH {aqi.current.humidityPct}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 px-1">
                <div className="text-[10px] text-slate-600">PM2.5</div>
                <div className="text-xs font-bold text-amber-800">
                  <AnimatedCounter value={aqi.current.pm25} decimals={1} />
                </div>
                <div className="text-[9px] text-slate-600">µg/m³</div>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 px-1">
                <div className="text-[10px] text-slate-600">PM10</div>
                <div className="text-xs font-bold text-slate-800">
                  <AnimatedCounter value={aqi.current.pm10} decimals={1} />
                </div>
                <div className="text-[9px] text-slate-600">µg/m³</div>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 px-1">
                <div className="text-[10px] text-slate-600">Temp</div>
                <div className="text-xs font-bold text-sky-800">{aqi.current.temperatureC}°C</div>
                <div className="text-[9px] text-slate-600">ambient</div>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 px-1">
                <div className="text-[10px] text-slate-600">Wind</div>
                <div className="text-xs font-bold text-teal-800">{aqi.current.windSpeedKmh}</div>
                <div className="text-[9px] text-slate-600">km/h</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-700">Thermal Inversion Cap</span>
                <span className="font-bold text-amber-800">
                  {aqi.inversionRisk.label} · {aqi.inversionRisk.score}/100
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                  className="h-full bg-amber-600"
                  animate={{ width: `${aqi.inversionRisk.score}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-2.5 py-2">
                <div className="text-[10px] text-teal-800 font-medium">Indoor Target</div>
                <div className="text-sm font-extrabold text-teal-900">
                  <AnimatedCounter value={liveImpact.optimizedIndoorPm25} suffix=" µg/m³" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-2">
                <div className="text-[10px] text-slate-600 font-medium">Dose Saved</div>
                <div className="text-sm font-extrabold text-slate-900">
                  -<AnimatedCounter value={liveImpact.inhaledDoseSavedPct} suffix="%" />
                </div>
              </div>
            </div>
          </SpotlightCard>

          <div className="lg:col-span-4">
            <WeatherVisualScene aqi={aqi} impact={liveImpact} />
          </div>

          <div className="lg:col-span-4">
            <SmogChart
              hourly={aqi.hourly}
              ventilationWindow={aqi.ventilationWindow}
              city={aqi.city}
            />
          </div>
        </section>
      )}

      {/* All-India Live Weather & Smog Feed */}
      <div id="india-live-feed-section">
        <IndiaLiveFeed feed={indiaFeed} activeCity={activeCity} onSelectCity={onSelectCity} />
      </div>

      {/* Live Meteorology Card + 4-Pillar Gemini Action Plans */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-4">
          <WeatherCard
            {...buildWeatherCardProps(aqi)}
            loading={!aqi}
            className="rounded-2xl border border-white/80 bg-white/95 backdrop-blur-md shadow-md"
          />
        </div>
        <div className="lg:col-span-8">
          <PlanCards plan={plan} isLoading={isLoadingPlan} planError={planError} />
        </div>
      </section>
    </motion.div>
  );
}
