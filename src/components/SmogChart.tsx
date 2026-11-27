import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { HourlyAqiPoint, VentilationWindow } from '@shared/types';
import { WHO_PM25_24H_GUIDELINE } from '@shared/impactEngine';

interface SmogChartProps {
  hourly: HourlyAqiPoint[];
  ventilationWindow: VentilationWindow;
  city: string;
}

export function SmogChart({ hourly, ventilationWindow, city }: SmogChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

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
  const activePoint = activeIdx !== null ? hourly[activeIdx] : null;

  const updateIndexFromPointer = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;

    const svgX = ((clientX - rect.left) / rect.width) * width;
    const clampedPlotX = Math.max(padLeft, Math.min(width - padRight, svgX));
    const ratio = (clampedPlotX - padLeft) / plotW;
    const nextIdx = Math.round(ratio * Math.max(1, hourly.length - 1));
    setActiveIdx(Math.max(0, Math.min(hourly.length - 1, nextIdx)));
  };

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    updateIndexFromPointer(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch' && e.buttons === 0) return;
    updateIndexFromPointer(e.clientX);
  };

  const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIdx((prev) => (prev === null ? 0 : Math.min(hourly.length - 1, prev + 1)));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIdx((prev) => (prev === null ? hourly.length - 1 : Math.max(0, prev - 1)));
    } else if (e.key === 'Escape') {
      setActiveIdx(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            24-Hour Smog Curve & Safe Ventilation Window — {city}
          </h3>
          <p className="text-xs text-slate-500">
            PM2.5 (µg/m³) across the diurnal inversion cycle. Dashed line = WHO 24h guideline (15 µg/m³).
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-teal-700">
            <span className="h-2.5 w-2.5 rounded-sm bg-teal-500/20 border border-teal-600" />
            Best Airing ({ventilationWindow.bestStartHour}–{ventilationWindow.bestEndHour})
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
            Peak ({ventilationWindow.peakHour}: {ventilationWindow.peakPm25} µg/m³)
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIdx(null)}
          onPointerCancel={() => setActiveIdx(null)}
          onBlur={() => setActiveIdx(null)}
          onKeyDown={handleKeyDown}
          className="w-full h-auto select-none touch-pan-y cursor-crosshair rounded-lg"
          role="img"
          aria-label={`24 hour PM2.5 chart for ${city}. Best ventilation window is ${ventilationWindow.bestStartHour} to ${ventilationWindow.bestEndHour} averaging ${ventilationWindow.avgPm25InWindow} micrograms per cubic meter. Peak is ${ventilationWindow.peakHour} at ${ventilationWindow.peakPm25}. Use left and right arrow keys to inspect hours.`}
        >
          <defs>
            <linearGradient id="pm25GradLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.02" />
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
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px]"
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
              fill="#0d9488"
              fillOpacity="0.12"
              stroke="#0f766e"
              strokeOpacity="0.45"
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
                stroke="#0284c7"
                strokeWidth="1.25"
                strokeDasharray="5 4"
              />
              <text
                x={width - padRight - 2}
                y={whoY - 5}
                textAnchor="end"
                className="fill-sky-700 text-[10px] font-medium"
              >
                WHO 15 µg/m³
              </text>
            </g>
          )}

          {/* PM2.5 curve */}
          <path d={areaD} fill="url(#pm25GradLight)" />
          <path
            d={pathD}
            fill="none"
            stroke="#c2410c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active crosshair guide */}
          {activeIdx !== null && (
            <line
              x1={xOf(activeIdx)}
              y1={padTop}
              x2={xOf(activeIdx)}
              y2={padTop + plotH}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* X-axis labels & highlight markers */}
          {hourly.map((pt, i) => {
            const cx = xOf(i);
            const cy = yOf(pt.pm25);
            const isHovered = activeIdx === i;
            const isPeak = pt.hourLabel === ventilationWindow.peakHour;
            return (
              <g key={pt.hourLabel}>
                {i % 4 === 0 && (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px]"
                  >
                    {pt.hourLabel}
                  </text>
                )}
                {(isHovered || isPeak) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 4}
                    className={
                      isPeak ? 'fill-rose-600 stroke-white' : 'fill-amber-600 stroke-white'
                    }
                    strokeWidth="1.75"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Fixed-height status strip prevents any layout shift on hover or touch */}
        <div
          className="mt-2 min-h-[36px] flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
          aria-live="polite"
        >
          {activePoint ? (
            <>
              <span>
                <strong className="text-slate-900">{activePoint.hourLabel}</strong> — PM2.5:{' '}
                <strong className="text-amber-800">{activePoint.pm25} µg/m³</strong> · PM10:{' '}
                {activePoint.pm10} µg/m³
              </span>
              <span className="font-medium text-slate-600">US AQI ~{activePoint.usAqi}</span>
            </>
          ) : (
            <>
              <span className="text-slate-500">
                Tap or hover the curve to inspect hourly PM2.5 levels
              </span>
              <span className="text-teal-700 font-medium">
                Safe window: {ventilationWindow.bestStartHour}–{ventilationWindow.bestEndHour}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
