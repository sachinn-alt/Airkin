import { Users, Home, Car, Flame, ShieldCheck, RefreshCw } from 'lucide-react';
import type { HouseholdProfile } from '@shared/types';

interface ProfilePanelProps {
  profile: HouseholdProfile;
  onChange: (next: HouseholdProfile) => void;
  onRegeneratePlan: () => void;
  isLoadingPlan: boolean;
}

export function ProfilePanel({
  profile,
  onChange,
  onRegeneratePlan,
  isLoadingPlan,
}: ProfilePanelProps) {
  const update = <K extends keyof HouseholdProfile>(key: K, value: HouseholdProfile[K]) => {
    onChange({ ...profile, [key]: value });
  };

  return (
    <aside
      aria-label="Household and Lifestyle Profile"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-teal-700" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900">Tailor to Your Household</h2>
        </div>
        <div
          className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs"
          role="group"
          aria-label="Assistant Perspective Mode"
        >
          <button
            type="button"
            onClick={() => update('role', 'family')}
            className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
              profile.role === 'family'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={profile.role === 'family'}
          >
            Family
          </button>
          <button
            type="button"
            onClick={() => update('role', 'community')}
            className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
              profile.role === 'community'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={profile.role === 'community'}
          >
            Community
          </button>
        </div>
      </div>

      {/* Household size & vulnerabilities */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-700">
          <label htmlFor="household-size-input">Household Members</label>
          <span className="font-semibold text-teal-700">{profile.householdSize} people</span>
        </div>
        <input
          id="household-size-input"
          type="range"
          min={1}
          max={10}
          value={profile.householdSize}
          onChange={(e) => update('householdSize', Number(e.target.value))}
          className="w-full accent-teal-700 cursor-pointer"
        />

        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          {[
            { key: 'hasChildren' as const, label: 'Children / Infants' },
            { key: 'hasSeniors' as const, label: 'Older Adults (65+)' },
            { key: 'hasRespiratoryCondition' as const, label: 'Asthma / COPD' },
            { key: 'outdoorExerciseHabit' as const, label: 'Outdoor Exercise' },
          ].map((item) => {
            const active = profile[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => update(item.key, !active)}
                aria-pressed={active}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition cursor-pointer ${
                  active
                    ? 'border-teal-300 bg-teal-50 text-teal-900 font-medium'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] font-bold">{active ? 'ON' : 'OFF'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Home & Filtration */}
      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <Home className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
          <span>Home Envelope & Indoor Air</span>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs">
          <label className="block">
            <span className="text-slate-500">Air Filtration Setup</span>
            <select
              value={profile.purifierType}
              onChange={(e) =>
                update('purifierType', e.target.value as HouseholdProfile['purifierType'])
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900"
            >
              <option value="none">No air purifier yet</option>
              <option value="single_hepa">Single HEPA Purifier</option>
              <option value="diy_corsi_rosenthal">DIY Corsi-Rosenthal (MERV-13)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-slate-500">Window & Door Sealing</span>
            <select
              value={profile.homeSealLevel}
              onChange={(e) =>
                update('homeSealLevel', e.target.value as HouseholdProfile['homeSealLevel'])
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900"
            >
              <option value="drafty">Drafty / Older frames</option>
              <option value="average">Average apartment / home</option>
              <option value="well_sealed">Well-sealed / Weatherstripped</option>
            </select>
          </label>
        </div>
      </div>

      {/* Heating & Cooking */}
      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <Flame className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
          <span>Heating & Cooking</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="block">
            <span className="text-slate-500">Heating</span>
            <select
              value={profile.heatingSource}
              onChange={(e) =>
                update('heatingSource', e.target.value as HouseholdProfile['heatingSource'])
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
            >
              <option value="gas_heater">Gas Heater</option>
              <option value="wood_coal">Wood / Coal / Charcoal</option>
              <option value="electric_heat_pump">Electric / Heat Pump</option>
              <option value="none">No Active Heating</option>
            </select>
          </label>

          <label className="block">
            <span className="text-slate-500">Cooking</span>
            <select
              value={profile.cookingFuel}
              onChange={(e) =>
                update('cookingFuel', e.target.value as HouseholdProfile['cookingFuel'])
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
            >
              <option value="gas_stove">Gas Stove</option>
              <option value="biomass_kerosene">Biomass / Kerosene</option>
              <option value="induction_electric">Induction / Electric</option>
            </select>
          </label>
        </div>
      </div>

      {/* Commute & Budget */}
      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <Car className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />
          <span>Commute & Budget</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="block">
            <span className="text-slate-500">Primary Commute</span>
            <select
              value={profile.commuteMode}
              onChange={(e) =>
                update('commuteMode', e.target.value as HouseholdProfile['commuteMode'])
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
            >
              <option value="solo_car">Solo Petrol/Diesel Car</option>
              <option value="motorbike">Two-Wheeler / Scooter</option>
              <option value="public_transit">Metro / Bus</option>
              <option value="walk_cycle">Walk / Cycle</option>
              <option value="remote">Work from Home</option>
            </select>
          </label>

          <label className="block">
            <span className="text-slate-500">Hack Budget</span>
            <select
              value={profile.budgetTier}
              onChange={(e) =>
                update('budgetTier', e.target.value as HouseholdProfile['budgetTier'])
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
            >
              <option value="zero_cost">Zero-Cost Only</option>
              <option value="low_budget">Low Cost (~₹2,000–₹4,500)</option>
              <option value="flexible">Flexible Upgrades</option>
            </select>
          </label>
        </div>

        {profile.commuteMode !== 'remote' && (
          <div>
            <div className="flex justify-between text-xs text-slate-600">
              <label htmlFor="commute-km">Daily Round-Trip Distance</label>
              <span className="text-slate-900 font-medium">{profile.commuteKmRoundTrip} km</span>
            </div>
            <input
              id="commute-km"
              type="range"
              min={2}
              max={60}
              value={profile.commuteKmRoundTrip}
              onChange={(e) => update('commuteKmRoundTrip', Number(e.target.value))}
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRegeneratePlan}
        disabled={isLoadingPlan}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition cursor-pointer"
      >
        {isLoadingPlan ? (
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        )}
        {isLoadingPlan ? 'Updating Tailored AI Plan...' : 'Regenerate Tailored AI Plan'}
      </button>
    </aside>
  );
}
