import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Danger,
  Document,
  Home,
  InfoCircle,
  People,
  Star,
  Swap,
  TickSquare,
  TimeCircle,
} from 'react-iconly';
import type { RecommendationCard, TailoredPlanResponse } from '@shared/types';
import { SpotlightCard } from './ui/AceternityPrimitives';

interface PlanCardsProps {
  plan: TailoredPlanResponse | null;
  isLoading: boolean;
  planError: string | null;
}

const CATEGORY_META: Record<
  RecommendationCard['category'],
  { label: string; icon: typeof TimeCircle; accent: string; iconColor: string }
> = {
  routine: {
    label: 'Routine',
    icon: TimeCircle,
    accent: 'border-sky-200 bg-sky-50 text-sky-800',
    iconColor: '#0369a1',
  },
  indoor_hack: {
    label: 'Indoor Hack',
    icon: Home,
    accent: 'border-teal-200 bg-teal-50 text-teal-800',
    iconColor: '#0f766e',
  },
  sustainable_swap: {
    label: 'Eco Swap',
    icon: Swap,
    accent: 'border-amber-200 bg-amber-50 text-amber-800',
    iconColor: '#b45309',
  },
  community: {
    label: 'Community',
    icon: People,
    accent: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    iconColor: '#4338ca',
  },
};

export function PlanCards({ plan, isLoading, planError }: PlanCardsProps) {
  const [copied, setCopied] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});
  const [openWhyId, setOpenWhyId] = useState<string | null>(null);

  if (isLoading && !plan) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-5 w-4/5 rounded bg-slate-200" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-5/6 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (planError && !plan) {
    return (
      <section
        aria-labelledby="ai-plan-status"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3"
      >
        <Danger set="two-tone" size="medium" primaryColor="#b45309" />
        <div>
          <h2 id="ai-plan-status" className="text-sm font-semibold text-amber-900">
            Gemini Action Plan Unavailable
          </h2>
          <p className="text-xs text-amber-800">{planError}</p>
        </div>
      </section>
    );
  }

  if (!plan) return null;

  const toggleStep = (key: string) => {
    setDoneSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyBriefing = async () => {
    const summaryLines = [
      `AirKin Plan — ${plan.headline}`,
      ...plan.recommendations.map(
        (r, i) => `${i + 1}. ${r.title} (${r.directImpactHeadline})`
      ),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summaryLines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="ai-plan-heading" className="space-y-3">
      {/* Compact Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Star set="two-tone" size="small" primaryColor="#0f766e" />
          <h2 id="ai-plan-heading" className="text-sm font-bold text-slate-900 truncate">
            {plan.headline}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyBriefing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-teal-400 hover:bg-teal-50 transition cursor-pointer"
          >
            {copied ? (
              <TickSquare set="bold" size={14} primaryColor="#0f766e" />
            ) : (
              <Document set="light" size={14} primaryColor="#475569" />
            )}
            <span>{copied ? 'Copied' : 'Share Alert'}</span>
          </button>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-800">
            {plan.modelUsed}
          </span>
        </div>
      </div>

      {/* 2x2 Interactive Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plan.recommendations.map((rec) => {
          const meta = CATEGORY_META[rec.category] ?? CATEGORY_META.routine;
          const Icon = meta.icon;
          const isWhyOpen = openWhyId === rec.id;

          return (
            <SpotlightCard key={rec.id} className="p-3.5 flex flex-col justify-between h-full">
              <article className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${meta.accent}`}
                    >
                      <Icon set="two-tone" size={14} primaryColor={meta.iconColor} />
                      {meta.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenWhyId(isWhyOpen ? null : rec.id)}
                      aria-expanded={isWhyOpen}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-teal-800 cursor-pointer"
                    >
                      <InfoCircle set="light" size={13} />
                      <span>Why</span>
                    </button>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">{rec.title}</h3>

                  {/* Interactive Checkable Steps */}
                  <div className="space-y-1.5">
                    {rec.steps.slice(0, 3).map((step, idx) => {
                      const key = `${rec.id}-${idx}`;
                      const checked = Boolean(doneSteps[key]);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleStep(key)}
                          aria-pressed={checked}
                          className={`w-full flex items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] transition cursor-pointer ${
                            checked
                              ? 'border-teal-200 bg-teal-50/60 text-slate-500 line-through'
                              : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-slate-200'
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">
                            <TickSquare
                              set={checked ? 'bold' : 'light'}
                              size={13}
                              primaryColor={checked ? '#0f766e' : '#94a3b8'}
                            />
                          </span>
                          <span className="leading-snug">{step}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-semibold text-teal-900">
                    {rec.directImpactHeadline}
                  </div>

                  <AnimatePresence initial={false}>
                    {isWhyOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <p className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-[11px] text-slate-600">
                          {rec.scienceWhy}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </article>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
}
