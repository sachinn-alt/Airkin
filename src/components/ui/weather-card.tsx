"use client"

// From chatcn, chat, voice and agent UI for shadcn: https://chatcn.dev

import * as React from "react"
import { forwardRef, createElement, type SVGAttributes, type ForwardRefExoticComponent, type RefAttributes } from "react"
import { cn } from "@/lib/utils"

/** chatcn theme variables and utilities this file uses, light and dark. */
const CHATCN_CSS = ":root{--chatcn-accent:var(--chatcn-gray-1000);--chatcn-amber:oklch(0.555 0.125 60);--chatcn-bg:oklch(1 0 0);--chatcn-blue:oklch(0.550 0.180 258);--chatcn-border:var(--chatcn-gray-400);--chatcn-card:oklch(1 0 0);--chatcn-chart-5:oklch(0.640 0.170 40);--chatcn-ease-out:cubic-bezier(0.23, 1, 0.32, 1);--chatcn-ease-standard:ease;--chatcn-fg:var(--chatcn-gray-1000);--chatcn-fg-faint:var(--chatcn-gray-700);--chatcn-fg-muted:var(--chatcn-gray-900);--chatcn-fg-subtle:var(--chatcn-gray-800);--chatcn-fill:var(--chatcn-gray-100);--chatcn-fill-active:var(--chatcn-gray-300);--chatcn-fill-hover:var(--chatcn-gray-200);--chatcn-gray-100:oklch(0.970 0 0);--chatcn-gray-1000:oklch(0.145 0 0);--chatcn-gray-200:oklch(0.950 0 0);--chatcn-gray-300:oklch(0.930 0 0);--chatcn-gray-400:oklch(0.910 0 0);--chatcn-gray-700:oklch(0.700 0 0);--chatcn-gray-800:oklch(0.525 0 0);--chatcn-gray-900:oklch(0.440 0 0);--chatcn-press-scale:0.97;--chatcn-press-scale-icon:0.94;--chatcn-primary:var(--chatcn-gray-1000);--chatcn-primary-fg:var(--chatcn-bg);--chatcn-primary-hover:var(--chatcn-gray-900);--chatcn-purple:oklch(0.530 0.190 300);--chatcn-radius-lg:12px;--chatcn-radius-md:8px;--chatcn-radius-sm:6px;--chatcn-radius-xs:4px;--chatcn-red:oklch(0.560 0.200 27);--chatcn-shadow-sm:0 0 0 1px oklch(0 0 0 / 0.06), 0 1px 2px -1px oklch(0 0 0 / 0.06), 0 2px 4px oklch(0 0 0 / 0.04);--chatcn-shadow-xs:0 0 0 1px oklch(0 0 0 / 0.08), 0 1px 2px oklch(0 0 0 / 0.04);--chatcn-teal:oklch(0.540 0.095 195)}.dark{--chatcn-accent:var(--chatcn-gray-1000);--chatcn-amber:oklch(0.800 0.140 74);--chatcn-bg:oklch(0.145 0 0);--chatcn-blue:oklch(0.710 0.140 252);--chatcn-border:var(--chatcn-gray-400);--chatcn-card:oklch(0.175 0 0);--chatcn-chart-5:oklch(0.740 0.150 45);--chatcn-fg:var(--chatcn-gray-1000);--chatcn-fg-faint:var(--chatcn-gray-700);--chatcn-fg-muted:var(--chatcn-gray-900);--chatcn-fg-subtle:var(--chatcn-gray-800);--chatcn-fill:var(--chatcn-gray-100);--chatcn-fill-active:var(--chatcn-gray-300);--chatcn-fill-hover:var(--chatcn-gray-200);--chatcn-gray-100:oklch(0.195 0 0);--chatcn-gray-1000:oklch(0.970 0 0);--chatcn-gray-200:oklch(0.225 0 0);--chatcn-gray-300:oklch(0.255 0 0);--chatcn-gray-400:oklch(0.285 0 0);--chatcn-gray-700:oklch(0.500 0 0);--chatcn-gray-800:oklch(0.620 0 0);--chatcn-gray-900:oklch(0.720 0 0);--chatcn-primary:var(--chatcn-gray-1000);--chatcn-primary-fg:var(--chatcn-bg);--chatcn-primary-hover:var(--chatcn-gray-900);--chatcn-purple:oklch(0.740 0.140 305);--chatcn-red:oklch(0.700 0.175 22);--chatcn-shadow-sm:0 0 0 1px oklch(1 0 0 / 0.08), inset 0 1px 0 oklch(1 0 0 / 0.03), 0 2px 4px oklch(0 0 0 / 0.4);--chatcn-shadow-xs:0 0 0 1px oklch(1 0 0 / 0.08), 0 1px 2px oklch(0 0 0 / 0.4);--chatcn-teal:oklch(0.770 0.100 190)}.chatcn-focus{}.chatcn-focus:focus-visible{outline: 2px solid var(--chatcn-accent); outline-offset: 2px;}@keyframes chatcn-swap{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}@media (prefers-reduced-motion: reduce){:root{--chatcn-press-scale:1;--chatcn-press-scale-icon:1;--chatcn-enter-scale:1}}"
if (typeof document !== "undefined" && !document.getElementById("chatcn-weather-card")) {
  const style = document.createElement("style")
  style.id = "chatcn-weather-card"
  style.textContent = CHATCN_CSS
  document.head.appendChild(style)
}

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

