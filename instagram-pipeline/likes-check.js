// Is a stored like count still true on Instagram? Pulled out of verify-likes.js
// as pure functions so they can be TESTED — same reasoning as scrape-outcome.js.
//
// ── Why this exists ──────────────────────────────────────────────────────────
// The 2026-08-07 viability audit checked the top 20 all-time breakouts against
// the live posts. Four of them stored a like count HIGHER than Instagram shows —
// Jumeirah Al Naseem at 36,202 against a real 315. A controlled 28-post sample
// localised it completely:
//
//     Image    0 of 2  overstated
//     Sidecar  0 of 12 overstated
//     Video    6 of 14 overstated, by 5.2x to 13.0x
//
// Reading the stored Apify datasets settled the cause: the actor itself returns
// the wrong `likesCount` for some collab Reels. scrape.js stores `p.likesCount`
// verbatim and correctly — the 4 Aug dataset holds 4603 for the la Mamounia
// Reel, the DB holds 4603, Instagram shows 746. It is not a play or view count
// leaking through either: videoViewCount and videoPlayCount are both present and
// distinct in the same row.
//
// ── Why a CHECK and not a fix ────────────────────────────────────────────────
// The actor's answer is also UNSTABLE. One Rosewood co-post returned 333-334
// likes on 21 Jul, 2,665 on 27 Jul, and shows 513 live. So re-scraping does not
// reliably correct it, and there is no field to re-map. The only thing that
// works is checking the number we are about to show against the number the
// customer would see if they clicked through — which is exactly what a hotel
// does, in about ten seconds, on its own post.
//
// This is deliberately NOT in the dashboard's render path: it is ~25 HTTP
// requests, and the member view is cached for ten minutes and shared. It belongs
// beside the scrape, once a week, before Neil publishes.

/** Stored may exceed live by this much before we call it indefensible.
 *
 *  Set at 25% to clear two sources of honest difference:
 *    • Instagram rounds counts above ~10,000 in og:description ("51K"), so a
 *      real 51,499 reads as 51,000 — under 1% at that scale, but the rounding
 *      is absolute, not relative, so it matters most on small numbers.
 *    • A post can genuinely shed a few likes between scrape and check.
 *  The defect it has to catch runs 1.9x to 13x, so there is a wide gap between
 *  the noise floor and the thing being detected. Widen this before narrowing it. */
export const OVERSTATEMENT_TOLERANCE = 0.25;

/** Fail the run when more than this share of CHECKED posts are overstated.
 *
 *  Not zero. One bad post in a 25-post sample is a post for Neil to remove in
 *  /admin on Monday; it should be reported loudly and not stop the pipeline.
 *  A fifth of the feed being wrong is a systemic break — that is the 7 Aug
 *  state (roughly 6 in 28) and it should have gone red. */
export const FAIL_RATIO = 0.15;

/** Below this many successfully checked posts, the ratio above means nothing,
 *  so a run that could barely reach Instagram reports UNVERIFIED rather than
 *  passing on a sample of two. */
export const MIN_CHECKED = 5;

/**
 * Parse Instagram's `og:description`, which is the only place a logged-out
 * request can read real engagement — and only when the request carries a
 * CRAWLER user agent. A normal browser UA gets a login-walled JS shell with no
 * counts in the HTML at all.
 *
 * The tag reads: `162 likes, 2 comments - rafflesdoha on June 3, 2026: "..."`.
 * Counts above ~10,000 arrive abbreviated ("51K", "1.2M") — `rounded` says so,
 * because a rounded figure must not be treated as exact.
 *
 * `author` is the account Instagram names as the post's owner. For a co-post
 * that is often NOT the handle the row is filed under, which is worth surfacing:
 * every overstated post in the audit sample except one was a co-post.
 *
 * @param {string} html
 * @returns {{likes: number, comments: number, author: string, rounded: boolean} | null}
 */
