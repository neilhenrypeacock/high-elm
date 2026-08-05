// Check 11 — extreme multipliers, surfaced never suppressed. The dashboard
// caps DISPLAY at "50×+", but the cause of a ≥50× reading deserves a human
// look the same day: a real viral moment (your best sales screenshot) or a
// data error (a poisoned baseline). Mirrors the dashboard's baseline rule.

import {
  EXTREME_MULTIPLIER, MIN_ENGAGEMENT, MIN_BASELINE_ENGAGEMENT,
  BASELINE_POSTS, BASELINE_MAX_AGE_DAYS,
} from '../constants.js';
import { daysAgoIso, hotelMedians, hasVisibleLikes, engagement } from '../lib.js';

export const id = 'extreme-multipliers';
export const name = 'Extreme multipliers (≥50×, 7d)';

export function evaluate(posts7, medians) {
  const hits = [];
  for (const p of posts7) {
    if (!hasVisibleLikes(p.likes_count)) continue;
    const eng = engagement(p);
    if (eng < MIN_ENGAGEMENT) continue;
    const med = medians.get(p.instagram_handle);
    if (!med || med < MIN_BASELINE_ENGAGEMENT) continue;
    const mult = eng / med;
    if (mult >= EXTREME_MULTIPLIER) hits.push({ p, eng, med, mult });
  }
  hits.sort((a, b) => b.mult - a.mult);
  if (hits.length) {
    return {
      status: 'warn',
      headline: `${hits.length} post(s) this week are at or beyond 50× their hotel's typical engagement.`,
      details: [
        ...hits.slice(0, 8).map(
          (h) => `@${h.p.instagram_handle}: ${h.eng.toLocaleString()} engagement vs typical ${Math.round(h.med)} = ${h.mult.toFixed(1)}×${h.p.post_url ? ` — ${h.p.post_url}` : ''}`,
        ),
        'The dashboard shows these as "50×+". Worth a look: genuinely viral, or a hotel whose typical is unrealistically low?',
      ],
    };
  }
  return { status: 'ok', headline: 'No post is at or beyond the 50× display cap this week.', details: [] };
}

export async function run(ctx) {
  const weekCut = daysAgoIso(7, ctx.now);
  const tracked = new Set(ctx.data.trackedHandles);
  const posts7 = ctx.data.postsYear.filter((p) => p.posted_at >= weekCut && tracked.has(p.instagram_handle));
  const medians = hotelMedians(ctx.data.postsYear, {
    baselinePosts: BASELINE_POSTS, maxAgeDays: BASELINE_MAX_AGE_DAYS, now: ctx.now,
  });
  return evaluate(posts7, medians);
}
