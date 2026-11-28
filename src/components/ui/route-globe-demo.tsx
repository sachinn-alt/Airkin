"use client";

import { RouteGlobe, type GlobeTheme } from "@/components/ui/route-globe";

const NIGHT: GlobeTheme = {
  ground: "#06080d",
  land: "#9fb4d6",
  arc: "#ffb547",
  glow: "rgb(90 140 255 / 0.18)",
  text: "#eef2fb",
  muted: "#7c8aa5",
};

export default function RouteGlobeDemo() {
  return (
    <div
      className="relative h-screen min-h-full w-full"
      style={{ background: NIGHT.ground, color: NIGHT.text }}
    >
      <RouteGlobe theme={NIGHT} className="!absolute inset-0" />
      <div className="pointer-events-none absolute left-6 top-6">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.16em]"
          style={{ color: NIGHT.muted }}
        >
          From Muscat · 10 routes
        </p>
        <p className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]">
          Where we fly this winter
        </p>
      </div>
    </div>
  );
}
