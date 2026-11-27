import type {
  ActionChoice,
  AirQualitySnapshot,
  CpcbAqiInfo,
  HouseholdProfile,
  HourlyAqiPoint,
  ImpactSummary,
  VentilationWindow,
} from './types.js';

export const WHO_PM25_24H_GUIDELINE = 15;
export const WINTER_SEASON_WEEKS = 14;
const BERKELEY_EARTH_UG_PER_CIGARETTE = 22;

/**
 * Curated, science-backed catalog of winter smog interventions.
 * Used by both the live interactive Impact Simulator and the AI advisor grounding.
 */
export const ACTION_CATALOG: ActionChoice[] = [
  {
    id: 'ventilation_timing',
    category: 'routine',
    title: 'Sync Ventilation to the Afternoon Mixing Window',
    shortLabel: 'Timed window airing',
    description:
      'Keep windows latched during morning & night thermal inversions; cross-ventilate for 15-20 minutes only during the lowest-PM2.5 afternoon window.',
    costLabel: 'Free',
    indoorPm25ReductionPct: 18,
    indoorSourceRemovedUgM3: 0,
    outdoorExposureReductionPct: 12,
    weeklyPm25EmissionsSavedGrams: 0,
    weeklyCo2eSavedKg: 0,
    impactMechanism:
      'Winter nocturnal inversions trap cold air and exhaust near street level. Afternoon solar warming lifts the boundary layer, dropping ambient PM2.5 by 25-45% briefly.',
    recommendedFor: 'All households in winter inversion cities',
  },
  {
    id: 'door_seal_wet_mop',
    category: 'indoor_hack',
    title: 'Weather-Strip Drafts & Wet-Mop Instead of Sweeping',
    shortLabel: 'Draft sealing + wet mop',
    description:
      'Use rolled damp towels or foam weatherstripping on window gaps and switch from dry brooms to damp microfiber mopping.',
    costLabel: 'Free',
    indoorPm25ReductionPct: 22,
    indoorSourceRemovedUgM3: 6,
    outdoorExposureReductionPct: 0,
    weeklyPm25EmissionsSavedGrams: 0,
    weeklyCo2eSavedKg: 0,
    impactMechanism:
      'Sealing gaps cuts outdoor smog infiltration factor by ~20-30%, while wet mopping captures settled PM2.5/PM10 instead of resuspending fine dust at child breathing height.',
    recommendedFor: 'Drafty apartments, homes with toddlers or asthma',
  },
  {
    id: 'diy_corsi_rosenthal',
    category: 'indoor_hack',
    title: 'Run DIY Corsi-Rosenthal Box (or MERV-13 / HEPA Clean Room)',
    shortLabel: 'Corsi-Rosenthal / HEPA filtration',
    description:
      'Assemble 4 MERV-13 furnace filters + a 20" box fan (or run an existing HEPA purifier on medium-high) inside the main sleeping/living room.',
    costLabel: 'Low Cost (~$25-$60)',
    indoorPm25ReductionPct: 58,
    indoorSourceRemovedUgM3: 4,
    outdoorExposureReductionPct: 0,
    weeklyPm25EmissionsSavedGrams: 0,
    weeklyCo2eSavedKg: 0,
    impactMechanism:
      'A 4-filter Corsi-Rosenthal cube delivers 400-600 CFM Clean Air Delivery Rate (CADR), achieving 4-6 air changes per hour in a bedroom and cutting indoor PM2.5 by 55-75%.',
    recommendedFor: 'Severe smog (AQI > 150) & sensitive family members',
  },
  {
    id: 'clean_cooking_exhaust',
    category: 'indoor_hack',
    title: 'Eliminate Indoor Combustion & Run Kitchen Exhaust',
    shortLabel: 'Clean cooking + zero incense/candles',
    description:
      'Replace indoor candles, incense, and open-flame cooking spikes with induction/electric kettle cooking, lids on pans, and active range-hood venting.',
    costLabel: 'Free',
    indoorPm25ReductionPct: 8,
    indoorSourceRemovedUgM3: 18,
    outdoorExposureReductionPct: 0,
    weeklyPm25EmissionsSavedGrams: 14,
    weeklyCo2eSavedKg: 5.4,
    impactMechanism:
      'Frying on gas or burning a single stick of incense can spike indoor PM2.5 above 150 µg/m³ for hours inside a sealed winter home. Removing indoor combustion cuts peak indoor exposure immediately.',
    recommendedFor: 'Gas/biomass kitchens and sealed winter apartments',
  },
  {
    id: 'n95_commute_shift',
    category: 'routine',
    title: 'Shift Commute Off-Peak + Fit-Tested N95/KF94',
    shortLabel: 'Off-peak + N95 commute',
    description:
      'Wear a well-sealed N95/KN95/KF94 outdoors when PM2.5 > 55 µg/m³, reschedule outdoor runs indoors, and avoid rush-hour arterial roads.',
    costLabel: 'Low Cost (~$25-$60)',
    indoorPm25ReductionPct: 0,
    indoorSourceRemovedUgM3: 0,
    outdoorExposureReductionPct: 78,
    weeklyPm25EmissionsSavedGrams: 0,
    weeklyCo2eSavedKg: 0,
    impactMechanism:
      'Electrostatic melt-blown N95/KF94 media captures >=94-95% of 0.3 µm particulates; avoiding brisk outdoor exercise cuts minute ventilation (inhaled air volume) by 3-5x.',
    recommendedFor: 'Commuters, school runs, outdoor runners',
  },
  {
    id: 'transit_carpool_swap',
    category: 'sustainable_swap',
    title: 'Swap Solo Fuel Commutes for Transit, Carpool, or E-Mobility',
    shortLabel: 'Low-emission commute swap',
    description:
      'Replace solo fossil-fuel trips with metro/bus, shared neighborhood school carpools, or batching errands into one trip.',
    costLabel: 'Free',
    indoorPm25ReductionPct: 0,
    indoorSourceRemovedUgM3: 0,
    outdoorExposureReductionPct: 15,
    weeklyPm25EmissionsSavedGrams: 28,
    weeklyCo2eSavedKg: 21.5,
    impactMechanism:
      'Cold-start winter engines emit 3-5x more PM2.5 and NOx in the first 3 km because catalytic converters are cold. Eliminating short cold-start car trips directly reduces street-level smog.',
    recommendedFor: 'Solo car or motorbike commuters',
  },
  {
    id: 'clean_heating_swap',
    category: 'sustainable_swap',
    title: 'Replace Wood/Coal/Open Heating with Zoned Electric Warmth',
    shortLabel: 'Zero-smoke winter heating',
    description:
      'Stop using wood stoves, charcoal braziers, or unvented kerosene heaters; heat only occupied rooms using electric heat pumps, oil-filled radiators, or heated throws.',
    costLabel: 'Upgrade',
    indoorPm25ReductionPct: 15,
    indoorSourceRemovedUgM3: 28,
    outdoorExposureReductionPct: 10,
    weeklyPm25EmissionsSavedGrams: 195,
    weeklyCo2eSavedKg: 34.0,
    impactMechanism:
      'Residential wood/biomass burning is often the #1 contributor to winter urban PM2.5 peaks. Switching to zoned electric heating eliminates both indoor smoke leakage and neighborhood plume emissions.',
    recommendedFor: 'Homes using wood, coal, or unvented fuel heaters',
  },
  {
    id: 'community_no_idle_burn',
    category: 'community',
    title: 'Organize No-Idling School Zones & Zero Leaf/Trash Burning',
    shortLabel: 'Community no-burn & no-idle',
    description:
      'Start a school-gate engine-off pledge and coordinate municipal/compost leaf collection instead of evening yard/waste fires.',
    costLabel: 'Free',
    indoorPm25ReductionPct: 5,
    indoorSourceRemovedUgM3: 0,
    outdoorExposureReductionPct: 18,
    weeklyPm25EmissionsSavedGrams: 310,
    weeklyCo2eSavedKg: 42.0,
    impactMechanism:
      'A single backyard leaf/trash fire emits as much PM2.5 as hundreds of cars. Stopping evening burning before thermal inversion sets in prevents neighborhood-wide overnight smog spikes.',
    recommendedFor: 'Neighborhoods, parent groups, community organizers',
  },
];

