import { useState } from 'react';
import type { HourlyAqiPoint, VentilationWindow } from '@shared/types';
import { WHO_PM25_24H_GUIDELINE } from '@shared/impactEngine';

interface SmogChartProps {
  hourly: HourlyAqiPoint[];
  ventilationWindow: VentilationWindow;
  city: string;
}

export function SmogChart({ hourly, ventilationWindow, city }: SmogChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!hourly.length) return null;

  const width = 680;
  const height = 210;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxPm25 = Math.max(40, ...hourly.map((h) => h.pm25)) * 1.12;
  const yOf = (val: number) => padTop + plotH - (val / maxPm25) * plotH;
  const xOf = (idx: number) =>
    padLeft + (idx / Math.max(1, hourly.length - 1)) * plotW;

  const pathD = hourly
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(pt.pm25).toFixed(1)}`)
    .join(' ');
  const areaD = `${pathD} L ${xOf(hourly.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(
    1
  )} L ${xOf(0).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

  const winStartIdx = hourly.findIndex((h) => h.hourLabel === ventilationWindow.bestStartHour);
  const winEndIdx = hourly.findIndex((h) => h.hourLabel === ventilationWindow.bestEndHour);
  const hasWindowBand = winStartIdx >= 0 && winEndIdx > winStartIdx;

  const whoY = yOf(WHO_PM25_24H_GUIDELINE);
  const activePoint = hoveredIdx !== null ? hourly[hoveredIdx] : null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            24-Hour Smog Curve & Safe Ventilation Window — {city}
          </h3>
          <p className="text-xs text-slate-400">
            PM2.5 (µg/m³) across the diurnal inversion cycle. Dashed line = WHO 24h guideline (15 µg/m³).
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40 border border-emerald-400" />
            Best Airing ({ventilationWindow.bestStartHour}–{ventilationWindow.bestEndHour})
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-300">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            Peak ({ventilationWindow.peakHour}: {ventilationWindow.peakPm25} µg/m³)
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label={`24 hour PM2.5 chart for ${city}. Best ventilation window is ${ventilationWindow.bestStartHour} to ${ventilationWindow.bestEndHour} averaging ${ventilationWindow.avgPm25InWindow} micrograms per cubic meter. Peak is ${ventilationWindow.peakHour} at ${ventilationWindow.peakPm25}.`}
        >
          <defs>
            <linearGradient id="pm25Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const val = Math.round(maxPm25 * frac);
            const y = yOf(val);
            return (
              <g key={frac}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px]"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Safe ventilation window highlight */}
          {hasWindowBand && (
            <rect
              x={xOf(winStartIdx)}
              y={padTop}
              width={Math.max(12, xOf(winEndIdx) - xOf(winStartIdx))}
              height={plotH}
              fill="#10b981"
              fillOpacity="0.16"
              stroke="#34d399"
              strokeOpacity="0.5"
              strokeDasharray="4 3"
              rx="4"
            />
          )}

          {/* WHO Guideline threshold */}
          {whoY >= padTop && whoY <= padTop + plotH && (
            <g>
              <line
                x1={padLeft}
                y1={whoY}
                x2={width - padRight}
                y2={whoY}
                stroke="#38bdf8"
                strokeWidth="1.25"
                strokeDasharray="5 4"
              />
              <text
                x={width - padRight - 2}
                y={whoY - 5}
                textAnchor="end"
                className="fill-sky-300 text-[10px] font-medium"
              >
                WHO 15 µg/m³
              </text>
            </g>
          )}

          {/* PM2.5 curve */}
          <path d={areaD} fill="url(#pm25Grad)" />
          <path
            d={pathD}
            fill="none"
            stroke="#fb923c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive points */}
          {hourly.map((pt, i) => {
            const cx = xOf(i);
            const cy = yOf(pt.pm25);
            const isHovered = hoveredIdx === i;
            const isPeak = pt.hourLabel === ventilationWindow.peakHour;
            return (
              <g key={pt.hourLabel}>
                {i % 4 === 0 && (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px]"
                  >
                    {pt.hourLabel}
                  </text>
                )}
                {(isHovered || isPeak) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5 : 4}
                    className={isPeak ? 'fill-rose-400 stroke-slate-950' : 'fill-amber-300 stroke-slate-950'}
                    strokeWidth="1.5"
                  />
                )}
                <rect
                  x={cx - plotW / hourly.length / 2}
                  y={padTop}
                  width={plotW / hourly.length}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${pt.hourLabel}: PM2.5 ${pt.pm25} µg/m³, US AQI ${pt.usAqi}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(i)}
                  onBlur={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>

        {activePoint && (
          <div
            className="mt-2 flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs text-slate-200"
            aria-live="polite"
          >
            <span>
              <strong>{activePoint.hourLabel}</strong> — PM2.5:{' '}
              <strong className="text-amber-300">{activePoint.pm25} µg/m³</strong> · PM10:{' '}
              {activePoint.pm10} µg/m³
            </span>
            <span className="text-slate-300">US AQI ~{activePoint.usAqi}</span>
          </div>
        )}
      </div>
    </div>
  );
}