export type WeatherCondition =
  | "clear"
  | "clear-night"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "storm"
  | "snow"
  | "wind"
  | "fog"

export interface WeatherHour {
  time: string
  temp: number
  condition?: WeatherCondition
  /** Chance of precipitation, 0 to 100. */
  precip?: number
}

export interface WeatherDay {
  day: string
  high: number
  low: number
  condition?: WeatherCondition
  precip?: number
  /**
   * Marks today's row: its range bar carries a dot at the current temperature. Defaults to the
   * row whose `day` reads "Today".
   */
  today?: boolean
}

export interface WeatherCardProps extends Omit<React.ComponentProps<"div">, "children"> {
  location?: string
  /** "Updated 14:05" or a date. */
  updated?: string
  unit?: "C" | "F"
  temp?: number
  condition?: WeatherCondition
  /** Condition in words. Defaults to a label for `condition`. */
  summary?: string
  high?: number
  low?: number
  feelsLike?: number
  humidity?: number
  /** Wind speed with its unit: "14 km/h". */
  wind?: string
  hourly?: WeatherHour[]
  daily?: WeatherDay[]
  loading?: boolean
  streaming?: boolean
  error?: React.ReactNode
  onRetry?: () => void
}

const LABELS: Record<WeatherCondition, string> = {
  clear: "Clear",
  "clear-night": "Clear",
  "partly-cloudy": "Partly cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
  storm: "Thunderstorms",
  snow: "Snow",
  wind: "Windy",
  fog: "Fog",
}

/** Which edges of a horizontal scroller hide content, so only those edges fade. */
function useScrollEdges(ref: React.RefObject<HTMLElement | null>, deps: unknown) {
  const [edges, setEdges] = React.useState({ start: false, end: false, rtl: false })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const rtl = getComputedStyle(el).direction === "rtl"
      const x = Math.abs(el.scrollLeft)
      const next = { start: x > 1, end: x + el.clientWidth < el.scrollWidth - 1, rtl }
      setEdges((prev) =>
        prev.start === next.start && prev.end === next.end && prev.rtl === next.rtl ? prev : next,
      )
    }
    measure()
    el.addEventListener("scroll", measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", measure)
      ro.disconnect()
    }
  }, [ref, deps])
  return edges
}

interface IconProps extends SVGAttributes<SVGSVGElement> {
  /** Width and height. Number means px. Default 24. */
  size?: number | string
  /** Stroke width in viewBox units (24 grid). Default 1.5. */
  strokeWidth?: number | string
  /** Keep the rendered stroke at `strokeWidth` px at any size. */
  absoluteStrokeWidth?: boolean
  /** Stroke color. Default currentColor. */
  color?: string
  /** Accessible name. Renders <title> and sets role="img"; without it the icon is aria-hidden. */
  title?: string
}

