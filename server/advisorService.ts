import { GoogleGenAI, Type } from '@google/genai';
import {
  ACTION_CATALOG,
  calculateImpactSummary,
  getDefaultSelectedActionIds,
} from '../shared/impactEngine.js';
import type {
  ActionChoice,
  AirQualitySnapshot,
  HouseholdProfile,
  ImpactSummary,
  RecommendationCard,
  TailoredPlanResponse,
} from '../shared/types.js';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export interface ScoredIntervention {
  action: ActionChoice;
  relevanceScore: number;
  computedIndoorDropUg: number;
  computedCo2eKg: number;
  computedPm25Grams: number;
}

/**
 * Scores interventions against the live atmospheric snapshot and household context
 * so both the Gemini prompt and the offline atmospheric model rank priorities consistently.
 */
export function scoreInterventionsForContext(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot
): ScoredIntervention[] {
  const sensitivityBoost =
    (profile.hasChildren ? 15 : 0) +
    (profile.hasSeniors ? 12 : 0) +
    (profile.hasRespiratoryCondition ? 20 : 0);

  return ACTION_CATALOG.map((action) => {
    let score = 40;
    const singleImpact = calculateImpactSummary(profile, aqi.current.pm25, [action.id]);
    const indoorDrop = Math.max(0, singleImpact.baselineIndoorPm25 - singleImpact.optimizedIndoorPm25);

    if (action.category === 'indoor_hack') {
      score += indoorDrop * 1.4 + sensitivityBoost;
      if (action.id === 'diy_corsi_rosenthal' && profile.purifierType === 'none') score += 25;
      if (action.id === 'diy_corsi_rosenthal' && profile.budgetTier === 'zero_cost') score -= 22;
      if (action.id === 'clean_cooking_exhaust' && profile.cookingFuel !== 'induction_electric') score += 20;
      if (action.id === 'door_seal_wet_mop' && profile.homeSealLevel === 'drafty') score += 18;
    }

    if (action.category === 'routine') {
      score += aqi.inversionRisk.score * 0.4 + sensitivityBoost * 0.6;
      if (action.id === 'n95_commute_shift' && (profile.outdoorExerciseHabit || aqi.current.usAqi >= 150)) {
        score += 22;
      }
    }

    if (action.category === 'sustainable_swap') {
      score += singleImpact.weeklyCo2eSavedKg * 1.2 + singleImpact.weeklyPm25EmissionsSavedGrams * 0.15;
      if (action.id === 'clean_heating_swap' && profile.heatingSource === 'wood_coal') score += 35;
      if (
        action.id === 'transit_carpool_swap' &&
        (profile.commuteMode === 'solo_car' || profile.commuteMode === 'motorbike')
      ) {
        score += 24;
      }
    }

    if (action.category === 'community') {
      score += profile.role === 'community' ? 45 : 15;
    }

    return {
      action,
      relevanceScore: Math.round(score),
      computedIndoorDropUg: indoorDrop,
      computedCo2eKg: singleImpact.weeklyCo2eSavedKg,
      computedPm25Grams: singleImpact.weeklyPm25EmissionsSavedGrams,
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function buildContextPrompt(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  selectedActionIds: string[]
): string {
  const impact = calculateImpactSummary(profile, aqi.current.pm25, selectedActionIds);
  const ranked = scoreInterventionsForContext(profile, aqi)
    .slice(0, 5)
    .map(
      (r, idx) =>
        `${idx + 1}. ${r.action.title} (Score ${r.relevanceScore}, -${r.computedIndoorDropUg} µg/m³ indoor, -${r.computedPm25Grams} g PM2.5/wk, -${r.computedCo2eKg} kg CO2e/wk)`
    )
    .join('\n');

  const vulnerabilities =
    [
      profile.hasChildren ? 'children' : null,
      profile.hasSeniors ? 'older adults' : null,
      profile.hasRespiratoryCondition ? 'asthma/respiratory condition' : null,
    ]
      .filter(Boolean)
      .join(', ') || 'standard adult household';

  return `
LIVE ENVIRONMENTAL CONTEXT:
- Location: ${aqi.city}${aqi.country ? `, ${aqi.country}` : ''} (${aqi.source})
- Current US AQI: ${aqi.current.usAqi} (${aqi.severity.label})
- PM2.5: ${aqi.current.pm25} µg/m³ (WHO 24h guideline: 15 µg/m³), PM10: ${aqi.current.pm10} µg/m³
- NO2: ${aqi.current.no2} µg/m³, CO: ${aqi.current.co} µg/m³, O3: ${aqi.current.o3} µg/m³
- Weather & Thermal Inversion: ${aqi.current.temperatureC}°C, wind ${aqi.current.windSpeedKmh} km/h, humidity ${aqi.current.humidityPct}% -> Inversion Risk: ${aqi.inversionRisk.label} (${aqi.inversionRisk.score}/100)
- Best Ventilation Window today: ${aqi.ventilationWindow.bestStartHour}-${aqi.ventilationWindow.bestEndHour} (~${aqi.ventilationWindow.avgPm25InWindow} µg/m³), Peak smog hour: ${aqi.ventilationWindow.peakHour} (~${aqi.ventilationWindow.peakPm25} µg/m³)

HOUSEHOLD & LIFESTYLE PROFILE:
- Mode: ${profile.role === 'community' ? 'Community / Neighborhood Organizer' : 'Family Household'}
- Household size: ${profile.householdSize} | Sensitive groups: ${vulnerabilities}
- Commute: ${profile.commuteMode} (${profile.commuteKmRoundTrip} km/day round trip)
- Heating: ${profile.heatingSource} | Cooking: ${profile.cookingFuel}
- Air purification: ${profile.purifierType} | Window sealing: ${profile.homeSealLevel}
- Outdoor exercise habit: ${profile.outdoorExerciseHabit ? 'Yes' : 'No'} | Budget: ${profile.budgetTier}

TOP SCORED INTERVENTIONS FOR THIS HOUSEHOLD:
${ranked}

QUANTITATIVE IMPACT SNAPSHOT (from mass-balance model):
- Baseline indoor PM2.5: ${impact.baselineIndoorPm25} µg/m³ -> With chosen interventions: ${impact.optimizedIndoorPm25} µg/m³ (${impact.indoorReductionPct}% drop)
- Daily household inhaled PM2.5 avoided: ${impact.inhaledDoseSavedUg} µg/day (${impact.inhaledDoseSavedPct}% less)
- Weekly community emissions avoided: ${impact.weeklyPm25EmissionsSavedGrams} g primary PM2.5 and ${impact.weeklyCo2eSavedKg} kg CO2e
- Block multiplier (${impact.communityBlockMultiplier.households} households over 14 winter weeks): ${impact.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5 & ${impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} tonnes CO2e prevented.
`.trim();
}

function buildDynamicCardFromScored(
  scored: ScoredIntervention,
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  impact: ImpactSummary
): RecommendationCard {
  const { action, computedIndoorDropUg, computedCo2eKg, computedPm25Grams } = scored;

  const priority: RecommendationCard['priority'] =
    action.category === 'community'
      ? 'Community Multiplier'
      : scored.relevanceScore >= 80
        ? 'Immediate'
        : 'High Impact';

  const steps: string[] = [action.description];

  if (action.id === 'ventilation_timing') {
    steps.push(
      `Keep windows closed around ${aqi.ventilationWindow.peakHour} (${aqi.ventilationWindow.peakPm25} µg/m³) and air out briefly at ${aqi.ventilationWindow.bestStartHour}–${aqi.ventilationWindow.bestEndHour} (${aqi.ventilationWindow.avgPm25InWindow} µg/m³).`
    );
    if (profile.outdoorExerciseHabit) {
      steps.push(
        'Move vigorous runs indoors whenever US AQI > 100 to prevent 3–5× deeper particulate deposition.'
      );
    }
  } else if (action.id === 'diy_corsi_rosenthal') {
    steps.push(
      'Tape four 20×20 MERV-13 filters into a cube with a 20" box fan blowing upward; run continuously in the primary sleeping room.'
    );
    steps.push(
      'Keep bedroom doors closed overnight so the 400–600 CFM Clean Air Delivery Rate achieves 4–6 air changes per hour.'
    );
  } else if (action.id === 'door_seal_wet_mop') {
    steps.push(
      'Place rolled damp towels or peel-and-stick foam strips along window sashes and exterior door thresholds.'
    );
    steps.push(
      'Use a damp microfiber mop instead of a dry broom so settled soot is captured rather than kicked back into breathing height.'
    );
  } else if (action.id === 'clean_cooking_exhaust') {
    steps.push(
      `Because your kitchen uses ${profile.cookingFuel.replace('_', ' ')}, run an exhaust hood (or crack only the kitchen window with the door closed) while cooking.`
    );
    steps.push('Avoid indoor incense, candles, or mosquito coils during inversion days.');
  } else if (action.id === 'n95_commute_shift') {
    steps.push(
      'Wear a snug N95/KN95/KF94 (child-sized KF94 for kids) outdoors whenever PM2.5 exceeds 55 µg/m³.'
    );
    steps.push('Enable cabin "Recirculate" airflow inside vehicles during arterial traffic.');
  } else if (action.id === 'transit_carpool_swap') {
    steps.push(
      `Shift ${profile.commuteKmRoundTrip} km/day ${profile.commuteMode.replace('_', ' ')} trips to metro/bus or a 3-family carpool 3+ days per week.`
    );
    steps.push(
      'Combine short errands (<3 km) into a single warm-engine loop to eliminate high-emitting cold starts.'
    );
  } else if (action.id === 'clean_heating_swap') {
    steps.push(
      'Heat only occupied bedrooms/living spaces with electric heat pumps or oil-filled radiators rather than solid fuel.'
    );
    steps.push('Draw heavy curtains at dusk to preserve daytime thermal gain.');
  } else if (action.id === 'community_no_idle_burn') {
    steps.push(
      `Share ${aqi.city}'s daily ${aqi.ventilationWindow.bestStartHour}–${aqi.ventilationWindow.bestEndHour} safe airing window and AQI alert in local parent/apartment groups.`
    );
    steps.push(
      'Establish a school-gate "Engines Off" pledge and coordinate municipal composting so zero evening leaf/trash fires are lit.'
    );
  }

  const impactParts: string[] = [];
  if (computedIndoorDropUg > 0) impactParts.push(`-${computedIndoorDropUg} µg/m³ indoors`);
  if (computedPm25Grams > 0) impactParts.push(`-${computedPm25Grams} g PM2.5/wk`);
  if (computedCo2eKg > 0) impactParts.push(`-${computedCo2eKg} kg CO2e/wk`);
  if (impactParts.length === 0) impactParts.push(`-${impact.inhaledDoseSavedPct}% total inhaled dose`);

  return {
    id: `rec-${action.id}`,
    category: action.category,
    priority,
    title: action.title,
    timingOrEffort: `${action.costLabel} · Priority Score ${scored.relevanceScore}`,
    steps,
    directImpactHeadline: impactParts.join(' · '),
    directImpactDetail:
      action.category === 'community'
        ? `Scaling to ${impact.communityBlockMultiplier.households} homes avoids ${impact.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5 & ${impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} tonnes CO2e per winter.`
        : `Contributes to lowering household indoor PM2.5 from ${impact.baselineIndoorPm25} to ${impact.optimizedIndoorPm25} µg/m³ and saving ${impact.inhaledDoseSavedUg.toLocaleString()} µg/day inhaled.`,
    scienceWhy: action.impactMechanism,
  };
}

export function buildDeterministicPlan(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  selectedActionIds?: string[]
): TailoredPlanResponse {
  const activeIds =
    selectedActionIds && selectedActionIds.length > 0
      ? selectedActionIds
      : getDefaultSelectedActionIds(profile);

  const impact = calculateImpactSummary(profile, aqi.current.pm25, activeIds);
  const scored = scoreInterventionsForContext(profile, aqi);

  const categories: RecommendationCard['category'][] = [
    'routine',
    'indoor_hack',
    'sustainable_swap',
    'community',
  ];

  const recommendations = categories
    .map((cat) => scored.find((s) => s.action.category === cat))
    .filter((item): item is ScoredIntervention => Boolean(item))
    .map((item) => buildDynamicCardFromScored(item, profile, aqi, impact));

  return {
    mode: 'deterministic-model',
    modelUsed: 'SmogShield Atmospheric & Mass-Balance Model',
    headline:
      aqi.current.usAqi >= 150
        ? `Severe Winter Smog Action Plan for ${aqi.city} (AQI ${aqi.current.usAqi})`
        : `Low-Emission & Clean-Air Plan for ${aqi.city} (AQI ${aqi.current.usAqi})`,
    situationSummary: `${aqi.city} is currently at US AQI ${aqi.current.usAqi} (${aqi.severity.label}, PM2.5 ${aqi.current.pm25} µg/m³—${(
      aqi.current.pm25 / 15
    ).toFixed(1)}× the WHO 24h guideline) with ${aqi.inversionRisk.label.toLowerCase()} thermal inversion risk (${aqi.inversionRisk.score}/100).`,
    riskAlert: impact.vulnerabilityNote,
    recommendations,
    impactSummary: impact,
    disclaimer:
      'Quantified estimates use live Open-Meteo ambient readings, an indoor single-compartment mass-balance infiltration model, and EPA/WHO benchmarks.',
  };
}

export async function generateTailoredPlan(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  selectedActionIds?: string[]
): Promise<TailoredPlanResponse> {
  const activeIds =
    selectedActionIds && selectedActionIds.length > 0
      ? selectedActionIds
      : getDefaultSelectedActionIds(profile);
  const impact = calculateImpactSummary(profile, aqi.current.pm25, activeIds);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return buildDeterministicPlan(profile, aqi, activeIds);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const context = buildContextPrompt(profile, aqi, activeIds);

    const prompt = `
You are SmogShield AI, an atmospheric scientist and practical family/community clean-air coach.
Generate a highly practical, empathetic, science-grounded winter smog action plan tailored specifically to this household's location, live air quality, thermal inversion dynamics, and lifestyle.

${context}

Requirements:
1. Provide exactly 4 recommendations covering all 4 categories: "routine", "indoor_hack", "sustainable_swap", and "community".
2. Every recommendation must cite the specific local AQI, ventilation window, or household parameters (commute, heating, cooking, purifier, sensitive members) and clearly explain the direct quantified impact of their choice (using the impact snapshot numbers accurately).
3. Include budget-realistic, actionable steps (e.g., DIY Corsi-Rosenthal MERV-13 box, damp mopping, cold-start trip batching, electric/zoned heating, zero leaf/waste burning).
4. Never suggest unsafe myths (e.g., ozone air purifiers, houseplants as sufficient smog filters, or cloth/surgical masks as equivalent to N95).
`.trim();

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            situationSummary: { type: Type.STRING },
            riskAlert: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: ['routine', 'indoor_hack', 'sustainable_swap', 'community'],
                  },
                  priority: {
                    type: Type.STRING,
                    enum: ['Immediate', 'High Impact', 'Community Multiplier'],
                  },
                  title: { type: Type.STRING },
                  timingOrEffort: { type: Type.STRING },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  directImpactHeadline: { type: Type.STRING },
                  directImpactDetail: { type: Type.STRING },
                  scienceWhy: { type: Type.STRING },
                },
                required: [
                  'id',
                  'category',
                  'priority',
                  'title',
                  'timingOrEffort',
                  'steps',
                  'directImpactHeadline',
                  'directImpactDetail',
                  'scienceWhy',
                ],
              },
            },
          },
          required: ['headline', 'situationSummary', 'riskAlert', 'recommendations'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}') as Partial<TailoredPlanResponse>;
    if (!parsed.recommendations || parsed.recommendations.length < 3) {
      return buildDeterministicPlan(profile, aqi, activeIds);
    }

    return {
      mode: 'gemini-live',
      modelUsed: DEFAULT_MODEL,
      headline: parsed.headline || `Clean-Air Action Plan for ${aqi.city}`,
      situationSummary:
        parsed.situationSummary ||
        `${aqi.city} is at US AQI ${aqi.current.usAqi} (${aqi.severity.label}).`,
      riskAlert: parsed.riskAlert || impact.vulnerabilityNote,
      recommendations: parsed.recommendations.slice(0, 4),
      impactSummary: impact,
      disclaimer:
        'Powered by Gemini grounded with live Open-Meteo AQI & an indoor mass-balance model. Seek medical care for acute respiratory distress.',
    };
  } catch {
    return buildDeterministicPlan(profile, aqi, activeIds);
  }
}

