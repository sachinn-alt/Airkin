import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { INDIA_POLYGONS } from '@/data/indiaOutline';
import type { CpcbAqiInfo, IndiaFeedCity } from '@shared/types';
import { CPCB_CITY_STYLES } from './IndiaLiveFeed';

interface IndiaAqiMapProps {
  cities: IndiaFeedCity[];
  activeCity: string;
  onSelectCity: (city: string) => void;
}

const PIN_FILL: Record<CpcbAqiInfo['colorToken'], string> = {
  emerald: '#059669',
  lime: '#65a30d',
  amber: '#d97706',
  orange: '#ea580c',
  red: '#dc2626',
  rose: '#be123c',
};

const LON_MIN = 67.5;
const LON_MAX = 98.0;
const LAT_MIN = 6.5;
const LAT_MAX = 37.8;
const SVG_W = 400;
const SVG_H = 436;
const PAD = 16;

function project(lon: number, lat: number): [number, number] {
  const x = PAD + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (SVG_W - PAD * 2);
  const y =
    SVG_H - PAD - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * (SVG_H - PAD * 2);
  return [x, y];
}

export function IndiaAqiMap({ cities, activeCity, onSelectCity }: IndiaAqiMapProps) {
  const [hoveredCity, setHoveredCity] = useState<IndiaFeedCity | null>(null);

  const indiaPathD = useMemo(() => {
    const segments: string[] = [];
    for (const poly of INDIA_POLYGONS) {
      for (const ring of poly) {
        if (!ring.length) continue;
        ring.forEach(([lon, lat], idx) => {
          const [x, y] = project(lon, lat);
          segments.push(`${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
        });
        segments.push('Z');
      }
    }
    return segments.join(' ');
  }, []);

  const inspected =
    hoveredCity ??
    cities.find((c) => c.city.toLowerCase() === activeCity.toLowerCase()) ??
    cities[0] ??
    null;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-sky-50/70 via-white/90 to-teal-50/50 p-3 flex flex-col justify-between h-full">
      <div className="relative flex-1 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full max-w-[340px] h-auto select-none"
          role="img"
          aria-label={`Interactive India air quality map showing ${cities.length} cities colored by Indian CPCB AQI`}
        >
          {/* Subtle lat/lon graticule */}
          {[14, 22, 30].map((lat) => {
            const [, y] = project(LON_MIN, lat);
            return (
              <line
                key={lat}
                x1={PAD}
                y1={y}
                x2={SVG_W - PAD}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="0.7"
                strokeDasharray="3 4"
              />
            );
          })}

          {/* India landmass */}
          <path
            d={indiaPathD}
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* City AQI Pins */}
          {cities.map((c) => {
            const [cx, cy] = project(c.longitude, c.latitude);
            const isCurrent = c.city.toLowerCase() === activeCity.toLowerCase();
            const isHovered = hoveredCity?.city === c.city;
            const fill = PIN_FILL[c.cpcbColorToken];

            return (
              <g
                key={c.city}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredCity(c)}
                onMouseLeave={() => setHoveredCity(null)}
                onClick={() => onSelectCity(c.city)}
              >
                {isCurrent && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill={fill}
                    opacity={0.22}
                    animate={{ r: [9, 15, 9], opacity: [0.35, 0.08, 0.35] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCurrent || isHovered ? 7 : 5}
                  fill={fill}
                  stroke={isCurrent ? '#0f172a' : '#ffffff'}
                  strokeWidth={isCurrent ? 2 : 1.4}
                />
                {(isCurrent || isHovered) && (
                  <g transform={`translate(${cx}, ${cy - 12})`}>
                    <rect
                      x="-36"
                      y="-14"
                      width="72"
                      height="15"
                      rx="7"
                      fill="#0f172a"
                      opacity="0.9"
                    />
                    <text
                      x="0"
                      y="-4"
                      textAnchor="middle"
                      className="fill-white text-[8.5px] font-semibold"
                    >
                      {c.city} · {c.indianAqi}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Fixed-height Map Readout Footer */}
      {inspected && (
        <div
          className={`mt-2 min-h-[38px] flex items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-xs ${
            CPCB_CITY_STYLES[inspected.cpcbColorToken].card
          }`}
          aria-live="polite"
        >
          <div className="min-w-0 truncate">
            <strong>{inspected.city}</strong> · {inspected.weatherLabel} · {inspected.temperatureC}°C
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
              CPCB_CITY_STYLES[inspected.cpcbColorToken].badge
            }`}
          >
            CPCB {inspected.indianAqi} ({inspected.cpcbCategory})
          </span>
        </div>
      )}
    </div>
  );
}
