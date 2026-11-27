import type {
  AssistantRole,
  CommuteMode,
  CookingFuel,
  HeatingSource,
  HomeSealLevel,
  HouseholdProfile,
  PurifierType,
} from '../shared/types.js';

const COMMUTE_MODES: CommuteMode[] = [
  'solo_car',
  'motorbike',
  'public_transit',
  'walk_cycle',
  'remote',
];
const HEATING_SOURCES: HeatingSource[] = [
  'wood_coal',
  'gas_heater',
  'electric_heat_pump',
  'none',
];
const COOKING_FUELS: CookingFuel[] = [
  'biomass_kerosene',
  'gas_stove',
  'induction_electric',
];
const PURIFIER_TYPES: PurifierType[] = ['none', 'single_hepa', 'diy_corsi_rosenthal'];
const SEAL_LEVELS: HomeSealLevel[] = ['drafty', 'average', 'well_sealed'];
const ROLES: AssistantRole[] = ['family', 'community'];
const BUDGET_TIERS: HouseholdProfile['budgetTier'][] = [
  'zero_cost',
  'low_budget',
  'flexible',
];

function clampInt(val: unknown, fallback: number, min: number, max: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function sanitizeText(input: unknown, maxLen = 120): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function validateCityQuery(city: unknown): string {
  const cleaned = sanitizeText(city, 80);
  return cleaned.length >= 2 ? cleaned : 'Delhi';
}

export function validateProfile(raw: unknown): HouseholdProfile {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const commuteMode = COMMUTE_MODES.includes(input.commuteMode as CommuteMode)
    ? (input.commuteMode as CommuteMode)
    : 'solo_car';

  const heatingSource = HEATING_SOURCES.includes(input.heatingSource as HeatingSource)
    ? (input.heatingSource as HeatingSource)
    : 'gas_heater';

  const cookingFuel = COOKING_FUELS.includes(input.cookingFuel as CookingFuel)
    ? (input.cookingFuel as CookingFuel)
    : 'gas_stove';

  const purifierType = PURIFIER_TYPES.includes(input.purifierType as PurifierType)
    ? (input.purifierType as PurifierType)
    : 'none';

  const homeSealLevel = SEAL_LEVELS.includes(input.homeSealLevel as HomeSealLevel)
    ? (input.homeSealLevel as HomeSealLevel)
    : 'average';

  const role = ROLES.includes(input.role as AssistantRole)
    ? (input.role as AssistantRole)
    : 'family';

  const budgetTier = BUDGET_TIERS.includes(input.budgetTier as HouseholdProfile['budgetTier'])
    ? (input.budgetTier as HouseholdProfile['budgetTier'])
    : 'low_budget';

  return {
    city: validateCityQuery(input.city),
    country: sanitizeText(input.country, 60) || undefined,
    latitude:
      typeof input.latitude === 'number' &&
      Number.isFinite(input.latitude) &&
      input.latitude >= -90 &&
      input.latitude <= 90
        ? input.latitude
        : undefined,
    longitude:
      typeof input.longitude === 'number' &&
      Number.isFinite(input.longitude) &&
      input.longitude >= -180 &&
      input.longitude <= 180
        ? input.longitude
        : undefined,
    role,
    householdSize: clampInt(input.householdSize, 4, 1, 15),
    hasChildren: Boolean(input.hasChildren),
    hasSeniors: Boolean(input.hasSeniors),
    hasRespiratoryCondition: Boolean(input.hasRespiratoryCondition),
    commuteMode,
    commuteKmRoundTrip: clampInt(input.commuteKmRoundTrip, 14, 0, 150),
    heatingSource,
    cookingFuel,
    purifierType,
    homeSealLevel,
    outdoorExerciseHabit: Boolean(input.outdoorExerciseHabit),
    budgetTier,
  };
}

export function validateActionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizeText(item, 48))
    .filter(Boolean)
    .slice(0, 20);
}

export function validateChatHistory(
  raw: unknown
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (msg): msg is { role: unknown; content: unknown } =>
        Boolean(msg) && typeof msg === 'object'
    )
    .slice(-12)
    .map((msg) => ({
      role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: sanitizeText(msg.content, 1500),
    }))
    .filter((msg) => msg.content.length > 0);
}