function linearInterpolateAqi(
  conc: number,
  breakpoints: Array<[number, number, number, number]>
): number {
  const c = Math.max(0, conc);
  for (const [cLo, cHi, iLo, iHi] of breakpoints) {
    if (c <= cHi) {
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (c - cLo) + iLo);
    }
  }
  return 500;
}

/**
 * Computes India's official CPCB National Air Quality Index (NAQI) from PM2.5 and PM10.
 */
export function computeIndianCpcbAqi(pm25: number, pm10: number): CpcbAqiInfo {
  const pm25Sub = linearInterpolateAqi(pm25, [
    [0, 30, 0, 50],
    [30, 60, 51, 100],
    [60, 90, 101, 200],
    [90, 120, 201, 300],
    [120, 250, 301, 400],
    [250, 500, 401, 500],
  ]);

  const pm10Sub = linearInterpolateAqi(pm10, [
    [0, 50, 0, 50],
    [50, 100, 51, 100],
    [100, 250, 101, 200],
    [250, 350, 201, 300],
    [350, 430, 301, 400],
    [430, 700, 401, 500],
  ]);

  const aqi = Math.max(pm25Sub, pm10Sub);

  if (aqi <= 50) return { aqi, category: 'Good', colorToken: 'emerald' };
  if (aqi <= 100) return { aqi, category: 'Satisfactory', colorToken: 'lime' };
  if (aqi <= 200) return { aqi, category: 'Moderate', colorToken: 'amber' };
  if (aqi <= 300) return { aqi, category: 'Poor', colorToken: 'orange' };
  if (aqi <= 400) return { aqi, category: 'Very Poor', colorToken: 'red' };
  return { aqi, category: 'Severe', colorToken: 'rose' };
}