type Icon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>

/** Shape elements an icon may contain. */
type IconElement = "path" | "circle" | "rect" | "ellipse" | "line" | "polyline" | "polygon"

/** An icon's drawing: a flat list of [element, attributes] pairs, lucide compatible. */
type IconNode = ReadonlyArray<readonly [IconElement, Readonly<Record<string, string>>]>

const toPascal = (name: string): string =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")

function createIcon(name: string, iconNode: IconNode): Icon {
  const Component = forwardRef<SVGSVGElement, IconProps>(function ChatcnIcon(
    {
      size = 24,
      strokeWidth = 1.5,
      absoluteStrokeWidth = false,
      color = "currentColor",
      title,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const stroke = absoluteStrokeWidth
      ? (Number(strokeWidth) * 24) / Number.parseFloat(String(size))
      : strokeWidth
    const labelled = Boolean(title || rest["aria-label"] || rest["aria-labelledby"])
    return createElement(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color,
        strokeWidth: stroke,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "data-slot": "icon",
        className: className
          ? `chatcn-icon chatcn-icon-${name} ${className}`
          : `chatcn-icon chatcn-icon-${name}`,
        ...(labelled ? { role: "img" } : { "aria-hidden": true }),
        ...rest,
      },
      title ? createElement("title", null, title) : null,
      ...iconNode.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs })),
      children,
    )
  })
  Component.displayName = `${toPascal(name)}Icon`
  return Component
}

const iconNode: IconNode = [
  ["path", {"d":"M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0"}],
  ["path", {"d":"M12 7.75v5"}],
  ["path", {"d":"M12 16.25h.01"}],
]

const CircleAlertIcon: Icon = /* @__PURE__ */ createIcon("circle-alert", iconNode)

type ButtonVariant = "solid" | "outline" | "ghost" | "subtle"

type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon-xs" | "icon-sm" | "icon-md" | "icon-lg"

interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const base = cn(
  "chatcn-focus inline-flex shrink-0 items-center justify-center gap-1.5 font-medium whitespace-nowrap select-none",
  "ease-(--chatcn-ease-standard) transition-[background-color,color,box-shadow,scale] duration-150",
  "active:scale-(--chatcn-press-scale) active:duration-100 disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
)

const variants: Record<ButtonVariant, string> = {
  solid: "bg-(color:--chatcn-primary) text-(color:--chatcn-primary-fg) hover:bg-(color:--chatcn-primary-hover)",
  outline: "bg-(color:--chatcn-card) text-(color:--chatcn-fg) shadow-(--chatcn-shadow-xs) hover:bg-(color:--chatcn-fill-hover)",
  ghost: "text-(color:--chatcn-fg-muted) hover:bg-(color:--chatcn-fill-hover) hover:text-(color:--chatcn-fg)",
  subtle: "bg-(color:--chatcn-fill) text-(color:--chatcn-fg) hover:bg-(color:--chatcn-fill-hover)",
}

const sizes: Record<ButtonSize, string> = {
  xs: "h-6 rounded-(--chatcn-radius-sm) px-2 text-[0.75rem]/[1rem] [&_svg]:size-3.5",
  sm: "h-7 rounded-(--chatcn-radius-sm) px-2.5 text-[0.8125rem]/[1.25rem] [&_svg]:size-3.5",
  md: "h-8 rounded-(--chatcn-radius-md) px-3 text-[0.875rem]/[1.25rem] tracking-[-0.003em] [&_svg]:size-4",
  lg: "h-9 rounded-(--chatcn-radius-md) px-3.5 text-[0.875rem]/[1.25rem] tracking-[-0.003em] [&_svg]:size-4",
  "icon-xs": "size-6 rounded-(--chatcn-radius-sm) active:scale-(--chatcn-press-scale-icon) [&_svg]:size-3.5",
  "icon-sm": "size-7 rounded-(--chatcn-radius-sm) active:scale-(--chatcn-press-scale-icon) [&_svg]:size-3.5",
  "icon-md": "size-8 rounded-(--chatcn-radius-md) active:scale-(--chatcn-press-scale-icon) [&_svg]:size-4",
  "icon-lg": "size-9 rounded-(--chatcn-radius-md) active:scale-(--chatcn-press-scale-icon) [&_svg]:size-4",
}

