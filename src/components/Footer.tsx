import { Heart, Location, ShieldDone } from 'react-iconly';

export type FooterPage = 'overview' | 'simulator' | 'community';

interface FooterProps {
  onNavigate: (page: FooterPage) => void;
  onSelectCity: (city: string) => void;
}

const FEATURED_CITIES = ['Delhi', 'Lucknow', 'Srinagar', 'Jammu', 'Mumbai', 'Bengaluru'];

/**
 * Editorial light-to-hills footer with 4-column navigation, rolling misty green hills backdrop,
 * and oversized AirKin display wordmark anchored at the bottom edge.
 */
export function Footer({ onNavigate, onSelectCity }: FooterProps) {
  const goPage = (page: FooterPage) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goCity = (city: string) => {
    onSelectCity(city);
    onNavigate('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative mt-10 overflow-hidden bg-[#f3f3ef] text-slate-800 border-t border-slate-200/70">
      {/* Scenic Rolling Misty Hills Backdrop along the lower half */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] overflow-hidden"
      >
        <svg
          viewBox="0 0 1440 420"
          preserveAspectRatio="xMidYMax slice"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="ak-footer-mist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3f3ef" stopOpacity="1" />
              <stop offset="32%" stopColor="#f5eed8" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#d9dfbd" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="ak-hill-far" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d7dfba" />
              <stop offset="100%" stopColor="#b9c993" />
            </linearGradient>
            <linearGradient id="ak-hill-mid" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#9ab06b" />
              <stop offset="100%" stopColor="#728c47" />
            </linearGradient>
            <linearGradient id="ak-hill-near" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%" stopColor="#5d793b" />
              <stop offset="50%" stopColor="#425d2c" />
              <stop offset="100%" stopColor="#354d26" />
            </linearGradient>
            <radialGradient id="ak-sun-glow" cx="52%" cy="38%" r="42%">
              <stop offset="0%" stopColor="#fff8df" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#f5e6bf" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f3f3ef" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="1440" height="420" fill="url(#ak-footer-mist)" />
          <circle cx="750" cy="180" r="320" fill="url(#ak-sun-glow)" />

          {/* Far soft ridgeline */}
          <path
            d="M0,210 C150,155 290,190 460,150 C585,120 630,96 710,128 C820,170 960,135 1130,175 C1270,208 1365,180 1440,195 L1440,420 L0,420 Z"
            fill="url(#ak-hill-far)"
          />

          {/* Sunlit mid hills */}
          <path
            d="M0,255 C160,185 330,240 500,205 C640,175 745,122 865,155 C1015,196 1160,175 1315,210 L1440,235 L1440,420 L0,420 Z"
            fill="url(#ak-hill-mid)"
            opacity="0.9"
          />

          {/* Closer rolling meadow ridge */}
          <path
            d="M0,215 C140,250 280,295 450,285 C630,275 765,208 935,235 C1100,262 1275,215 1440,265 L1440,420 L0,420 Z"
            fill="url(#ak-hill-near)"
            opacity="0.92"
          />

          {/* Soft golden valley mist between ridges */}
          <ellipse cx="640" cy="245" rx="460" ry="65" fill="#faf5df" opacity="0.46" />
          <ellipse cx="1040" cy="285" rx="340" ry="48" fill="#f7f2dc" opacity="0.28" />

          {/* Small soaring bird silhouette above ridge */}
          <path
            d="M842,138 C850,126 862,126 868,134 C875,125 889,124 897,132 C885,134 876,140 870,148 C862,140 852,138 842,138 Z"
            fill="#3e4738"
            opacity="0.72"
          />
        </svg>
      </div>

      {/* Upper Editorial Content Grid */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-10 sm:pb-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Summary + Pill CTA */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                <ShieldDone set="bold" size="small" primaryColor="#ffffff" />
              </span>
              <span className="text-sm font-bold tracking-tight text-slate-900">AirKin</span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Your family’s calm smog shield
              </h2>
              <p className="max-w-xs text-xs leading-relaxed text-slate-600">
                Live Indian CPCB AQI, 24-hour inversion forecasting, household clean-air
                simulations, and Gemini guidance across India.
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => goPage('simulator')}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition cursor-pointer"
              >
                <ShieldDone set="light" size={14} primaryColor="#ffffff" />
                <span>Launch Impact Simulator</span>
              </button>
            </div>

            <div className="pt-2 space-y-1 text-[11px] text-slate-600">
              <p>© 2026 AirKin · CPCB NAQI & Open-Meteo</p>
              <p className="inline-flex items-center gap-1 font-medium text-slate-700">
                <span>Built with</span>
                <Heart set="bold" size={12} primaryColor="#0d9488" />
                <span>for cleaner air across India</span>
              </p>
            </div>
          </div>

          {/* 3 Clean Link Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div className="space-y-2.5">
              <h3 className="font-semibold text-slate-900">Menu</h3>
              <ul className="space-y-2 text-slate-700">
                <li>
                  <button
                    type="button"
                    onClick={() => goPage('overview')}
                    className="hover:text-slate-950 transition cursor-pointer"
                  >
                    Live Smog & Plan
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => goPage('simulator')}
                    className="hover:text-slate-950 transition cursor-pointer"
                  >
                    Impact Simulator
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => goPage('community')}
                    className="hover:text-slate-950 transition cursor-pointer"
                  >
                    RWA & Hindi Guide
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('overview');
                      document
                        .getElementById('india-live-feed-section')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-slate-950 transition cursor-pointer"
                  >
                    All-India Map
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h3 className="font-semibold text-slate-900">Cities</h3>
              <ul className="space-y-2 text-slate-700">
                {FEATURED_CITIES.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => goCity(c)}
                      className="inline-flex items-center gap-1 hover:text-slate-950 transition cursor-pointer"
                    >
                      <Location set="light" size={11} primaryColor="#64748b" />
                      <span>{c}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2.5">
              <h3 className="font-semibold text-slate-900">Resources</h3>
              <ul className="space-y-2 text-slate-700">
                <li>
                  <a
                    href="https://github.com/sachinn-alt/Airkin"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-950 transition"
                  >
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a
                    href="https://open-meteo.com/en/docs/air-quality-api"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-950 transition"
                  >
                    Open-Meteo API
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => goPage('community')}
                    className="hover:text-slate-950 transition cursor-pointer"
                  >
                    CPCB NAQI Scale
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => goPage('overview')}
                    className="hover:text-slate-950 transition cursor-pointer"
                  >
                    Gemini Flash Engine
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Oversized Bottom Edge Wordmark */}
      <div
        aria-hidden="true"
        className="relative z-10 mx-auto max-w-7xl overflow-hidden px-3 pt-2 select-none pointer-events-none"
      >
        <div className="text-center font-black tracking-[-0.045em] text-[24vw] sm:text-[170px] md:text-[215px] lg:text-[255px] leading-[0.76] text-[#f3f3ef]/92">
          AirKin
        </div>
      </div>
    </footer>
  );
}
