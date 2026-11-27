export type CommuteMode = 'solo_car' | 'motorbike' | 'public_transit' | 'walk_cycle' | 'remote';
export type HeatingSource = 'wood_coal' | 'gas_heater' | 'electric_heat_pump' | 'none';
export type CookingFuel = 'biomass_kerosene' | 'gas_stove' | 'induction_electric';
export type PurifierType = 'none' | 'single_hepa' | 'diy_corsi_rosenthal';
export type HomeSealLevel = 'drafty' | 'average' | 'well_sealed';
export type AssistantRole = 'family' | 'community';

export interface HouseholdProfile {
  city: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  role: AssistantRole;
  householdSize: number;
  hasChildren: boolean;
  hasSeniors: boolean;
  hasRespiratoryCondition: boolean;
  commuteMode: CommuteMode;
  commuteKmRoundTrip: number;
  heatingSource: HeatingSource;
  cookingFuel: CookingFuel;
  purifierType: PurifierType;
  homeSealLevel: HomeSealLevel;
  outdoorExerciseHabit: boolean;
  budgetTier: 'zero_cost' | 'low_budget' | 'flexible';
}

export interface HourlyAqiPoint {
  time: string;
  hourLabel: string;
  pm25: number;
  pm10: number;
  usAqi: number;
  temperatureC?: number;
  windSpeedKmh?: number;
}

export interface VentilationWindow {
  bestStartHour: string;
  bestEndHour: string;
  avgPm25InWindow: number;
  peakHour: string;
  peakPm25: number;
  advisory: string;
}

export interface CpcbAqiInfo {
  aqi: number;
  category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
  colorToken: 'emerald' | 'lime' | 'amber' | 'orange' | 'red' | 'rose';
}

export interface AirQualitySnapshot {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  source: 'open-meteo-live' | 'offline-scenario';
  fetchedAt: string;
  current: {
    pm25: number;
    pm10: number;
    no2: number;
    co: number;
    so2: number;
    o3: number;
    usAqi: number;
    indianAqi?: number;
    cpcbCategory?: CpcbAqiInfo['category'];
    cpcbColorToken?: CpcbAqiInfo['colorToken'];
    europeanAqi: number;
    temperatureC: number;
    windSpeedKmh: number;
    humidityPct: number;
    weatherCode?: number;
    weatherLabel?: string;
  };
  severity: {
    level: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
    label: string;
    colorToken: 'emerald' | 'amber' | 'orange' | 'red' | 'purple' | 'rose';
    summary: string;
  };
  inversionRisk: {
    score: number; // 0-100
    label: 'Low' | 'Moderate' | 'High' | 'Severe Trap';
    explanation: string;
  };
  ventilationWindow: VentilationWindow;
  hourly: HourlyAqiPoint[];
}

export type ChoiceCategory = 'routine' | 'indoor_hack' | 'sustainable_swap' | 'community';

export interface ActionChoice {
  id: string;
  category: ChoiceCategory;
  title: string;
  shortLabel: string;
  description: string;
  costLabel: 'Free' | 'Low Cost (~$25-$60)' | 'Upgrade';
  /** Multiplicative reduction on indoor infiltration or indoor source PM2.5 */
  indoorPm25ReductionPct: number;
  /** Flat indoor source PM2.5 removed in ug/m3 (e.g., replacing indoor gas/biomass/incense) */
  indoorSourceRemovedUgM3: number;
  /** Percentage reduction in outdoor inhaled dose during peak smog */
  outdoorExposureReductionPct: number;
  /** Primary PM2.5 emissions avoided per week (grams) */
  weeklyPm25EmissionsSavedGrams: number;
  /** CO2e emissions avoided per week (kg) */
  weeklyCo2eSavedKg: number;
  /** Clear mechanistic explanation of why this works and its direct impact */
  impactMechanism: string;
  /** Conditions under which this action is most relevant */
  recommendedFor: string;
}

export interface ImpactSummary {
  outdoorPm25: number;
  baselineIndoorPm25: number;
  optimizedIndoorPm25: number;
  indoorReductionPct: number;
  whoGuidelineUgM3: number;
  baselineDailyInhaledUg: number;
  optimizedDailyInhaledUg: number;
  inhaledDoseSavedUg: number;
  inhaledDoseSavedPct: number;
  cigaretteEquivalentsAvoidedPerWeek: number;
  weeklyPm25EmissionsSavedGrams: number;
  weeklyCo2eSavedKg: number;
  winterSeasonCo2eSavedKg: number;
  communityBlockMultiplier: {
    households: number;
    seasonPm25AvoidedKg: number;
    seasonCo2eAvoidedTonnes: number;
  };
  vulnerabilityNote: string;
}

export interface RecommendationCard {
  id: string;
  category: 'routine' | 'indoor_hack' | 'sustainable_swap' | 'community';
  priority: 'Immediate' | 'High Impact' | 'Community Multiplier';
  title: string;
  timingOrEffort: string;
  steps: string[];
  directImpactHeadline: string;
  directImpactDetail: string;
  scienceWhy: string;
}

export interface TailoredPlanResponse {
  mode: 'gemini-live';
  modelUsed: string;
  headline: string;
  situationSummary: string;
  riskAlert: string;
  recommendations: RecommendationCard[];
  impactSummary: ImpactSummary;
  disclaimer: string;
}

export type IndiaRegion = 'North' | 'West' | 'East' | 'South' | 'Central';

export interface IndiaFeedCity {
  city: string;
  state: string;
  region: IndiaRegion;
  latitude: number;
  longitude: number;
  usAqi: number;
  indianAqi: number;
  cpcbCategory: CpcbAqiInfo['category'];
  cpcbColorToken: CpcbAqiInfo['colorToken'];
  pm25: number;
  pm10: number;
  temperatureC: number;
  windSpeedKmh: number;
  humidityPct: number;
  weatherCode: number;
  weatherLabel: string;
  severity: AirQualitySnapshot['severity'];
  inversionScore: number;
  inversionLabel: AirQualitySnapshot['inversionRisk']['label'];
}

export interface IndiaLiveFeedResponse {
  source: 'open-meteo-live' | 'offline-scenario';
  fetchedAt: string;
  cities: IndiaFeedCity[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: 'gemini-live';
}
