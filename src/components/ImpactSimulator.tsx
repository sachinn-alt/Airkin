import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  InfoCircle,
  People,
  ShieldDone,
  Swap,
  TickSquare,
  TimeCircle,
  Home,
} from 'react-iconly';
import { ACTION_CATALOG, WHO_PM25_24H_GUIDELINE } from '@shared/impactEngine';
import type { ChoiceCategory, HourlyAqiPoint, ImpactSummary } from '@shared/types';
import { AnimatedCounter, SpotlightCard } from './ui/AceternityPrimitives';

interface ImpactSimulatorProps {
  selectedActionIds: string[];
  onToggleAction: (id: string) => void;
  impact: ImpactSummary;
  hourly?: HourlyAqiPoint[];
}

const CATEGORY_META: Record<
  ChoiceCategory,
  { label: string; cls: string; icon: typeof Home }
> = {
  routine: { label: 'Routine', cls: 'bg-sky-50 text-sky-800 border-sky-200', icon: TimeCircle },
  indoor_hack: { label: 'Indoor', cls: 'bg-teal-50 text-teal-800 border-teal-200', icon: Home },
  sustainable_swap: { label: 'Swap', cls: 'bg-amber-50 text-amber-800 border-amber-200', icon: Swap },
  community: { label: 'Block', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: People },
};

