import { motion } from 'motion/react';
import type { AirQualitySnapshot } from '@shared/types';

interface AmbientWeatherBackdropProps {
  aqi: AirQualitySnapshot | null;
}

interface PaletteSpec {
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  cloudPrimary: string;
  cloudWarm: string;
  hazeTint: string;
  particleColor: string;
}

function getPaletteForConditions(aqi: AirQualitySnapshot | null): PaletteSpec {
  const usAqi = aqi?.current.usAqi ?? 160;
  const code = aqi?.current.weatherCode ?? 45;
  const isRain = code >= 51 && code <= 86;

  if (isRain) {
    return {
      skyTop: '#7cbab4',
      skyMid: '#bddfd4',
      skyHorizon: '#e5efe4',
      cloudPrimary: '#dbeee8',
      cloudWarm: '#cddfdc',
      hazeTint: 'rgba(203, 213, 225, 0.28)',
      particleColor: '#e0f2fe',
    };
  }

  if (usAqi <= 100) {
    return {
      skyTop: '#7dc5aa',
      skyMid: '#c4e6c7',
      skyHorizon: '#f8e6bd',
      cloudPrimary: '#e3efd3',
      cloudWarm: '#f6d8b8',
      hazeTint: 'rgba(255, 255, 255, 0.1)',
      particleColor: '#fef3c7',
    };
  }

  if (usAqi <= 200) {
    return {
      skyTop: '#8cc6ab',
      skyMid: '#d0e3c3',
      skyHorizon: '#f7deb4',
      cloudPrimary: '#e8ebd0',
      cloudWarm: '#f4cda8',
      hazeTint: 'rgba(254, 243, 199, 0.2)',
      particleColor: '#fde68a',
    };
  }

  return {
    skyTop: '#90bfb0',
    skyMid: '#d5dec2',
    skyHorizon: '#f2d3ad',
    cloudPrimary: '#e9e4cd',
    cloudWarm: '#efc39e',
    hazeTint: 'rgba(241, 224, 206, 0.28)',
    particleColor: '#fed7aa',
  };
}

interface PineProps {
  x: number;
  y: number;
  scale?: number;
  fill: string;
}

function PineTree({ x, y, scale = 1, fill }: PineProps) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} fill={fill}>
      <path d="M0,-220 C6,-185 20,-155 34,-135 L16,-137 C28,-112 44,-90 58,-72 L24,-75 C38,-48 56,-22 72,2 L26,-2 C44,24 62,48 78,74 L-78,74 C-62,48 -44,24 -26,-2 L-72,2 C-56,-22 -38,-48 -24,-75 L-58,-72 C-44,-90 -28,-112 -16,-137 L-34,-135 C-20,-155 -6,-185 0,-220 Z" />
    </g>
  );
}

/**
 * Full-bleed illustrated mountain valley & pine forest backdrop inspired by sunlit alpine meadows,
 * winding valley road, and layered evergreens, with subtle atmospheric response to live AQI/weather.
 */
