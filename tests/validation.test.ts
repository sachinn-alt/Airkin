import { describe, expect, it } from 'vitest';
import { ACTION_CATALOG } from '../shared/impactEngine.js';
import {
  sanitizeText,
  validateActionIds,
  validateChatHistory,
  validateCityQuery,
  validateProfile,
} from '../server/validation.js';

describe('server validation & sanitization', () => {
  it('strips control characters and enforces maxLength in sanitizeText', () => {
    expect(sanitizeText('  Delhi\n\r\t<ok>  ', 10)).toBe('Delhi   <o');
    expect(sanitizeText(12345)).toBe('');
    expect(sanitizeText(null)).toBe('');
  });

  it('defaults blank or 1-char city queries cleanly to Delhi', () => {
    expect(validateCityQuery('')).toBe('Delhi');
    expect(validateCityQuery('a')).toBe('Delhi');
    expect(validateCityQuery('  Srinagar  ')).toBe('Srinagar');
  });

  it('clamps numeric bounds and coerces invalid enum fields to safe defaults', () => {
    const clean = validateProfile({
      city: 'Jammu',
      householdSize: 99,
      commuteKmRoundTrip: -10,
      latitude: 120,
      longitude: -220,
      commuteMode: 'spaceship',
      heatingSource: 'bonfire',
      cookingFuel: 'coal',
      purifierType: 'magic',
      homeSealLevel: 'open',
      role: 'admin',
      budgetTier: 'unlimited',
    });

    expect(clean.city).toBe('Jammu');
    expect(clean.householdSize).toBe(15);
    expect(clean.commuteKmRoundTrip).toBe(0);
    expect(clean.latitude).toBeUndefined();
    expect(clean.longitude).toBeUndefined();
    expect(clean.commuteMode).toBe('solo_car');
    expect(clean.heatingSource).toBe('gas_heater');
    expect(clean.cookingFuel).toBe('gas_stove');
    expect(clean.purifierType).toBe('none');
    expect(clean.homeSealLevel).toBe('average');
    expect(clean.role).toBe('family');
    expect(clean.budgetTier).toBe('low_budget');
  });

  it('deduplicates and filters unknown action IDs', () => {
    const first = ACTION_CATALOG[0].id;
    const second = ACTION_CATALOG[1].id;
    const ids = validateActionIds([
      first,
      first,
      'malicious_payload',
      second,
    ]);
    expect(ids).toEqual([first, second]);
    expect(validateActionIds('not-an-array')).toEqual([]);
  });

  it('sanitizes chat history entries and limits to tail window', () => {
    const raw = Array.from({ length: 12 }, (_, idx) => ({
      role: idx % 2 === 0 ? 'user' : 'assistant',
      content: `Turn ${idx}`,
    }));
    raw.push({ role: 'system', content: '   ' });

    const history = validateChatHistory(raw);
    expect(history.length).toBe(8);
    expect(history[history.length - 1].content).toBe('Turn 11');
  });
});
