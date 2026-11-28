import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Chart,
  Danger,
  Discovery,
  Filter,
  Location,
  People,
  Search,
  ShieldDone,
} from 'react-iconly';
import {
  calculateImpactSummary,
  getDefaultSelectedActionIds,
} from '@shared/impactEngine';
import type {
  AirQualitySnapshot,
  ChatMessage,
  HouseholdProfile,
  IndiaLiveFeedResponse,
  TailoredPlanResponse,
} from '@shared/types';
import { AdvisorChat } from './components/AdvisorChat';
import { AmbientWeatherBackdrop } from './components/AmbientWeatherBackdrop';
import { CommunityGuide } from './components/CommunityGuide';
import { Footer } from './components/Footer';
import { ImpactSimulator } from './components/ImpactSimulator';
import { CPCB_CITY_STYLES, IndiaLiveFeed } from './components/IndiaLiveFeed';
import { PlanCards } from './components/PlanCards';
import { ProfilePanel } from './components/ProfilePanel';
import { SmogChart } from './components/SmogChart';
import { WeatherVisualScene } from './components/WeatherVisualScene';
import { AnimatedCounter, AqiGaugeRing, SpotlightCard } from './components/ui/AceternityPrimitives';
import { WeatherCard } from './components/ui/weather-card';
import { buildWeatherCardProps } from './lib/weatherMapper';

type AppPage = 'overview' | 'simulator' | 'community';

const QUICK_CITIES = [
  'Delhi',
  'Gurugram',
  'Noida',
  'Lucknow',
  'Patna',
  'Mumbai',
  'Bengaluru',
  'Kolkata',
];

const INITIAL_PROFILE: HouseholdProfile = {
  city: 'Delhi',
  role: 'family',
  householdSize: 4,
  hasChildren: true,
  hasSeniors: false,
  hasRespiratoryCondition: true,
  commuteMode: 'solo_car',
  commuteKmRoundTrip: 16,
  heatingSource: 'gas_heater',
  cookingFuel: 'gas_stove',
  purifierType: 'none',
  homeSealLevel: 'average',
  outdoorExerciseHabit: true,
  budgetTier: 'low_budget',
};