export function ImpactSimulator({
  selectedActionIds,
  onToggleAction,
  impact,
  hourly = [],
}: ImpactSimulatorProps) {
  const [expandedInfoId, setExpandedInfoId] = useState<string | null>(null);
  const [blockSliderHomes, setBlockSliderHomes] = useState<number | null>(null);
  const [leaveHour, setLeaveHour] = useState(8);

  const effectiveHomes = blockSliderHomes ?? impact.communityBlockMultiplier.households;
  const scaledPm25Kg = Number(
    ((impact.weeklyPm25EmissionsSavedGrams * 14 * effectiveHomes) / 1000).toFixed(1)
  );
  const scaledCo2eTonnes = Number(
    ((impact.weeklyCo2eSavedKg * 14 * effectiveHomes) / 1000).toFixed(1)
  );

  const selectedHourPoint = hourly[leaveHour] ?? null;
  const safestHourPoint = hourly.length
    ? hourly.reduce((min, pt) => (pt.pm25 < min.pm25 ? pt : min), hourly[0])
    : null;
  const commuteShiftSavingsPct =
    selectedHourPoint && safestHourPoint && selectedHourPoint.pm25 > 0
      ? Math.max(
          0,
          Math.round(
            ((selectedHourPoint.pm25 - safestHourPoint.pm25) / selectedHourPoint.pm25) * 100
          )
        )
      : 0;

  const maxBar = Math.max(40, impact.outdoorPm25, impact.baselineIndoorPm25);
  const pctOf = (val: number) => Math.min(100, Math.max(4, Math.round((val / maxBar) * 100)));

  return (
    <section aria-labelledby="impact-sim-heading" className="space-y-4">
      {/* Top Interactive KPI Bento Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SpotlightCard className="p-3.5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldDone set="two-tone" size="small" primaryColor="#0f766e" />
              Indoor PM2.5
            </span>
            <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-bold text-teal-800">
              -<AnimatedCounter value={impact.indoorReductionPct} suffix="%" />
            </span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div>
              <div className="flex justify-between text-slate-500">
                <span>Outside</span>
                <span>{impact.outdoorPm25} µg/m³</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full bg-rose-600"
                  animate={{ width: `${pctOf(impact.outdoorPm25)}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-500">
                <span>Baseline Indoors</span>
                <span>{impact.baselineIndoorPm25} µg/m³</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full bg-amber-600"
                  animate={{ width: `${pctOf(impact.baselineIndoorPm25)}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold text-teal-800">
                <span>Protected Indoors</span>
                <span>
                  <AnimatedCounter value={impact.optimizedIndoorPm25} suffix=" µg/m³" />
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full bg-teal-600"
                  animate={{ width: `${pctOf(impact.optimizedIndoorPm25)}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            WHO 24h target: <strong className="text-sky-700">{WHO_PM25_24H_GUIDELINE} µg/m³</strong>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-3.5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800">Daily Dose Saved</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-teal-800">
                <AnimatedCounter value={impact.inhaledDoseSavedUg} suffix=" µg" />
              </span>
              <span className="text-xs font-bold text-teal-700">
                (-<AnimatedCounter value={impact.inhaledDoseSavedPct} suffix="%" />)
              </span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="text-sm font-bold text-slate-900">
                <AnimatedCounter value={impact.cigaretteEquivalentsAvoidedPerWeek} decimals={1} />
              </div>
              <div className="text-[10px] text-slate-500">cig-eq/wk avoided</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="text-sm font-bold text-amber-800">
                <AnimatedCounter value={impact.weeklyPm25EmissionsSavedGrams} suffix=" g" />
              </div>
              <div className="text-[10px] text-slate-500">PM2.5 cut/wk</div>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900">
              <People set="two-tone" size="small" primaryColor="#4338ca" />
              Community Multiplier ({effectiveHomes} homes)
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-3">
            <div>
              <span className="text-xl font-extrabold text-indigo-900">
                <AnimatedCounter value={scaledPm25Kg} decimals={1} suffix=" kg" />
              </span>
              <span className="ml-1 text-[10px] text-slate-500">PM2.5</span>
            </div>
            <div>
              <span className="text-xl font-extrabold text-teal-800">
                <AnimatedCounter value={scaledCo2eTonnes} decimals={1} suffix=" t" />
              </span>
              <span className="ml-1 text-[10px] text-slate-500">CO2e</span>
            </div>
          </div>
          <div>
            <label htmlFor="block-homes-slider" className="sr-only">
              Scale neighborhood homes
            </label>
            <input
              id="block-homes-slider"
              type="range"
              min={10}
              max={250}
              step={5}
              value={effectiveHomes}
              onChange={(e) => setBlockSliderHomes(Number(e.target.value))}
              className="w-full accent-indigo-700 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10 homes</span>
              <span>14-week winter scale</span>
              <span>250 homes</span>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Interactive School-Run & Commute Hour Explorer */}
      {hourly.length > 0 && selectedHourPoint && safestHourPoint && (
        <SpotlightCard className="p-3.5" contentClassName="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
              <TimeCircle set="two-tone" size="small" primaryColor="#0369a1" />
              Commute & School-Run Hour Exposure ({String(leaveHour).padStart(2, '0')}:00)
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">
                {selectedHourPoint.pm25} µg/m³ outdoor
              </span>
              <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 font-semibold text-teal-900">
                {commuteShiftSavingsPct > 0
                  ? `Shift to ${safestHourPoint.hourLabel} saves ${commuteShiftSavingsPct}%`
                  : 'Optimal hour selected'}
              </span>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, hourly.length - 1)}
            value={leaveHour}
            onChange={(e) => setLeaveHour(Number(e.target.value))}
            aria-label="Select commute or school-run departure hour"
            className="w-full accent-sky-700 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-500">
            <span>00:00 Midnight</span>
            <span>
              {selectedHourPoint.pm25 > 55
                ? 'N95 / KF94 recommended outdoors'
                : 'Standard outdoor precautions'}
            </span>
            <span>23:00 Night Peak</span>
          </div>
        </SpotlightCard>
      )}

      {/* Compact Interactive Choice Grid */}
      <SpotlightCard className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="impact-sim-heading" className="text-sm font-semibold text-slate-900">
            Toggle Habits & Hacks
          </h2>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
            {selectedActionIds.length} of {ACTION_CATALOG.length} choices active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ACTION_CATALOG.map((action) => {
            const checked = selectedActionIds.includes(action.id);
            const meta = CATEGORY_META[action.category];
            const CatIcon = meta.icon;
            const infoOpen = expandedInfoId === action.id;

            const impactChip =
              action.indoorPm25ReductionPct > 0
                ? `-${action.indoorPm25ReductionPct}% indoor`
                : action.weeklyCo2eSavedKg > 0
                  ? `-${action.weeklyCo2eSavedKg} kg CO2e/wk`
                  : `-${action.outdoorExposureReductionPct}% outdoor`;

            return (
              <div
                key={action.id}
                className={`rounded-xl border transition ${
                  checked
                    ? 'border-teal-400 bg-teal-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleAction(action.id)}
                    aria-pressed={checked}
                    className="flex flex-1 items-start gap-2.5 text-left cursor-pointer"
                  >
                    <span className="mt-0.5 shrink-0">
                      <TickSquare
                        set={checked ? 'bold' : 'light'}
                        size="small"
                        primaryColor={checked ? '#0f766e' : '#94a3b8'}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1 mb-0.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}
                        >
                          <CatIcon set="light" size={11} />
                          {meta.label}
                        </span>
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                          {impactChip}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 leading-snug">
                        {action.title}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedInfoId(infoOpen ? null : action.id)}
                    aria-expanded={infoOpen}
                    aria-label={`How ${action.shortLabel} works`}
                    className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-teal-700 cursor-pointer"
                  >
                    <InfoCircle set="light" size="small" />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {infoOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-200/70 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600">
                        <strong className="text-teal-800">Mechanism: </strong>
                        {action.impactMechanism}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </SpotlightCard>
    </section>
  );
}
