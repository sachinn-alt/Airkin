import { CheckCircle2, Circle, Info, Leaf, Shield, Users } from 'lucide-react';
import { ACTION_CATALOG, WHO_PM25_24H_GUIDELINE } from '@shared/impactEngine';
import type { ChoiceCategory, ImpactSummary } from '@shared/types';

interface ImpactSimulatorProps {
  selectedActionIds: string[];
  onToggleAction: (id: string) => void;
  impact: ImpactSummary;
}

const CATEGORY_BADGE: Record<ChoiceCategory, { label: string; cls: string }> = {
  routine: { label: 'Daily Routine', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  indoor_hack: { label: 'Indoor Air Hack', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  sustainable_swap: { label: 'Sustainable Swap', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  community: { label: 'Community', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
};

export function ImpactSimulator({
  selectedActionIds,
  onToggleAction,
  impact,
}: ImpactSimulatorProps) {
  const maxBar = Math.max(40, impact.outdoorPm25, impact.baselineIndoorPm25);
  const pctOf = (val: number) => Math.min(100, Math.max(4, Math.round((val / maxBar) * 100)));

  return (
    <section
      aria-labelledby="impact-sim-heading"
      className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="impact-sim-heading" className="text-base font-semibold text-slate-100">
            Interactive Choice & Direct Impact Simulator
          </h2>
          <p className="text-xs text-slate-400">
            Toggle habits, indoor air hacks, and low-emission swaps below to see exactly how your choices protect your lungs and lower neighborhood smog.
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          {selectedActionIds.length} of {ACTION_CATALOG.length} choices active
        </span>
      </div>

      {/* Live Quantified Impact Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
              <Shield className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              Indoor PM2.5 Exposure
            </span>
            <span className="font-bold text-emerald-300">-{impact.indoorReductionPct}%</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div>
              <div className="flex justify-between text-slate-400">
                <span>Outside Air</span>
                <span>{impact.outdoorPm25} µg/m³</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-rose-500" style={{ width: `${pctOf(impact.outdoorPm25)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-400">
                <span>Baseline Indoors</span>
                <span>{impact.baselineIndoorPm25} µg/m³</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${pctOf(impact.baselineIndoorPm25)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-emerald-300 font-medium">
                <span>With Your Choices</span>
                <span>{impact.optimizedIndoorPm25} µg/m³</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${pctOf(impact.optimizedIndoorPm25)}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            WHO 24h safe target: <strong className="text-sky-300">{WHO_PM25_24H_GUIDELINE} µg/m³</strong>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-slate-300">Daily Household Inhaled PM2.5 Saved</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-300">
                {impact.inhaledDoseSavedUg.toLocaleString()} µg
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                (-{impact.inhaledDoseSavedPct}%)
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Roughly <strong className="text-slate-200">{impact.cigaretteEquivalentsAvoidedPerWeek} fewer</strong>{' '}
              cigarette-equivalents/week inhaled per person (Berkeley Earth 22 µg/m³ benchmark).
            </p>
          </div>
          <div className="mt-2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 text-sky-400 mt-0.5" aria-hidden="true" />
            <span>{impact.vulnerabilityNote}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Leaf className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              Emissions Prevented (Your Home)
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <div>
                <span className="text-xl font-bold text-amber-300">
                  {impact.weeklyPm25EmissionsSavedGrams} g
                </span>
                <span className="ml-1 text-xs text-slate-400">PM2.5/wk</span>
              </div>
              <div>
                <span className="text-xl font-bold text-sky-300">{impact.weeklyCo2eSavedKg} kg</span>
                <span className="ml-1 text-xs text-slate-400">CO2e/wk</span>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-2 text-[11px] text-violet-200">
            <div className="flex items-center gap-1 font-semibold">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Community Multiplier ({impact.communityBlockMultiplier.households} homes)
            </div>
            <p className="mt-0.5 text-violet-100/90">
              Prevents <strong>{impact.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5</strong> and{' '}
              <strong>{impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} tonnes CO2e</strong> over a 14-week winter.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Toggle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ACTION_CATALOG.map((action) => {
          const checked = selectedActionIds.includes(action.id);
          const badge = CATEGORY_BADGE[action.category];

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onToggleAction(action.id)}
              aria-pressed={checked}
              className={`group rounded-xl border p-3.5 text-left transition cursor-pointer ${
                checked
                  ? 'border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-950'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  {checked ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-slate-600 group-hover:text-slate-400 mt-0.5" aria-hidden="true" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300">
                        {action.costLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100">{action.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                    <p className="mt-2 rounded-lg bg-slate-900/90 px-2.5 py-1.5 text-[11px] text-slate-300 border border-slate-800/80">
                      <strong className="text-emerald-300">Why it works: </strong>
                      {action.impactMechanism}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
