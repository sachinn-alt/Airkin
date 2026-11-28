'use client';

import * as React from 'react';
import {
  AlertCircle,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Moon,
  RotateCcw,
  Snowflake,
  Sun,
  Wind,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WEATHER_CARD_CSS =
  ':root{--chatcn-accent:var(--chatcn-gray-1000);--chatcn-amber:oklch(0.555 0.125 60);--chatcn-bg:oklch(1 0 0);--chatcn-blue:oklch(0.550 0.180 258);--chatcn-border:var(--chatcn-gray-400);--chatcn-card:oklch(1 0 0);--chatcn-chart-5:oklch(0.640 0.170 40);--chatcn-ease-out:cubic-bezier(0.23, 1, 0.32, 1);--chatcn-fg:var(--chatcn-gray-1000);--chatcn-fg-muted:var(--chatcn-gray-900);--chatcn-fg-subtle:var(--chatcn-gray-800);--chatcn-fill:var(--chatcn-gray-100);--chatcn-fill-active:var(--chatcn-gray-300);--chatcn-fill-hover:var(--chatcn-gray-200);--chatcn-gray-100:oklch(0.970 0 0);--chatcn-gray-1000:oklch(0.145 0 0);--chatcn-gray-200:oklch(0.950 0 0);--chatcn-gray-300:oklch(0.930 0 0);--chatcn-gray-400:oklch(0.910 0 0);--chatcn-gray-800:oklch(0.420 0 0);--chatcn-gray-900:oklch(0.350 0 0);--chatcn-purple:oklch(0.530 0.190 300);--chatcn-radius-lg:12px;--chatcn-radius-md:8px;--chatcn-radius-sm:6px;--chatcn-radius-xs:4px;--chatcn-red:oklch(0.560 0.200 27);--chatcn-shadow-sm:0 0 0 1px oklch(0 0 0 / 0.06), 0 1px 2px -1px oklch(0 0 0 / 0.06), 0 2px 4px oklch(0 0 0 / 0.04);--chatcn-shadow-xs:0 0 0 1px oklch(0 0 0 / 0.08), 0 1px 2px oklch(0 0 0 / 0.04);--chatcn-teal:oklch(0.540 0.095 195)}.chatcn-focus:focus-visible{outline:2px solid var(--chatcn-accent);outline-offset:2px}@keyframes chatcn-swap{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}';

if (typeof document !== 'undefined' && !document.getElementById('chatcn-weather-card')) {
  const style = document.createElement('style');
  style.id = 'chatcn-weather-card';
  style.textContent = WEATHER_CARD_CSS;
  document.head.appendChild(style);
}

export type WeatherCondition =
  | 'clear'
  | 'clear-night'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'wind'
  | 'fog';

export interface WeatherHour {
  time: string;
  temp: number;
  condition?: WeatherCondition;
  precip?: number;
}

export interface WeatherDay {
  day: string;
  high: number;
  low: number;
  condition?: WeatherCondition;
  precip?: number;
  today?: boolean;
}

export interface WeatherCardProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  location?: string;
  updated?: string;
  unit?: 'C' | 'F';
  temp?: number;
  condition?: WeatherCondition;
  summary?: string;
  high?: number;
  low?: number;
  feelsLike?: number;
  humidity?: number;
  wind?: string;
  hourly?: WeatherHour[];
  daily?: WeatherDay[];
  loading?: boolean;
  streaming?: boolean;
  error?: React.ReactNode;
  onRetry?: () => void;
}

const LABELS: Record<WeatherCondition, string> = {
  clear: 'Clear',
  'clear-night': 'Clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  rain: 'Rain',
  storm: 'Thunderstorms',
  snow: 'Snow',
  wind: 'Windy',
  fog: 'Fog',
};

const ICONS: Record<WeatherCondition, React.ComponentType<{ className?: string }>> = {
  clear: Sun,
  'clear-night': Moon,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  storm: CloudLightning,
  snow: Snowflake,
  wind: Wind,
  fog: Cloud,
};