function buttonVariants({
  variant = "ghost",
  size = "md",
}: {
  variant?: ButtonVariant
  size?: ButtonSize
} = {}) {
  return cn(base, variants[variant], sizes[size])
}

function Button({
  variant = "ghost",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

const iconNode2: IconNode = [
  ["path", {"d":"M5.49 17.46A8.5 8.5 0 1 0 6.54 5.49"}],
  ["path", {"d":"m8.21 8.65-2.94-.26a2 2 0 0 1-1.82-2.16l.26-2.94"}],
]

const RotateCcwIcon: Icon = /* @__PURE__ */ createIcon("rotate-ccw", iconNode2)

const deg = (v: number) => `${Math.round(v)}°`

const iconNode3: IconNode = [
  ["path", {"d":"M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"}],
  ["path", {"d":"M19 12h2.25"}],
  ["path", {"d":"m16.95 16.95 1.59 1.59"}],
  ["path", {"d":"M12 19v2.25"}],
  ["path", {"d":"m7.05 16.95-1.59 1.59"}],
  ["path", {"d":"M5 12H2.75"}],
  ["path", {"d":"M7.05 7.05 5.46 5.46"}],
  ["path", {"d":"M12 5V2.75"}],
  ["path", {"d":"m16.95 7.05 1.59-1.59"}],
]

const SunIcon: Icon = /* @__PURE__ */ createIcon("sun", iconNode3)

const iconNode4: IconNode = [
  ["path", {"d":"M11.47 3.27a8.75 8.75 0 1 0 9.26 9.26 6.75 6.75 0 0 1-9.26-9.26"}],
]

const MoonIcon: Icon = /* @__PURE__ */ createIcon("moon", iconNode4)

const iconNode5: IconNode = [
  ["path", {"d":"M10.25 20.5a3.75 3.75 0 0 1-.22-7.49 4.75 4.75 0 0 1 9.47.57 3.5 3.5 0 0 1-.75 6.92z"}],
  ["path", {"d":"M6.31 11.23a3.5 3.5 0 0 1 4.37-5.47"}],
  ["path", {"d":"m4.43 12.57-1.06 1.06"}],
  ["path", {"d":"M2.75 8.5h-1.5"}],
  ["path", {"d":"M4.43 4.43 3.37 3.37"}],
  ["path", {"d":"M8.5 2.75v-1.5"}],
  ["path", {"d":"m12.57 4.43 1.06-1.06"}],
]

const CloudSunIcon: Icon = /* @__PURE__ */ createIcon("cloud-sun", iconNode5)

const iconNode6: IconNode = [
  ["path", {"d":"M7 19a4.5 4.5 0 0 1-.23-8.99 5.75 5.75 0 0 1 11.48.56A4.25 4.25 0 0 1 17.5 19z"}],
]

const CloudIcon: Icon = /* @__PURE__ */ createIcon("cloud", iconNode6)

const iconNode7: IconNode = [
  ["path", {"d":"M7.75 13.68a3.83 3.83 0 0 1-.2-7.65 4.89 4.89 0 0 1 9.76.48 3.61 3.61 0 0 1-.63 7.17z"}],
  ["path", {"d":"m8.25 17-1 3.75"}],
  ["path", {"d":"m12.25 17-1 3.75"}],
  ["path", {"d":"m16.25 17-1 3.75"}],
]

const CloudRainIcon: Icon = /* @__PURE__ */ createIcon("cloud-rain", iconNode7)

const iconNode8: IconNode = [
  ["path", {"d":"m8.31 13.25-.56.01a3.83 3.83 0 0 1-.2-7.65 4.89 4.89 0 0 1 9.77.38 3.61 3.61 0 0 1-.64 7.16l-1.43.02"}],
  ["path", {"d":"m13.88 10.41-2.92 3.89a.83.83 0 0 0 .78 1.31l1.52-.22a.83.83 0 0 1 .78 1.31l-2.91 3.89"}],
]

const CloudLightningIcon: Icon = /* @__PURE__ */ createIcon("cloud-lightning", iconNode8)

const iconNode9: IconNode = [
  ["path", {"d":"M12 2.5v19"}],
  ["path", {"d":"m3.77 7.25 16.46 9.5"}],
  ["path", {"d":"m3.77 16.75 16.46-9.5"}],
  ["path", {"d":"m9.3 3.68 2.21 1.9a.75.75 0 0 0 .98 0l2.21-1.9"}],
  ["path", {"d":"m17.85 5.5-.53 2.87a.75.75 0 0 0 .48.84l2.76.97"}],
  ["path", {"d":"m20.56 13.82-2.76.97a.75.75 0 0 0-.48.84l.53 2.87"}],
  ["path", {"d":"m14.7 20.32-2.21-1.9a.75.75 0 0 0-.98 0l-2.21 1.9"}],
  ["path", {"d":"m6.15 18.5.53-2.87a.75.75 0 0 0-.48-.84l-2.76-.97"}],
  ["path", {"d":"m3.44 10.18 2.76-.97a.75.75 0 0 0 .48-.84L6.15 5.5"}],
]

const SnowflakeIcon: Icon = /* @__PURE__ */ createIcon("snowflake", iconNode9)

const iconNode10: IconNode = [
  ["path", {"d":"M2.5 8h9a2.75 2.75 0 1 0-2.38-4.12"}],
  ["path", {"d":"M2.5 12h15a3 3 0 1 0-2.82-4.03"}],
  ["path", {"d":"M2.5 16h11a2.5 2.5 0 1 1-2.17 3.75"}],
]

const WindIcon: Icon = /* @__PURE__ */ createIcon("wind", iconNode10)

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

const ICONS: Record<WeatherCondition, React.ComponentType<{ className?: string }>> = {
  clear: SunIcon,
  "clear-night": MoonIcon,
  "partly-cloudy": CloudSunIcon,
  cloudy: CloudIcon,
  rain: CloudRainIcon,
  storm: CloudLightningIcon,
  snow: SnowflakeIcon,
  wind: WindIcon,
  fog: CloudIcon,
}

const TINTS: Record<WeatherCondition, string> = {
  clear: "text-(color:--chatcn-amber)",
  "clear-night": "text-(color:--chatcn-purple)",
  "partly-cloudy": "text-(color:--chatcn-amber)",
  cloudy: "text-(color:--chatcn-fg-subtle)",
  rain: "text-(color:--chatcn-blue)",
  storm: "text-(color:--chatcn-purple)",
  snow: "text-(color:--chatcn-teal)",
  wind: "text-(color:--chatcn-teal)",
  fog: "text-(color:--chatcn-fg-subtle)",
}

function ConditionIcon({
  condition,
  className,
}: {
  condition?: WeatherCondition
  className?: string
}) {
  const Icon = ICONS[condition ?? "cloudy"] ?? CloudIcon
  return <Icon aria-hidden="true" className={cn(TINTS[condition ?? "cloudy"], className)} />
}

const iconNode11: IconNode = [
  ["path", {"d":"M17.55 11.62a6.5 6.5 0 1 1-11.1 0l4.7-7.72a1 1 0 0 1 1.7 0z"}],
]

const DropletIcon: Icon = /* @__PURE__ */ createIcon("droplet", iconNode11)

function edgeMask({ start, end, rtl }: { start: boolean; end: boolean; rtl: boolean }) {
  if (!start && !end) return undefined
  const left = rtl ? end : start
  const right = rtl ? start : end
  const image = `linear-gradient(to right, ${left ? "transparent, black 2rem" : "black"}, ${right ? "black calc(100% - 2rem), transparent" : "black"})`
  return { maskImage: image, WebkitMaskImage: image }
}

const TEMPERATURE_SCALE =
  "linear-gradient(90deg, var(--chatcn-blue), var(--chatcn-teal) 35%, var(--chatcn-amber) 70%, var(--chatcn-chart-5))"

/* -------------------------------------------------------------------------------------------------
 * WeatherCard
 * -----------------------------------------------------------------------------------------------*/

export function WeatherCard({
  location,
  updated,
  unit = "C",
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
  const pending = loading || (temp === undefined && streaming)
  const days = (daily ?? []).filter(
    (d) => d && typeof d.high === "number" && typeof d.low === "number",
  )
  const hours = (hourly ?? []).filter((h) => h && typeof h.temp === "number")
  const weekMin = days.length ? Math.min(...days.map((d) => d.low)) : 0
  const weekMax = days.length ? Math.max(...days.map((d) => d.high)) : 1
  const span = weekMax - weekMin || 1
  const words = summary ?? (condition ? LABELS[condition] : undefined)
  const todayIndex = days.some((d) => d.today)
    ? days.findIndex((d) => d.today)
    : days.findIndex((d) => d.day.trim().toLowerCase() === "today")
  const hourlyRef = React.useRef<HTMLOListElement>(null)
  const edges = useScrollEdges(hourlyRef, `${hours.length}-${pending}`)
  const scrolls = edges.start || edges.end

  if (error) {
    return (
      <div
        data-slot="weather-card"
        role="alert"
        className={cn(
          "text-[0.875rem]/[1.25rem] tracking-[-0.003em] text-(color:--chatcn-fg) rounded-(--chatcn-radius-lg) bg-(color:--chatcn-card) shadow-(--chatcn-shadow-sm) flex flex-col gap-2 p-4",
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <CircleAlertIcon aria-hidden="true" className="text-(color:--chatcn-red) size-4 shrink-0" />
          <span className="font-medium">
            Weather unavailable{location ? ` for ${location}` : ""}
          </span>
        </div>
        <p className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg-subtle) ps-6 text-pretty">{error}</p>
        {onRetry ? (
          <Button size="sm" variant="outline" className="ms-6 self-start" onClick={onRetry}>
            <RotateCcwIcon />
            Try again
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      data-slot="weather-card"
      aria-busy={pending || streaming || undefined}
      className={cn(
        "text-[0.875rem]/[1.25rem] tracking-[-0.003em] text-(color:--chatcn-fg) rounded-(--chatcn-radius-lg) bg-(color:--chatcn-card) shadow-(--chatcn-shadow-sm) flex min-w-0 flex-col",
        className,
      )}
      {...props}
    >
      {/* Now */}
      <div className="flex items-start gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg-subtle) flex items-center gap-1.5">
            {location ? (
              <span className="text-(color:--chatcn-fg-muted) truncate font-medium">{location}</span>
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
            <span className="text-[3.5rem]/[3.5rem] tracking-[-0.042em] text-(color:--chatcn-fg) leading-none font-medium tracking-tight">
              <span className="sr-only">
                {`${Math.round(temp ?? 0)} degrees ${unit === "C" ? "Celsius" : "Fahrenheit"}`}
              </span>
              <span aria-hidden="true">{deg(temp ?? 0)}</span>
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
                H {deg(high)} L {deg(low)}
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
              <ConditionIcon condition={condition} className="size-10 [stroke-width:1.25]" />
            </span>
          )}
          <dl className="text-[0.75rem]/[1rem] text-(color:--chatcn-fg-subtle) flex flex-col items-end gap-0.5 tabular-nums">
            {feelsLike !== undefined ? (
              <div className="flex gap-1">
                <dt>Feels like</dt>
                <dd className="text-(color:--chatcn-fg-muted)">{deg(feelsLike)}</dd>
              </div>
            ) : null}
            {humidity !== undefined ? (
              <div className="flex items-center gap-1">
                <dt>
                  <DropletIcon aria-hidden="true" className="size-3" />
                  <span className="sr-only">Humidity</span>
                </dt>
                <dd className="text-(color:--chatcn-fg-muted)">{Math.round(humidity)}%</dd>
              </div>
            ) : null}
            {wind ? (
              <div className="flex items-center gap-1">
                <dt>
                  <WindIcon aria-hidden="true" className="size-3" />
                  <span className="sr-only">Wind</span>
                </dt>
                <dd className="text-(color:--chatcn-fg-muted)">{wind}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {/* Hourly */}
      {hours.length > 0 || pending ? (
        <div className="border-(color:--chatcn-border) border-t">
          <ol
            ref={hourlyRef}
            aria-label="Hourly forecast"
            tabIndex={scrolls ? 0 : undefined}
            style={edgeMask(edges)}
            className="chatcn-focus relative flex [scrollbar-width:none] gap-1 overflow-x-auto overscroll-x-contain px-2 py-3 [&::-webkit-scrollbar]:hidden"
          >
            {(pending ? Array.from({ length: 8 }, () => null) : hours).map((h, i) => (
              <li key={i} className="flex min-w-12 flex-1 flex-col items-center gap-1.5 px-1">
                {h ? (
                  <>
                    <span className="text-[0.75rem]/[1rem] text-(color:--chatcn-fg-subtle) tabular-nums">
                      {h.time}
                    </span>
                    <ConditionIcon condition={h.condition} className="size-4" />
                    <span className="sr-only">{h.condition ? LABELS[h.condition] : ""}</span>
                    <span className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg) font-medium tabular-nums">
                      {deg(h.temp)}
                    </span>
                    <span
                      className={cn(
                        "text-[0.75rem]/[1rem] tabular-nums",
                        h.precip && h.precip >= 30 ? "text-(color:--chatcn-blue)" : "invisible",
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

      {/* Week */}
      {pending && days.length === 0 ? (
        <ol aria-hidden="true" className="border-(color:--chatcn-border) flex flex-col border-t px-4 py-2">
          {[0.2, 0.1, 0.05, 0.15, 0.25].map((offset, i) => (
            <li
              key={i}
              className="grid h-9 grid-cols-[3rem_1.25rem_2.25rem_2rem_1fr_2rem] items-center gap-2"
            >
              <span className="bg-(color:--chatcn-fill) rounded-(--chatcn-radius-xs) h-3 w-9" />
              <span className="bg-(color:--chatcn-fill) size-4 rounded-full" />
              <span />
              <span className="bg-(color:--chatcn-fill) rounded-(--chatcn-radius-xs) h-3 w-6 justify-self-end" />
              <span className="bg-(color:--chatcn-fill) relative h-1 rounded-full">
                <span
                  className="bg-(color:--chatcn-fill-active) absolute inset-y-0 rounded-full"
                  style={{ insetInlineStart: `${offset * 100}%`, width: "55%" }}
                />
              </span>
              <span className="bg-(color:--chatcn-fill) rounded-(--chatcn-radius-xs) h-3 w-6" />
            </li>
          ))}
        </ol>
      ) : null}
      {days.length > 0 ? (
        <ol
          aria-label="Daily forecast"
          className="border-(color:--chatcn-border) flex flex-col border-t px-4 py-2"
        >
          {days.map((d, i) => {
            const left = ((d.low - weekMin) / span) * 100
            const width = Math.max(4, ((d.high - d.low) / span) * 100)
            return (
              <li
                key={`${d.day}-${i}`}
                className="grid h-9 grid-cols-[3rem_1.25rem_2.25rem_2rem_1fr_2rem] items-center gap-2"
              >
                <span className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg)">{d.day}</span>
                <ConditionIcon condition={d.condition} className="size-4" />
                <span className="text-[0.75rem]/[1rem] text-(color:--chatcn-blue) text-end tabular-nums">
                  {d.precip && d.precip >= 30 ? `${d.precip}%` : ""}
                </span>
                <span className="sr-only">
                  {d.condition ? `${LABELS[d.condition]}, ` : ""}low {deg(d.low)}, high{" "}
                  {deg(d.high)}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg-subtle) text-end tabular-nums"
                >
                  {deg(d.low)}
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
                        width >= 100 ? "0 0" : `${(left / (100 - width)) * 100}% 0`,
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
                <span aria-hidden="true" className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg) tabular-nums">
                  {deg(d.high)}
                </span>
              </li>
            )
          })}
        </ol>
      ) : null}
    </div>
  )
}

export default WeatherCard
