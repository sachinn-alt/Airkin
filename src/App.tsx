import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CloudFog,
  Cpu,
  MapPin,
  Search,
  ShieldAlert,
  Thermometer,
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
import { ImpactSimulator } from './components/ImpactSimulator';
import { PlanCards } from './components/PlanCards';
import { ProfilePanel } from './components/ProfilePanel';
import { SmogChart } from './components/SmogChart';

const QUICK_CITIES = ['Lahore', 'Delhi', 'Beijing', 'Salt Lake City', 'Sarajevo', 'London'];

const INITIAL_PROFILE: HouseholdProfile = {
  city: 'Lahore',
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
  emerald: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  amber: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  orange: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  red: 'border-red-500/40 bg-red-500/15 text-red-300',
  purple: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  rose: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
};

export default function App() {
  const [profile, setProfile] = useState<HouseholdProfile>(INITIAL_PROFILE);
  const [cityInput, setCityInput] = useState('Lahore');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <a
        href="#main-dashboard"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-emerald-500 focus:px-3 focus:py-2 focus:text-slate-950 focus:font-semibold"
      >
        Skip to main dashboard
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
              <CloudFog className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">AirKin</h1>
              <p className="text-[11px] text-slate-400">
                Winter Smog Navigation, Indoor Air Hacks & Community Impact Assistant
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleCitySearch} className="flex items-center gap-1.5">
              <label htmlFor="city-search-input" className="sr-only">
                Search city for live air quality
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
                  placeholder="Enter city..."
                  className="w-44 sm:w-52 rounded-xl border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 transition cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Check</span>
              </button>
            </form>

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium ${
                geminiActive
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {geminiActive ? 'Gemini Flash Active' : 'Server GEMINI_API_KEY Required'}
              </span>
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 mr-1">Winter hotspots:</span>
          {QUICK_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleSelectQuickCity(c)}
              className={`rounded-full border px-2.5 py-0.5 transition cursor-pointer ${
                aqi?.city.toLowerCase() === c.toLowerCase()
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-medium'
                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <main id="main-dashboard" className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-xs text-rose-200 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {aqi && (
          <section
            aria-label="Current Local Air Quality and Thermal Inversion Status"
            className="grid grid-cols-1 lg:grid-cols-12 gap-4"
          >
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/75 p-4 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">
                    {aqi.city}
                    {aqi.country ? `, ${aqi.country}` : ''} ·{' '}
                    <span className="text-slate-500">
                      {aqi.source === 'open-meteo-live'
                        ? 'Live Open-Meteo Feed'
                        : 'Offline Winter Profile'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2.5">
                    <span className="text-4xl font-extrabold tracking-tight text-white">
                      {aqi.current.usAqi}
                    </span>
                    <span className="text-xs font-medium text-slate-400">US AQI</span>
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

              <p className="text-xs text-slate-300">{aqi.severity.summary}</p>

              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                  <div className="text-[10px] text-slate-400">PM2.5</div>
                  <div className="text-sm font-bold text-amber-300">{aqi.current.pm25}</div>
                  <div className="text-[10px] text-slate-500">µg/m³</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                  <div className="text-[10px] text-slate-400">PM10</div>
                  <div className="text-sm font-bold text-slate-200">{aqi.current.pm10}</div>
                  <div className="text-[10px] text-slate-500">µg/m³</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                    <Thermometer className="h-3 w-3" aria-hidden="true" /> Temp
                  </div>
                  <div className="text-sm font-bold text-sky-300">{aqi.current.temperatureC}°C</div>
                  <div className="text-[10px] text-slate-500">{aqi.current.humidityPct}% RH</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                    <Wind className="h-3 w-3" aria-hidden="true" /> Wind
                  </div>
                  <div className="text-sm font-bold text-emerald-300">
                    {aqi.current.windSpeedKmh}
                  </div>
                  <div className="text-[10px] text-slate-500">km/h</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Winter Thermal Inversion Trap</span>
                  <span className="font-bold text-amber-300">
                    {aqi.inversionRisk.label} ({aqi.inversionRisk.score}/100)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{aqi.inversionRisk.explanation}</p>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-between gap-3">
              <SmogChart
                hourly={aqi.hourly}
                ventilationWindow={aqi.ventilationWindow}
                city={aqi.city}
              />
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
                <strong>Ventilation Advisory: </strong>
                {aqi.ventilationWindow.advisory}
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-5">
            <ProfilePanel
              profile={profile}
              onChange={setProfile}
              onRegeneratePlan={() => void loadCityAndPlan(profile, selectedActionIds)}
              isLoadingPlan={isLoadingPlan}
            />
            <AdvisorChat
              city={aqi?.city ?? profile.city}
              messages={messages}
              onSendMessage={handleSendMessage}
              isSending={isSendingChat}
            />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <ImpactSimulator
              selectedActionIds={selectedActionIds}
              onToggleAction={handleToggleAction}
              impact={liveImpact}
            />
            <PlanCards plan={plan} isLoading={isLoadingPlan} planError={planError} />
          </div>
        </div>
      </main>
    </div>
  );
}
