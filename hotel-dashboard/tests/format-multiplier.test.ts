import { describe, it, expect } from 'vitest';
import {
  MULTIPLIER_CAP,
  CAPPED_MULTIPLIER_LABEL,
  isCappedMultiplier,
  formatMultiplier,
  belowCap,
} from '../lib/format-multiplier';

describe('formatMultiplier', () => {
  it('shows one decimal below the cap', () => {
    expect(formatMultiplier(2)).toBe('2.0×');
    expect(formatMultiplier(31.0526)).toBe('31.1×');
    expect(formatMultiplier(49.94)).toBe('49.9×');
  });

  it('caps at the threshold, inclusive', () => {
    expect(formatMultiplier(MULTIPLIER_CAP)).toBe(CAPPED_MULTIPLIER_LABEL);
    expect(formatMultiplier(50.1)).toBe(CAPPED_MULTIPLIER_LABEL);
    // The two figures this cap exists for: Okada Manila and Crockfords.
    expect(formatMultiplier(1226.8724832214766)).toBe('50×+');
    expect(formatMultiplier(857.1578947368421)).toBe('50×+');
  });

  it('never renders a raw figure for a non-finite multiplier', () => {
    expect(formatMultiplier(Infinity)).toBe(CAPPED_MULTIPLIER_LABEL);
    expect(formatMultiplier(NaN)).toBe(CAPPED_MULTIPLIER_LABEL);
  });

  it('rounds up to the cap rather than printing 50.0×', () => {
    // 49.96 rounds to "50.0×" with toFixed, which would read as an uncapped
    // figure sitting exactly on the threshold. It must show the capped label.
    expect(formatMultiplier(49.96)).toBe(CAPPED_MULTIPLIER_LABEL);
  });
});

describe('isCappedMultiplier', () => {
  it('is false below the cap and true at or above it', () => {
    expect(isCappedMultiplier(49.9)).toBe(false);
    expect(isCappedMultiplier(MULTIPLIER_CAP)).toBe(true);
    expect(isCappedMultiplier(1226.87)).toBe(true);
  });
});

describe('belowCap', () => {
  const posts = [
    { multiplier: 1226.87, id: 'okada' },
    { multiplier: 84.6, id: 'okada-2' },
    { multiplier: 31.1, id: 'wynn' },
    { multiplier: 19.1, id: 'taj' },
  ];

  it('drops capped posts from a showcase but keeps order', () => {
    expect(belowCap(posts).map(p => p.id)).toEqual(['wynn', 'taj']);
  });

  it('falls back to the full list when everything is capped', () => {
    const allCapped = [{ multiplier: 1226.87 }, { multiplier: 857.16 }];
    expect(belowCap(allCapped)).toEqual(allCapped);
  });

  it('handles an empty list', () => {
    expect(belowCap([])).toEqual([]);
  });
});
