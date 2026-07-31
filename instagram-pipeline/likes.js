// Normalising the like count Apify hands us — the ONE place the hidden-likes
// sentinels are turned into the DB convention (`null` = no readable like count).
//
// Instagram lets accounts hide like counts, and apify/instagram-post-scraper
// has represented "hidden" in at least three ways over time:
//   • null / missing  — the documented case
//   • -1              — what the actor returns as of late Jul 2026
//   • 3               — what it returned through Jun/Jul 2026: the 3-avatar
//                       "liked by A, B and others" preview count leaked through
//                       as if it were a real figure. 813 rows landed in the DB
//                       before this was caught (audit 2026-07-31); posts with
//                       30+ comments were showing "3 likes".
//
// We store `null` for every sentinel so downstream code has ONE convention to
// filter. Trade-off, made knowingly: a GENUINE 3-like post is also dropped.
// For luxury-hotel accounts the neighbouring values (1, 2, 4, 5 likes) occur
// 0–4 times each across 10k+ posts, so genuine 3s are a handful at most —
// and a 3-like post is noise for every figure we compute anyway.
//
// -1 is normalised too: the app already filters it, but writing it forward
// would leave two "hidden" spellings in new rows for no benefit.

/** Sentinel values the actor has used for "like count hidden". */
const HIDDEN_LIKE_SENTINELS = new Set([-1, 3]);

/**
 * The like count to STORE for a scraped post: a real non-negative number, or
 * null when the count is hidden/unreadable (missing, -1, or the 3 leak).
 */
export function normalizeLikesCount(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  if (raw < 0) return null;
  if (HIDDEN_LIKE_SENTINELS.has(raw)) return null;
  return raw;
}
