import { useState } from 'react';
import { motion } from 'motion/react';
import { Discovery, Home, ShieldDone } from 'react-iconly';
import type { AirQualitySnapshot, ImpactSummary } from '@shared/types';
import { SpotlightCard } from './ui/AceternityPrimitives';

interface WeatherVisualSceneProps {
  aqi: AirQualitySnapshot;
  impact: ImpactSummary;
}

type SceneLayer = 'outdoor' | 'inversion' | 'home';

const SKY_GRADIENTS: Record<AirQualitySnapshot['severity']['colorToken'], [string, string]> = {
  emerald: ['#e0f2fe', '#f0fdf4'],
  amber: ['#fef3c7', '#f8fafc'],
  orange: ['#ffedd5', '#f1f5f9'],
  red: ['#fee2e2', '#f1f5f9'],
  purple: ['#f3e8ff', '#e2e8f0'],
  rose: ['#ffe4e6', '#e2e8f0'],
};

export function WeatherVisualScene({ aqi, impact }: WeatherVisualSceneProps) {
  const [layer, setLayer] = useState<SceneLayer>('outdoor');

  const [skyTop, skyBottom] = SKY_GRADIENTS[aqi.severity.colorToken];
  const weatherCode = aqi.current.weatherCode ?? 45;
  const isFoggy = weatherCode === 45 || weatherCode === 48 || aqi.current.usAqi >= 150;
  const isRainy = weatherCode >= 51 && weatherCode <= 86;
  const isCloudy = weatherCode >= 1 && weatherCode <= 3;

  const particleCount = Math.min(18, Math.max(3, Math.round(aqi.current.pm25 / 14)));
  const windDuration = Math.max(1.8, 7 - Math.min(5, aqi.current.windSpeedKmh * 0.35));

  const layerSummary: Record<SceneLayer, string> = {
    outdoor: `${aqi.current.weatherLabel ?? 'Urban Air'} · Outside ${aqi.current.pm25} µg/m³ · Wind ${aqi.current.windSpeedKmh} km/h`,
    inversion: `Thermal Cap ${aqi.inversionRisk.score}/100 (${aqi.inversionRisk.label}) · Airing ${aqi.ventilationWindow.bestStartHour}–${aqi.ventilationWindow.bestEndHour}`,
    home: `Protected Indoors ${impact.optimizedIndoorPm25} µg/m³ (-${impact.indoorReductionPct}% vs baseline ${impact.baselineIndoorPm25})`,
  };

  return (
    <SpotlightCard className="p-4 flex flex-col justify-between h-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <Discovery set="two-tone" size={15} />
          </span>
          <h3 className="text-xs font-semibold text-slate-900">
            Live Atmospheric Scene
          </h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700">
          {aqi.current.weatherLabel ?? 'Winter Haze'}
        </span>
      </div>

      {/* Interactive Animated Weather & Air Quality SVG Scene */}
      <svg
        viewBox="0 0 360 175"
        className="w-full h-auto rounded-xl border border-slate-200/80 select-none"
        role="img"
        aria-label={`Interactive weather and air quality visual for ${aqi.city}: ${aqi.current.weatherLabel ?? 'Haze'}, US AQI ${aqi.current.usAqi}, indoor protected PM2.5 ${impact.optimizedIndoorPm25} micrograms per cubic meter.`}
      >
        <defs>
          <linearGradient id="airkinSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTop} />
            <stop offset="100%" stopColor={skyBottom} />
          </linearGradient>
        </defs>

        <rect width="360" height="175" fill="url(#airkinSky)" />

        {/* Sun */}
        <motion.circle
          cx="295"
          cy="40"
          r="20"
          fill={aqi.current.usAqi > 150 ? '#fbbf24' : '#f59e0b'}
          opacity={isFoggy ? 0.55 : 0.9}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Clouds (if cloudy/rainy/foggy) */}
        {(isCloudy || isRainy || isFoggy) && (
          <motion.g
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            opacity={isFoggy ? 0.7 : 0.92}
          >
            <ellipse cx="95" cy="42" rx="34" ry="13" fill="#ffffff" />
            <ellipse cx="115" cy="36" rx="22" ry="12" fill="#ffffff" />
            <ellipse cx="245" cy="48" rx="30" ry="11" fill="#ffffff" />
          </motion.g>
        )}

        {/* Raindrops if rainy */}
        {isRainy &&
          [75, 95, 115, 235, 255].map((rx, idx) => (
            <motion.line
              key={rx}
              x1={rx}
              y1="56"
              x2={rx - 4}
              y2="68"
              stroke="#0284c7"
              strokeWidth="1.8"
              strokeLinecap="round"
              animate={{ y: [0, 38], opacity: [0.9, 0] }}
              transition={{ duration: 0.9, delay: idx * 0.16, repeat: Infinity }}
            />
          ))}

        {/* Interactive Thermal Inversion Cap Arc */}
        <g
          onClick={() => setLayer('inversion')}
          className="cursor-pointer"
        >
          <motion.path
            d="M 16 86 Q 180 54 344 86"
            fill="none"
            stroke={layer === 'inversion' ? '#b45309' : '#d97706'}
            strokeWidth={layer === 'inversion' ? 2.6 : 1.75}
            strokeDasharray="6 5"
            opacity={aqi.inversionRisk.score >= 45 ? 0.85 : 0.35}
            animate={{ opacity: aqi.inversionRisk.score >= 45 ? [0.65, 0.95, 0.65] : 0.3 }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <rect x="132" y="56" width="96" height="16" rx="8" fill="#fffbeb" stroke="#fcd34d" />
          <text x="180" y="67" textAnchor="middle" className="fill-amber-900 text-[9px] font-semibold">
            Cap {aqi.inversionRisk.score}/100
          </text>
        </g>

        {/* Animated Wind Streamlines */}
        {[98, 116].map((wy, idx) => (
          <motion.path
            key={wy}
            d={`M 20 ${wy} Q 68 ${wy - 5} 112 ${wy}`}
            fill="none"
            stroke="#0284c7"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.45"
            animate={{ x: [0, 35, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: windDuration, delay: idx * 0.6, repeat: Infinity }}
          />
        ))}

        {/* Drifting Outdoor PM2.5 Particulate Haze */}
        <g onClick={() => setLayer('outdoor')} className="cursor-pointer">
          {Array.from({ length: particleCount }).map((_, idx) => {
            const px = 26 + ((idx * 37) % 308);
            const py = 88 + ((idx * 19) % 58);
            return (
              <motion.circle
                key={idx}
                cx={px}
                cy={py}
                r={aqi.current.pm25 > 120 ? 2.6 : 2}
                fill={aqi.current.usAqi > 150 ? '#b45309' : '#64748b'}
                opacity={layer === 'outdoor' ? 0.7 : 0.45}
                animate={{ cx: [px, px + 10, px], cy: [py, py - 4, py] }}
                transition={{
                  duration: 3 + (idx % 3),
                  delay: idx * 0.12,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            );
          })}
        </g>

        {/* City Skyline Silhouette */}
        <rect x="22" y="118" width="24" height="39" rx="2" fill="#cbd5e1" />
        <rect x="52" y="106" width="28" height="51" rx="2" fill="#94a3b8" />
        <rect x="276" y="112" width="26" height="45" rx="2" fill="#cbd5e1" />
        <rect x="308" y="122" width="28" height="35" rx="2" fill="#94a3b8" />

        {/* Ground */}
        <rect x="0" y="154" width="360" height="21" fill="#e2e8f0" />

        {/* Interactive Clean-Air Home Sanctuary */}
        <g onClick={() => setLayer('home')} className="cursor-pointer">
          <polygon
            points="126,112 180,82 234,112"
            fill="#0f766e"
            stroke={layer === 'home' ? '#0f172a' : '#115e59'}
            strokeWidth={layer === 'home' ? 2 : 1}
          />
          <rect
            x="136"
            y="112"
            width="88"
            height="44"
            rx="3"
            fill="#ffffff"
            stroke={layer === 'home' ? '#0f766e' : '#94a3b8'}
            strokeWidth={layer === 'home' ? 2.2 : 1.2}
          />
          {/* Clean Indoor Air Glow Circle */}
          <motion.circle
            cx="180"
            cy="134"
            r="15"
            fill="#ccfbf1"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          />
          <text x="180" y="137" textAnchor="middle" className="fill-teal-900 text-[10px] font-bold">
            {impact.optimizedIndoorPm25}µg
          </text>
        </g>
      </svg>

      {/* Interactive Layer Switcher + Fixed Readout */}
      <div className="mt-2.5 space-y-1.5">
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          {[
            { id: 'outdoor' as const, label: 'Outdoor', icon: Discovery },
            { id: 'inversion' as const, label: 'Inversion', icon: ShieldDone },
            { id: 'home' as const, label: 'Sanctuary', icon: Home },
          ].map((btn) => {
            const Icon = btn.icon;
            const active = layer === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setLayer(btn.id)}
                aria-pressed={active}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1 font-medium transition cursor-pointer ${
                  active
                    ? 'border-teal-600 bg-teal-50 text-teal-900'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Icon set={active ? 'bold' : 'light'} size={12} />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="min-h-[28px] flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 text-center"
          aria-live="polite"
        >
          {layerSummary[layer]}
        </div>
      </div>
    </SpotlightCard>
  );
}
