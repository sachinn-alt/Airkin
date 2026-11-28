"use client"

import * as React from "react"
import { WeatherCard, type WeatherCardProps } from "@/components/ui/weather-card"

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

const RESUME_MS = 1800

function useCycle<T>(values: readonly T[], ms: number) {
  const [index, setIndex] = React.useState(0)
  const [heldAt] = React.useState(0)
  React.useEffect(() => {
    if (reducedMotion()) return
    let id = 0
    const start = () => {
      id = window.setInterval(() => setIndex((n) => (n + 1) % values.length), ms)
    }
    const wait = window.setTimeout(start, heldAt ? RESUME_MS : 0)
    return () => {
      window.clearTimeout(wait)
      window.clearInterval(id)
    }
  }, [heldAt, values.length, ms])
  return [values[index] as T] as const
}

const CITIES: WeatherCardProps[] = [
  {
    location: "Delhi",
    updated: "Updated 14:05",
    temp: 13,
    condition: "fog",
    high: 19,
    low: 9,
    feelsLike: 12,
    humidity: 74,
    wind: "4 km/h",
    hourly: [
      { time: "Now", temp: 13, condition: "fog" },
      { time: "15:00", temp: 18, condition: "partly-cloudy" },
      { time: "16:00", temp: 19, condition: "partly-cloudy" },
      { time: "17:00", temp: 17, condition: "fog" },
      { time: "18:00", temp: 14, condition: "fog" },
    ],
    daily: [
      { day: "Today", condition: "fog", low: 9, high: 19 },
      { day: "Thu", condition: "partly-cloudy", low: 10, high: 20 },
      { day: "Fri", condition: "fog", low: 8, high: 18 },
      { day: "Sat", condition: "clear", low: 9, high: 21 },
    ],
  },
]

export default function WeatherCardPreview() {
  const [city] = useCycle(CITIES, 1800)
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 p-6">
      <div className="w-full max-w-md">
        <WeatherCard {...city} />
      </div>
    </div>
  )
}
