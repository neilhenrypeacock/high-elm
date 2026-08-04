// Check 3 — snapshot coverage. A scrape can "succeed" while skipping whole
// batches of hotels (this happened 1 Aug: green tick, 0 of 200 covered).
// Every successfully scraped hotel gets a profile snapshot, so coverage of
// the last cycle is the honest measure of how much of the portfolio the last
// scrape actually reached.

import { COVERAGE_WINDOW_DAYS, COVERAGE_WARN, COVERAGE_FAIL } from '../constants.js';
import { daysAgoIso } from '../lib.js';

export const id = 'snapshot-coverage';
export const name = 'Hotel coverage (last scrape cycle)';

export function evaluate(trackedHandles, coveredHandles) {
  const tracked = new Set(trackedHandles);
  const covered = new Set(coveredHandles.filter((h) => tracked.has(h)));
  if (tracked.size === 0) {
    return { status: 'fail', headline: 'No tracked hotels found — the hotels table looks wrong.', details: [] };
  }
  const ratio = covered.size / tracked.size;
  const missing = [...tracked].filter((h) => !covered.has(h));
  const line = `${covered.size} of ${tracked.size} tracked hotels were reached in the last ${COVERAGE_WINDOW_DAYS} days (${(ratio * 100).toFixed(0)}%).`;
  if (ratio < COVERAGE_FAIL) {
    return {
      status: 'fail',
      headline: `The last scrape cycle missed most hotels — ${line}`,
      details: [`Missing (first 20): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '…' : ''}`,
        'A batch-level failure inside a "successful" run looks exactly like this — check the scrape logs.'],
    };
  }
  if (ratio < COVERAGE_WARN) {
    return {
      status: 'warn',
      headline: line,
      details: [`Missing: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '…' : ''}`],
    };
  }
  return { status: 'ok', headline: line, details: [] };
}

export async function run(ctx) {
  const covered = await ctx.pagedSelect(() =>
    ctx.supabase.from('profile_snapshots').select('instagram_handle')
      .gte('captured_at', daysAgoIso(COVERAGE_WINDOW_DAYS, ctx.now)));
  return evaluate(ctx.data.trackedHandles, covered.map((r) => r.instagram_handle));
}
