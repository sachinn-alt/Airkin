import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Danger, Discovery, Filter, People } from 'react-iconly';
import { AdvisorChat } from './components/AdvisorChat';
import { AmbientWeatherBackdrop } from './components/AmbientWeatherBackdrop';
import { Footer } from './components/Footer';
import { OverviewSection } from './components/OverviewSection';
import { AirKinMark } from './components/ui/AirKinMark';
import { useAirKinData } from './hooks/useAirKinData';

type AppPage = 'overview' | 'simulator' | 'community';

const LazyProfilePanel = lazy(() =>
  import('./components/ProfilePanel').then((m) => ({ default: m.ProfilePanel }))
);
const LazyImpactSimulator = lazy(() =>
  import('./components/ImpactSimulator').then((m) => ({ default: m.ImpactSimulator }))
);
const LazyCommunityGuide = lazy(() =>
  import('./components/CommunityGuide').then((m) => ({ default: m.CommunityGuide }))
);

const NAV_ITEMS: Array<{ id: AppPage; label: string; icon: typeof Discovery }> = [
  { id: 'overview', label: 'Live Smog & Daily Plan', icon: Discovery },
  { id: 'simulator', label: 'Household & Impact Simulator', icon: Filter },
  { id: 'community', label: 'Community & Guide', icon: People },
];

/**
 * Top-level AirKin shell orchestrating navigation across the three views,
 * atmospheric backdrop, editorial footer, and hovering Coach dialog.
 */
export default function App() {
  const [activePage, setActivePage] = useState<AppPage>('overview');
  const {
    profile,
    setProfile,
    selectedActionIds,
    aqi,
    indiaFeed,
    plan,
    planError,
    messages,
    isLoadingPlan,
    isSendingChat,
    errorMsg,
    geminiActive,
    liveImpact,
    loadCityAndPlan,
    handleSelectCity,
    handleToggleAction,
    handleSendMessage,
  } = useAirKinData();

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

        {/* Single-Row Floating Pill Header */}
        <header className="sticky top-0 z-30 px-3 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-b-3xl border-x border-b border-emerald-950/10 bg-white/95 backdrop-blur-md shadow-md">
            <div className="px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 shrink-0">
                <AirKinMark className="h-8 w-8 shrink-0 rounded-xl shadow-xs" />
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-slate-900">AirKin</h1>
                  <p className="text-[10px] text-slate-600">All-India Winter Smog Assistant</p>
                </div>
              </div>

              <nav
                aria-label="AirKin Views"
                className="order-3 lg:order-none w-full lg:w-auto flex justify-center"
              >
                <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActivePage(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                          active ? 'text-white' : 'text-slate-700 hover:text-slate-900'
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
                            primaryColor={active ? '#ffffff' : '#334155'}
                          />
                          <span>{item.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <span
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium ${
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
            {activePage === 'overview' && (
              <OverviewSection
                aqi={aqi}
                liveImpact={liveImpact}
                indiaFeed={indiaFeed}
                activeCity={aqi?.city ?? profile.city}
                plan={plan}
                isLoadingPlan={isLoadingPlan}
                planError={planError}
                onSelectCity={handleSelectCity}
              />
            )}

            {activePage === 'simulator' && (
              <motion.div
                key="simulator"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
              >
                <Suspense
                  fallback={
                    <div className="lg:col-span-12 h-48 animate-pulse rounded-2xl border border-white/80 bg-white/90 p-4" />
                  }
                >
                  <div className="lg:col-span-4">
                    <LazyProfilePanel
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
                    <LazyImpactSimulator
                      selectedActionIds={selectedActionIds}
                      onToggleAction={handleToggleAction}
                      impact={liveImpact}
                      hourly={aqi?.hourly}
                    />
                  </div>
                </Suspense>
              </motion.div>
            )}

            {activePage === 'community' && (
              <motion.div
                key="community"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <Suspense
                  fallback={
                    <div className="h-48 animate-pulse rounded-2xl border border-white/80 bg-white/90 p-4" />
                  }
                >
                  <LazyCommunityGuide aqi={aqi} profile={profile} impact={liveImpact} />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Footer onNavigate={setActivePage} onSelectCity={handleSelectCity} />

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