interface KnowledgeTopic {
  id: string;
  terms: string[];
  compose: (ctx: {
    profile: HouseholdProfile;
    aqi: AirQualitySnapshot;
    impact: ImpactSummary;
    scored: ScoredIntervention[];
  }) => string;
}

const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  {
    id: 'ventilation_inversion',
    terms: [
      'window',
      'ventilation',
      'open',
      'air',
      'hour',
      'time',
      'morning',
      'afternoon',
      'inversion',
      'fog',
      'smog',
    ],
    compose: ({ aqi }) =>
      `**Ventilation & Thermal Inversion Timing (${aqi.city})**\n- **Safe Airing Slot:** ${aqi.ventilationWindow.bestStartHour}–${aqi.ventilationWindow.bestEndHour} (avg ~${aqi.ventilationWindow.avgPm25InWindow} µg/m³ PM2.5), avoiding the **${aqi.ventilationWindow.peakHour}** peak (~${aqi.ventilationWindow.peakPm25} µg/m³).\n- **Atmospheric Physics:** Inversion risk is **${aqi.inversionRisk.label} (${aqi.inversionRisk.score}/100)** at ${aqi.current.temperatureC}°C and ${aqi.current.windSpeedKmh} km/h wind—${aqi.inversionRisk.explanation}\n- **Advisory:** ${aqi.ventilationWindow.advisory}`,
  },
  {
    id: 'indoor_filtration_hacks',
    terms: [
      'indoor',
      'purifier',
      'hepa',
      'corsi',
      'rosenthal',
      'merv',
      'filter',
      'box',
      'fan',
      'diy',
      'mop',
      'seal',
      'house',
      'room',
      'home',
      'plant',
    ],
    compose: ({ profile, aqi, impact }) =>
      `**Indoor Air Quality Engineering (${profile.householdSize}-Person Home)**\n- **Model Output:** Outside PM2.5 is **${aqi.current.pm25} µg/m³**. Your baseline indoor level is **~${impact.baselineIndoorPm25} µg/m³** (${profile.homeSealLevel} envelope, ${profile.purifierType.replace('_', ' ')}), dropping to **~${impact.optimizedIndoorPm25} µg/m³ (-${impact.indoorReductionPct}%)** with active controls.\n- **Corsi-Rosenthal Build:** Four 20×20 MERV-13 filters taped to a 20" box fan (~$35–$55) deliver 400–600 CFM CADR (4–6 bedroom air changes/hour). Note: Houseplants clean <1% of particulate smog, and ozone "ionizers" worsen lung irritation—stick to mechanical MERV-13/HEPA filtration.\n- **Zero-Cost Steps:** Damp-mop instead of dry sweeping, seal door bottoms with damp towels, and isolate kitchen smoke with exhaust venting.`,
  },
  {
    id: 'masking_health_kids',
    terms: [
      'mask',
      'n95',
      'kf94',
      'kn95',
      'kid',
      'child',
      'school',
      'elder',
      'senior',
      'asthma',
      'run',
      'exercise',
      'walk',
      'breath',
      'health',
      'lung',
    ],
    compose: ({ profile, aqi, impact }) =>
      `**Respiratory Protection & Daily Routines (US AQI ${aqi.current.usAqi})**\n- **Masking:** Fit-tested **N95/KN95/KF94** respirators filter ≥94–95% of 0.3 µm particulates; surgical or cloth masks allow 40–70% side leakage.\n- **Exertion Adjustment:** At PM2.5 **${aqi.current.pm25} µg/m³**, move cardio indoors—brisk outdoor exercise increases minute ventilation 3–5×.\n- **Direct Exposure Impact:** Your selected plan saves **${impact.inhaledDoseSavedUg.toLocaleString()} µg/day (${impact.inhaledDoseSavedPct}%)** of inhaled PM2.5 (~**${impact.cigaretteEquivalentsAvoidedPerWeek} fewer cigarette-equivalents/week** per person). ${profile.hasChildren || profile.hasRespiratoryCondition ? 'Priority protection is enabled for sensitive household members.' : ''}`,
  },
  {
    id: 'sustainable_community_impact',
    terms: [
      'commute',
      'car',
      'bus',
      'metro',
      'transit',
      'bike',
      'heat',
      'wood',
      'gas',
      'cook',
      'induction',
      'community',
      'block',
      'neighbor',
      'burn',
      'leaf',
      'co2',
      'emission',
      'impact',
    ],
    compose: ({ profile, impact }) =>
      `**Low-Emission Swaps & Community Block Impact**\n- **Household Footprint Prevented:** Your active choices prevent **${impact.weeklyPm25EmissionsSavedGrams} g of primary PM2.5** and **${impact.weeklyCo2eSavedKg} kg CO2e every week** (${impact.winterSeasonCo2eSavedKg} kg CO2e over 14 winter weeks).\n- **Why Winter Swaps Matter:** Cold-start car engines (${profile.commuteKmRoundTrip} km/day profile) emit 3–5× higher PM2.5 in the first 3 km, and residential solid-fuel heating or evening leaf fires inject dense plumes straight into nocturnal inversions.\n- **Block Multiplier (${impact.communityBlockMultiplier.households} Homes):** Collective adoption prevents **${impact.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5** and **${impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} tonnes CO2e** this winter.`,
  },
];