export function classifyAqiSeverity(usAqi: number): AirQualitySnapshot['severity'] {
  if (usAqi <= 50) {
    return {
      level: 'good',
      label: 'Good',
      colorToken: 'emerald',
      summary: 'Air is clean. Normal ventilation and outdoor routines are safe.',
    };
  }
  if (usAqi <= 100) {
    return {
      level: 'moderate',
      label: 'Moderate',
      colorToken: 'amber',
      summary: 'Acceptable for most, but sensitive groups should limit prolonged heavy outdoor exertion.',
    };
  }
  if (usAqi <= 150) {
    return {
      level: 'sensitive',
      label: 'Unhealthy for Sensitive Groups',
      colorToken: 'orange',
      summary: 'Children, seniors, and asthma/heart patients should reduce outdoor time and filter indoor air.',
    };
  }
  if (usAqi <= 200) {
    return {
      level: 'unhealthy',
      label: 'Unhealthy',
      colorToken: 'red',
      summary: 'Everyone experiences elevated exposure. Keep windows sealed during peaks and mask outdoors.',
    };
  }
  if (usAqi <= 300) {
    return {
      level: 'very_unhealthy',
      label: 'Very Unhealthy',
      colorToken: 'purple',
      summary: 'Severe smog alert. Create a HEPA/Corsi-Rosenthal clean room and cancel outdoor exertion.',
    };
  }
  return {
    level: 'hazardous',
    label: 'Hazardous Winter Smog',
    colorToken: 'rose',
    summary: 'Emergency air quality. Stay indoors with active filtration, seal drafts, and wear fit-tested N95 outside.',
  };
}

export function computeInversionRisk(params: {
  windSpeedKmh: number;
  temperatureC: number;
  pm25: number;
  humidityPct: number;
}): AirQualitySnapshot['inversionRisk'] {
  const { windSpeedKmh, temperatureC, pm25, humidityPct } = params;
  let score = 20;

  if (windSpeedKmh < 5) score += 38;
  else if (windSpeedKmh < 10) score += 24;
  else if (windSpeedKmh < 16) score += 10;
  else score -= 12;

  if (temperatureC <= 10) score += 18;
  else if (temperatureC <= 16) score += 10;

  if (humidityPct >= 70) score += 12;
  if (pm25 >= 100) score += 18;
  else if (pm25 >= 55) score += 10;

  const clamped = Math.max(5, Math.min(98, Math.round(score)));

  if (clamped >= 75) {
    return {
      score: clamped,
      label: 'Severe Trap',
      explanation: `Calm winds (${windSpeedKmh.toFixed(1)} km/h) and cool air (${temperatureC.toFixed(1)}°C) create a strong thermal lid trapping street & heating smoke near ground level.`,
    };
  }
  if (clamped >= 55) {
    return {
      score: clamped,
      label: 'High',
      explanation: `Light winds (${windSpeedKmh.toFixed(1)} km/h) slow dispersion; pollutants build up sharply after sunset and before mid-morning.`,
    };
  }
  if (clamped >= 35) {
    return {
      score: clamped,
      label: 'Moderate',
      explanation: `Partial atmospheric mixing (${windSpeedKmh.toFixed(1)} km/h wind), though evening cooling can still cause localized pockets.`,
    };
  }
  return {
    score: clamped,
    label: 'Low',
    explanation: `Steady breeze (${windSpeedKmh.toFixed(1)} km/h) helps disperse urban emissions and prevent stagnant smog layers.`,
  };
}

