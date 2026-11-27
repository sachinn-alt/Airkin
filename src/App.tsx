import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CloudFog,
  Compass,
  Cpu,
  MapPin,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Thermometer,
  Users,
  Wind,
} from 'lucide-react';
import {
  calculateImpactSummary,
  getDefaultSelectedActionIds,
} from '@shared/impactEngine';
import type {
  AirQualitySnapshot,
  ChatMessage,
  HouseholdProfile,
  TailoredPlanResponse,
} from '@shared/types';
import { AdvisorChat } from './components/AdvisorChat';
import { CommunityGuide } from './components/CommunityGuide';
import { ImpactSimulator } from './components/ImpactSimulator';
import { PlanCards } from './components/PlanCards';
import { ProfilePanel } from './components/ProfilePanel';
import { SmogChart } from './components/SmogChart';

type AppPage = 'overview' | 'simulator' | 'community';

const QUICK_CITIES = [
  'Delhi',
  'Gurugram',
  'Noida',
  'Lucknow',
  'Patna',
  'Kanpur',
  'Jaipur',
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

  const navItems: Array<{ id: AppPage; label: string; icon: typeof Compass }> = [
    { id: 'overview', label: 'Live Smog & Daily Plan', icon: Compass },
    { id: 'simulator', label: 'Household & Impact Simulator', icon: SlidersHorizontal },
    { id: 'community', label: 'Community & Guide', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 pb-24">
      <a
        href="#main-dashboard"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-teal-700 focus:px-3 focus:py-2 focus:text-white focus:font-semibold"
      >
        Skip to main dashboard
      </a>

      {/* Clean Light Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
              <CloudFog className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">AirKin</h1>
              <p className="text-[11px] text-slate-500">
                Indian Winter Smog & Clean-Air Family Assistant
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleCitySearch} className="flex items-center gap-1.5">
              <label htmlFor="city-search-input" className="sr-only">
                Search Indian city for live air quality
              </label>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="city-search-input"
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Search Indian city..."
                  className="w-44 sm:w-52 rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200 transition cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Check</span>
              </button>
            </form>

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium ${
                geminiActive
                  ? 'border-teal-200 bg-teal-50 text-teal-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {geminiActive ? 'Gemini Flash Active' : 'Server GEMINI_API_KEY Required'}
              </span>
            </span>
          </div>
        </div>

        {/* City Chips + 3-Page Navigation */}
        <div className="mx-auto max-w-6xl px-4 pb-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 mr-1">Indian winter hotspots:</span>
            {QUICK_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSelectQuickCity(c)}
                className={`rounded-full border px-2.5 py-0.5 transition cursor-pointer ${
                  aqi?.city.toLowerCase() === c.toLowerCase()
                    ? 'border-teal-600 bg-teal-50 text-teal-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <nav aria-label="AirKin Views" className="flex flex-wrap gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePage(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main id="main-dashboard" className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PAGE 1: LIVE SMOG & DAILY PLAN */}
        {activePage === 'overview' && (
          <div className="space-y-6">
            {aqi && (
              <section
                aria-label="Current Local Air Quality and Thermal Inversion Status"
                className="grid grid-cols-1 lg:grid-cols-12 gap-4"
              >
                <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">
                        {aqi.city}, India ·{' '}
                        <span className="text-slate-400">
                          {aqi.source === 'open-meteo-live'
                            ? 'Live Open-Meteo Feed'
                            : 'Offline Indian Profile'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2.5">
                        <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                          {aqi.current.usAqi}
                        </span>
                        <span className="text-xs font-medium text-slate-500">US AQI</span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                        SEVERITY_BADGE_STYLES[aqi.severity.colorToken]
                      }`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      {aqi.severity.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{aqi.severity.summary}</p>

                  <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <div className="text-[10px] text-slate-500">PM2.5</div>
                      <div className="text-sm font-bold text-amber-800">{aqi.current.pm25}</div>
                      <div className="text-[10px] text-slate-500">µg/m³</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <div className="text-[10px] text-slate-500">PM10</div>
                      <div className="text-sm font-bold text-slate-800">{aqi.current.pm10}</div>
                      <div className="text-[10px] text-slate-500">µg/m³</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
                        <Thermometer className="h-3 w-3" aria-hidden="true" /> Temp
                      </div>
                      <div className="text-sm font-bold text-sky-800">{aqi.current.temperatureC}°C</div>
                      <div className="text-[10px] text-slate-500">{aqi.current.humidityPct}% RH</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
                        <Wind className="h-3 w-3" aria-hidden="true" /> Wind
                      </div>
                      <div className="text-sm font-bold text-teal-800">
                        {aqi.current.windSpeedKmh}
                      </div>
                      <div className="text-[10px] text-slate-500">km/h</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        Winter Thermal Inversion Trap
                      </span>
                      <span className="font-bold text-amber-800">
                        {aqi.inversionRisk.label} ({aqi.inversionRisk.score}/100)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{aqi.inversionRisk.explanation}</p>
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-col justify-between gap-3">
                  <SmogChart
                    hourly={aqi.hourly}
                    ventilationWindow={aqi.ventilationWindow}
                    city={aqi.city}
                  />
                  <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs text-teal-900">
                    <strong>Ventilation Advisory: </strong>
                    {aqi.ventilationWindow.advisory}
                  </div>
                </div>
              </section>
            )}

            <PlanCards plan={plan} isLoading={isLoadingPlan} planError={planError} />
          </div>
        )}

        {/* PAGE 2: HOUSEHOLD PROFILE & IMPACT SIMULATOR */}
        {activePage === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
              />
            </div>
          </div>
        )}

        {/* PAGE 3: COMMUNITY ACTION & METHODOLOGY */}
        {activePage === 'community' && (
          <CommunityGuide aqi={aqi} profile={profile} impact={liveImpact} />
        )}
      </main>

      {/* Hovering Floating Ask AirKin Coach */}
      <AdvisorChat
        city={aqi?.city ?? profile.city}
        messages={messages}
        onSendMessage={handleSendMessage}
        isSending={isSendingChat}
      />
    </div>
  );
}