/**
 * Composes an offline scientific response using weighted token-overlap scoring across
 * domain knowledge modules combined with live atmospheric & mass-balance calculations.
 */
export function buildDeterministicChatReply(
  question: string,
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  selectedActionIds: string[]
): string {
  const impact = calculateImpactSummary(profile, aqi.current.pm25, selectedActionIds);
  const scored = scoreInterventionsForContext(profile, aqi);
  const tokens = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const rankedTopics = KNOWLEDGE_TOPICS.map((topic) => {
    let overlap = 0;
    for (const token of tokens) {
      if (topic.terms.some((term) => term.includes(token) || token.includes(term))) {
        overlap += 1;
      }
    }
    return { topic, overlap };
  }).sort((a, b) => b.overlap - a.overlap);

  const topMatches = rankedTopics.filter((t) => t.overlap > 0).slice(0, 2);

  if (topMatches.length === 0) {
    const topAction = scored[0];
    return [
      `**SmogShield Scientific Briefing — ${aqi.city} (US AQI ${aqi.current.usAqi} · ${aqi.severity.label})**`,
      `- **Highest-Impact Next Step:** *${topAction.action.title}* (Priority Score ${topAction.relevanceScore}; ${topAction.action.impactMechanism})`,
      `- **Indoor Exposure Model:** Baseline **${impact.baselineIndoorPm25} µg/m³** → Protected **${impact.optimizedIndoorPm25} µg/m³** (**-${impact.indoorReductionPct}%**), saving **${impact.inhaledDoseSavedUg.toLocaleString()} µg/day** inhaled across ${profile.householdSize} people.`,
      `- **Safe Airing & Community Impact:** Ventilate briefly around **${aqi.ventilationWindow.bestStartHour}–${aqi.ventilationWindow.bestEndHour}** (~${aqi.ventilationWindow.avgPm25InWindow} µg/m³). Your weekly emissions saved: **${impact.weeklyPm25EmissionsSavedGrams} g PM2.5** & **${impact.weeklyCo2eSavedKg} kg CO2e**.`,
    ].join('\n\n');
  }

  return topMatches
    .map((m) => m.topic.compose({ profile, aqi, impact, scored }))
    .join('\n\n');
}

