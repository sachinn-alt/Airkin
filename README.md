# SmogShield AI — Winter Smog & Clean-Air Family & Community Assistant

**SmogShield AI** is a full-stack GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. It combines live local air quality and meteorological data, thermal inversion risk scoring, an interactive indoor exposure & emission simulator, and context-aware AI recommendations that clearly quantify the direct impact of each choice.

---

## Chosen Vertical

**Severe Winter Smog & Urban Air Pollution — Family & Community Clean-Air Assistant**

Designed around two real-world personas:
1. **Family Household Mode**: Parents, caregivers, older adults, and individuals with asthma/COPD managing daily school runs, indoor air safety, cooking/heating choices, and budget-realistic filtration.
2. **Community Organizer Mode**: Neighborhood groups, resident associations, and school-zone coordinators organizing block-level zero-burn pledges, no-idling school drop-offs, and shared safe-ventilation alerts.

---

## Approach and Logic

Winter urban smog is physically distinct from summer pollution because **nocturnal and morning thermal inversions** act like an atmospheric lid, trapping ground-level exhaust, residential heating smoke, and open-fire particulates close to where people breathe.

SmogShield AI connects three core layers:

1. **Live Atmospheric & Inversion Analytics (`server/airQualityService.ts`)**
   - Geocodes any city worldwide via the Open-Meteo Geocoding API and fetches live `PM2.5`, `PM10`, `NO2`, `CO`, `SO2`, `O3`, `US AQI`, `European AQI`, temperature, humidity, and wind speed (with resilient offline winter-city presets if external network access is unavailable).
   - Computes a **Winter Thermal Inversion Trap Score (0–100)** from wind speed, ambient temperature, relative humidity, and PM2.5 concentration.
   - Scans the 24-hour hourly PM2.5 curve (`findVentilationWindow`) to pinpoint the **safest afternoon airing window** and **peak smog danger hour**.

2. **Transparent Indoor Mass-Balance & Emission Engine (`shared/impactEngine.ts`)**
   - Calculates baseline vs. protected indoor `PM2.5` using a single-compartment infiltration and indoor-source attenuation model parameterized by window sealing (`drafty`, `average`, `well_sealed`), existing filtration (`none`, `single_hepa`, `diy_corsi_rosenthal`), cooking fuel, and heating source.
   - Computes **daily household inhaled PM2.5 saved (`µg/day` and `%`)**, weekly cigarette-equivalents avoided per person, weekly primary `PM2.5` (`g/wk`) and `CO2e` (`kg/wk`) avoided, and a **Community Block Multiplier** (25 homes in Family Mode, 100 homes in Community Mode over a 14-week winter season).

3. **Context-Scored GenAI Synthesis (`server/advisorService.ts`)**
   - Scores every intervention dynamically against the household's vulnerabilities, budget tier, commute distance, heating/cooking fuel, and live thermal inversion severity (`scoreInterventionsForContext`).
   - When `GEMINI_API_KEY` is configured on the server (`.env`), uses Google's official `@google/genai` SDK (`gemini-2.5-flash`) with strict JSON schema output grounded in live environmental metrics and the mass-balance output.
   - When running without a server-side key, seamlessly runs the **SmogShield Atmospheric & Mass-Balance Model** (multi-factor priority scoring + weighted topic composition grounded in live data) with zero client-side key prompts (no BYOK).

---

## How the Solution Works

```text
[React + Vite UI] ──► GET  /api/health
                   ──► POST /api/plan   ──► Open-Meteo Geo + AQI + Weather (10m TTL cache)
                   ──► POST /api/chat   ──► scoreInterventionsForContext + calculateImpactSummary
                                        ──► Gemini 2.5 Flash (if server GEMINI_API_KEY set)
                                            or Deterministic Atmospheric Model
                   ◄── Instant <1ms client recalculation via shared/impactEngine.ts
```

### Key Features
- **Live City AQI & 24-Hour Smog Curve**: Interactive SVG chart highlighting the WHO 24h `15 µg/m³` guideline, inversion peak, and safe cross-ventilation window.
- **Household & Lifestyle Customizer**: Adjust household size, children/seniors/asthma flags, purifier setup, window sealing, heating/cooking fuels, commute mode & distance, and budget tier (`Zero-Cost`, `Low Cost ~$25–$60`, `Flexible`).
- **Interactive Choice & Direct Impact Simulator**: Toggle 8 evidence-based habits/hacks/swaps and watch indoor PM2.5, inhaled dose saved, and community emissions update instantaneously with mechanistic *"Why It Works"* explanations.
- **4-Pillar Tailored Action Plan + Shareable Community Briefing**: Actionable cards across *Low-Emission Daily Routines*, *Indoor Air Quality Hacks*, *Sustainable Alternatives*, and *Community Multiplier*, plus 1-click copyable neighborhood alert text.
- **Context-Aware AI Coach Chat**: Multi-turn assistant grounded in the user's live city AQI and home profile.

---

## Assumptions Made

- **Indoor Mass-Balance Infiltration**: Default winter building infiltration factors are modeled as `0.78` (drafty), `0.62` (average), and `0.45` (well-sealed) based on typical residential envelope literature; continuous indoor source additions are modeled as `26 µg/m³` (biomass/kerosene), `14 µg/m³` (gas stove), and `30 µg/m³` (wood/coal indoor heating leakage).
- **Respiratory Minute Volume**: Daily inhaled air volume per person is modeled at `13.8 m³/day` standard (`11.2 m³` indoor / `2.6 m³` outdoor) and `15.0 m³/day` when regular outdoor exercise is active.
- **Cigarette-Equivalent Benchmark**: Uses the Berkeley Earth equivalence (`22 µg/m³` 24-hour PM2.5 exposure ≈ 1 cigarette/day) as an intuitive communication metric.
- **Winter Season Length**: Community winter projections assume a `14-week` severe smog season.
- **External Data Dependency**: Live air quality relies on Open-Meteo's public API; when offline or unreachable, the backend gracefully switches to calibrated offline winter-city profiles.

---

## Getting Started

### Prerequisites
- Node.js `>= 20` and `npm`

### Installation & Local Run
```bash
npm install
cp .env.example .env
# Optional: set GEMINI_API_KEY in .env on the server to enable Gemini 2.5 Flash live generation
npm run dev
```
- Frontend runs at `http://localhost:5173`
- Backend API runs at `http://localhost:3001`

### Build & Tests
```bash
npm test
npm run build
```

---

## Security, Efficiency & Accessibility Highlights
- **Security**: Server-side-only `GEMINI_API_KEY` handling (no BYOK or client key transmission), strict input validation & clamping (`server/validation.ts`), security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), `100kb` payload limit, per-IP rate limiting on AI routes, and safe React text rendering (no `dangerouslySetInnerHTML`).
- **Efficiency**: 10-minute bounded TTL cache for Open-Meteo geocoding/AQI requests and shared `<1ms` client-side impact calculation.
- **Accessibility**: Semantic landmarks, keyboard skip link, `aria-live` announcements, `aria-pressed` stateful buttons, color + icon + text status badges, visible focus rings, and `prefers-reduced-motion` support.