const TINTS: Record<WeatherCondition, string> = {
  clear: 'text-(color:--chatcn-amber)',
  'clear-night': 'text-(color:--chatcn-purple)',
  'partly-cloudy': 'text-(color:--chatcn-amber)',
  cloudy: 'text-(color:--chatcn-fg-subtle)',
  rain: 'text-(color:--chatcn-blue)',
  storm: 'text-(color:--chatcn-purple)',
  snow: 'text-(color:--chatcn-teal)',
  wind: 'text-(color:--chatcn-teal)',
  fog: 'text-(color:--chatcn-fg-subtle)',
};

const TEMPERATURE_SCALE =
  'linear-gradient(90deg, var(--chatcn-blue), var(--chatcn-teal) 35%, var(--chatcn-amber) 70%, var(--chatcn-chart-5))';

const formatDeg = (v: number) => `${Math.round(v)}°`;

function ConditionIcon({
  condition,
  className,
}: {
  condition?: WeatherCondition;
  className?: string;
}) {
  const Icon = ICONS[condition ?? 'cloudy'] ?? Cloud;
  return <Icon aria-hidden="true" className={cn(TINTS[condition ?? 'cloudy'], className)} />;
}

function useScrollEdges(ref: React.RefObject<HTMLElement | null>, deps: unknown) {
  const [edges, setEdges] = React.useState({ start: false, end: false, rtl: false });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rtl = getComputedStyle(el).direction === 'rtl';
      const x = Math.abs(el.scrollLeft);
      const next = { start: x > 1, end: x + el.clientWidth < el.scrollWidth - 1, rtl };
      setEdges((prev) =>
        prev.start === next.start && prev.end === next.end && prev.rtl === next.rtl ? prev : next
      );
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [ref, deps]);
  return edges;
}

function edgeMask({ start, end, rtl }: { start: boolean; end: boolean; rtl: boolean }) {
  if (!start && !end) return undefined;
  const left = rtl ? end : start;
  const right = rtl ? start : end;
  const image = `linear-gradient(to right, ${left ? 'transparent, black 2rem' : 'black'}, ${right ? 'black calc(100% - 2rem), transparent' : 'black'})`;
  return { maskImage: image, WebkitMaskImage: image };
}

/**
 * Compact meteorology forecast card displaying current temperature, hourly conditions,
 * and multi-day thermal range bars.
 */