export async function generateChatReply(params: {
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  profile: HouseholdProfile;
  aqi: AirQualitySnapshot;
  selectedActionIds: string[];
}): Promise<{ reply: string; mode: 'gemini-live' | 'deterministic-model'; modelUsed: string }> {
  const { question, history, profile, aqi, selectedActionIds } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      reply: buildDeterministicChatReply(question, profile, aqi, selectedActionIds),
      mode: 'deterministic-model',
      modelUsed: 'SmogShield Atmospheric & Mass-Balance Model',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const context = buildContextPrompt(profile, aqi, selectedActionIds);
    const catalogSummary = ACTION_CATALOG.map(
      (a) => `- ${a.title} (${a.costLabel}): ${a.impactMechanism}`
    ).join('\n');

    const conversationText = history
      .slice(-8)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `
System Role: You are SmogShield AI, a practical, empathetic, scientifically accurate urban air-quality & winter-smog assistant for families and communities.
Always:
- Tailor advice to the user's live local AQI, thermal inversion risk, ventilation window, and household profile below.
- Explain the direct quantified impact of each choice (indoor PM2.5 drop, inhaled dose saved, emissions prevented, or community multiplier).
- Debunk unsafe myths politely if asked (e.g., never recommend ozone generators, and explain why houseplants cannot clean severe smog).
- Keep answers concise, structured with clear bullet points, and immediately actionable.

${context}

VERIFIED INTERVENTION SCIENCE:
${catalogSummary}

RECENT CONVERSATION:
${conversationText || '(New conversation)'}

User's latest question: ${question}
`.trim();

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: { temperature: 0.45 },
    });

    const text = (response.text || '').trim();
    if (!text) {
      throw new Error('Empty Gemini response');
    }

    return {
      reply: text,
      mode: 'gemini-live',
      modelUsed: DEFAULT_MODEL,
    };
  } catch {
    return {
      reply: buildDeterministicChatReply(question, profile, aqi, selectedActionIds),
      mode: 'deterministic-model',
      modelUsed: 'SmogShield Atmospheric & Mass-Balance Model',
    };
  }
}
