import { describe, expect, it } from 'vitest';
import {
  ACTION_CATALOG,
  calculateImpactSummary,
  classifyAqiSeverity,
  computeIndianCpcbAqi,
  computeInversionRisk,
  findVentilationWindow,
  getDefaultSelectedActionIds,
} from '../shared/impactEngine.js';
import type { HouseholdProfile, HourlyAqiPoint } from '../shared/types.js';

const baseProfile: HouseholdProfile = {
  city: 'Delhi',
  role: 'family',
  householdSize: 4,
  hasChildren: true,
  hasSeniors: false,
  hasRespiratoryCondition: true,
  commuteMode: 'solo_car',
  commuteKmRoundTrip: 16,
  heatingSource: 'wood_coal',
  cookingFuel: 'gas_stove',
  purifierType: 'none',
  homeSealLevel: 'drafty',
  outdoorExerciseHabit: true,
  budgetTier: 'low_budget',
};

describe('impactEngine', () => {
  it('computes official Indian CPCB NAQI categories across PM2.5 and PM10 breakpoints', () => {
    expect(computeIndianCpcbAqi(20, 35).category).toBe('Good');
    expect(computeIndianCpcbAqi(48, 49).category).toBe('Satisfactory');
    expect(computeIndianCpcbAqi(75, 120).category).toBe('Moderate');
    expect(computeIndianCpcbAqi(105, 160).category).toBe('Poor');
    expect(computeIndianCpcbAqi(180, 220).category).toBe('Very Poor');
    expect(computeIndianCpcbAqi(280, 360).category).toBe('Severe');
  });

  it('classifies AQI severity across WHO/EPA thresholds', () => {
    expect(classifyAqiSeverity(35).level).toBe('good');
    expect(classifyAqiSeverity(85).level).toBe('moderate');
    expect(classifyAqiSeverity(125).level).toBe('sensitive');
    expect(classifyAqiSeverity(175).level).toBe('unhealthy');
    expect(classifyAqiSeverity(240).level).toBe('very_unhealthy');
    expect(classifyAqiSeverity(340).level).toBe('hazardous');
  });

  it('scores severe thermal inversion under calm, cold, high-PM2.5 conditions', () => {
    const trap = computeInversionRisk({
      windSpeedKmh: 2.5,
      temperatureC: 4,
      pm25: 160,
      humidityPct: 82,
    });
    expect(trap.score).toBeGreaterThanOrEqual(75);
    expect(trap.label).toBe('Severe Trap');

    const breezy = computeInversionRisk({
      windSpeedKmh: 22,
      temperatureC: 18,
      pm25: 18,
      humidityPct: 45,
    });
    expect(breezy.score).toBeLessThan(35);
    expect(breezy.label).toBe('Low');
  });

  it('detects the lowest-PM2.5 afternoon ventilation window and peak smog hour', () => {
    const hourly: HourlyAqiPoint[] = [
      { time: '2026-11-27T08:00', hourLabel: '08:00', pm25: 180, pm10: 220, usAqi: 230 },
      { time: '2026-11-27T11:00', hourLabel: '11:00', pm25: 110, pm10: 140, usAqi: 180 },
      { time: '2026-11-27T14:00', hourLabel: '14:00', pm25: 55, pm10: 75, usAqi: 145 },
      { time: '2026-11-27T15:00', hourLabel: '15:00', pm25: 52, pm10: 70, usAqi: 140 },
      { time: '2026-11-27T21:00', hourLabel: '21:00', pm25: 195, pm10: 240, usAqi: 245 },
    ];
    const window = findVentilationWindow(hourly);
    expect(window.bestStartHour).toBe('14:00');
    expect(window.avgPm25InWindow).toBe(54);
    expect(window.peakHour).toBe('21:00');
    expect(window.peakPm25).toBe(195);
  });

  it('computes meaningful indoor PM2.5 and emission reductions when interventions are active', () => {
    const defaults = getDefaultSelectedActionIds(baseProfile);
    const noAction = calculateImpactSummary(baseProfile, 150, []);
    const withActions = calculateImpactSummary(baseProfile, 150, defaults);

    expect(noAction.optimizedIndoorPm25).toBe(noAction.baselineIndoorPm25);
    expect(withActions.optimizedIndoorPm25).toBeLessThan(withActions.baselineIndoorPm25);
    expect(withActions.indoorReductionPct).toBeGreaterThan(40);
    expect(withActions.inhaledDoseSavedUg).toBeGreaterThan(0);
    expect(withActions.weeklyPm25EmissionsSavedGrams).toBeGreaterThan(0);
    expect(withActions.weeklyCo2eSavedKg).toBeGreaterThan(0);
  });

  it('scales community multiplier larger in community mode than family mode', () => {
    const actions = ACTION_CATALOG.map((a) => a.id);
    const familyImpact = calculateImpactSummary(baseProfile, 140, actions);
    const communityImpact = calculateImpactSummary(
      { ...baseProfile, role: 'community' },
      140,
      actions
    );
    expect(communityImpact.communityBlockMultiplier.households).toBe(100);
    expect(communityImpact.communityBlockMultiplier.seasonPm25AvoidedKg).toBeGreaterThan(
      familyImpact.communityBlockMultiplier.seasonPm25AvoidedKg
    );
  });
});
