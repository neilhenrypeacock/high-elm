import { describe, it, expect } from 'vitest';
import {
  FOUNDING_PRICE_GBP,
  FOUNDING_PRICE_PENCE,
  STANDARD_PRICE_GBP,
  STANDARD_PRICE_PENCE,
  FOUNDING_PLACES_TOTAL,
  FOUNDING_PLACES_TAKEN,
  FOUNDING_PLACES_LEFT,
  FOUNDING_OPEN,
  FOUNDING_PRICE_DISPLAY,
  STANDARD_PRICE_DISPLAY,
  FOUNDING_PRICE_MONTHLY,
  STANDARD_PRICE_MONTHLY,
  PLACES_LEFT_LINE,
  TRIAL_DAYS,
  TRIAL_FINE_PRINT,
  VALUE_STACK,
  VALUE_STACK_TOTAL_GBP,
  monthlyCost,
} from '../lib/pricing';

// These tests deliberately assert against lib/pricing.ts rather than hardcoded
// numbers: their job is to stop the file drifting internally (pence not matching
// pounds, a seat count that doesn't add up, a value-stack total that doesn't
// equal its rows) — the exact price is Neil's to change, and changing it should
// not break the suite.
describe('pricing — the single source of truth', () => {
  it('states pence and pounds consistently', () => {
    expect(FOUNDING_PRICE_PENCE).toBe(FOUNDING_PRICE_GBP * 100);
    expect(STANDARD_PRICE_PENCE).toBe(STANDARD_PRICE_GBP * 100);
  });

  it('prices the founding tier below the standard tier', () => {
    expect(FOUNDING_PRICE_GBP).toBeLessThan(STANDARD_PRICE_GBP);
  });

  it('derives places-left and the open flag from the seat counts', () => {
    expect(FOUNDING_PLACES_LEFT).toBe(FOUNDING_PLACES_TOTAL - FOUNDING_PLACES_TAKEN);
    expect(FOUNDING_OPEN).toBe(FOUNDING_PLACES_LEFT > 0);
  });

  it('never claims more places taken than exist', () => {
    expect(FOUNDING_PLACES_TAKEN).toBeGreaterThanOrEqual(0);
    expect(FOUNDING_PLACES_TAKEN).toBeLessThanOrEqual(FOUNDING_PLACES_TOTAL);
  });

  it('builds display strings from the numbers, not by hand', () => {
    expect(FOUNDING_PRICE_DISPLAY).toBe(`£${FOUNDING_PRICE_GBP}`);
    expect(STANDARD_PRICE_DISPLAY).toBe(`£${STANDARD_PRICE_GBP}`);
    expect(FOUNDING_PRICE_MONTHLY).toBe(`£${FOUNDING_PRICE_GBP}/month`);
    expect(STANDARD_PRICE_MONTHLY).toBe(`£${STANDARD_PRICE_GBP}/month`);
    expect(PLACES_LEFT_LINE).toBe(`${FOUNDING_PLACES_LEFT} of ${FOUNDING_PLACES_TOTAL} places left`);
    expect(TRIAL_FINE_PRINT).toContain(String(TRIAL_DAYS));
  });

  it('derives the value-stack total from its rows', () => {
    const summed = VALUE_STACK.reduce((n, r) => n + r.monthlyGbp, 0);
    expect(VALUE_STACK_TOTAL_GBP).toBe(summed);
  });

  it('keeps the value stack worth more than the founding price', () => {
    expect(VALUE_STACK_TOTAL_GBP).toBeGreaterThan(FOUNDING_PRICE_GBP);
  });

  it('formats monthly costs with thousands separators', () => {
    expect(monthlyCost(400)).toBe('£400/mo');
    expect(monthlyCost(1800)).toBe('£1,800/mo');
  });
});
