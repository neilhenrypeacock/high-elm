// Check 1 — data freshness. Absorbs the old check-freshness.js alarm.
// How old is the newest post we hold? A healthy weekly cadence keeps this
// under 8 days; past 10 the dashboard is visibly stale to members.

import { FRESH_WARN_DAYS, FRESH_FAIL_DAYS } from '../constants.js';
import { ageDays } from '../lib.js';

export const id = 'freshness';
export const name = 'Data freshness';

export function evaluate(newestPostedAt, now = Date.now()) {
  if (!newestPostedAt) {
    return {
      status: 'fail',
      headline: 'The posts table returned no dated rows at all.',
      details: ['Either the database is unreachable or something emptied it — investigate immediately.'],
    };
  }
  const age = ageDays(newestPostedAt, now);
  const line = `Newest post is ${age.toFixed(1)} days old (posted ${newestPostedAt.slice(0, 16)} UTC).`;
  if (age > FRESH_FAIL_DAYS) {
    return {
      status: 'fail',
      headline: `Data is ${age.toFixed(1)} days old — the scrape has been failing or not running.`,
      details: [line, 'Check the last scrape run (see the scrape-outcome check) and Apify billing — an unpaid invoice reads exactly like this.'],
    };
  }
  if (age > FRESH_WARN_DAYS) {
    return {
      status: 'warn',
      headline: `Data is ${age.toFixed(1)} days old — one scrape cycle overdue.`,
      details: [line, 'If Monday\'s scrape ran, this resolves itself; if it did not, see the scrape-outcome check.'],
    };
  }
  return { status: 'ok', headline: line, details: [] };
}

export async function run(ctx) {
  const { data, error } = await ctx.supabase
    .from('posts').select('posted_at')
    .not('posted_at', 'is', null)
    .order('posted_at', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return evaluate(data?.[0]?.posted_at ?? null, ctx.now);
}
