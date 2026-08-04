// Check 13 — breakout-count sanity. Zero breakouts in the 7-day window means
// the feed members pay for is empty (usually staleness underneath — cross-
// reference the freshness check). A count far above the recent pace means
// something inflated the feed (a baseline shift, a data leak).

import {
  OUTLIER_THRESHOLD, MIN_ENGAGEMENT, MIN_BASELINE_ENGAGEMENT,
  BASELINE_POSTS, BASELINE_MAX_AGE_DAYS, BREAKOUT_INFLATED_RATIO,
} from '../constants.js';
import { daysAgoIso, hotelMedians, hasVisibleLikes, engagement } from '../lib.js';

export const id = 'breakout-sanity';
export const name = 'Breakout count sanity';

export function countBreakouts(posts, medians) {
  let n = 0;
  for (const p of posts) {
    if (!hasVisibleLikes(p.likes_count)) continue;
    const eng = engagement(p);
    if (eng < MIN_ENGAGEMENT) continue;
    const med = medians.get(p.instagram_handle);
    if (!med || med < MIN_BASELINE_ENGAGEMENT) continue;
    if (eng / med >= OUTLIER_THRESHOLD) n++;
  }
  return n;
}

export function evaluate(count7, count28) {
  const expected7 = count28 / 4; // the trailing-28-day pace, expressed per week
  const line = `${count7} breakout(s) in the last 7 days (recent pace: ~${expected7.toFixed(1)}/week).`;
  if (count7 === 0) {
    return {
      status: 'fail',
      headline: 'ZERO breakouts in the 7-day window — the feed members see is empty.',
      details: [line, 'Cross-reference the freshness check: stale data is the usual cause. A genuinely quiet week shows the "Closest this week" fallback, but zero here plus fresh data deserves a look at the baselines.'],
    };
  }
  if (expected7 > 0 && count7 > expected7 * BREAKOUT_INFLATED_RATIO) {
    return {
      status: 'warn',
      headline: `Breakout count is ${(count7 / expected7).toFixed(1)}× the recent pace — something may have inflated the feed.`,
      details: [line, 'A burst of real news can do this; so can a baseline problem. Skim the Top posts list before publishing.'],
    };
  }
  return { status: 'ok', headline: line, details: [] };
}

export async function run(ctx) {
  const tracked = new Set(ctx.data.trackedHandles);
  const medians = hotelMedians(ctx.data.postsYear, {
    baselinePosts: BASELINE_POSTS, maxAgeDays: BASELINE_MAX_AGE_DAYS, now: ctx.now,
  });
  const cut7 = daysAgoIso(7, ctx.now);
  const cut28 = daysAgoIso(28, ctx.now);
  const in7 = [], in28 = [];
  for (const p of ctx.data.postsYear) {
    if (!tracked.has(p.instagram_handle)) continue;
    if (p.posted_at >= cut7) in7.push(p);
    if (p.posted_at >= cut28) in28.push(p);
  }
  return evaluate(countBreakouts(in7, medians), countBreakouts(in28, medians));
}
