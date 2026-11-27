import { motion } from 'motion/react';
import type { AirQualitySnapshot } from '@shared/types';

interface AmbientWeatherBackdropProps {
  aqi: AirQualitySnapshot | null;
}

interface PaletteSpec {
  baseGradient: string;
  orbPrimary: string;
  orbSecondary: string;
  hazeTint: string;
  particleColor: string;
}

function getAtmosphericPalette(aqi: AirQualitySnapshot | null): PaletteSpec {
  const usAqi = aqi?.current.usAqi ?? 180;
  const code = aqi?.current.weatherCode ?? 45;
  const isRain = code >= 51 && code <= 86;

  if (isRain) {
    return {
      baseGradient: 'linear-gradient(160deg, #e2eef7 0%, #eef4f8 48%, #e5eceb 100%)',
      orbPrimary: 'rgba(14, 116, 144, 0.16)',
      orbSecondary: 'rgba(56, 189, 248, 0.14)',
      hazeTint: 'rgba(203, 213, 225, 0.45)',
      particleColor: '#0284c7',
    };
  }

  if (usAqi <= 50) {
    return {
      baseGradient: 'linear-gradient(155deg, #e0f2fe 0%, #f0fdf4 52%, #fefce8 100%)',
      orbPrimary: 'rgba(13, 148, 136, 0.14)',
      orbSecondary: 'rgba(250, 204, 21, 0.18)',
      hazeTint: 'rgba(255, 255, 255, 0.5)',
      particleColor: '#0d9488',
    };
  }

  if (usAqi <= 150) {
    return {
      baseGradient: 'linear-gradient(155deg, #fef3c7 0%, #f7f9f7 50%, #e0f2fe 100%)',
      orbPrimary: 'rgba(217, 119, 6, 0.14)',
      orbSecondary: 'rgba(15, 118, 110, 0.12)',
      hazeTint: 'rgba(254, 243, 199, 0.42)',
      particleColor: '#b45309',
    };
  }

  if (usAqi <= 250) {
    return {
      baseGradient: 'linear-gradient(160deg, #f5ebe0 0%, #efe9e2 48%, #e2e8f0 100%)',
      orbPrimary: 'rgba(194, 65, 12, 0.14)',
      orbSecondary: 'rgba(100, 116, 139, 0.16)',
      hazeTint: 'rgba(226, 217, 205, 0.55)',
      particleColor: '#c2410c',
    };
  }

  return {
    baseGradient: 'linear-gradient(165deg, #ede4e6 0%, #e7e4e8 50%, #dbe2ea 100%)',
    orbPrimary: 'rgba(159, 18, 57, 0.13)',
    orbSecondary: 'rgba(180, 83, 9, 0.13)',
    hazeTint: 'rgba(214, 208, 214, 0.55)',
    particleColor: '#9f1239',
  };
}

/**
 * Full-bleed atmospheric backdrop adapting softly to live Indian weather & AQI.
 * Keeps daylight readability with zero neon glare.
 */
export function AmbientWeatherBackdrop({ aqi }: AmbientWeatherBackdropProps) {
  const palette = getAtmosphericPalette(aqi);
  const code = aqi?.current.weatherCode ?? 45;
  const usAqi = aqi?.current.usAqi ?? 180;
  const isRain = code >= 51 && code <= 86;
  const isFoggy = code === 45 || code === 48 || usAqi > 150;
  const isClear = code === 0 && usAqi <= 150;
  const particleCount = Math.min(16, Math.max(4, Math.round((aqi?.current.pm25 ?? 100) / 18)));

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-colors duration-700"
      style={{ background: palette.baseGradient }}
    >
      {/* Top-Right Atmospheric Sun / Sky Glow */}
      <motion.div
        className="absolute -top-24 -right-20 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${palette.orbSecondary} 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.08, 1], opacity: isClear ? [0.85, 1, 0.85] : [0.65, 0.85, 0.65] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Bottom-Left Ground / Inversion Diffusion */}
      <motion.div
        className="absolute -bottom-32 -left-24 h-[460px] w-[520px] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${palette.orbPrimary} 0%, transparent 72%)`,
        }}
        animate={{ x: [0, 28, 0], y: [0, -16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Soft Horizon Inversion / Fog Ribbons */}
      {isFoggy && (
        <>
          <motion.div
            className="absolute inset-x-0 bottom-0 h-56 blur-2xl"
            style={{
              background: `linear-gradient(to top, ${palette.hazeTint}, transparent)`,
            }}
            animate={{ opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/3 -left-24 h-40 w-[130%] rounded-full blur-3xl"
            style={{ backgroundColor: palette.hazeTint }}
            animate={{ x: [-20, 25, -20] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* Subtle Rain Streaks when WMO weather_code indicates rain/showers */}
      {isRain && (
        <svg className="absolute inset-0 h-full w-full opacity-25">
          {Array.from({ length: 18 }).map((_, i) => {
            const xPct = (i * 5.7 + 3) % 98;
            return (
              <motion.line
                key={i}
                x1={`${xPct}%`}
                y1="-6%"
                x2={`${xPct - 1.5}%`}
                y2="4%"
                stroke="#0369a1"
                strokeWidth="1.2"
                strokeLinecap="round"
                animate={{ y: ['0vh', '108vh'] }}
                transition={{
                  duration: 1.4 + (i % 4) * 0.25,
                  delay: (i % 6) * 0.22,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            );
          })}
        </svg>
      )}

      {/* Subtle Floating Atmospheric Particulates / Air Motes */}
      <svg className="absolute inset-0 h-full w-full">
        {Array.from({ length: particleCount }).map((_, idx) => {
          const cx = `${(idx * 17 + 7) % 94}%`;
          const cy = `${(idx * 23 + 11) % 88}%`;
          return (
            <motion.circle
              key={idx}
              cx={cx}
              cy={cy}
              r={usAqi > 150 ? 2.8 : 2.1}
              fill={palette.particleColor}
              opacity={0.18}
              animate={{
                cy: [cy, `${((idx * 23 + 11) % 88) - 4}%`, cy],
                opacity: [0.1, 0.24, 0.1],
              }}
              transition={{
                duration: 5 + (idx % 4),
                delay: idx * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