export function findVentilationWindow(hourly: HourlyAqiPoint[]): VentilationWindow {
  if (!hourly.length) {
    return {
      bestStartHour: '14:00',
      bestEndHour: '16:00',
      avgPm25InWindow: 35,
      peakHour: '08:00',
      peakPm25: 90,
      advisory: 'Ventilate briefly mid-afternoon when thermal mixing is highest.',
    };
  }

  let bestIdx = 0;
  let lowestPairAvg = Number.POSITIVE_INFINITY;
  for (let i = 0; i < hourly.length - 1; i++) {
    const pairAvg = (hourly[i].pm25 + hourly[i + 1].pm25) / 2;
    if (pairAvg < lowestPairAvg) {
      lowestPairAvg = pairAvg;
      bestIdx = i;
    }
  }

  let peakPoint = hourly[0];
  for (const pt of hourly) {
    if (pt.pm25 > peakPoint.pm25) peakPoint = pt;
  }

  const start = hourly[bestIdx];
  const end = hourly[Math.min(bestIdx + 2, hourly.length - 1)];
  const avgPm25 = Math.round(lowestPairAvg);

  let advisory = `Lowest smog is ${start.hourLabel}-${end.hourLabel} (~${avgPm25} µg/m³). `;
  if (avgPm25 > 75) {
    advisory += 'Even the best window is high—limit airing to 5-10 min only if CO2 feels stuffy, and run filtration right after.';
  } else if (avgPm25 > 35) {
    advisory += 'Open opposite windows for 15 minutes during this slot, then reseal and run indoor filtration.';
  } else {
    advisory += 'Great time for a 20-30 minute cross-breeze flush before evening cooling restarts.';
  }

  return {
    bestStartHour: start.hourLabel,
    bestEndHour: end.hourLabel,
    avgPm25InWindow: avgPm25,
    peakHour: peakPoint.hourLabel,
    peakPm25: Math.round(peakPoint.pm25),
    advisory,
  };
}

export function getDefaultSelectedActionIds(profile: HouseholdProfile): string[] {
  const ids = new Set<string>(['ventilation_timing', 'door_seal_wet_mop', 'n95_commute_shift']);
  if (profile.purifierType !== 'none' || profile.budgetTier !== 'zero_cost') {
    ids.add('diy_corsi_rosenthal');
  }
  if (profile.cookingFuel !== 'induction_electric') {
    ids.add('clean_cooking_exhaust');
  }
  if (profile.commuteMode === 'solo_car' || profile.commuteMode === 'motorbike') {
    ids.add('transit_carpool_swap');
  }
  if (profile.heatingSource === 'wood_coal' || profile.heatingSource === 'gas_heater') {
    ids.add('clean_heating_swap');
  }
  if (profile.role === 'community') {
    ids.add('community_no_idle_burn');
  }
  return Array.from(ids);
}

/**
 * Calculates transparent indoor PM2.5, personal inhaled dose, and community emission impacts
 * using an indoor mass-balance infiltration + CADR attenuation model.
 */