export function parseOgCounts(html) {
  if (typeof html !== 'string') return null;
  const tag = html.match(/og:description"\s+content="([^"]+)"/);
  if (!tag) return null;
  const m = tag[1].match(/^([\d.,KM]+)\s+likes?,\s+([\d.,KM]+)\s+comments?\s+-\s+([\w.]+)\s+on/i);
  if (!m) return null;
  const likes = parseAbbreviated(m[1]);
  const comments = parseAbbreviated(m[2]);
  if (likes === null || comments === null) return null;
  return {
    likes,
    comments,
    author: m[3],
    rounded: /[KM]/i.test(m[1]),
  };
}

/** "1,228" -> 1228 · "51K" -> 51000 · "1.2M" -> 1200000 · anything else -> null */
export function parseAbbreviated(s) {
  if (typeof s !== 'string') return null;
  const m = s.replace(/,/g, '').trim().match(/^(\d+(?:\.\d+)?)([KM])?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const scale = m[2] ? (m[2].toUpperCase() === 'K' ? 1e3 : 1e6) : 1;
  return Math.round(n * scale);
}

/**
 * Verdict for one post.
 *
 * Only OVERSTATEMENT is a defect. Stored being LOWER than live is the normal,
 * expected direction — the post kept earning likes after the scrape — and must
 * never be flagged, or the check would go red every week for the right reasons.
 *
 * @param {{stored: number|null, live: {likes:number, rounded:boolean}|null}} input
 * @returns {{code:'ok'|'overstated'|'unverified'|'skipped', ratio:number|null, reason:string}}
 */
export function classifyLikeCheck({ stored, live }) {
  if (stored === null || stored === undefined) {
    // A hidden-likes post carries no figure, so there is nothing to overstate.
    return { code: 'skipped', ratio: null, reason: 'no stored like count' };
  }
  if (!live || typeof live.likes !== 'number') {
    return { code: 'unverified', ratio: null, reason: 'could not read the live post' };
  }
  if (live.likes === 0) {
    // Guard the division. A live zero against a stored figure is itself odd, so
    // say so rather than dividing by it.
    return stored > 0
      ? { code: 'overstated', ratio: Infinity, reason: `stored ${stored} against a live 0` }
      : { code: 'ok', ratio: 1, reason: 'both zero' };
  }
  const ratio = stored / live.likes;
  // Give rounded live figures the benefit of the doubt: "51K" could be 51,499,
  // so compare against the top of the bracket it could represent.
  const ceiling = live.rounded ? live.likes + roundingSlack(live.likes) : live.likes;
  if (stored > ceiling * (1 + OVERSTATEMENT_TOLERANCE)) {
    return {
      code: 'overstated',
      ratio,
      reason: `stored ${stored} is ${ratio.toFixed(1)}x the live ${live.rounded ? '~' : ''}${live.likes}`,
    };
  }
  return { code: 'ok', ratio, reason: `stored ${stored} against live ${live.rounded ? '~' : ''}${live.likes}` };
}

/** Half the rounding bucket Instagram used, so "51K" can mean up to 51,499. */
export function roundingSlack(likes) {
  return likes >= 1e6 ? 50_000 : 500;
}

/**
 * Should the run fail? Same shape as classifyScrape in scrape-outcome.js, and
 * for the same reason — a guard is only worth having if it can go red, so the
 * decision is a pure function with a test per branch.
 *
 * @param {{checked:number, overstated:number, unverified:number}} counts
 * @returns {{ok:boolean, code:'clean'|'overstated'|'too-few-checked', reason:string}}
 */
export function classifyLikeRun({ checked, overstated, unverified }) {
  if (checked < MIN_CHECKED) {
    return {
      ok: false,
      code: 'too-few-checked',
      reason: `only ${checked} of ${checked + unverified} posts could be read from Instagram — not enough to judge the feed.`,
    };
  }
  const ratio = overstated / checked;
  if (ratio > FAIL_RATIO) {
    return {
      ok: false,
      code: 'overstated',
      reason: `${overstated} of ${checked} checked posts store more likes than the live post (${(ratio * 100).toFixed(0)}%, over the ${(FAIL_RATIO * 100).toFixed(0)}% limit).`,
    };
  }
  return {
    ok: true,
    code: 'clean',
    reason: overstated === 0
      ? `all ${checked} checked posts match the live counts.`
      : `${overstated} of ${checked} checked posts are overstated, under the ${(FAIL_RATIO * 100).toFixed(0)}% limit — remove them in /admin before publishing.`,
  };
}
