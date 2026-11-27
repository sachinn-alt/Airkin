import { Check, Copy, BookOpen, Hammer, Megaphone, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { AirQualitySnapshot, HouseholdProfile, ImpactSummary } from '@shared/types';

interface CommunityGuideProps {
  aqi: AirQualitySnapshot | null;
  profile: HouseholdProfile;
  impact: ImpactSummary;
}

export function CommunityGuide({ aqi, profile, impact }: CommunityGuideProps) {
  const [copied, setCopied] = useState(false);

  const city = aqi?.city ?? profile.city;
  const usAqi = aqi?.current.usAqi ?? 200;
  const pm25 = aqi?.current.pm25 ?? impact.outdoorPm25;
  const winStart = aqi?.ventilationWindow.bestStartHour ?? '14:00';
  const winEnd = aqi?.ventilationWindow.bestEndHour ?? '16:00';
  const peakHour = aqi?.ventilationWindow.peakHour ?? '23:00';

  const rwaBriefing = [
    `AirKin Neighborhood Clean-Air Alert — ${city}`,
    `Today's US AQI: ${usAqi} (PM2.5: ${pm25} µg/m³)`,
    `Safe Window Airing: ${winStart}–${winEnd} only | Avoid opening windows around ${peakHour}`,
    `3 Block Actions Today:`,
    `1) School/Gate No-Idling: Switch off engines while waiting outside gates.`,
    `2) Zero Evening Leaf/Waste Fires: Evening thermal inversions trap smoke until morning.`,
    `3) Clean Room Focus: Wet-mop floors and run HEPA / MERV-13 Corsi-Rosenthal filtration.`,
    `Impact if ${impact.communityBlockMultiplier.households} homes join: ${impact.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5 & ${impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} tonnes CO2e prevented this winter.`,
  ].join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rwaBriefing);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Shareable Community Briefing */}
      <section
        aria-labelledby="community-briefing-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <div>
              <h2 id="community-briefing-heading" className="text-base font-semibold text-slate-900">
                RWA & School-Group Clean-Air Briefing ({city})
              </h2>
              <p className="text-xs text-slate-600">
                Copy this daily advisory directly into apartment, resident welfare association (RWA), or parent groups.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy Neighborhood Alert</span>
              </>
            )}
          </button>
        </div>

        <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 font-sans">
          {rwaBriefing}
        </pre>
      </section>

      {/* Practical Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section
          aria-labelledby="diy-cr-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2">
            <Hammer className="h-4 w-4 text-amber-700" aria-hidden="true" />
            <h3 id="diy-cr-heading" className="text-sm font-semibold text-slate-900">
              Budget DIY Corsi-Rosenthal Filter Box
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Achieves 400–600 CFM Clean Air Delivery Rate (CADR) for bedrooms at a fraction of commercial HEPA cost.
          </p>
          <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-700">
            <li>Source four pleated MERV-13 filters (20×20×1 in) and one standard 20-inch box fan.</li>
            <li>Arrange filters in a 4-sided square cube with airflow arrows pointing inward.</li>
            <li>Seal all vertical seams and a cardboard bottom plate tightly with wide duct tape.</li>
            <li>Mount the box fan on top blowing upward and seal corners so air pulls strictly through the filters.</li>
          </ol>
        </section>

        <section
          aria-labelledby="science-basis-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-700" aria-hidden="true" />
            <h3 id="science-basis-heading" className="text-sm font-semibold text-slate-900">
              Scientific Model & Assumptions
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Indoor Mass Balance:</strong> Penetration factors of 0.78 (drafty), 0.62 (average), and 0.45 (well-sealed) combined with indoor combustion baselines.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Health Benchmarks:</strong> WHO 24h PM2.5 guideline (15 µg/m³) and Berkeley Earth 22 µg/m³ cigarette-equivalent scale.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Indian Winter Season:</strong> Projections model a 14-week peak winter inversion season across {impact.communityBlockMultiplier.households} households.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
