import { AlertCircle, Check, Copy, Clock, Home, Leaf, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import type { RecommendationCard, TailoredPlanResponse } from '@shared/types';

interface PlanCardsProps {
  plan: TailoredPlanResponse | null;
  isLoading: boolean;
  planError: string | null;
}

const CATEGORY_META: Record<
  RecommendationCard['category'],
  { label: string; icon: typeof Clock; accent: string }
> = {
  routine: {
    label: 'Low-Emission Daily Routine',
    icon: Clock,
    accent: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  },
  indoor_hack: {
    label: 'Indoor Air Quality Hack',
    icon: Home,
    accent: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  sustainable_swap: {
    label: 'Sustainable Alternative',
    icon: Leaf,
    accent: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  community: {
    label: 'Community Multiplier',
    icon: Users,
    accent: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  },
};

export function PlanCards({ plan, isLoading, planError }: PlanCardsProps) {
  const [copied, setCopied] = useState(false);

  if (isLoading && !plan) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
        Generating personalized Gemini Flash winter smog action plan...
      </div>
    );
  }

  if (planError && !plan) {
    return (
      <section
        aria-labelledby="ai-plan-status"
        className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5 space-y-2"
      >
        <div className="flex items-center gap-2 text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <h2 id="ai-plan-status" className="text-sm font-semibold">
            Gemini Action Plan Unavailable
          </h2>
        </div>
        <p className="text-xs text-amber-100/90">{planError}</p>
        <p className="text-[11px] text-amber-200/75">
          Live air quality tracking, thermal inversion scoring, and the interactive mass-balance impact simulator above remain fully operational.
        </p>
      </section>
    );
  }

  if (!plan) return null;

  const handleCopyBriefing = async () => {
    const summaryLines = [
      `🌫️ ${plan.headline}`,
      plan.situationSummary,
      '',
      ...plan.recommendations.map(
        (r, i) => `${i + 1}. ${r.title} (${r.directImpactHeadline})\n   • ${r.steps[0]}`
      ),
      '',
      `👥 Block Impact (${plan.impactSummary.communityBlockMultiplier.households} homes): Prevents ${plan.impactSummary.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5 & ${plan.impactSummary.communityBlockMultiplier.seasonCo2eAvoidedTonnes} t CO2e this winter.`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summaryLines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="ai-plan-heading" className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h2 id="ai-plan-heading" className="text-base font-semibold text-slate-100">
              {plan.headline}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBriefing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-emerald-500/50 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Copied Briefing</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span>Share Community Alert</span>
                </>
              )}
            </button>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
              AI: {plan.modelUsed}
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-300">{plan.situationSummary}</p>
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {plan.riskAlert}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plan.recommendations.map((rec) => {
          const meta = CATEGORY_META[rec.category] ?? CATEGORY_META.routine;
          const Icon = meta.icon;

          return (
            <article
              key={rec.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-medium ${meta.accent}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {meta.label}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">{rec.timingOrEffort}</span>
                </div>

                <h3 className="text-sm font-semibold text-slate-100">{rec.title}</h3>

                <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                  {rec.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 border-t border-slate-800/80 pt-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <div className="text-xs font-semibold text-emerald-300">
                    Direct Impact: {rec.directImpactHeadline}
                  </div>
                  <p className="mt-0.5 text-[11px] text-emerald-100/85">{rec.directImpactDetail}</p>
                </div>
                <p className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Mechanism: </strong>
                  {rec.scienceWhy}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500">{plan.disclaimer}</p>
    </section>
  );
}