export function AmbientWeatherBackdrop({ aqi }: AmbientWeatherBackdropProps) {
  const palette = getPaletteForConditions(aqi);
  const code = aqi?.current.weatherCode ?? 45;
  const usAqi = aqi?.current.usAqi ?? 160;
  const isRain = code >= 51 && code <= 86;
  const isFoggy = code === 45 || code === 48 || usAqi > 175;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0e3933]"
    >
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="ak-valley-sky" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={palette.skyTop} />
            <stop offset="52%" stopColor={palette.skyMid} />
            <stop offset="100%" stopColor={palette.skyHorizon} />
          </linearGradient>
          <linearGradient id="ak-road-surface" x1="0.4" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#d89d3a" />
            <stop offset="55%" stopColor="#bf8328" />
            <stop offset="100%" stopColor="#9b661c" />
          </linearGradient>
          <linearGradient id="ak-foreground-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f3f35" stopOpacity="0" />
            <stop offset="100%" stopColor="#08241e" stopOpacity="0.48" />
          </linearGradient>
        </defs>

        {/* 1. Luminous Sky Gradient */}
        <rect width="1600" height="900" fill="url(#ak-valley-sky)" />

        {/* Soft Illustrated Clouds (Top-Left & Top-Right Corners Frame Header cleanly) */}
        <g opacity="0.92">
          <path
            d="M-30,110 C25,52 105,62 145,84 C185,40 265,48 292,94 C342,84 398,108 418,148 L-30,165 Z"
            fill={palette.cloudPrimary}
          />
          <path
            d="M70,132 C122,96 196,102 232,126 C270,92 332,96 360,128 C392,122 426,136 444,164 L40,175 Z"
            fill={palette.cloudWarm}
            opacity="0.78"
          />
          <path
            d="M1190,115 C1245,64 1338,68 1384,96 C1428,46 1518,48 1564,96 L1630,118 L1630,180 L1150,180 Z"
            fill={palette.cloudWarm}
            opacity="0.82"
          />
          <path
            d="M1275,92 C1325,44 1408,48 1452,78 C1496,38 1568,42 1620,86 L1620,150 L1240,150 Z"
            fill={palette.cloudPrimary}
            opacity="0.72"
          />
        </g>

        {/* 2. Far Distant Misty Mountain Horizon */}
        <path
          d="M0,290 L135,205 L245,235 L395,180 L550,248 L720,192 L875,246 L1045,172 L1200,224 L1370,155 L1600,220 L1600,480 L0,480 Z"
          fill="#2d836b"
          opacity="0.65"
        />
        <path
          d="M0,330 L190,225 L340,295 L535,230 L685,295 L860,260 L1030,295 L1215,212 L1410,275 L1600,190 L1600,520 L0,520 Z"
          fill="#1b675b"
        />

        {/* 3. Hero Twin-Peak Valley Mountains (Deep Teal Shadows + Sunlit Green Meadow Slopes) */}
        {/* Left Hero Ridge */}
        <path
          d="M-20,520 L-20,310 L175,220 L440,104 L695,280 L845,355 L845,620 L-20,620 Z"
          fill="#124e48"
        />
        {/* Left Ridge Sunlit Meadow Slopes */}
        <path
          d="M440,104 L685,274 L630,312 L595,260 L542,272 L495,220 L452,256 L402,216 L360,274 L305,230 L272,275 L195,242 L262,190 L372,155 Z"
          fill="#5eb23b"
        />
        <path
          d="M440,104 L535,176 L502,212 L464,195 L446,245 L408,200 L355,228 L392,154 Z"
          fill="#78c443"
        />
        <path
          d="M462,258 L552,298 L515,342 L442,315 L370,352 L322,312 L396,268 Z"
          fill="#2b7e4f"
          opacity="0.88"
        />
        {/* Left Foothill Shelf */}
        <path
          d="M-20,420 L255,335 L580,418 L770,455 L750,650 L-20,650 Z"
          fill="#165748"
        />
        <path
          d="M210,360 L495,412 L640,468 L410,492 L180,455 Z"
          fill="#4ca038"
          opacity="0.72"
        />

        {/* Right Hero Ridge */}
        <path
          d="M780,340 L945,255 L1175,92 L1425,138 L1620,65 L1620,640 L760,640 Z"
          fill="#13524a"
        />
        {/* Right Ridge Sunlit Meadow Facets */}
        <path
          d="M1175,92 L1295,120 L1412,175 L1338,248 L1272,215 L1215,288 L1158,245 L1110,305 L1060,270 L996,315 L955,268 L1075,180 Z"
          fill="#5fb33b"
        />
        <path
          d="M1175,92 L1255,148 L1218,195 L1172,172 L1132,235 L1085,192 L1130,132 Z"
          fill="#7bc644"
        />
        <path
          d="M1590,82 L1470,192 L1382,255 L1462,285 L1545,220 L1610,210 Z"
          fill="#4da039"
          opacity="0.86"
        />
        {/* Right Rolling Valley Foothills */}
        <path
          d="M670,425 C825,368 995,330 1195,295 C1355,268 1485,225 1620,185 L1620,900 L660,900 Z"
          fill="#1c6449"
        />
        <path
          d="M685,435 C835,425 995,392 1210,350 C1380,318 1510,290 1620,275 L1620,560 L710,560 Z"
          fill="#4b9c39"
          opacity="0.78"
        />

        {/* 4. Winding Golden-Ochre Valley Meadow & Perspective Road */}
        {/* Central Meadow Basin */}
        <path
          d="M0,560 C240,515 470,490 735,442 C960,402 1250,435 1600,520 L1600,900 L0,900 Z"
          fill="#1e6645"
        />
        <path
          d="M420,900 C490,740 595,620 710,515 C765,465 815,430 855,412 C885,445 945,515 1030,615 C1125,725 1195,820 1245,900 Z"
          fill="#418e36"
        />

        {/* Winding Sunlit Road */}
        <path
          d="M842,402 C795,438 725,472 722,508 C718,548 875,582 995,668 C1105,748 1135,830 1075,900 L425,900 C585,848 865,785 872,705 C880,620 672,562 688,505 C700,462 785,428 836,400 Z"
          fill="url(#ak-road-surface)"
        />
        {/* Subtle Warm Center Track Highlight */}
        <path
          d="M838,408 C792,442 732,475 732,508 C732,542 868,588 965,672 C1048,744 1038,828 925,900 L565,900 C745,848 920,782 912,702 C904,615 702,558 708,506 C714,464 785,432 835,405 Z"
          fill="#dfaa46"
          opacity="0.34"
        />
        {/* Crisp Left/Right Shoulder Ribbons */}
        <path
          d="M838,402 C785,432 706,466 696,506 C684,562 885,622 878,706 C872,786 600,848 455,900 L478,900 C625,848 892,786 898,706 C905,620 704,560 714,506 C722,468 794,435 840,404 Z"
          fill="#f2c46d"
          opacity="0.4"
        />

        {/* 5. Layered Left & Right Evergreen Pine Forests */}
        {/* Mid-ground Left Pines */}
        <g>
          <PineTree x={95} y={485} scale={0.78} fill="#144b3c" />
          <PineTree x={210} y={475} scale={0.68} fill="#185742" />
          <PineTree x={320} y={505} scale={0.56} fill="#1b5e46" />
          <PineTree x={155} y={595} scale={1.15} fill="#0f3c31" />
          <PineTree x={38} y={660} scale={1.35} fill="#0c3128" />
          <PineTree x={285} y={675} scale={0.96} fill="#124536" />
          <PineTree x={425} y={635} scale={0.66} fill="#195942" />
          <PineTree x={515} y={615} scale={0.48} fill="#216849" />
          <PineTree x={115} y={845} scale={1.55} fill="#08241e" />
          <PineTree x={355} y={865} scale={1.25} fill="#0b2d25" />
        </g>

        {/* Mid-ground & Foreground Right Pines */}
        <g>
          <PineTree x={1510} y={465} scale={0.82} fill="#14493b" />
          <PineTree x={1395} y={470} scale={0.65} fill="#185742" />
          <PineTree x={1270} y={500} scale={0.52} fill="#1d6247" />
          <PineTree x={1445} y={615} scale={1.25} fill="#0e382e" />
          <PineTree x={1565} y={675} scale={1.4} fill="#0a2c24" />
          <PineTree x={1305} y={685} scale={0.98} fill="#114133" />
          <PineTree x={1175} y={645} scale={0.62} fill="#1a5842" />
          <PineTree x={1095} y={625} scale={0.44} fill="#236b4a" />
          <PineTree x={1495} y={850} scale={1.55} fill="#08241e" />
          <PineTree x={1265} y={870} scale={1.28} fill="#0b2d25" />
        </g>

        {/* Subtle Bottom Vignette & Soft AQI/Fog Horizon Veil */}
        <rect width="1600" height="900" fill="url(#ak-foreground-shade)" />
        {isFoggy && (
          <motion.rect
            x="0"
            y="180"
            width="1600"
            height="340"
            fill={palette.hazeTint}
            animate={{ opacity: [0.35, 0.72, 0.35] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Delicate Rain Streaks when live weather_code indicates rain */}
        {isRain && (
          <g opacity="0.28">
            {Array.from({ length: 20 }).map((_, i) => {
              const x = (i * 83 + 25) % 1580;
              return (
                <motion.line
                  key={i}
                  x1={x}
                  y1={-40}
                  x2={x - 24}
                  y2={35}
                  stroke="#e0f2fe"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  animate={{ y: [0, 960] }}
                  transition={{
                    duration: 1.35 + (i % 4) * 0.2,
                    delay: (i % 5) * 0.25,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              );
            })}
          </g>
        )}

        {/* Subtle Sunlight Dust Motes above Valley */}
        {Array.from({ length: 10 }).map((_, idx) => {
          const cx = 140 + ((idx * 139) % 1320);
          const cy = 110 + ((idx * 97) % 340);
          return (
            <motion.circle
              key={idx}
              cx={cx}
              cy={cy}
              r={usAqi > 150 ? 2.6 : 2}
              fill={palette.particleColor}
              animate={{ cy: [cy, cy - 18, cy], opacity: [0.14, 0.36, 0.14] }}
              transition={{
                duration: 5.5 + (idx % 4),
                delay: idx * 0.35,
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
