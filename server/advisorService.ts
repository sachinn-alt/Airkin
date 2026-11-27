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
  TailoredPlanResponse,
} from '../shared/types.js';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_FALLBACK_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

export class AiServiceError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AiServiceError';
    this.statusCode = statusCode;
  }
}

export interface ScoredIntervention {
  action: ActionChoice;
  relevanceScore: number;
  computedIndoorDropUg: number;
  computedCo2eKg: number;
  computedPm25Grams: number;
}

/**
 * Ranks physical interventions using live atmospheric metrics and household parameters
 * to supply grounded quantitative context to Gemini.
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

export function buildContextPrompt(
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  selectedActionIds: string[]
): string {
  const impact = calculateImpactSummary(profile, aqi.current.pm25, selectedActionIds);
  const ranked = scoreInterventionsForContext(profile, aqi)
    .slice(0, 5)
    .map(
      (r, idx) =>
        `${idx + 1}. ${r.action.title} (Priority Score ${r.relevanceScore}, -${r.computedIndoorDropUg} µg/m³ indoor, -${r.computedPm25Grams} g PM2.5/wk, -${r.computedCo2eKg} kg CO2e/wk)`
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

TOP RANKED INTERVENTIONS FOR THIS HOUSEHOLD:
${ranked}

QUANTITATIVE IMPACT SNAPSHOT (from mass-balance model):
- Baseline indoor PM2.5: ${impact.baselineIndoorPm25} µg/m³ -> With chosen interventions: ${impact.optimizedIndoorPm25} µg/m³ (${impact.indoorReductionPct}% drop)
- Daily household inhaled PM2.5 avoided: ${impact.inhaledDoseSavedUg} µg/day (${impact.inhaledDoseSavedPct}% less)
- Weekly community emissions avoided: ${impact.weeklyPm25EmissionsSavedGrams} g primary PM2.5 and ${impact.weeklyCo2eSavedKg} kg CO2e
- Block multiplier (${impact.communityBlockMultiplier.households} households over 14 winter weeks): ${impact.communityBlockMultiplier.seasonPm25AvoidedKg} kg PM2.5 & ${impact.communityBlockMultiplier.seasonCo2eAvoidedTonnes} tonnes CO2e prevented.
`.trim();
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiServiceError(
      'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY to .env to enable Gemini 3.8 Flash.',
      503
    );
  }
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithGeminiRetry(
  ai: GoogleGenAI,
  params: { contents: string; config?: Record<string, unknown> }
): Promise<{ text: string; modelUsed: string }> {
  const models = Array.from(new Set([DEFAULT_MODEL, ...GEMINI_FALLBACK_CHAIN]));
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        const text = (response.text || '').trim();
        if (text) {
          return { text, modelUsed: model };
        }
      } catch (err) {
        lastError = err;
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          throw new AiServiceError('Server GEMINI_API_KEY was rejected by Google Gemini API.', 502);
        }
        // On 404 (model unavailable) immediately move to next model in chain
        if (status === 404) break;
        if (attempt === 0) await sleep(350);
      }
    }
  }

  const lastStatus = (lastError as { status?: number })?.status;
  if (lastStatus === 503 || lastStatus === 429) {
    throw new AiServiceError(
      'Google Gemini models are temporarily experiencing high demand. Please retry in a few seconds.',
      503
    );
  }
  throw new AiServiceError('Unable to reach Gemini upstream service.', 502);
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
  const ai = getGeminiClient();
  const context = buildContextPrompt(profile, aqi, activeIds);

  const prompt = `
You are AirKin, an atmospheric scientist and practical family/community clean-air coach.
Generate a highly practical, empathetic, science-grounded winter smog action plan tailored specifically to this household's location, live air quality, thermal inversion dynamics, and lifestyle.

${context}

Requirements:
1. Provide exactly 4 recommendations covering all 4 categories: "routine", "indoor_hack", "sustainable_swap", and "community".
2. Every recommendation must cite the specific local AQI, ventilation window, or household parameters (commute, heating, cooking, purifier, sensitive members) and clearly explain the direct quantified impact of their choice (using the impact snapshot numbers accurately).
3. Include budget-realistic, actionable steps (e.g., DIY Corsi-Rosenthal MERV-13 box, damp mopping, cold-start trip batching, electric/zoned heating, zero leaf/waste burning).
4. Never suggest unsafe myths (e.g., ozone air purifiers, houseplants as sufficient smog filters, or cloth/surgical masks as equivalent to N95).
`.trim();

  const { text, modelUsed } = await generateWithGeminiRetry(ai, {
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

  let parsed: Partial<TailoredPlanResponse>;
  try {
    parsed = JSON.parse(text) as Partial<TailoredPlanResponse>;
  } catch {
    throw new AiServiceError('Gemini returned invalid JSON for the action plan.', 502);
  }

  if (!parsed.recommendations || parsed.recommendations.length < 1) {
    throw new AiServiceError('Gemini returned an incomplete structured plan.', 502);
  }

  return {
    mode: 'gemini-live',
    modelUsed,
    headline: parsed.headline || `Clean-Air Action Plan for ${aqi.city}`,
    situationSummary:
      parsed.situationSummary ||
      `${aqi.city} is at US AQI ${aqi.current.usAqi} (${aqi.severity.label}).`,
    riskAlert: parsed.riskAlert || impact.vulnerabilityNote,
    recommendations: parsed.recommendations.slice(0, 4),
    impactSummary: impact,
    disclaimer: `Powered by Google ${modelUsed} grounded with live Open-Meteo AQI & an indoor mass-balance model. Seek medical care for acute respiratory distress.`,
  };
}

export async function generateChatReply(params: {
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  profile: HouseholdProfile;
  aqi: AirQualitySnapshot;
  selectedActionIds: string[];
}): Promise<{ reply: string; mode: 'gemini-live'; modelUsed: string }> {
  const { question, history, profile, aqi, selectedActionIds } = params;
  const ai = getGeminiClient();
  const context = buildContextPrompt(profile, aqi, selectedActionIds);
  const catalogSummary = ACTION_CATALOG.map(
    (a) => `- ${a.title} (${a.costLabel}): ${a.impactMechanism}`
  ).join('\n');

  const conversationText = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `
System Role: You are AirKin, a practical, empathetic, scientifically accurate urban air-quality & winter-smog assistant for families and communities.
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

  const { text, modelUsed } = await generateWithGeminiRetry(ai, {
    contents: prompt,
    config: { temperature: 0.45 },
  });

  return {
    reply: text,
    mode: 'gemini-live',
    modelUsed,
  };
}
