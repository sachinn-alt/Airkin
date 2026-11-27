import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Document,
  InfoCircle,
  People,
  ShieldDone,
  TickSquare,
  Work,
} from 'react-iconly';
import type { AirQualitySnapshot, HouseholdProfile, ImpactSummary } from '@shared/types';
import { AnimatedCounter, SpotlightCard } from './ui/AceternityPrimitives';

interface CommunityGuideProps {
  aqi: AirQualitySnapshot | null;
  profile: HouseholdProfile;
  impact: ImpactSummary;
}

const DIY_STEPS = [
  '4 pleated MERV-13 filters (20×20×1 in) + 1 20" box fan',
  'Tape filters into a cube (arrows pointing inward)',
  'Seal cardboard bottom + vertical corners with duct tape',
  'Mount fan on top blowing up; run in bedroom overnight',
];

export function CommunityGuide({ aqi, profile, impact }: CommunityGuideProps) {
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [checkedDiy, setCheckedDiy] = useState<Record<number, boolean>>({});
  const [showModelMath, setShowModelMath] = useState(false);

  const city = aqi?.city ?? profile.city;
  const indianAqi = aqi?.current.indianAqi ?? aqi?.current.usAqi ?? 220;
  const cpcbCat = aqi?.current.cpcbCategory ?? 'Poor';
  const pm25 = aqi?.current.pm25 ?? impact.outdoorPm25;
  const winStart = aqi?.ventilationWindow.bestStartHour ?? '14:00';
  const winEnd = aqi?.ventilationWindow.bestEndHour ?? '16:00';
  const peakHour = aqi?.ventilationWindow.peakHour ?? '23:00';

  const rwaBriefing =
    lang === 'hi'
      ? [
          `AirKin मोहल्ला स्वच्छ-हवा अलर्ट — ${city} | CPCB AQI ${indianAqi} (${cpcbCat}, PM2.5: ${pm25} µg/m³)`,
          `खिड़की खोलने का सुरक्षित समय: ${winStart}–${winEnd} | ${peakHour} के आसपास बंद रखें`,
          `• स्कूल गेट पर इंतज़ार करते समय गाड़ी का इंजन बंद रखें`,
          `• शाम को सूखे पत्ते या कचरा बिल्कुल न जलाएँ`,
          `• घर में गीला पोंछा लगाएँ और MERV-13 / HEPA फ़िल्टर चलाएँ`,
          `${impact.communityBlockMultiplier.households} घरों की पहल से इस सर्दी में ${impact.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5 और ${impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} t CO2e की बचत होगी।`,
        ].join('\n')
      : [
          `AirKin Alert — ${city} | India CPCB AQI ${indianAqi} (${cpcbCat}, PM2.5: ${pm25} µg/m³)`,
          `Safe Airing: ${winStart}–${winEnd} | Avoid: ${peakHour}`,
          `• Gate engines OFF at school pickup`,
          `• Zero evening leaf/trash fires`,
          `• Wet-mop + MERV-13 / HEPA indoors`,
          `Block impact (${impact.communityBlockMultiplier.households} homes): -${impact.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5 & -${impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} t CO2e/winter`,
        ].join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rwaBriefing);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const completedCount = Object.values(checkedDiy).filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Left: Shareable RWA & Parent Alert */}
      <SpotlightCard className="lg:col-span-7 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <People set="two-tone" size="small" />
            </span>
            <div>
              <h2
                id="community-briefing-heading"
                className="text-sm font-semibold text-slate-900"
              >
                RWA & School-Group Clean-Air Briefing
              </h2>
              <p className="text-[11px] text-slate-500">1-click WhatsApp / resident alert for {city}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`rounded-md px-2 py-0.5 font-medium cursor-pointer ${
                  lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                aria-pressed={lang === 'hi'}
                className={`rounded-md px-2 py-0.5 font-medium cursor-pointer ${
                  lang === 'hi' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                हिंदी
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 transition cursor-pointer"
            >
              {copied ? (
                <TickSquare set="bold" size={14} primaryColor="#ffffff" />
              ) : (
                <Document set="light" size={14} primaryColor="#ffffff" />
              )}
              <span>{copied ? 'Copied' : 'Copy Alert'}</span>
            </motion.button>
          </div>
        </div>

        <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-800 font-sans">
          {rwaBriefing}
        </pre>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="text-base font-bold text-slate-900">
              <AnimatedCounter value={impact.communityBlockMultiplier.households} />
            </div>
            <div className="text-[10px] text-slate-500">Block Homes</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="text-base font-bold text-indigo-800">
              <AnimatedCounter value={impact.communityBlockMultiplier.seasonPm25AvoidedKg} decimals={1} suffix=" kg" />
            </div>
            <div className="text-[10px] text-slate-500">PM2.5 Cut</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="text-base font-bold text-teal-800">
              <AnimatedCounter value={impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} decimals={1} suffix=" t" />
            </div>
            <div className="text-[10px] text-slate-500">CO2e Cut</div>
          </div>
        </div>
      </SpotlightCard>

      {/* Right: Interactive DIY Build Checklist & Collapsible Assumptions */}
      <div className="lg:col-span-5 space-y-4">
        <SpotlightCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Work set="two-tone" size="small" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">DIY Corsi-Rosenthal Build</h3>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              {completedCount}/{DIY_STEPS.length} done
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full bg-teal-600"
              animate={{ width: `${(completedCount / DIY_STEPS.length) * 100}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>

          <div className="space-y-1.5">
            {DIY_STEPS.map((step, i) => {
              const checked = Boolean(checkedDiy[i]);
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => setCheckedDiy((p) => ({ ...p, [i]: !p[i] }))}
                  aria-pressed={checked}
                  className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition cursor-pointer ${
                    checked
                      ? 'border-teal-300 bg-teal-50/70 text-slate-500 line-through'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <TickSquare
                    set={checked ? 'bold' : 'light'}
                    size={15}
                    primaryColor={checked ? '#0f766e' : '#94a3b8'}
                  />
                  <span>{step}</span>
                </button>
              );
            })}
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-4">
          <button
            type="button"
            onClick={() => setShowModelMath((s) => !s)}
            aria-expanded={showModelMath}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-900 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <InfoCircle set="two-tone" size="small" primaryColor="#0369a1" />
              Model Parameters & Assumptions
            </span>
            {showModelMath ? <ChevronUp set="light" size={16} /> : <ChevronDown set="light" size={16} />}
          </button>

          <AnimatePresence initial={false}>
            {showModelMath && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <ShieldDone set="light" size={14} primaryColor="#0f766e" />
                    <span>Infiltration: 0.78 drafty · 0.62 avg · 0.45 sealed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldDone set="light" size={14} primaryColor="#0f766e" />
                    <span>WHO 24h target: 15 µg/m³ · Berkeley Earth: 22 µg/m³/cig</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldDone set="light" size={14} primaryColor="#0f766e" />
                    <span>Winter projection: 14-week Indian inversion season</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SpotlightCard>
      </div>
    </div>
  );
}
