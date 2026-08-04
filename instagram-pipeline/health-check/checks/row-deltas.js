// Check 4 — row-count deltas, stateless. Instead of remembering yesterday's
// totals (which would need stored state), count rows CAPTURED in the last 24h
// and judge them against whether a scrape actually ran in that window:
// scrape ran + zero rows = the 1 Aug failure mode; no scrape + zero rows =
// a normal quiet day.

import { DELTA_RUNAWAY_ROWS } from '../constants.js';
import { daysAgoIso, ageDays } from '../lib.js';

export const id = 'row-deltas';
export const name = 'Ingestion volume (24h)';

export function evaluate(postsAdded, snapshotsAdded, scrapeRanInLast24h) {
  const line = `${postsAdded} posts and ${snapshotsAdded} profile snapshots ingested in the last 24h.`;
  if (scrapeRanInLast24h && postsAdded === 0) {
    return {
      status: 'fail',
      headline: 'A scrape ran in the last 24h but ingested ZERO posts.',
      details: [line, 'This is the "green tick, empty run" failure — check Apify billing and the run log.'],
    };
  }
  if (postsAdded > DELTA_RUNAWAY_ROWS) {
    return {
      status: 'warn',
      headline: `Unusually large ingestion: ${line}`,
      details: ['A full-history scrape explains this; anything else deserves a look at Apify usage (cost).'],
    };
  }
  return { status: 'ok', headline: line, details: [] };
}

export async function run(ctx) {
  const since = daysAgoIso(1, ctx.now);
  const posts = await ctx.countExact(() =>
    ctx.supabase.from('posts').select('post_id', { count: 'exact', head: true }).gte('captured_at', since));
  const snaps = await ctx.countExact(() =>
    ctx.supabase.from('profile_snapshots').select('id', { count: 'exact', head: true }).gte('captured_at', since));
  const lastRun = ctx.shared.lastScrapeRun;
  const ranRecently = Boolean(
    lastRun && lastRun.conclusion === 'success' && ageDays(lastRun.run_started_at ?? lastRun.created_at, ctx.now) <= 1,
  );
  return evaluate(posts, snaps, ranRecently);
}
