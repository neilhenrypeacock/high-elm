// Check 12 — impossible engagement: a post whose likes+comments exceed ~150%
// of the hotel's entire follower count. Legitimately possible for true
// virality (non-followers pile in) — which is exactly why it should be seen
// same-day: it's either the week's best screenshot or a data bug.

import { IMPOSSIBLE_ENGAGEMENT_RATIO } from '../constants.js';
import { daysAgoIso, hasVisibleLikes, engagement } from '../lib.js';

export const id = 'impossible-engagement';
export const name = 'Engagement vs audience size (7d)';

export function evaluate(posts7, latestFollowers) {
  const hits = [];
  for (const p of posts7) {
    if (!hasVisibleLikes(p.likes_count)) continue;
    const followers = latestFollowers.get(p.instagram_handle);
    if (!followers) continue;
    const eng = engagement(p);
    if (eng > followers * IMPOSSIBLE_ENGAGEMENT_RATIO) {
      hits.push(`@${p.instagram_handle}: ${eng.toLocaleString()} engagement vs ${followers.toLocaleString()} followers (${((eng / followers) * 100).toFixed(0)}%)`);
    }
  }
  if (hits.length) {
    return {
      status: 'warn',
      headline: `${hits.length} post(s) out-engaged their hotel's entire follower count by >50%.`,
      details: [...hits.slice(0, 10), 'True virality does this — verify on Instagram before celebrating or debugging.'],
    };
  }
  return { status: 'ok', headline: 'No post exceeds its hotel\'s audience size — engagement plausible everywhere.', details: [] };
}

export async function run(ctx) {
  const weekCut = daysAgoIso(7, ctx.now);
  const tracked = new Set(ctx.data.trackedHandles);
  const posts7 = ctx.data.postsYear.filter((p) => p.posted_at >= weekCut && tracked.has(p.instagram_handle));
  const latest = new Map();
  for (const s of [...ctx.data.snapshots40].sort((a, b) => (a.captured_at < b.captured_at ? -1 : 1))) {
    if (typeof s.followers_count === 'number') latest.set(s.instagram_handle, s.followers_count);
  }
  return evaluate(posts7, latest);
}