export function WeatherCard({
  location,
  updated,
  unit = 'C',
  temp,
  condition,
  summary,
  high,
  low,
  feelsLike,
  humidity,
  wind,
  hourly,
  daily,
  loading = false,
  streaming = false,
  error,
  onRetry,
  className,
  ...props
}: WeatherCardProps) {
  const pending = loading || (temp === undefined && streaming);
  const days = (daily ?? []).filter(
    (d) => d && typeof d.high === 'number' && typeof d.low === 'number'
  );
  const hours = (hourly ?? []).filter((h) => h && typeof h.temp === 'number');
  const weekMin = days.length ? Math.min(...days.map((d) => d.low)) : 0;
  const weekMax = days.length ? Math.max(...days.map((d) => d.high)) : 1;
  const span = weekMax - weekMin || 1;
  const words = summary ?? (condition ? LABELS[condition] : undefined);
  const todayIndex = days.some((d) => d.today)
    ? days.findIndex((d) => d.today)
    : days.findIndex((d) => d.day.trim().toLowerCase() === 'today');
  const hourlyRef = React.useRef<HTMLOListElement>(null);
  const edges = useScrollEdges(hourlyRef, `${hours.length}-${pending}`);
  const scrolls = edges.start || edges.end;

  if (error) {
    return (
      <div
        data-slot="weather-card"
        role="alert"
        className={cn(
          'text-[0.875rem]/[1.25rem] tracking-[-0.003em] text-(color:--chatcn-fg) rounded-(--chatcn-radius-lg) bg-(color:--chatcn-card) shadow-(--chatcn-shadow-sm) flex flex-col gap-2 p-4',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <AlertCircle aria-hidden="true" className="text-(color:--chatcn-red) size-4 shrink-0" />
          <span className="font-medium">
            Weather unavailable{location ? ` for ${location}` : ''}
          </span>
        </div>
        <p className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg-subtle) ps-6 text-pretty">
          {error}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="chatcn-focus ms-6 self-start inline-flex h-7 items-center gap-1.5 rounded-(--chatcn-radius-sm) bg-(color:--chatcn-card) px-2.5 text-[0.8125rem] font-medium text-(color:--chatcn-fg) shadow-(--chatcn-shadow-xs) hover:bg-(color:--chatcn-fill-hover) cursor-pointer"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            <span>Try again</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-slot="weather-card"
      aria-busy={pending || streaming || undefined}
      className={cn(
        'text-[0.875rem]/[1.25rem] tracking-[-0.003em] text-(color:--chatcn-fg) rounded-(--chatcn-radius-lg) bg-(color:--chatcn-card) shadow-(--chatcn-shadow-sm) flex min-w-0 flex-col',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg-subtle) flex items-center gap-1.5">
            {location ? (
              <span className="text-(color:--chatcn-fg-muted) truncate font-medium">
                {location}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="bg-(color:--chatcn-fill) rounded-(--chatcn-radius-xs) my-0.5 h-3 w-24"
              />
            )}
            {updated ? <span className="shrink-0">{updated}</span> : null}
          </span>
          {pending ? (
            <span
              aria-hidden="true"
              className="bg-(color:--chatcn-fill) rounded-(--chatcn-radius-xs) my-2 block h-11 w-28"
            />
          ) : (
            <span className="text-[3.5rem]/[3.5rem] tracking-[-0.042em] text-(color:--chatcn-fg) leading-none font-medium">
              <span className="sr-only">
                {`${Math.round(temp ?? 0)} degrees ${unit === 'C' ? 'Celsius' : 'Fahrenheit'}`}
              </span>
              <span aria-hidden="true">{formatDeg(temp ?? 0)}</span>
              <span
                aria-hidden="true"
                className="text-[1.5rem]/[2rem] tracking-[-0.022em] text-(color:--chatcn-fg-subtle) align-top font-normal"
              >
                {unit}
              </span>
            </span>
          )}
          <span className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg-muted) flex flex-wrap items-center gap-x-2">
            {words ? <span className="text-(color:--chatcn-fg)">{words}</span> : null}
            {high !== undefined && low !== undefined ? (
              <span className="tabular-nums">
                H {formatDeg(high)} L {formatDeg(low)}
              </span>
            ) : null}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          {pending ? (
            <span aria-hidden="true" className="bg-(color:--chatcn-fill) size-10 rounded-full" />
          ) : (
            <span
              key={condition}
              className="grid place-items-center motion-safe:animate-[chatcn-swap_150ms_var(--chatcn-ease-out)]"
            >
              <ConditionIcon condition={condition} className="size-10 [stroke-width:1.35]" />
            </span>
          )}
          <dl className="text-[0.75rem]/[1rem] text-(color:--chatcn-fg-subtle) flex flex-col items-end gap-0.5 tabular-nums">
            {feelsLike !== undefined ? (
              <div className="flex gap-1">
                <dt>Feels like</dt>
                <dd className="text-(color:--chatcn-fg-muted)">{formatDeg(feelsLike)}</dd>
              </div>
            ) : null}
            {humidity !== undefined ? (
              <div className="flex items-center gap-1">
                <dt>
                  <Droplets aria-hidden="true" className="size-3" />
                  <span className="sr-only">Humidity</span>
                </dt>
                <dd className="text-(color:--chatcn-fg-muted)">{Math.round(humidity)}%</dd>
              </div>
            ) : null}
            {wind ? (
              <div className="flex items-center gap-1">
                <dt>
                  <Wind aria-hidden="true" className="size-3" />
                  <span className="sr-only">Wind</span>
                </dt>
                <dd className="text-(color:--chatcn-fg-muted)">{wind}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {hours.length > 0 || pending ? (
        <div className="border-(color:--chatcn-border) border-t">
          <ol
            ref={hourlyRef}
            aria-label="Hourly forecast"
            style={edgeMask(edges)}
            className={cn(
              'chatcn-focus relative flex [scrollbar-width:none] gap-1 overflow-x-auto overscroll-x-contain px-2 py-3 [&::-webkit-scrollbar]:hidden',
              scrolls ? 'cursor-ew-resize' : undefined
            )}
          >
            {(pending ? Array.from({ length: 8 }, () => null) : hours).map((h, i) => (
              <li key={i} className="flex min-w-12 flex-1 flex-col items-center gap-1.5 px-1">
                {h ? (
                  <>
                    <span className="text-[0.75rem]/[1rem] text-(color:--chatcn-fg-subtle) tabular-nums">
                      {h.time}
                    </span>
                    <ConditionIcon condition={h.condition} className="size-4" />
                    <span className="sr-only">{h.condition ? LABELS[h.condition] : ''}</span>
                    <span className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg) font-medium tabular-nums">
                      {formatDeg(h.temp)}
                    </span>
                    <span
                      className={cn(
                        'text-[0.75rem]/[1rem] tabular-nums',
                        h.precip && h.precip >= 30 ? 'text-(color:--chatcn-blue)' : 'invisible'
                      )}
                    >
                      {h.precip ?? 0}%
                    </span>
                  </>
                ) : (
                  <span aria-hidden="true" className="contents">
                    <span className="flex h-4 items-center">
                      <span className="bg-(color:--chatcn-fill) rounded-(--chatcn-radius-xs) h-2.5 w-7" />
                    </span>
                    <span className="bg-(color:--chatcn-fill) size-4 rounded-full" />
                    <span className="flex h-5 items-center">
                      <span className="bg-(color:--chatcn-fill) rounded-(--chatcn-radius-xs) h-3 w-6" />
                    </span>
                    <span className="h-4" />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {days.length > 0 ? (
        <ol
          aria-label="Daily forecast"
          className="border-(color:--chatcn-border) flex flex-col border-t px-4 py-2"
        >
          {days.map((d, i) => {
            const left = ((d.low - weekMin) / span) * 100;
            const width = Math.max(4, ((d.high - d.low) / span) * 100);
            return (
              <li
                key={`${d.day}-${i}`}
                className="grid h-9 grid-cols-[3rem_1.25rem_2.25rem_2rem_1fr_2rem] items-center gap-2"
              >
                <span className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg)">
                  {d.day}
                </span>
                <ConditionIcon condition={d.condition} className="size-4" />
                <span className="text-[0.75rem]/[1rem] text-(color:--chatcn-blue) text-end tabular-nums">
                  {d.precip && d.precip >= 30 ? `${d.precip}%` : ''}
                </span>
                <span className="sr-only">
                  {d.condition ? `${LABELS[d.condition]}, ` : ''}low {formatDeg(d.low)}, high{' '}
                  {formatDeg(d.high)}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg-subtle) text-end tabular-nums"
                >
                  {formatDeg(d.low)}
                </span>
                <span
                  className="bg-(color:--chatcn-fill-active) relative h-1 rounded-full rtl:-scale-x-100"
                  aria-hidden="true"
                >
                  <span
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundImage: TEMPERATURE_SCALE,
                      backgroundSize: `${(100 / width) * 100}% 100%`,
                      backgroundPosition:
                        width >= 100 ? '0 0' : `${(left / (100 - width)) * 100}% 0`,
                    }}
                  />
                  {i === todayIndex && temp !== undefined && !pending ? (
                    <span
                      data-slot="weather-card-now"
                      className="bg-(color:--chatcn-fg) ring-(color:--chatcn-card) absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
                      style={{
                        left: `${((Math.min(Math.max(temp, d.low), d.high) - weekMin) / span) * 100}%`,
                      }}
                    />
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg) tabular-nums"
                >
                  {formatDeg(d.high)}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

export default WeatherCard;
