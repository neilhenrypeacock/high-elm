// Check 6 — contradiction rows. A post with lively comments but almost no
// likes usually means the like count is wrong (hidden, mis-scraped), not that
// the audience behaved strangely. Surfaces new ones so a bad value never
// quietly feeds a baseline.

import { CONTRADICTION_MIN_COMMENTS, CONTRADICTION_MAX_LIKES } from '../constants.js';
import { daysAgoIso } from '../lib.js';

export const id = 'contradictions';
export const name = 'Comment/like contradictions (7d)';

export function evaluate(rows) {
  const hits = rows.filter(
    (p) => typeof p.likes_count === 'number' && p.likes_count >= 0 &&
      p.likes_count < CONTRADICTION_MAX_LIKES && (p.comments_count ?? 0) > CONTRADICTION_MIN_COMMENTS,
  );
  if (hits.length) {
    return {
      status: 'warn',
      headline: `${hits.length} new post(s) have >${CONTRADICTION_MIN_COMMENTS} comments but <${CONTRADICTION_MAX_LIKES} likes — like counts look wrong.`,
      details: hits.slice(0, 15).map(
        (p) => `@${p.instagram_handle} ${String(p.posted_at).slice(0, 10)}: ${p.likes_count} likes / ${p.comments_count} comments`,
      ),
    };
  }
  return { status: 'ok', headline: 'No posts where the like count contradicts the comment count.', details: [] };
}

export async function run(ctx) {
  const since = daysAgoIso(7, ctx.now);
  return evaluate(ctx.data.postsYear.filter((p) => p.posted_at >= since));
}