const SEVERITY_BADGE_STYLES: Record<AirQualitySnapshot['severity']['colorToken'], string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  orange: 'border-orange-200 bg-orange-50 text-orange-800',
  red: 'border-red-200 bg-red-50 text-red-800',
  purple: 'border-purple-200 bg-purple-50 text-purple-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
};

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>('overview');
  const [profile, setProfile] = useState<HouseholdProfile>(INITIAL_PROFILE);
  const [cityInput, setCityInput] = useState('Delhi');
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>(() =>
    getDefaultSelectedActionIds(INITIAL_PROFILE)
  );
  const [aqi, setAqi] = useState<AirQualitySnapshot | null>(null);
  const [indiaFeed, setIndiaFeed] = useState<IndiaLiveFeedResponse | null>(null);
  const [plan, setPlan] = useState<TailoredPlanResponse | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [geminiActive, setGeminiActive] = useState(false);

  const loadCityAndPlan = useCallback(
    async (nextProfile: HouseholdProfile, actions: string[]) => {
      setIsLoadingPlan(true);
      setErrorMsg(null);
      setPlanError(null);
      try {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: nextProfile,
            selectedActionIds: actions,
          }),
        });
        const data = (await res.json()) as {
          aqi?: AirQualitySnapshot;
          plan?: TailoredPlanResponse;
          error?: string;
        };
        if (res.status === 400 && !data.aqi) {
          setErrorMsg(data.error || 'Please enter a valid Indian city.');
          return;
        }
        if (data.aqi) {
          setAqi(data.aqi);
        }
        if (res.ok && data.plan) {
          setPlan(data.plan);
        } else {
          setPlan(null);
          setPlanError(data.error || `AI request failed (${res.status}).`);
        }
      } catch {
        setErrorMsg('Could not reach the AirKin API server. Make sure the backend is running.');
      } finally {
        setIsLoadingPlan(false);
      }
    },
    []
  );

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { geminiConfiguredOnServer?: boolean }) => {
        setGeminiActive(Boolean(d.geminiConfiguredOnServer));
      })
      .catch(() => {});

    fetch('/api/india-feed')
      .then((r) => r.json())
      .then((feed: IndiaLiveFeedResponse) => {
        if (Array.isArray(feed.cities)) setIndiaFeed(feed);
      })
      .catch(() => {});

    void loadCityAndPlan(INITIAL_PROFILE, getDefaultSelectedActionIds(INITIAL_PROFILE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCitySearch = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = cityInput.trim();
    if (!cleaned) return;
    const updated = { ...profile, city: cleaned };
    setProfile(updated);
    void loadCityAndPlan(updated, selectedActionIds);
  };

  const handleSelectQuickCity = (city: string) => {
    setCityInput(city);
    const updated = { ...profile, city };
    setProfile(updated);
    void loadCityAndPlan(updated, selectedActionIds);
  };

  const handleToggleAction = (id: string) => {
    setSelectedActionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendMessage = async (question: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          profile,
          selectedActionIds,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        mode?: 'gemini-live';
      };

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || data.error || 'Unable to respond right now.',
        timestamp: new Date().toISOString(),
        mode: data.mode,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Network error contacting the AirKin AI service.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const liveImpact = useMemo(
    () => calculateImpactSummary(profile, aqi?.current.pm25 ?? 120, selectedActionIds),
    [profile, aqi?.current.pm25, selectedActionIds]
  );

  const navItems: Array<{ id: AppPage; label: string; icon: typeof Discovery }> = [
    { id: 'overview', label: 'Live Smog & Daily Plan', icon: Discovery },
    { id: 'simulator', label: 'Household & Impact Simulator', icon: Filter },
    { id: 'community', label: 'Community & Guide', icon: People },
  ];

  return (
    <div className="relative min-h-screen text-slate-900">
      <AmbientWeatherBackdrop aqi={aqi} />

      <div className="relative z-10 flex min-h-screen flex-col">
      <a
        href="#main-dashboard"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-teal-700 focus:px-3 focus:py-2 focus:text-white focus:font-semibold"
      >
        Skip to main dashboard
      </a>

      {/* Compact Floating Pill Header matching scenic valley aesthetic */}
      <header className="sticky top-0 z-30 px-3 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-b-3xl border-x border-b border-emerald-950/10 bg-white/95 backdrop-blur-md shadow-md">
          <div className="px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
              <ShieldDone set="two-tone" size="small" />
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">AirKin</h1>
              <p className="text-[10px] text-slate-500">All-India Winter Smog Assistant</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleCitySearch} className="flex items-center gap-1.5">
              <label htmlFor="city-search-input" className="sr-only">
                Search Indian city for live air quality
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-2 text-slate-400">
                  <Location set="light" size={14} />
                </span>
                <input
                  id="city-search-input"
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Any Indian city..."
                  className="w-40 sm:w-48 rounded-xl border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              >
                <Search set="light" size={14} />
                <span>Go</span>
              </button>
            </form>

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium ${
                geminiActive
                  ? 'border-teal-200 bg-teal-50 text-teal-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <Activity set="two-tone" size={14} />
              <span>
                {geminiActive ? 'Gemini Flash Active' : 'Server GEMINI_API_KEY Required'}
              </span>
            </span>
          </div>
        </div>

          {/* Color-Coded City Pills + Animated Motion Page Switcher */}
          <div className="px-4 sm:px-5 pb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {QUICK_CITIES.map((c) => {
              const active = aqi?.city.toLowerCase() === c.toLowerCase();
              const feedCity = indiaFeed?.cities.find(
                (fc) => fc.city.toLowerCase() === c.toLowerCase()
              );
              const colorStyle = feedCity
                ? CPCB_CITY_STYLES[feedCity.cpcbColorToken]
                : null;

              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelectQuickCity(c)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 transition cursor-pointer ${
                    colorStyle
                      ? colorStyle.card
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  } ${active ? 'ring-2 ring-slate-900 font-bold' : 'font-medium'}`}
                >
                  {colorStyle && <span className={`h-2 w-2 rounded-full ${colorStyle.dot}`} />}
                  <span>{c}</span>
                  {feedCity && (
                    <span className="text-[10px] opacity-80 font-semibold">
                      {feedCity.indianAqi}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <nav
            aria-label="AirKin Views"
            className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePage(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    active ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="active-page-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-teal-700"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <Icon
                      set={active ? 'bold' : 'light'}
                      size={14}
                      primaryColor={active ? '#ffffff' : '#475569'}
                    />
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
        </div>
      </header>

      <main id="main-dashboard" className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 space-y-4">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-center gap-2"
          >
            <Danger set="two-tone" size="small" primaryColor="#be123c" />
            <span>{errorMsg}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* PAGE 1: LIVE SMOG, VISUAL WEATHER SCENE, ALL-INDIA FEED & DAILY PLAN */}
          {activePage === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {aqi && (
                <section
                  aria-label="Current Local Air Quality and Thermal Inversion Status"
                  className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
                >
                  {/* Col 1-4: AQI Ring Gauge + Metrics */}
                  <SpotlightCard
                    className="lg:col-span-4 p-4 h-full"
                    contentClassName="justify-between gap-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <AqiGaugeRing
                        aqi={aqi.current.usAqi}
                        label={aqi.severity.label}
                        colorToken={aqi.severity.colorToken}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate font-medium text-slate-700">
                            {aqi.city}, India
                          </span>
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                            {aqi.source === 'open-meteo-live' ? 'Live' : 'Preset'}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold ${
                            SEVERITY_BADGE_STYLES[aqi.severity.colorToken]
                          }`}
                        >
                          <Chart set="two-tone" size={13} />
                          {aqi.severity.label}
                        </span>
                        <div className="text-[11px] text-slate-600">
                          India CPCB: <strong className="text-slate-900">{aqi.current.indianAqi ?? aqi.current.usAqi}</strong> ({aqi.current.cpcbCategory ?? aqi.severity.label}) · RH {aqi.current.humidityPct}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 px-1">
                        <div className="text-[10px] text-slate-500">PM2.5</div>
                        <div className="text-xs font-bold text-amber-800">
                          <AnimatedCounter value={aqi.current.pm25} decimals={1} />
                        </div>
                        <div className="text-[9px] text-slate-400">µg/m³</div>
                      </div>
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 px-1">
                        <div className="text-[10px] text-slate-500">PM10</div>
                        <div className="text-xs font-bold text-slate-800">
                          <AnimatedCounter value={aqi.current.pm10} decimals={1} />
                        </div>
                        <div className="text-[9px] text-slate-400">µg/m³</div>
                      </div>
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 px-1">
                        <div className="text-[10px] text-slate-500">Temp</div>
                        <div className="text-xs font-bold text-sky-800">
                          {aqi.current.temperatureC}°C
                        </div>
                        <div className="text-[9px] text-slate-400">ambient</div>
                      </div>
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 py-2 px-1">
                        <div className="text-[10px] text-slate-500">Wind</div>
                        <div className="text-xs font-bold text-teal-800">
                          {aqi.current.windSpeedKmh}
                        </div>
                        <div className="text-[9px] text-slate-400">km/h</div>
                      </div>
                    </div>

                    {/* Inversion Trap Meter */}
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-700">Thermal Inversion Cap</span>
                        <span className="font-bold text-amber-800">
                          {aqi.inversionRisk.label} · {aqi.inversionRisk.score}/100
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <motion.div
                          className="h-full bg-amber-600"
                          animate={{ width: `${aqi.inversionRisk.score}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-2.5 py-2">
                        <div className="text-[10px] text-teal-700 font-medium">Indoor Target</div>
                        <div className="text-sm font-extrabold text-teal-900">
                          <AnimatedCounter value={liveImpact.optimizedIndoorPm25} suffix=" µg/m³" />
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-2">
                        <div className="text-[10px] text-slate-500 font-medium">Dose Saved</div>
                        <div className="text-sm font-extrabold text-slate-900">
                          -<AnimatedCounter value={liveImpact.inhaledDoseSavedPct} suffix="%" />
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>

                  {/* Col 5-8: Interactive Visual Weather & Air Quality Scene */}
                  <div className="lg:col-span-4">
                    <WeatherVisualScene aqi={aqi} impact={liveImpact} />
                  </div>

                  {/* Col 9-12: 24h Smog Curve */}
                  <div className="lg:col-span-4">
                    <SmogChart
                      hourly={aqi.hourly}
                      ventilationWindow={aqi.ventilationWindow}
                      city={aqi.city}
                    />
                  </div>
                </section>
              )}

              {/* All-India Live Weather & Smog Feed */}
              <div id="india-live-feed-section">
                <IndiaLiveFeed
                  feed={indiaFeed}
                  activeCity={aqi?.city ?? profile.city}
                  onSelectCity={handleSelectQuickCity}
                />
              </div>

              <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-4">
                  <WeatherCard
                    {...buildWeatherCardProps(aqi)}
                    loading={!aqi}
                    className="rounded-2xl border border-white/80 bg-white/95 backdrop-blur-md shadow-md"
                  />
                </div>
                <div className="lg:col-span-8">
                  <PlanCards plan={plan} isLoading={isLoadingPlan} planError={planError} />
                </div>
              </section>
            </motion.div>
          )}

          {/* PAGE 2: HOUSEHOLD PROFILE & IMPACT SIMULATOR */}
          {activePage === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
            >
              <div className="lg:col-span-4">
                <ProfilePanel
                  profile={profile}
                  onChange={setProfile}
                  onRegeneratePlan={() => {
                    void loadCityAndPlan(profile, selectedActionIds);
                    setActivePage('overview');
                  }}
                  isLoadingPlan={isLoadingPlan}
                />
              </div>
              <div className="lg:col-span-8">
                <ImpactSimulator
                  selectedActionIds={selectedActionIds}
                  onToggleAction={handleToggleAction}
                  impact={liveImpact}
                  hourly={aqi?.hourly}
                />
              </div>
            </motion.div>
          )}

          {/* PAGE 3: COMMUNITY ACTION & METHODOLOGY */}
          {activePage === 'community' && (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <CommunityGuide aqi={aqi} profile={profile} impact={liveImpact} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer onNavigate={setActivePage} onSelectCity={handleSelectQuickCity} />

      {/* Hovering Floating Ask AirKin Coach */}
      <AdvisorChat
        city={aqi?.city ?? profile.city}
        messages={messages}
        onSendMessage={handleSendMessage}
        isSending={isSendingChat}
      />
      </div>
    </div>
  );
}