export function calculateImpactSummary(
  profile: HouseholdProfile,
  outdoorPm25Raw: number,
  selectedActionIds: string[]
): ImpactSummary {
  const outdoorPm25 = Math.max(5, outdoorPm25Raw);

  // 1. Baseline infiltration factor based on building envelope
  const infiltrationMap: Record<HouseholdProfile['homeSealLevel'], number> = {
    drafty: 0.78,
    average: 0.62,
    well_sealed: 0.45,
  };
  const baseInfiltration = infiltrationMap[profile.homeSealLevel];

  // 2. Baseline indoor combustion sources (ug/m3 continuous equivalent)
  const cookingSourceMap: Record<HouseholdProfile['cookingFuel'], number> = {
    biomass_kerosene: 26,
    gas_stove: 14,
    induction_electric: 2,
  };
  const heatingSourceMap: Record<HouseholdProfile['heatingSource'], number> = {
    wood_coal: 30,
    gas_heater: 12,
    electric_heat_pump: 0,
    none: 0,
  };
  const purifierBaseFactor: Record<HouseholdProfile['purifierType'], number> = {
    none: 1.0,
    single_hepa: 0.62,
    diy_corsi_rosenthal: 0.48,
  };

  const baselineIndoorSources =
    cookingSourceMap[profile.cookingFuel] + heatingSourceMap[profile.heatingSource];

  const baselineIndoorPm25 = Math.max(
    4,
    Math.round(
      (outdoorPm25 * baseInfiltration + baselineIndoorSources) *
        purifierBaseFactor[profile.purifierType]
    )
  );

  // 3. Apply chosen interventions without double-counting purifier if already present
  const selectedActions = ACTION_CATALOG.filter((a) => selectedActionIds.includes(a.id));

  let remainingInfiltrationMultiplier = 1.0;
  let removedSourceUgM3 = 0;
  let outdoorProtectionFactor = 1.0;
  let weeklyPm25Saved = 0;
  let weeklyCo2eSaved = 0;

  for (const action of selectedActions) {
    let indoorPct = action.indoorPm25ReductionPct;
    // If the user already runs a purifier, adding the Corsi-Rosenthal action gives an incremental boost rather than full fresh gain
    if (action.id === 'diy_corsi_rosenthal' && profile.purifierType !== 'none') {
      indoorPct = 28;
    }
    remainingInfiltrationMultiplier *= 1 - indoorPct / 100;

    // Only credit source removal that actually exists in the user's home
    if (action.id === 'clean_cooking_exhaust' && profile.cookingFuel === 'induction_electric') {
      removedSourceUgM3 += 4;
    } else if (action.id === 'clean_heating_swap' && (profile.heatingSource === 'none' || profile.heatingSource === 'electric_heat_pump')) {
      removedSourceUgM3 += 0;
    } else {
      removedSourceUgM3 += action.indoorSourceRemovedUgM3;
    }

    outdoorProtectionFactor *= 1 - action.outdoorExposureReductionPct / 100;

    // Scale commute savings by actual round-trip km if commute action is chosen
    if (action.id === 'transit_carpool_swap') {
      const kmFactor =
        profile.commuteMode === 'remote' || profile.commuteMode === 'walk_cycle'
          ? 0.25
          : Math.max(0.4, Math.min(2.5, profile.commuteKmRoundTrip / 14));
      weeklyPm25Saved += action.weeklyPm25EmissionsSavedGrams * kmFactor;
      weeklyCo2eSaved += action.weeklyCo2eSavedKg * kmFactor;
    } else if (action.id === 'clean_heating_swap') {
      const heatFactor =
        profile.heatingSource === 'wood_coal'
          ? 1.25
          : profile.heatingSource === 'gas_heater'
            ? 0.55
            : 0.15;
      weeklyPm25Saved += action.weeklyPm25EmissionsSavedGrams * heatFactor;
      weeklyCo2eSaved += action.weeklyCo2eSavedKg * heatFactor;
    } else {
      weeklyPm25Saved += action.weeklyPm25EmissionsSavedGrams;
      weeklyCo2eSaved += action.weeklyCo2eSavedKg;
    }
  }

  const remainingIndoorSources = Math.max(1, baselineIndoorSources - removedSourceUgM3);
  const optimizedIndoorRaw =
    (outdoorPm25 * baseInfiltration + remainingIndoorSources) *
    purifierBaseFactor[profile.purifierType] *
    remainingInfiltrationMultiplier;

  const optimizedIndoorPm25 = Math.max(3, Math.round(optimizedIndoorRaw));
  const indoorReductionPct =
    baselineIndoorPm25 > 0
      ? Math.max(0, Math.round(((baselineIndoorPm25 - optimizedIndoorPm25) / baselineIndoorPm25) * 100))
      : 0;

  // 4. Daily inhaled dose calculation (m3/day average across household)
  // Average person breathes ~14 m3/day (higher if outdoor exercise habit).
  // Assume ~20h indoors (11.2 m3) + ~4h outdoors/transit (2.8 m3, or 3.8 m3 with outdoor exercise).
  const indoorAirVolM3 = 11.2;
  const outdoorAirVolM3 = profile.outdoorExerciseHabit ? 3.8 : 2.6;

  const baselineDailyInhaledUg = Math.round(
    (baselineIndoorPm25 * indoorAirVolM3 + outdoorPm25 * outdoorAirVolM3) * profile.householdSize
  );
  const optimizedDailyInhaledUg = Math.round(
    (optimizedIndoorPm25 * indoorAirVolM3 +
      outdoorPm25 * outdoorProtectionFactor * outdoorAirVolM3) *
      profile.householdSize
  );

  const inhaledDoseSavedUg = Math.max(0, baselineDailyInhaledUg - optimizedDailyInhaledUg);
  const inhaledDoseSavedPct =
    baselineDailyInhaledUg > 0
      ? Math.max(0, Math.round((inhaledDoseSavedUg / baselineDailyInhaledUg) * 100))
      : 0;

  // Per-person weekly cigarette-equivalent avoided (Berkeley Earth: 22 ug/m3 24h ≈ 1 cig/day)
  const perPersonDailyAvgDropUgM3 =
    inhaledDoseSavedUg / Math.max(1, profile.householdSize) / (indoorAirVolM3 + outdoorAirVolM3);
  const cigaretteEquivalentsAvoidedPerWeek = Number(
    ((perPersonDailyAvgDropUgM3 / BERKELEY_EARTH_UG_PER_CIGARETTE) * 7).toFixed(1)
  );

  const weeklyPm25EmissionsSavedGrams = Math.round(weeklyPm25Saved);
  const weeklyCo2eSavedKg = Number(weeklyCo2eSaved.toFixed(1));
  const winterSeasonCo2eSavedKg = Math.round(weeklyCo2eSaved * WINTER_SEASON_WEEKS);

  const blockHouseholds = profile.role === 'community' ? 100 : 25;
  const seasonPm25AvoidedKg = Number(
    ((weeklyPm25EmissionsSavedGrams * WINTER_SEASON_WEEKS * blockHouseholds) / 1000).toFixed(1)
  );
  const seasonCo2eAvoidedTonnes = Number(
    ((weeklyCo2eSavedKg * WINTER_SEASON_WEEKS * blockHouseholds) / 1000).toFixed(1)
  );

  const flags: string[] = [];
  if (profile.hasChildren) flags.push('children (higher breathing rate per kg)');
  if (profile.hasSeniors) flags.push('older adults (cardiovascular sensitivity)');
  if (profile.hasRespiratoryCondition) flags.push('asthma/respiratory sensitivity');

  const vulnerabilityNote =
    flags.length > 0
      ? `High-priority protection active for ${flags.join(', ')}. Target keeping bedroom PM2.5 near or below the WHO 24h guideline (${WHO_PM25_24H_GUIDELINE} µg/m³).`
      : `Standard adult protection profile active. Keeping indoor PM2.5 near the WHO 24h guideline (${WHO_PM25_24H_GUIDELINE} µg/m³) minimizes cumulative winter inflammation.`;

  return {
    outdoorPm25: Math.round(outdoorPm25),
    baselineIndoorPm25,
    optimizedIndoorPm25,
    indoorReductionPct,
    whoGuidelineUgM3: WHO_PM25_24H_GUIDELINE,
    baselineDailyInhaledUg,
    optimizedDailyInhaledUg,
    inhaledDoseSavedUg,
    inhaledDoseSavedPct,
    cigaretteEquivalentsAvoidedPerWeek,
    weeklyPm25EmissionsSavedGrams,
    weeklyCo2eSavedKg,
    winterSeasonCo2eSavedKg,
    communityBlockMultiplier: {
      households: blockHouseholds,
      seasonPm25AvoidedKg,
      seasonCo2eAvoidedTonnes,
    },
    vulnerabilityNote,
  };
}
