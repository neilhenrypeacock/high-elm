// Check 7 — null-likes ratio drift. Instagram hiding likes is normal (~16%
// of posts). What matters is a sudden JUMP: that means the Apify actor
// changed behaviour or Instagram changed markup, and baselines will quietly
// thin out. Compares the last 7 days against the trailing-90-day norm.

import { NULL_DRIFT_WARN_PP } from '../constants.js';
import { daysAgoIso } from '../lib.js';

export const id = 'null-drift';
export const name = 'Hidden-likes ratio drift';

export function evaluate(recentTotal, recentNull, normTotal, normNull) {
  if (recentTotal === 0) {
    return { status: 'ok', headline: 'No posts published in the last 7 days to measure.', details: [] };
  }
  const recentPct = (recentNull / recentTotal) * 100;
  const normPct = normTotal ? (normNull / normTotal) * 100 : 0;
  const driftPp = recentPct - normPct;
  const line = `${recentPct.toFixed(1)}% of this week's posts have hidden likes (norm ${normPct.toFixed(1)}%).`;
  if (driftPp >= NULL_DRIFT_WARN_PP) {
    return {
      status: 'warn',
      headline: `Hidden-likes share jumped ${driftPp.toFixed(0)} points: ${line}`,
      details: ['A jump this size usually means the scraping robot changed behaviour, not that hotels changed theirs. Baselines will thin out if it persists.'],
    };
  }
  return { status: 'ok', headline: line, details: [] };
}

export async function run(ctx) {
  const weekCut = daysAgoIso(7, ctx.now);
  const normCut = daysAgoIso(97, ctx.now);
  let recentTotal = 0, recentNull = 0, normTotal = 0, normNull = 0;
  for (const p of ctx.data.postsYear) {
    const isNull = p.likes_count === null;
    if (p.posted_at >= weekCut) { recentTotal++; if (isNull) recentNull++; }
    else if (p.posted_at >= normCut) { normTotal++; if (isNull) normNull++; }
  }
  return evaluate(recentTotal, recentNull, normTotal, normNull);
}
