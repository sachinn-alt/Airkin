import { motion } from 'motion/react';
import { Home, Setting, ShieldDone, TwoUsers, Activity } from 'react-iconly';
import type { HouseholdProfile } from '@shared/types';
import { SpotlightCard } from './ui/AceternityPrimitives';

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
    <SpotlightCard className="p-4">
      <aside aria-label="Household and Lifestyle Profile" className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <TwoUsers set="two-tone" size="small" />
            </span>
            <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
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

        {/* Household Size + Risk Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <label htmlFor="household-size-input">Members</label>
            <span className="font-bold text-teal-800">{profile.householdSize}</span>
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

          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
            {[
              { key: 'hasChildren' as const, label: 'Kids / Infants' },
              { key: 'hasSeniors' as const, label: 'Seniors (65+)' },
              { key: 'hasRespiratoryCondition' as const, label: 'Asthma / COPD' },
              { key: 'outdoorExerciseHabit' as const, label: 'Outdoor Run' },
            ].map((item) => {
              const active = profile[item.key];
              return (
                <motion.button
                  key={item.key}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => update(item.key, !active)}
                  aria-pressed={active}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition cursor-pointer ${
                    active
                      ? 'border-teal-300 bg-teal-50 text-teal-900 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px]">{active ? '●' : '○'}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Compact Icon Selectors */}
        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Home set="two-tone" size="small" primaryColor="#0f766e" />
            <span>Home & Air</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-slate-500">Filtration</span>
              <select
                value={profile.purifierType}
                onChange={(e) =>
                  update('purifierType', e.target.value as HouseholdProfile['purifierType'])
                }
                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
              >
                <option value="none">No Purifier</option>
                <option value="single_hepa">HEPA Unit</option>
                <option value="diy_corsi_rosenthal">Corsi-Rosenthal</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-500">Window Seal</span>
              <select
                value={profile.homeSealLevel}
                onChange={(e) =>
                  update('homeSealLevel', e.target.value as HouseholdProfile['homeSealLevel'])
                }
                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
              >
                <option value="drafty">Drafty</option>
                <option value="average">Average</option>
                <option value="well_sealed">Well-Sealed</option>
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Setting set="two-tone" size="small" primaryColor="#b45309" />
            <span>Fuel & Mobility</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-slate-500">Heating</span>
              <select
                value={profile.heatingSource}
                onChange={(e) =>
                  update('heatingSource', e.target.value as HouseholdProfile['heatingSource'])
                }
                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
              >
                <option value="gas_heater">Gas</option>
                <option value="wood_coal">Wood / Coal</option>
                <option value="electric_heat_pump">Electric</option>
                <option value="none">None</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] text-slate-500">Cooking</span>
              <select
                value={profile.cookingFuel}
                onChange={(e) =>
                  update('cookingFuel', e.target.value as HouseholdProfile['cookingFuel'])
                }
                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
              >
                <option value="gas_stove">Gas Stove</option>
                <option value="biomass_kerosene">Biomass</option>
                <option value="induction_electric">Induction</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] text-slate-500">Commute</span>
              <select
                value={profile.commuteMode}
                onChange={(e) =>
                  update('commuteMode', e.target.value as HouseholdProfile['commuteMode'])
                }
                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
              >
                <option value="solo_car">Solo Car</option>
                <option value="motorbike">Two-Wheeler</option>
                <option value="public_transit">Metro / Bus</option>
                <option value="walk_cycle">Walk / Cycle</option>
                <option value="remote">Remote</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] text-slate-500">Budget</span>
              <select
                value={profile.budgetTier}
                onChange={(e) =>
                  update('budgetTier', e.target.value as HouseholdProfile['budgetTier'])
                }
                className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
              >
                <option value="zero_cost">₹0 (Free)</option>
                <option value="low_budget">₹2k–₹4.5k</option>
                <option value="flexible">Flexible</option>
              </select>
            </label>
          </div>

          {profile.commuteMode !== 'remote' && (
            <div className="pt-1">
              <div className="flex justify-between text-[11px] text-slate-600">
                <label htmlFor="commute-km" className="inline-flex items-center gap-1">
                  <Activity set="light" size={13} /> Daily Commute
                </label>
                <span className="text-slate-900 font-semibold">{profile.commuteKmRoundTrip} km</span>
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

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onRegeneratePlan}
          disabled={isLoadingPlan}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition cursor-pointer"
        >
          <ShieldDone set="bold" size="small" primaryColor="#ffffff" />
          <span>{isLoadingPlan ? 'Updating Gemini Plan...' : 'Apply & Refresh AI Plan'}</span>
        </motion.button>
      </aside>
    </SpotlightCard>
  );
}
