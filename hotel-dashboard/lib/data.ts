import { getSupabase } from './supabase';
import { accreditationsFor } from './accreditations';
import { fmtFollowers, fmtNumber } from './format';

// ─── Constants ────────────────────────────────────────────────────────────────
// Shared "recent window" — the leaderboard ER and the breakout baseline both use
// each hotel's last N valid posts (matches the pipeline's 30-posts-per-scrape).
// One source of truth so the two never drift apart.
const RECENT_POSTS        = 30;
const HOTEL_ER_POSTS      = RECENT_POSTS;
// A hotel with nothing posted in this many days is dormant: its ER (a count-based
// "last 30 posts" median, which never ages out on its own) is nulled so it sorts
// to the bottom of the leaderboard instead of coasting on stale numbers.
// Exported so HotelTable can label the dormant "—" accurately.
export const DORMANT_DAYS = 60;
const OUTLIER_THRESHOLD   = 2;
const OUTLIER_WINDOW_DAYS = 7
const POSTS_WEEK_WINDOW   = 28;
const CAPTION_SHORT_MAX   = 100;
const CAPTION_MEDIUM_MAX  = 300;
const MAX_STANDOUT_POSTS      = 25;
// Per-window cap on the Top posts (breakout) list. Same selection logic across
// all three windows; "All time" surfaces the top 100 best-performing ever.
const STANDOUT_LIMIT          = 100;
// What's Working is a STATIC panel (the time-window toggle now drives Top posts,
// not this) — its median-engagement charts cover the last 30 days.
const WHATS_WORKING_WINDOW_DAYS = 30;
// Landing-page taster rule (Neil, 2026-07-03): feature the best-performing
// posts of the last 30 days, excluding collaborations
const LANDING_WINDOW_DAYS     = 30;
// Landing slot count: 3 fanned hero cards + 3 taster cards, all distinct posts.
const LANDING_SLOTS           = 6;
// Curated-taster marquee (Neil, 2026-07-21): when posts are pinned, the FIRST
// open card always shows a post from one of these best-known hotels (cycling
// hourly); the remaining slots rotate through the rest of the pinned set.
// Handles, not post_ids, so the rule survives re-pinning a different post.
const LANDING_MARQUEE_HANDLES = ['thesavoylondon', 'estellemanor', 'theconnaught'];
// Absolute engagement floor — a post needs at least this many likes+comments to
// count as a breakout (and so to carry an AI insight). Raised 100 → 500 (Neil,
// 2026-07-22) so only genuinely well-performing posts surface: "2.1× a median of
// 88" (≈189 engagement) reads as thin on a sales asset. At 500 this keeps ~77% of
// all-time breakouts and 21 of 22 this week (per the engagement analysis, so the
// weekly count barely moves). Tunable — raise for a harder "best only" cut.
const MIN_ENGAGEMENT          = 500;
// Baseline floor — hotels whose median engagement is below this are excluded
// from breakout detection: "94× a median of 3" is technically true but reads
// as noise on a sales asset. Tunable.
const MIN_BASELINE_ENGAGEMENT = 25;
// ── The empty-week top-up (Neil, 2026-07-31) ─────────────────────────────────
// Some weeks produce no breakouts a hotel can act on alone. Measured on the
// week ending 27 Jul: 11 posts cleared 2×, and ALL ELEVEN were collabs (six of
// them one hotel's) — the best solo post of the week managed 1.66×. Dropping
// OUTLIER_THRESHOLD was the obvious fix and the wrong one: at 1.5× it would
// have added three solo posts, at 1.2× ten, while permanently rewriting what
// "breakout" means in the 30-day and all-time lists too.
//
// So the threshold stays at 2× and the SEVEN-DAY VIEW ONLY tops itself up with
// the week's next-best posts, carried as near_miss and labelled as such. They
// never touch breakout_count, the hero numeral, the other windows, What's
// Working or the landing taster. Tunable:
//   FLOOR   — a top-up must still have beaten its hotel's own median by this
//             much; below it the post is simply ordinary and not worth showing.
//   MIN     — how many posts the week should offer in total.
//   MIN_SOLO— how many of those should be non-collab, since a collab needs a
//             willing partner and so isn't something a hotel can act on alone.
const NEAR_MISS_FLOOR = 1.25;
const WEEK_MIN_POSTS  = 5;
const WEEK_MIN_SOLO   = 3;
// Live client-side time window for the Top posts (breakout) list. Each window's
// list is precomputed server-side (below) so toggling needs no new query. Same
// breakout selection for all three; "All time" is the top 100 best-performing
// ever (see STANDOUT_LIMIT). Note the baseline a post is judged against is the
// hotel's last-30-posts median (today's baseline), so old posts in the all-time
// view are compared to a current bar — read them as directional.
export type TimeWindow = '7d' | '30d' | 'all';
export const TIME_WINDOWS: { key: TimeWindow; label: string; days: number | null }[] = [
  { key: '7d',  label: 'Last 7 days',  days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: 'all', label: 'All time',     days: null },
];
// Hotel ER reliability guards — flagged hotels are excluded from category stats.
const MIN_VALID_POSTS         = 3;   // need ≥3 posts with visible likes for a reliable ER
const ER_ANOMALY_THRESHOLD    = 10;  // ER above 10% is implausibly high — flag for review
// Breakout baseline = the hotel's last N valid posts. The pipeline scrapes
// exactly this many per tracked hotel, so baseline and scrape stay in step.
const BASELINE_POSTS          = RECENT_POSTS;
const BASELINE_MIN_POSTS      = 12;  // fewer posts in the baseline → low-confidence warning
// The baseline window's reach (2026-07-31, brief 02). The baseline is the last
// BASELINE_POSTS VISIBLE-like posts — reaching past hidden-like posts so every
// hotel gets the same sample size (what makes multipliers comparable between
// hotels) — but never further back than this. Without the cap, a hotel that
// mostly hides likes would have "today's typical post" quietly defined by
// engagement from years ago.
const BASELINE_MAX_AGE_DAYS   = 365;
// The measurability gate (2026-07-31, brief 02). A hotel that cannot supply
// this many visible-like posts within BASELINE_MAX_AGE_DAYS has no honest
// baseline at any sample size — it is removed from the leaderboard and the
// breakout feed entirely (absent, not warned; ~21 of 200 tracked hotels when
// introduced). It runs ALONGSIDE the coverage-ratio gate below, not instead of
// it: this one catches "too little readable data overall", the ratio catches
// "hides likes on most recent posts" — different offenders (Neil, 2026-07-31).
const MEASURABLE_MIN_POSTS    = 12;
// Visible-like coverage gate (Neil, 2026-07-22). Instagram lets accounts hide
// like counts; a hotel that hides likes on most of its recent posts can't be
// measured reliably — its median and ER come from a thin, self-selected sample.
// Below this ratio (visible-like posts ÷ its last RECENT_POSTS) the hotel is
// SILENTLY dropped from breakout selection AND its leaderboard ER/rate is nulled
// — no viewer-facing caveat (this replaces surfacing a "6 of 30 posts" warning).
// 0.5 = "mostly hides likes" (majority hidden). Tunable; at 0.5 it removes ~15 of
// the 200 tracked hotels (per the coverage analysis, 2026-07-22).
const MIN_VISIBLE_LIKE_RATIO  = 0.5;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const HOUR_BLOCKS: [string, number, number][] = [
  ['Midnight (0–5)',    0,  5],
  ['Morning (6–11)',    6, 11],
  ['Afternoon (12–17)', 12, 17],
  ['Evening (18–23)',  18, 23],
];
const FORMAT_ORDER = ['Carousel', 'Reel', 'Video', 'Photo', 'Other'];

// ─── Types ────────────────────────────────────────────────────────────────────
export type HotelRow = {
  name: string;
  region: string | null;
  country: string | null;
  instagram_handle: string;
  followers_count: number | null;
  /** Median per-post rate (%) over the hotel's last 30 valid posts — what a
   *  typical post does, so one viral hit doesn't inflate it. Null when flagged
   *  (too few posts or anomalous value) or dormant (nothing posted in
   *  DORMANT_DAYS) — excluded from all stats */
  engagement_rate: number | null;
  /** Momentum — total engagement (likes+comments) over the last N days
   *  ÷ followers × 100. Rewards posting often as well as posting well; a
   *  sort-only rank option on the leaderboard, never displayed as a rate.
   *  Null when the hotel has no valid posts in the window (dormant) or no
   *  follower count. */
  recent_rate: { d30: number | null; d90: number | null };
  posts_per_week: number | null;
  last_posted: string | null;
  /** Non-null when ER is unreliable; shown as ⚠ in leaderboard */
  er_flag_reason: string | null;
  /** Static accreditation labels (Forbes / Gold List / Michelin Keys) matched by
   *  handle from hotel-lists/*.csv. Display-only; empty when the hotel isn't listed. */
  accreditations: string[];
};

export type OutlierPost = {
  hotel_name: string;
  hotel_country: string | null;
  /** Broad destination (Europe / North America / Asia-Pacific / Middle East /
   *  Central America & Caribbean / Africa / South America)
   *  — what the Top-posts destination filter works on. Country is too granular
   *  to filter by (46 of them). Undefined on posts saved before this field
   *  existed, since saved_posts stores a snapshot — treat as unknown. */
  hotel_region: string | null;
  hotel_followers: number | null;
  instagram_handle: string;
  post_id: string;
  type: string | null;
  likes_count: number;
  comments_count: number;
  image_url: string | null;
  post_url: string | null;
  multiplier: number;
  /** Per-metric lift ratios vs hotel median */
  likes_multiple: number;
  comments_multiple: number;
  /** Hotel's typical absolute engagement (median) */
  hotel_typical_total: number | null;
  hotel_typical_likes: number | null;
  hotel_typical_comments: number | null;
  posted_at: string;
  post_insight: string | null;
  driver_tag: string | null;
  theme_tag: string | null;
  /** Display-only collab tag (feed filter). Structural: same post_id under >1
   *  tracked handle, OR the AI driver_tag = 'Collaboration'. Does NOT affect
   *  breakout selection or counts — collabs with UNTRACKED accounts stay unflagged. */
  is_collab: boolean;
  /** Editor's pick — a manually curated "worth replicating" flag, set in
   *  standout_posts.editors_pick. Shows a subtle badge on the card. */
  editors_pick: boolean;
  /** Feature-on-homepage flag, set in standout_posts.landing_pin. Pinned
   *  breakouts are forced to the front of the landing taster (hero + open
   *  cards), overriding the default "best non-collab, last 30 days" rule. */
  landing_pin: boolean;
  /** NOT a breakout — a top-up on the 7-day view only, added when the week
   *  didn't produce enough breakouts (or enough non-collab ones) to be worth
   *  looking at. Beat its hotel's own median, but by less than
   *  OUTLIER_THRESHOLD. Never counted in breakout_count, never in the 30d or
   *  all-time lists, and labelled as "closest this week" in the UI — the 2×
   *  claim has to keep meaning 2×. */
  near_miss: boolean;
};

export type BarItem = { label: string; value: number; count: number };

export type WhatsWorkingSet = {
  by_format: BarItem[];
  by_caption: BarItem[];
  by_day: BarItem[];
  by_hour_block: BarItem[];
};

export type Snapshot = {
  median_er: number | null;
  median_ppw: number | null;
  median_followers: number | null;
};

// ── What's Working — holistic portfolio analysis, scoped Last-30-days / All-time.
export type WwScope = 'month' | 'all';
export type WwDeltaDir = 'up' | 'down' | 'flat';
// ── The five levers ─────────────────────────────────────────────────────────
// The What's Working screen is built as a stack of "levers" — the things a hotel
// can actually change. Each lever is one card: a plain-English headline, a
// period-over-period trend line, and a set of bars measured as a MULTIPLE of the
// weakest option ("1.6× more engagement per post than a photo"), which is the
// only framing that reads without explaining engagement rate first.
/** One bar: a label, an optional qualifier, and its multiple of the baseline. */
export type WwLeverBar = {
  label: string;
  /** Qualifier shown small next to the label, e.g. "150+ words". */
  sub: string | null;
  /** Multiple of the weakest bar. null marks the baseline bar itself. */
  ratio: number | null;
  /** Bar width, 0–100, proportional to the underlying median. */
  width: number;
  count: number;
};
/** A named pattern with its real share of the tagged sample. */
export type WwTheme = { title: string; text: string };
export type WwLeverStrength = 'strong' | 'early';
export type WwLever = {
  id: 'content' | 'format' | 'frequency' | 'day' | 'caption';
  /** Display label — 'Format', 'Day & time'. Numbering is assigned at render. */
  label: string;
  strength: WwLeverStrength;
  /** Sample-size pill copy, e.g. "Strong signal · 1,532 posts". */
  sample: string;
  /** Headline split so the middle clause can carry the green accent. */
  headline: { pre: string; highlight: string; post: string };
  /** Period-over-period movement. 'flat' renders an em-dash, not an arrow. */
  trend: { text: string; dir: WwDeltaDir };
  bars: WwLeverBar[];
  /** Caption under the bars — states the baseline and the sample size. */
  barsNote: string;
  cta: { label: string; href: string } | null;
  /** Lever 01 only: the recurring subjects behind the breakouts. */
  themes: WwTheme[] | null;
  themesTitle: string | null;
};

/** The collaboration note — deliberately NOT a sixth lever. A collab needs a
 *  partner, so it isn't a thing a hotel can simply change the way format or
 *  posting day is; it's shown as a standing "worth considering" note instead. */
export type WwCollabNote = {
  /** Headline split so the figure can carry the green accent (lever idiom). */
  headline: { pre: string; highlight: string; post: string };
  /** Sample sizes + the standing caveat. */
  note: string;
};

export type WhatsWorkingScope = {
  /** Format / caption / day / hour median-engagement bars for this scope. */
  set: WhatsWorkingSet;
  /** The five levers, in display order. Levers with no data are omitted. */
  levers: WwLever[];
  /** Editorial lede shown under the section title. */
  lede: string;
  /** How collaboration posts are performing vs solo posts. Null when there are
   *  too few collabs in scope to say anything honest. */
  collab: WwCollabNote | null;
};
export type WhatsWorkingData = Record<WwScope, WhatsWorkingScope>;

/** A post the admin has hidden — enough to recognise and un-hide it. */
export type HiddenPost = {
  post_id: string;
  instagram_handle: string;
  hotel_name: string;
  image_url: string | null;
  posted_at: string;
};

export type DashboardData = {
  /** Publish-gate state, for the /admin banner. `cutoff` is the ISO timestamp
   *  members can see up to; `pending` counts posts newer than it (they exist in
   *  the DB but are held back until Publish). */
  publish: { cutoff: string | null; pending: number };
  /** What the admin has hidden. Hidden things are excluded from every figure
   *  above, so this roster is the only place they can be seen and undone.
   *  `posts` is populated on the admin view only; `hotels` always. */
  hidden: { posts: HiddenPost[]; hotels: { instagram_handle: string; name: string }[] };
  hotels: HotelRow[];
  snapshot: Snapshot;
  /** What's Working medians — the last WHATS_WORKING_WINDOW_DAYS set (used by the
   *  overview's "in focus" bullets). The full scoped analysis is whatsWorkingData. */
  whatsWorking: WhatsWorkingSet;
  /** What's Working — full holistic analysis, per scope (Last 30 days / All time) */
  whatsWorkingData: WhatsWorkingData;
  /** Top posts (breakouts) precomputed per time window; the client toggle picks one */
  standout: Record<TimeWindow, OutlierPost[]>;
  /** Landing-page taster: best non-collab breakouts of the last 30 days */
  landing_featured: OutlierPost[];
  /** Featured — every post carrying editors_pick, best first (the curated
   *  inspiration shelf). Breakout gates are relaxed so a pick stays honoured
   *  after its hotel's median drifts; multiplier is vs the current median. */
  featured: OutlierPost[];
  /** Total posts qualifying ≥2× this week (before top-25 slice) */
  breakout_count: number;
  /** Posts qualifying ≥10× this week */
  super_breakout_count: number;
  /** Global: top-10 vs rest, by overall ER */
  hotel_count: number;
  /** Distinct countries among hotels with post data */
  countries_count: number;
  /** Total valid posts (likes not hidden) across the full dataset */
  total_posts_analysed: number;
  /** "26 Jun" — most recent post date in the data, NOT the render date */
  week_ending: string;
  /** "26 JUN 2026" — footer "updated" stamp, derived from the same date */
  week_ending_long: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function normalizeType(t: string | null): string {
  if (!t) return 'Other';
  switch (t.toLowerCase()) {
    case 'sidecar': return 'Carousel';
    case 'image':   return 'Photo';
    case 'video':   return 'Video';
    case 'reel':    return 'Reel';
    default:        return 'Other';
  }
}

/**
 * Instagram hides like counts on some posts — the pipeline stores those as
 * null (its one convention since 2026-07-31; likes.js normalises at scrape
 * time). The -1 and 3 checks are belt-and-braces against pipeline regression:
 * the Apify actor's hidden-likes sentinel has DRIFTED before (-1 as of late
 * Jul 2026; a literal 3 — the "liked by A, B and others" preview count leaking
 * through as data — through Jun/Jul 2026, which put 813 fake 3-like rows in
 * the DB and poisoned 57 hotels' baselines before the 2026-07-31 audit).
 * Trade-off, made knowingly: a GENUINE 3-like post is excluded too — across
 * 10k+ rows the neighbouring values (1, 2, 4, 5) occur 0–4 times each, so
 * genuine 3s are a handful, and they carry no signal for any figure here.
 */
export function hasVisibleLikesCount(likes_count: number | null): boolean {
  return likes_count !== null && likes_count !== -1 && likes_count !== 3;
}
/** Object form of {@link hasVisibleLikesCount} — the single source of truth for the hidden-likes rule. */
export function hasVisibleLikes(p: { likes_count: number | null }): boolean {
  return hasVisibleLikesCount(p.likes_count);
}

/**
 * The posts a hotel's baseline and ER may draw from: every VISIBLE-like post
 * within BASELINE_MAX_AGE_DAYS, newest first. Callers take the first
 * BASELINE_POSTS of these — "the last 30 posts with visible likes, going back
 * up to 12 months" — so every measurable hotel gets the same sample size,
 * which is what makes multipliers comparable between hotels.
 *
 * The MEASURABLE_MIN_POSTS gate reads the same list: fewer than 12 of these
 * and the hotel has no honest baseline at any sample size.
 *
 * Pure + exported so the window and the gate are unit-testable without a render.
 */
export function selectBaselinePosts<T extends { likes_count: number | null; posted_at: string }>(
  postsNewestFirst: T[],
  now: number,
): T[] {
  const oldest = now - BASELINE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return postsNewestFirst.filter(
    p => hasVisibleLikes(p) && new Date(p.posted_at).getTime() >= oldest,
  );
}

/** The measurability gate: can this many visible-like posts support a baseline? */
export function isMeasurable(visiblePostsInWindow: number): boolean {
  return visiblePostsInWindow >= MEASURABLE_MIN_POSTS;
}

/**
 * ER reliability flags. A `hard` flag means the ER itself is untrustworthy —
 * it is nulled and excluded from all category stats. A `soft` flag only warns
 * that the breakout baseline is low-confidence; the ER stays valid and counted.
 */
export function erFlagReasons(
  validPostCount: number,
  rawERPct: number | null,
  recentBaselineCount: number
): { hard: string | null; soft: string | null } {
  const hard =
    validPostCount < MIN_VALID_POSTS
      ? `Only ${validPostCount} post${validPostCount === 1 ? '' : 's'} with visible likes`
      : rawERPct !== null && rawERPct > ER_ANOMALY_THRESHOLD
        ? `ER ${rawERPct.toFixed(2)}% — unusually high, verify data`
        : null;
  const soft =
    recentBaselineCount < BASELINE_MIN_POSTS
      ? `Breakout baseline low-confidence: only ${recentBaselineCount} post${recentBaselineCount === 1 ? '' : 's'} in baseline (need ${BASELINE_MIN_POSTS})`
      : null;
  return { hard, soft };
}

/**
 * Parse a stored `post_insight` blob into its three parts. The generator
 * (instagram-pipeline/generate-insight.js) writes them as one string —
 * "What it is: … / Why it worked: … / Consider this: …" (older rows say
 * "Try this"). We split it back apart so the card can lead with "why it
 * worked" and tuck the rest behind a read-more.
 *
 * Robust to: any subset of the three labels, either order, "Try this" or
 * "Consider this", and text with no labels at all (a short free-form note),
 * which comes back as `freeform` for plain single-line display.
 * Pure + exported so the parsing is unit-tested without a render.
 */
export type ParsedInsight = {
  whatItIs: string | null;
  whyItWorked: string | null;
  considerThis: string | null;
  /** Set only when the text carries none of the three labels — show as-is. */
  freeform: string | null;
};

export function parseInsight(raw: string | null): ParsedInsight | null {
  const text = raw?.trim();
  if (!text) return null;
  const markers: { key: 'whatItIs' | 'whyItWorked' | 'considerThis'; re: RegExp }[] = [
    { key: 'whatItIs',     re: /what\s+it\s+is\s*:/i },
    { key: 'whyItWorked',  re: /why\s+it\s+worked\s*:/i },
    { key: 'considerThis', re: /(?:consider\s+this|try\s+this)\s*:/i },
  ];
  const hits = markers
    .map(m => { const hit = m.re.exec(text); return hit ? { key: m.key, start: hit.index, end: hit.index + hit[0].length } : null; })
    .filter((h): h is { key: 'whatItIs' | 'whyItWorked' | 'considerThis'; start: number; end: number } => h !== null)
    .sort((a, b) => a.start - b.start);

  if (hits.length === 0) return { whatItIs: null, whyItWorked: null, considerThis: null, freeform: text };

  const out: ParsedInsight = { whatItIs: null, whyItWorked: null, considerThis: null, freeform: null };
  hits.forEach((h, i) => {
    const stop = i + 1 < hits.length ? hits[i + 1].start : text.length;
    out[h.key] = text.slice(h.end, stop).trim() || null;
  });
  return out;
}

export function captionBucket(caption: string | null): string {
  const len = (caption ?? '').length;
  if (len < CAPTION_SHORT_MAX)  return 'Short';
  if (len < CAPTION_MEDIUM_MAX) return 'Medium';
  return 'Long';
}

// High-precision caption signal for partnership/sponsored language. NO LONGER
// feeds is_collab — the collab tag is now TRUE Instagram Collabs only (co-author
// byline). Retained (exported, tested) as the likely basis for a future
// paid-partnership / sponsored filter, since the scraper exposes no native
// sponsored field. Catches "in collaboration with @…", "paid partnership",
// "x @brand" without flagging incidental @-mentions ("dinner by @chef").
const COLLAB_CAPTION_RE =
  /\b(?:in\s+)?collab(?:oration)?\s+with\b|\b(?:in\s+)?partnership\s+with\b|\bpartnered\s+with\b|\bpaid\s+partnership\b|@\w[\w.]*\s*[×x]\s*@\w/i;

export function captionSuggestsCollab(caption: string | null): boolean {
  return !!caption && COLLAB_CAPTION_RE.test(caption);
}

export function groupMedianER(
  posts: { er: number; label: string }[],
  labelOrder: string[]
): BarItem[] {
  const buckets: Record<string, number[]> = {};
  for (const p of posts) {
    if (!buckets[p.label]) buckets[p.label] = [];
    buckets[p.label].push(p.er);
  }
  return labelOrder
    .filter(l => buckets[l]?.length)
    .map(l => ({ label: l, value: median(buckets[l])! * 100, count: buckets[l].length }));
}

export type RawPost = {
  post_id: string;
  instagram_handle: string;
  likes_count: number;
  comments_count: number;
  posted_at: string;
  type: string | null;
  caption: string | null;
  image_url: string | null;
  post_url: string | null;
  /** Instagram's native co-author handles (lowercased). null = unknown/not captured. */
  coauthor_usernames: string[] | null;
};

export type HotelMetrics = {
  er: number | null;
  ppw: number | null;
  lastPosted: string | null;
  /** Median absolute engagement (likes+comments) across ALL valid posts — breakout baseline */
  medianPostEngagement: number | null;
  medianLikes: number | null;
  medianComments: number | null;
  followers: number | null;
  validPostCount: number;
  /** Share of the hotel's last RECENT_POSTS that have a visible like count (0–1).
   *  Below MIN_VISIBLE_LIKE_RATIO the hotel is gated out of breakouts + leaderboard. */
  visibleLikeRatio: number;
  /** Visible-like posts within BASELINE_MAX_AGE_DAYS — what the baseline/ER
   *  windows draw from, and what the measurability gate counts. */
  visibleInWindow: number;
  /** false = fewer than MEASURABLE_MIN_POSTS visible-like posts in the window:
   *  no honest baseline exists, so the hotel is ABSENT from the leaderboard and
   *  the breakout feed (not warned — absent). */
  measurable: boolean;
  /** Momentum: total engagement over the last 30 / 90 days ÷ followers × 100 */
  recentRate30: number | null;
  recentRate90: number | null;
};

export function computeWhatsWorking(
  posts: RawPost[],
  latestFollowers: Record<string, number | null>
): WhatsWorkingSet {
  const byFormat:  { er: number; label: string }[] = [];
  const byCaption: { er: number; label: string }[] = [];
  const byDay:     { er: number; label: string }[] = [];
  const byHour:    { er: number; label: string }[] = [];

  for (const p of posts) {
    const f = latestFollowers[p.instagram_handle];
    if (!f || f <= 0) continue;
    const er = (p.likes_count + (p.comments_count ?? 0)) / f;
    byFormat.push({ er, label: normalizeType(p.type) });
    byCaption.push({ er, label: captionBucket(p.caption) });
    byDay.push({ er, label: DAYS[new Date(p.posted_at).getUTCDay()] });
    const h = new Date(p.posted_at).getUTCHours();
    const block = HOUR_BLOCKS.find(([, lo, hi]) => h >= lo && h <= hi);
    if (block) byHour.push({ er, label: block[0] });
  }

  return {
    by_format:     groupMedianER(byFormat,  FORMAT_ORDER).sort((a, b) => b.value - a.value),
    by_caption:    groupMedianER(byCaption, ['Short', 'Medium', 'Long']),
    by_day:        groupMedianER(byDay,     [...DAYS]),
    by_hour_block: groupMedianER(byHour,    HOUR_BLOCKS.map(b => b[0])),
  };
}

// ── What's Working — holistic analysis helpers ──────────────────────────────
const DAY_MS_WW = 24 * 60 * 60 * 1000;

/** Median per-post engagement rate (%) across posts with a known follower count. */
function medianPostERPct(posts: RawPost[], latestFollowers: Record<string, number | null>): number | null {
  const ers: number[] = [];
  for (const p of posts) {
    const f = latestFollowers[p.instagram_handle];
    if (!f || f <= 0) continue;
    ers.push(((p.likes_count + (p.comments_count ?? 0)) / f) * 100);
  }
  return median(ers);
}

function pluralFormat(label: string): string {
  const map: Record<string, string> = { Reel: 'Reels', Video: 'Videos', Carousel: 'Carousels', Photo: 'Photos', Other: 'other posts' };
  return map[label] ?? `${label}s`;
}

/** The same format as one thing, with its article — "a photo", "a carousel". */
function singleFormat(label: string): string {
  const map: Record<string, string> = { Reel: 'a Reel', Video: 'a video', Carousel: 'a carousel', Photo: 'a photo', Other: 'another post type' };
  return map[label] ?? `a ${label.toLowerCase()}`;
}

/**
 * How collaboration posts are performing against solo posts in a scope.
 *
 * Measured the same way the levers are — median per-post engagement rate — so
 * the multiple is comparable to them. Also reports how far collabs over- (or
 * under-) index in the breakout list, which is the thing that prompted this:
 * collabs keep appearing near the top of the breakouts.
 *
 * Returns null below MIN_COLLAB_POSTS collabs, or when either median can't be
 * computed. `breakouts` is the scope's breakout LIST (capped at
 * STANDOUT_LIMIT), so the share is "of the breakouts shown", which is what the
 * copy says.
 */
export function buildCollabNote(
  scopePosts: RawPost[],
  breakouts: OutlierPost[],
  latestFollowers: Record<string, number | null>,
  scope: WwScope,
): WwCollabNote | null {
  const isCollabRaw = (p: RawPost) => (p.coauthor_usernames?.length ?? 0) > 0;
  const collab = scopePosts.filter(isCollabRaw);
  const solo = scopePosts.filter(p => !isCollabRaw(p));
  if (collab.length < MIN_COLLAB_POSTS || solo.length === 0) return null;

  const erCollab = medianPostERPct(collab, latestFollowers);
  const erSolo = medianPostERPct(solo, latestFollowers);
  if (erCollab === null || erSolo === null || erSolo <= 0) return null;

  const ratio = erCollab / erSolo;
  const postShare = Math.round((collab.length / scopePosts.length) * 100);
  const collabBreakouts = breakouts.filter(p => p.is_collab).length;
  const periodWord = scope === 'month' ? 'this month' : 'on record';

  // Copy adapts to direction — a note that only ever says "collabs win" would be
  // marketing, not analysis.
  const headline =
    ratio >= 1.05
      ? {
          pre: 'Collaboration posts are pulling ',
          highlight: `${ratio.toFixed(1)}× the engagement`,
          post: ' of a solo post — worth considering who you partner with, not just what you post.',
        }
      : ratio <= 0.95
        ? {
            pre: 'Collaboration posts are pulling ',
            highlight: `${ratio.toFixed(1)}× a solo post’s engagement`,
            post: ' — they are not automatically the stronger play here.',
          }
        : {
            pre: 'Collaboration posts are performing ',
            highlight: 'about the same as solo posts',
            post: ' — the partner brings reach, but not a reliable lift on this measure.',
          };

  const breakoutClause =
    breakouts.length > 0
      ? ` They are ${collabBreakouts} of the ${breakouts.length} breakouts shown ${periodWord}, from ${postShare}% of posts.`
      : '';

  return {
    headline,
    note:
      `${fmtNumber(collab.length)} collaboration posts vs ${fmtNumber(solo.length)} solo, by median engagement rate per post.` +
      `${breakoutClause}` +
      ' A collab is a true Instagram co-author byline, appears on both partners’ grids, and borrows the partner’s audience —' +
      ' so treat it as a partnership decision rather than a posting tweak.',
  };
}

// ── Lever construction ──────────────────────────────────────────────────────
/** Posting-cadence buckets, measured per hotel over the scope's window. The
 *  phrase is how the bucket reads mid-sentence ("posting once a week"). */
const CADENCE_BUCKETS: [label: string, lo: number, hi: number, phrase: string][] = [
  ['1× / week',   0,   1.5,      'once a week'],
  ['2–3× / week', 1.5, 3.5,      'two to three times a week'],
  ['4+× / week',  3.5, Infinity, 'four or more times a week'],
];
const cadencePhrase = (label: string) =>
  CADENCE_BUCKETS.find(b => b[0] === label)?.[3] ?? label;
/** Caption-length qualifiers. Buckets themselves are character-based
 *  (captionBucket); these describe them in the words people actually think in. */
const CAPTION_SUBS: Record<string, string> = {
  Short:  `under ${CAPTION_SHORT_MAX} characters`,
  Medium: `${CAPTION_SHORT_MAX}–${CAPTION_MEDIUM_MAX} characters`,
  Long:   `${CAPTION_MEDIUM_MAX}+ characters`,
};
/** Plain-English gloss for each AI theme tag written by the pipeline. */
const THEME_BLURB: Record<string, string> = {
  'Place & Experience': 'The setting and what it feels like to be there — the landscape, the light, the view from the room.',
  'The Property':       'The building itself — architecture, interiors, the design details people come for.',
  'People':             'Someone in the frame — a guest, a chef, a host — giving the scene scale and a story.',
  'Events':             'A moment with a date on it — a party, a launch, a seasonal opening.',
};
/** Below this many AI-tagged breakouts the content lever is withheld rather than
 *  shown thin — a handful of tagged posts is not a portfolio pattern. */
const MIN_TAGGED_THEMES = 5;
/** Below this many collabs in scope the collaboration note is withheld — the
 *  same discipline as MIN_TAGGED_THEMES: say nothing rather than say it thinly. */
const MIN_COLLAB_POSTS = 30;
/** At or above this many posts a lever reads as a settled signal, not a hint. */
const STRONG_SIGNAL_POSTS = 500;

/** "Afternoon (12–17)" → "afternoon". The UTC caveat lives under the bars, not
 *  mid-sentence, so the prose stays readable. */
function hourBlockPhrase(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase();
}

const DAY_FULL_NAME: Record<string, string> = {
  Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
};

/** "a", "a and b", "a, b and c" — Oxford-comma-free, as the rest of the copy is. */
function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function usableBars(items: BarItem[]): BarItem[] {
  return items.filter(i => i.count > 0 && i.value > 0);
}

function leaderOf(items: BarItem[]): BarItem | null {
  return usableBars(items).sort((a, b) => b.value - a.value)[0] ?? null;
}

/** Median engagement per post, bucketed by how often the hotel posts. */
function cadenceBars(
  posts: RawPost[],
  cadencePosts: RawPost[],
  windowDays: number,
  latestFollowers: Record<string, number | null>,
): BarItem[] {
  if (windowDays <= 0) return [];
  const perHandle: Record<string, number> = {};
  for (const p of cadencePosts) perHandle[p.instagram_handle] = (perHandle[p.instagram_handle] ?? 0) + 1;
  const weeks = windowDays / 7;
  const rows: { er: number; label: string }[] = [];
  for (const p of posts) {
    const f = latestFollowers[p.instagram_handle];
    if (!f || f <= 0) continue;
    const ppw = (perHandle[p.instagram_handle] ?? 0) / weeks;
    const bucket = CADENCE_BUCKETS.find(([, lo, hi]) => ppw >= lo && ppw < hi);
    if (!bucket) continue;
    rows.push({ er: (p.likes_count + (p.comments_count ?? 0)) / f, label: bucket[0] });
  }
  return groupMedianER(rows, CADENCE_BUCKETS.map(b => b[0]));
}

/** Turn median-ER bars into multiples of the weakest option. The lowest bar is
 *  the baseline (ratio null); every other bar reads as "N× more than that". */
function toLeverBars(items: BarItem[], subs: Record<string, string>, sort: boolean): WwLeverBar[] {
  const usable = usableBars(items);
  if (usable.length < 2) return [];
  const values = usable.map(i => i.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const ordered = sort ? [...usable].sort((a, b) => b.value - a.value) : usable;
  return ordered.map(i => ({
    label: i.label,
    sub: subs[i.label] ?? null,
    ratio: i.value === min ? null : i.value / min,
    width: Math.max(8, Math.round((i.value / max) * 100)),
    count: i.count,
  }));
}

/** The movement line under each headline. Without a previous period (all-time
 *  scope) it states the standing pattern instead of inventing a direction. */
function buildTrend(
  now: BarItem[],
  prev: BarItem[] | null,
  /** How the bar reads as the sentence subject vs as its object — days stay
   *  capitalised ("overtook Tuesday"), formats do not ("overtook videos"). */
  say: { subject: (label: string) => string; object: (label: string) => string },
  verb: { plural: boolean },
): { text: string; dir: WwDeltaDir } {
  const has = verb.plural ? 'have' : 'has';
  const held = verb.plural ? 'held their lead' : 'held its lead';
  const widened = verb.plural ? 'widened their lead' : 'widened its lead';
  const nowLead = leaderOf(now);
  if (!nowLead) return { text: 'Not enough posts yet to call this one', dir: 'flat' };
  if (!prev) return { text: `${say.subject(nowLead.label)} ${has} led across everything tracked`, dir: 'flat' };
  const prevLead = leaderOf(prev);
  if (!prevLead) return { text: `${say.subject(nowLead.label)} ${held} — first period with enough posts to compare`, dir: 'flat' };
  if (prevLead.label !== nowLead.label) {
    return { text: `${say.subject(nowLead.label)} overtook ${say.object(prevLead.label)} this month`, dir: 'up' };
  }
  const gap = (bars: BarItem[]) => {
    const s = usableBars(bars).sort((a, b) => b.value - a.value);
    return s.length >= 2 && s[1].value > 0 ? s[0].value / s[1].value : 1;
  };
  return gap(now) > gap(prev) * 1.05
    ? { text: `${say.subject(nowLead.label)} ${widened} this month`, dir: 'up' }
    : { text: `${say.subject(nowLead.label)} ${held} — no change this month`, dir: 'flat' };
}

function samplePill(count: number, noun: string): { strength: WwLeverStrength; sample: string } {
  const strength: WwLeverStrength = count >= STRONG_SIGNAL_POSTS ? 'strong' : 'early';
  const words = strength === 'strong' ? 'Strong signal' : 'Early pattern';
  return { strength, sample: `${words} · ${fmtNumber(count)} ${noun}` };
}

const totalCount = (bars: WwLeverBar[]) => bars.reduce((n, b) => n + b.count, 0);

/** The recurring subjects behind the breakouts, from the pipeline's theme tags. */
function buildThemes(breakouts: OutlierPost[]): { themes: WwTheme[]; tagged: number } {
  const tagged = breakouts.filter(p => p.theme_tag);
  const counts: Record<string, number> = {};
  for (const p of tagged) counts[p.theme_tag!] = (counts[p.theme_tag!] ?? 0) + 1;
  const themes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, n]) => ({
      title: tag,
      text: `${n} of the ${tagged.length} tagged breakouts. ${THEME_BLURB[tag] ?? ''}`.trim(),
    }));
  return { themes, tagged: tagged.length };
}

/** Build the lever stack for one scope. Any lever without enough data is left
 *  out entirely — the screen renumbers around it rather than showing an empty card. */
function buildLevers(
  set: WhatsWorkingSet,
  prev: WhatsWorkingSet | null,
  cadence: BarItem[],
  prevCadence: BarItem[] | null,
  breakouts: OutlierPost[],
  scope: WwScope,
): WwLever[] {
  const levers: WwLever[] = [];
  const thisPeriod = scope === 'month' ? 'this month' : 'across everything tracked';

  // 01 · The content — what the breakouts are actually about.
  const { themes, tagged } = buildThemes(breakouts);
  if (tagged >= MIN_TAGGED_THEMES && themes.length >= 2) {
    levers.push({
      id: 'content',
      label: 'The content',
      ...samplePill(tagged, 'tagged breakouts'),
      headline: {
        pre: 'The breakouts aren’t really about the hotel — they’re about ',
        highlight: themes[0].title.toLowerCase(),
        post: ` more than anything else. Reading the AI notes across the top posts, a few subjects keep coming back.`,
      },
      trend: { text: `${themes[0].title} leads the tagged breakouts ${thisPeriod}`, dir: 'flat' },
      bars: [],
      barsNote: '',
      cta: { label: 'See this month’s breakouts', href: '/dashboard#breakouts' },
      themes,
      themesTitle: 'AI read · patterns across the tagged breakouts',
    });
  }

  // 02 · Format.
  const formatBars = toLeverBars(set.by_format, {}, true);
  if (formatBars.length >= 2) {
    const lead = formatBars.filter(b => b.ratio && b.ratio >= (formatBars[0].ratio ?? 1) * 0.92).map(b => pluralFormat(b.label).toLowerCase());
    const baseline = formatBars[formatBars.length - 1];
    const baseOne = singleFormat(baseline.label);
    const n = totalCount(formatBars);
    levers.push({
      id: 'format',
      label: 'Format',
      ...samplePill(n, 'posts'),
      headline: {
        pre: 'Lead with ',
        highlight: joinList(lead.length ? lead : [pluralFormat(formatBars[0].label).toLowerCase()]),
        post: `. They pull noticeably more engagement than ${baseOne} on its own.`,
      },
      trend: buildTrend(set.by_format, prev?.by_format ?? null, {
        subject: l => pluralFormat(l),
        object: l => pluralFormat(l).toLowerCase(),
      }, { plural: true }),
      bars: formatBars,
      barsNote: `Median engagement per post vs ${baseOne} · ${fmtNumber(n)} posts`,
      cta: { label: 'See the top posts', href: '/dashboard#breakouts' },
      themes: null,
      themesTitle: null,
    });
  }

  // 03 · Frequency.
  const cadenceLever = toLeverBars(cadence, {}, true);
  if (cadenceLever.length >= 2) {
    const top = cadenceLever[0];
    const baseline = cadenceLever[cadenceLever.length - 1];
    const n = totalCount(cadenceLever);
    levers.push({
      id: 'frequency',
      label: 'Frequency',
      ...samplePill(n, 'posts'),
      headline: {
        pre: 'Hotels posting ',
        highlight: cadencePhrase(top.label),
        post: ' get the most out of each post — enough to stay seen, not so much that every post thins out.',
      },
      trend: buildTrend(cadence, prevCadence, {
        subject: l => `Posting ${cadencePhrase(l)}`,
        object: l => `posting ${cadencePhrase(l)}`,
      }, { plural: false }),
      bars: cadenceLever,
      barsNote: `Median engagement per post vs posting ${cadencePhrase(baseline.label)} · ${fmtNumber(n)} posts`,
      cta: null,
      themes: null,
      themesTitle: null,
    });
  }

  // 04 · Day & time — bars stay in week order; the prose names the winner.
  const dayBars = toLeverBars(set.by_day, {}, false);
  const dayLead = leaderOf(set.by_day);
  const hourLead = leaderOf(set.by_hour_block);
  if (dayBars.length >= 2 && dayLead) {
    const quietest = usableBars(set.by_day).sort((a, b) => a.value - b.value)[0];
    const n = totalCount(dayBars);
    levers.push({
      id: 'day',
      label: 'Day & time',
      ...samplePill(n, 'posts'),
      headline: {
        pre: '',
        highlight: DAY_FULL_NAME[dayLead.label] ?? dayLead.label,
        post: hourLead
          ? ` is the strongest day across the portfolio, and posts that land in the ${hourBlockPhrase(hourLead.label)} do best. ${DAY_FULL_NAME[quietest.label] ?? quietest.label} is the quietest.`
          : ` is the strongest day across the portfolio. ${DAY_FULL_NAME[quietest.label] ?? quietest.label} is the quietest.`,
      },
      trend: buildTrend(set.by_day, prev?.by_day ?? null, {
        subject: l => DAY_FULL_NAME[l] ?? l,
        object: l => DAY_FULL_NAME[l] ?? l,
      }, { plural: false }),
      bars: dayBars,
      barsNote: `Median engagement per post vs ${DAY_FULL_NAME[quietest.label] ?? quietest.label}, the quietest day · ${fmtNumber(n)} posts · times are UTC`,
      cta: null,
      themes: null,
      themesTitle: null,
    });
  }

  // 05 · Caption.
  const captionBars = toLeverBars(set.by_caption, CAPTION_SUBS, true);
  if (captionBars.length >= 2) {
    const top = captionBars[0];
    const baseline = captionBars[captionBars.length - 1];
    const n = totalCount(captionBars);
    const longest = top.label === 'Long';
    levers.push({
      id: 'caption',
      label: 'Caption',
      ...samplePill(n, 'posts'),
      headline: {
        pre: '',
        highlight: longest ? 'Longer captions win' : `${top.label} captions win`,
        post: longest
          ? ' — the posts that tell a fuller story beat one-liners.'
          : ` — ${top.label.toLowerCase()} captions beat both the very short and the very long.`,
      },
      trend: buildTrend(set.by_caption, prev?.by_caption ?? null, {
        subject: l => `${l} captions`,
        object: l => `${l.toLowerCase()} captions`,
      }, { plural: true }),
      bars: captionBars,
      barsNote: `Median engagement per post vs a ${baseline.label.toLowerCase()} caption · ${fmtNumber(n)} posts`,
      cta: { label: 'See the top posts', href: '/dashboard#breakouts' },
      themes: null,
      themesTitle: null,
    });
  }

  return levers;
}

const WW_LEDE: Record<WwScope, string> = {
  month:
    'The levers you can actually pull — what to post about, what format, how often, when to post, and how to write it. Drawn from the breakouts across every tracked hotel, honestly hedged.',
  all:
    'The same levers, measured across everything we’ve tracked rather than the last 30 days — steadier, and more telling than any single month suggests.',
};

/** Standing line under the lever stack: what the numbers are and are not. */
export const WW_LEVERS_NOTE: Record<WwScope, string> = {
  month: 'Patterns across the tracked hotels · last 30 days · correlation, not a promise',
  all:   'Patterns across the tracked hotels · everything on record · correlation, not a promise',
};

/** Build the full What's Working analysis for both scopes. */
export function computeWhatsWorkingData(
  validForAnalysis: RawPost[],
  allPosts: RawPost[],
  now: number,
  latestFollowers: Record<string, number | null>,
  hotelMetrics: Record<string, HotelMetrics>,
  hotelNameByHandle: Record<string, string>,
  hotelCountryByHandle: Record<string, string | null>,
  hotelRegionByHandle: Record<string, string | null>,
  storedImageUrl: Record<string, string | null>,
  storedInsight: Record<string, { insight: string | null; tag: string | null; theme_tag: string | null; editors_pick: boolean; landing_pin: boolean }>,
): WhatsWorkingData {
  const age = (p: RawPost) => now - new Date(p.posted_at).getTime();
  const inLast = (days: number) => (p: RawPost) => age(p) <= days * DAY_MS_WW;
  const between = (lo: number, hi: number) => (p: RawPost) => age(p) > lo * DAY_MS_WW && age(p) <= hi * DAY_MS_WW;

  const monthPosts = validForAnalysis.filter(inLast(30));
  const prevPosts  = validForAnalysis.filter(between(30, 60));
  const allValid   = validForAnalysis;
  const monthCadence = allPosts.filter(inLast(30));
  const prevCadence  = allPosts.filter(between(30, 60));

  const breakoutsIn = (posts: RawPost[]) =>
    computeStandout(posts, hotelMetrics, hotelNameByHandle, hotelCountryByHandle, hotelRegionByHandle, storedImageUrl, storedInsight, STANDOUT_LIMIT);
  // Only the current and all-time breakout passes are needed: the previous
  // period reaches the screen through the levers' trend lines, which compare
  // computeWhatsWorking SETS rather than breakout counts.
  const mRes = breakoutsIn(monthPosts);
  const aRes = breakoutsIn(allValid);

  const setMonth = computeWhatsWorking(monthPosts, latestFollowers);
  const setPrev  = computeWhatsWorking(prevPosts, latestFollowers);
  const setAll   = computeWhatsWorking(allValid, latestFollowers);

  // Cadence is measured on ALL posts (a post with hidden likes still counts as
  // posting), but the engagement it buckets comes from the analysable set.
  const spanDays = (posts: RawPost[]) => {
    if (!posts.length) return 0;
    const ts = posts.map(p => new Date(p.posted_at).getTime());
    return Math.max(1, (Math.max(...ts) - Math.min(...ts)) / DAY_MS_WW);
  };
  const cadenceMonth = cadenceBars(monthPosts, monthCadence, 30, latestFollowers);
  const cadencePrev  = cadenceBars(prevPosts, prevCadence, 30, latestFollowers);
  const cadenceAll   = cadenceBars(allValid, allPosts, spanDays(allPosts), latestFollowers);

  return {
    month: {
      set: setMonth,
      levers: buildLevers(setMonth, setPrev, cadenceMonth, cadencePrev, mRes.posts, 'month'),
      lede: WW_LEDE.month,
      collab: buildCollabNote(monthPosts, mRes.posts, latestFollowers, 'month'),
    },
    all: {
      set: setAll,
      levers: buildLevers(setAll, null, cadenceAll, null, aRes.posts, 'all'),
      lede: WW_LEDE.all,
      collab: buildCollabNote(allValid, aRes.posts, latestFollowers, 'all'),
    },
  };
}

export function computeSnapshot(hotels: HotelRow[]): Snapshot {
  const ers       = hotels.map(h => h.engagement_rate).filter((e): e is number => e !== null);
  const ppws      = hotels.map(h => h.posts_per_week).filter((p): p is number => p !== null);
  const followers = hotels.map(h => h.followers_count).filter((f): f is number => f !== null);
  return {
    median_er:        median(ers),
    median_ppw:       median(ppws),
    median_followers: median(followers),
  };
}

export function computeStandout(
  recentValidPosts: RawPost[],
  hotelMetrics: Record<string, HotelMetrics>,
  hotelNameByHandle: Record<string, string>,
  hotelCountryByHandle: Record<string, string | null>,
  hotelRegionByHandle: Record<string, string | null>,
  storedImageUrl: Record<string, string | null>,
  storedInsight: Record<string, { insight: string | null; tag: string | null; theme_tag: string | null; editors_pick: boolean; landing_pin: boolean }>,
  limit: number = MAX_STANDOUT_POSTS,
  // Curated mode (the Featured shelf): every gate that exists to SELECT
  // breakouts — the 2× threshold, the absolute floor, the baseline floor and
  // the coverage gate — is skipped, because the editor already selected the
  // post. The one hard requirement left is a computable baseline (median > 0),
  // without which no multiplier exists.
  //
  // minMultiplier drops the 2× bar for THIS CALL ONLY, so the 7-day view can
  // build its near-miss pool (see NEAR_MISS_FLOOR). Every other gate still
  // applies, and the returned breakout_count is still the ≥2× count — a
  // near-miss is not a breakout and must never be counted as one.
  opts: { curated?: boolean; minMultiplier?: number } = {},
): { posts: OutlierPost[]; breakout_count: number; super_breakout_count: number } {
  const standout: OutlierPost[] = [];
  for (const p of recentValidPosts) {
    const m = hotelMetrics[p.instagram_handle];
    const postEngagement = p.likes_count + (p.comments_count ?? 0);
    if (!m?.medianPostEngagement) continue;
    if (!opts.curated) {
      if (postEngagement < MIN_ENGAGEMENT) continue;
      if (m.medianPostEngagement < MIN_BASELINE_ENGAGEMENT) continue;
      // Coverage gate: a hotel that hides likes on most recent posts has a
      // median built from too thin a sample to trust — drop its breakouts
      // silently.
      if (m.visibleLikeRatio < MIN_VISIBLE_LIKE_RATIO) continue;
      // Measurability gate: no honest baseline exists (fewer than
      // MEASURABLE_MIN_POSTS visible-like posts inside BASELINE_MAX_AGE_DAYS),
      // so no multiplier from this hotel can be trusted either. Runs alongside
      // the ratio gate — they catch different offenders.
      if (!m.measurable) continue;
    }
    const multiplier = postEngagement / m.medianPostEngagement;
    if (!opts.curated && multiplier < (opts.minMultiplier ?? OUTLIER_THRESHOLD)) continue;
    const medL = m.medianLikes    ?? 1;
    const medC = m.medianComments ?? 1;
    standout.push({
      hotel_name:           hotelNameByHandle[p.instagram_handle] ?? p.instagram_handle,
      hotel_country:        hotelCountryByHandle[p.instagram_handle] ?? null,
      hotel_region:         hotelRegionByHandle[p.instagram_handle] ?? null,
      hotel_followers:      m.followers,
      instagram_handle:     p.instagram_handle,
      post_id:              p.post_id,
      type:                 normalizeType(p.type),
      likes_count:          p.likes_count,
      comments_count:       p.comments_count ?? 0,
      // Stored image takes priority; falls back to live Instagram CDN link
      image_url:            storedImageUrl[p.post_id] ?? p.image_url,
      post_url:             p.post_url,
      multiplier,
      likes_multiple:       medL > 0 ? p.likes_count / medL : 0,
      comments_multiple:    medC > 0 ? (p.comments_count ?? 0) / medC : 0,
      hotel_typical_total:  m.medianPostEngagement,
      hotel_typical_likes:  m.medianLikes,
      hotel_typical_comments: m.medianComments,
      posted_at:            p.posted_at,
      post_insight:         storedInsight[p.post_id]?.insight ?? null,
      driver_tag:           storedInsight[p.post_id]?.tag ?? null,
      theme_tag:            storedInsight[p.post_id]?.theme_tag ?? null,
      editors_pick:         storedInsight[p.post_id]?.editors_pick ?? false,
      landing_pin:          storedInsight[p.post_id]?.landing_pin ?? false,
      // Display-only collab tag — TRUE Instagram Collabs ONLY: posts co-authored
      // by two accounts (the "X and Y" byline), which the scraper exposes as
      // coauthor_usernames. Deliberately NOT caption "collaboration with @…" posts
      // or single-grid tagged partnerships — those stay in the feed. Catches
      // collabs with UNTRACKED partners too (the co-author tag rides on the post,
      // not the grid). Null coauthor_usernames (rows not yet re-scraped) = not a
      // collab until backfilled.
      is_collab:            (p.coauthor_usernames?.length ?? 0) > 0,
      // Set by selectWeekTopUps on the 7-day view; everything selected here
      // cleared whatever bar this call was given, so nothing is a near-miss yet.
      near_miss:            false,
    });
  }
  // Count ALL qualifying posts before slicing for the hero panel. Counted at
  // OUTLIER_THRESHOLD regardless of any minMultiplier override — a relaxed call
  // is building a near-miss pool, and near-misses are not breakouts.
  const breakouts            = standout.filter(p => p.multiplier >= OUTLIER_THRESHOLD);
  const breakout_count       = breakouts.length;
  const super_breakout_count = breakouts.filter(p => p.multiplier >= 10).length;
  standout.sort((a, b) => b.multiplier - a.multiplier);
  return { posts: standout.slice(0, limit), breakout_count, super_breakout_count };
}

/**
 * The empty-week top-up for the SEVEN-DAY view.
 *
 * Given the week's true breakouts and a pool of everything that beat its
 * hotel's median by at least NEAR_MISS_FLOOR, return the posts to append so the
 * week offers WEEK_MIN_POSTS in total and WEEK_MIN_SOLO of them non-collab.
 * The solo shortfall is filled first — a week of nothing but collabs is the
 * case this exists for, and a collab isn't a lever a hotel can pull on its own.
 *
 * Returns a NEW array of posts flagged near_miss, best-first; never mutates its
 * inputs, and returns [] when the week stands up on its own. Exported for
 * tests.
 */
export function selectWeekTopUps(
  breakouts: OutlierPost[],
  pool: OutlierPost[],
): OutlierPost[] {
  const key = (p: OutlierPost) => `${p.post_id}|${p.instagram_handle}`;
  const taken = new Set(breakouts.map(key));

  // Anything in the pool that isn't already a breakout, best first.
  const candidates = pool
    .filter(p => !taken.has(key(p)) && p.multiplier < OUTLIER_THRESHOLD)
    .sort((a, b) => b.multiplier - a.multiplier);

  const chosen: OutlierPost[] = [];
  const take = (p: OutlierPost) => {
    taken.add(key(p));
    chosen.push({ ...p, near_miss: true });
  };

  // 1. Enough non-collab posts that the week says something a hotel can act on.
  const soloShort = WEEK_MIN_SOLO - breakouts.filter(p => !p.is_collab).length;
  if (soloShort > 0) {
    for (const p of candidates) {
      if (chosen.length >= soloShort) break;
      if (!p.is_collab) take(p);
    }
  }

  // 2. Then enough posts overall, best available regardless of collab status.
  for (const p of candidates) {
    if (breakouts.length + chosen.length >= WEEK_MIN_POSTS) break;
    if (!taken.has(key(p))) take(p);
  }

  return chosen.sort((a, b) => b.multiplier - a.multiplier);
}

/**
 * Landing-taster ordering: admin-pinned breakouts first, then the automatic
 * list fills the remaining slots.
 *
 * `pinnedPool` is the full breakout set (all-time, any age/collab) already
 * sorted by multiplier — every post carrying `landing_pin` is lifted to the
 * front in that order (one row per post_id; a co-post's best grid wins).
 * `autoFeatured` is the default selection (best non-collab last-30); its posts
 * fill the rest, minus anything already pinned. Result is capped at `limit`.
 * With no pins this returns `autoFeatured` unchanged (capped) — the old rule.
 * Pure + exported so the priority logic is unit-tested without a DB round-trip.
 */
export function orderLandingFeatured(
  autoFeatured: OutlierPost[],
  pinnedPool: OutlierPost[],
  limit: number,
): OutlierPost[] {
  const pinned: OutlierPost[] = [];
  const pinnedIds = new Set<string>();
  for (const p of pinnedPool) {
    if (!p.landing_pin || pinnedIds.has(p.post_id)) continue;
    pinnedIds.add(p.post_id);
    pinned.push(p);
  }
  if (pinned.length === 0) return autoFeatured.slice(0, limit);
  const filler = autoFeatured.filter(p => !pinnedIds.has(p.post_id));
  return [...pinned, ...filler].slice(0, limit);
}

/**
 * The Featured shelf: every post in the pool carrying `editors_pick`, one row
 * per post_id (the pool is multiplier-sorted, so a co-post's best grid wins),
 * kept in the pool's best-first order.
 *
 * The caller builds the pool from the picked posts in curated mode
 * ({ curated: true }), so a pick stays honoured even after its hotel's
 * median drifts below the breakout gates.
 * Pure + exported so the selection is unit-tested without a DB round-trip.
 */
export function selectFeaturedPosts(pool: OutlierPost[]): OutlierPost[] {
  const seen = new Set<string>();
  const out: OutlierPost[] = [];
  for (const p of pool) {
    if (!p.editors_pick || seen.has(p.post_id)) continue;
    seen.add(p.post_id);
    out.push(p);
  }
  return out;
}

/**
 * Hybrid marquee rotation for the landing taster (Neil, 2026-07-21).
 *
 * When posts are pinned, the taster's first open card ALWAYS shows a post from
 * a marquee hotel (`marqueeHandles`), cycling through them one per tick; the
 * remaining `slots - 1` cards rotate through the rest of the pinned set (ring
 * advancing one per tick), so every pinned post gets homepage exposure over a
 * day. `tick` is hours-since-epoch at render — the landing page's hourly ISR
 * revalidate is what actually advances it. Pinned posts not shown this tick
 * stay queued after the visible slots (harmless — the taster slices 0..5);
 * non-pinned filler keeps its order after them. With no pinned marquee post
 * the whole pinned set rotates plainly; with ≤1 pinned post there is nothing
 * to rotate and the list is returned unchanged.
 * Pure + exported so the rotation is unit-tested without a DB round-trip.
 */
export function rotateLandingFeatured(
  ordered: OutlierPost[],
  marqueeHandles: string[],
  tick: number,
  slots: number = LANDING_SLOTS,
): OutlierPost[] {
  const pinned = ordered.filter(p => p.landing_pin);
  if (pinned.length <= 1) return ordered;
  const rest = ordered.filter(p => !p.landing_pin);

  // Slot 1 — the marquee lead, cycling per tick (multiplier order within the set).
  const marquee = pinned.filter(p => marqueeHandles.includes(p.instagram_handle));
  const lead = marquee.length > 0 ? marquee[tick % marquee.length] : null;

  // Remaining slots — a ring over every other pinned post (marquee ones
  // included, so the big names also appear in ordinary slots), advancing one
  // position per tick.
  const ring = pinned.filter(p => p !== lead);
  const shown: OutlierPost[] = lead ? [lead] : [];
  const ringCount = Math.min(slots - shown.length, ring.length);
  const start = ring.length > 0 ? tick % ring.length : 0;
  for (let i = 0; i < ringCount; i++) shown.push(ring[(start + i) % ring.length]);

  const shownSet = new Set(shown);
  const unshown = pinned.filter(p => !shownSet.has(p));
  return [...shown, ...unshown, ...rest];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
/**
 * @param opts.adminView  Bypass the PUBLISH GATE so /admin sees the posts from
 *   the latest scrape before they are released to members. It does NOT bypass
 *   the hidden flags — hidden posts and hotels are excluded from the numbers
 *   for everyone, so what the admin reviews is exactly what members will get.
 */
export async function getPortfolioData(
  opts: { adminView?: boolean } = {},
): Promise<DashboardData> {
  const supabase = getSupabase();
  const PAGE = 1000;
  const adminView = opts.adminView === true;

  // ── Publish gate ──────────────────────────────────────────────────────────
  // Members only see posts dated at or before the cutoff, so a Sunday-night
  // scrape lands invisibly and is released by hitting Publish in /admin on the
  // Monday. A missing/unreadable settings row must never black out the
  // dashboard, so the fallback is "everything is published".
  const settingsRes = await supabase
    .from('dashboard_settings')
    .select('publish_cutoff, published_at')
    .eq('id', true)
    .maybeSingle();
  if (settingsRes.error) console.error('dashboard_settings query failed:', settingsRes.error.message);
  const publishCutoffIso = settingsRes.data?.publish_cutoff ?? null;
  const publishCutoffMs = publishCutoffIso ? new Date(publishCutoffIso).getTime() : Number.POSITIVE_INFINITY;

  // Beta: only tracked hotels (the 200 most-followed — see
  // instagram-pipeline/setup-tracked.sql). Untracked hotels stay in the
  // database but are invisible to the dashboard. `hidden` is the separate,
  // EDITORIAL flag set in /admin — deliberately not `tracked`, so hiding a
  // hotel from the dashboard never stops the pipeline scraping it.
  const hotelsRes = await supabase
    .from('hotels')
    .select('name, region, country, instagram_handle, hidden')
    .eq('tracked', true)
    .order('name');
  if (hotelsRes.error) throw new Error(hotelsRes.error.message);
  const hiddenHotels = (hotelsRes.data ?? []).filter(h => h.hidden === true);
  const hiddenHandles = new Set(hiddenHotels.map(h => h.instagram_handle));
  // A hidden hotel is excluded from EVERY figure — it never reaches trackedHandles.
  const trackedHandles = new Set(
    (hotelsRes.data ?? []).filter(h => !hiddenHandles.has(h.instagram_handle)).map(h => h.instagram_handle),
  );

  // NOTE: every paginated query orders by a UNIQUE key (or has a unique
  // tiebreaker). Offset pagination over non-unique columns (a scrape inserts
  // ~465 rows with near-identical timestamps) can silently skip rows at page
  // boundaries.

  // Paginate standout posts — the PostgREST default caps at 1,000 rows, which
  // this table outgrows within ~10 months at 25 rows/week
  type StandoutRow = {
    post_id: string;
    stored_image_url: string | null;
    post_insight: string | null;
    driver_tag: string | null;
    theme_tag: string | null;
    editors_pick: boolean | null;
    landing_pin: boolean | null;
    hidden: boolean | null;
  };
  const standoutRows: StandoutRow[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('standout_posts')
      .select('post_id, stored_image_url, post_insight, driver_tag, theme_tag, editors_pick, landing_pin, hidden')
      .order('post_id')
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      // Non-fatal (table may not exist yet) — but never swallow it silently
      console.error('standout_posts query failed:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    standoutRows.push(...data);
    if (data.length < PAGE) break;
  }

  // Paginate snapshots — a fixed range silently drops hotels once the table
  // outgrows it (~10 scrape runs at 465 hotels per run)
  type SnapshotRow = { instagram_handle: string; followers_count: number | null };
  const snapshots: SnapshotRow[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('profile_snapshots')
      .select('instagram_handle, followers_count, captured_at')
      .order('captured_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    snapshots.push(...data);
    if (data.length < PAGE) break;
  }

  // Posts hidden by the admin. Keyed on post_id (standout_posts' primary key),
  // so — exactly like the Editor's note — hiding a co-post hides it on every
  // partner's grid.
  const hiddenPostIds = new Set(standoutRows.filter(r => r.hidden === true).map(r => r.post_id));

  // Paginate posts
  const allPosts: RawPost[] = [];
  // Posts newer than the cutoff, awaiting release. Counted even when they're
  // filtered out, so /admin can say how many are pending.
  let pendingPosts = 0;
  // A co-post appears on each partner's grid as a separate row (same post_id,
  // different instagram_handle) — de-dupe on the composite, not post_id alone.
  const seenPostKeys = new Set<string>();
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('posts')
      .select('post_id, instagram_handle, likes_count, comments_count, posted_at, type, caption, image_url, post_url, coauthor_usernames')
      .not('posted_at', 'is', null)
      .order('posted_at', { ascending: false })
      .order('post_id')
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const p of data) {
      // Untracked + admin-hidden hotels' posts stay in the DB but out of the
      // stats. Hidden is FULL exclusion: the post never reaches a baseline, a
      // median, a breakout count or the What's Working buckets, so no figure
      // can disagree with what's on screen.
      if (!trackedHandles.has(p.instagram_handle)) continue;
      if (hiddenPostIds.has(p.post_id)) continue;
      // Rows can shift between pages if the pipeline uploads mid-fetch
      const key = `${p.post_id}|${p.instagram_handle}`;
      if (seenPostKeys.has(key)) continue;
      seenPostKeys.add(key);
      // The publish gate. Admin sees through it; members don't.
      if (new Date(p.posted_at).getTime() > publishCutoffMs) {
        pendingPosts++;
        if (!adminView) continue;
      }
      allPosts.push(p);
    }
    if (data.length < PAGE) break;
  }

  const allHotels = (hotelsRes.data ?? []).filter(h => !hiddenHandles.has(h.instagram_handle));

  // ── The hidden roster (admin only) ────────────────────────────────────────
  // Hidden things are excluded from the data above, so /admin needs this
  // separate list to show what's hidden and undo it. Skipped entirely for
  // members — it costs a query and they can't act on it.
  const nameByHandleAll: Record<string, string> = {};
  for (const h of hotelsRes.data ?? []) {
    if (!(h.instagram_handle in nameByHandleAll)) nameByHandleAll[h.instagram_handle] = h.name;
  }
  const hiddenRoster: DashboardData['hidden'] = {
    posts: [],
    hotels: hiddenHotels.map(h => ({ instagram_handle: h.instagram_handle, name: h.name })),
  };
  if (adminView && hiddenPostIds.size > 0) {
    // storedImageUrl proper is built further down; the roster needs it now.
    const storedImg = new Map(standoutRows.map(r => [r.post_id, r.stored_image_url]));
    const { data, error } = await supabase
      .from('posts')
      .select('post_id, instagram_handle, image_url, posted_at')
      .in('post_id', [...hiddenPostIds])
      .order('posted_at', { ascending: false });
    if (error) {
      console.error('hidden posts query failed:', error.message);
    } else {
      const seen = new Set<string>();
      for (const p of data ?? []) {
        if (seen.has(p.post_id)) continue; // one row per post_id (co-posts)
        seen.add(p.post_id);
        hiddenRoster.posts.push({
          post_id: p.post_id,
          instagram_handle: p.instagram_handle,
          hotel_name: nameByHandleAll[p.instagram_handle] ?? p.instagram_handle,
          image_url: storedImg.get(p.post_id) ?? p.image_url ?? null,
          posted_at: p.posted_at,
        });
      }
    }
  }

  // ── Stored image URLs + per-post insights ─────────────────────────────────
  const storedImageUrl: Record<string, string | null> = {};
  const storedInsight:  Record<string, { insight: string | null; tag: string | null; theme_tag: string | null; editors_pick: boolean; landing_pin: boolean }> = {};
  for (const r of standoutRows) {
    storedImageUrl[r.post_id] = r.stored_image_url ?? null;
    storedInsight[r.post_id]  = { insight: r.post_insight ?? null, tag: r.driver_tag ?? null, theme_tag: r.theme_tag ?? null, editors_pick: r.editors_pick ?? false, landing_pin: r.landing_pin ?? false };
  }

  // ── Latest followers per handle (snapshots are newest-first) ──────────────
  const latestFollowers: Record<string, number | null> = {};
  for (const s of snapshots) {
    if (!(s.instagram_handle in latestFollowers)) {
      latestFollowers[s.instagram_handle] = s.followers_count;
    }
  }

  // ── Group posts by handle ─────────────────────────────────────────────────
  const postsByHandle: Record<string, RawPost[]> = {};
  for (const p of allPosts) {
    if (!postsByHandle[p.instagram_handle]) postsByHandle[p.instagram_handle] = [];
    postsByHandle[p.instagram_handle].push(p);
  }

  // ── Per-hotel metrics ─────────────────────────────────────────────────────
  const now              = Date.now();
  const weekWindowMs     = POSTS_WEEK_WINDOW * 24 * 60 * 60 * 1000;
  const outlierWindowMs  = OUTLIER_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const hotelMetrics: Record<string, HotelMetrics> = {};

  for (const [handle, posts] of Object.entries(postsByHandle)) {
    const followers  = latestFollowers[handle] ?? null;
    const validPosts = posts.filter(hasVisibleLikes);

    // Visible-like coverage over the hotel's last RECENT_POSTS (posts is
    // newest-first). The share of recent posts we can actually read — low
    // coverage means the median/ER below are drawn from a thin sample, so the
    // hotel is gated out of breakouts + leaderboard (MIN_VISIBLE_LIKE_RATIO).
    const recentWindow = posts.slice(0, RECENT_POSTS);
    const visibleLikeRatio = recentWindow.length > 0
      ? recentWindow.filter(hasVisibleLikes).length / recentWindow.length
      : 0;

    // The baseline/ER window: the last BASELINE_POSTS visible-like posts,
    // reaching back at most BASELINE_MAX_AGE_DAYS (selectBaselinePosts). Same
    // sample size for every measurable hotel; the measurability gate counts
    // the same list. Runs ALONGSIDE the coverage ratio above — the gate
    // catches "too little readable data", the ratio "hides likes on most
    // recent posts". Both must pass.
    const windowPosts = selectBaselinePosts(posts, now);
    const measurable  = isMeasurable(windowPosts.length);

    // Overall ER — MEDIAN per-post rate over the hotel's last 30 valid posts
    // in the window. Median, not mean: one viral post shouldn't set a hotel's
    // "typical post" number.
    const recentERs = followers && followers > 0
      ? windowPosts.slice(0, HOTEL_ER_POSTS).map(p => (p.likes_count! + (p.comments_count ?? 0)) / followers)
      : [];
    const er = median(recentERs);

    // Breakout baseline: median engagement across the hotel's last 30 valid
    // posts in the window — recency-weighted, and never older than 12 months.
    const baselinePosts    = windowPosts.slice(0, BASELINE_POSTS);
    const baseLikes        = baselinePosts.map(p => p.likes_count!);
    const baseComments     = baselinePosts.map(p => p.comments_count ?? 0);
    const baseEngagements  = baseLikes.map((l, i) => l + baseComments[i]);
    const medianPostEngagement = median(baseEngagements);
    const medianLikes          = median(baseLikes);
    const medianComments       = median(baseComments);

    // Posts per week (last 28 days)
    const recentCount = posts.filter(p => now - new Date(p.posted_at).getTime() < weekWindowMs).length;
    const ppw = recentCount / (POSTS_WEEK_WINDOW / 7);

    // Momentum — TOTAL engagement (likes+comments) over the last N days
    // ÷ followers × 100. A period "reach relative to size": rewards both post
    // quality AND frequency, so it's a sort-only rank option (a single viral
    // post or heavy posting cadence can push it far above any credible ER).
    // Null when the hotel has no valid posts in the window (dormant → sorts
    // to the bottom) or no follower count.
    const DAY = 24 * 60 * 60 * 1000;
    const rateOverDays = (days: number): number | null => {
      if (!followers || followers <= 0) return null;
      const cutoff = now - days * DAY;
      const inWindow = validPosts.filter(p => new Date(p.posted_at).getTime() >= cutoff);
      if (inWindow.length === 0) return null;
      const total = inWindow.reduce((s, p) => s + p.likes_count! + (p.comments_count ?? 0), 0);
      return (total / followers) * 100;
    };

    hotelMetrics[handle] = {
      er,
      ppw,
      lastPosted:    posts[0]?.posted_at ?? null,
      medianPostEngagement,
      medianLikes,
      medianComments,
      followers,
      validPostCount: validPosts.length,
      visibleLikeRatio,
      visibleInWindow: windowPosts.length,
      measurable,
      recentRate30:  rateOverDays(30),
      recentRate90:  rateOverDays(90),
    };
  }

  // ── Hotel rows (deduped, scraped-only) ────────────────────────────────────
  const seenHandles        = new Set<string>();
  const hotelRows: HotelRow[] = [];
  const hotelNameByHandle:    Record<string, string>      = {};
  const hotelCountryByHandle: Record<string, string | null> = {};
  const hotelRegionByHandle:  Record<string, string | null> = {};

  for (const h of allHotels) {
    // First entry wins for duplicated handles — keeps cards and leaderboard
    // showing the same hotel name
    if (!(h.instagram_handle in hotelNameByHandle)) {
      hotelNameByHandle[h.instagram_handle]    = h.name;
      hotelCountryByHandle[h.instagram_handle] = h.country ?? null;
      hotelRegionByHandle[h.instagram_handle]  = h.region ?? null;
    }
    if (seenHandles.has(h.instagram_handle)) continue;
    if (!postsByHandle[h.instagram_handle])  continue;
    seenHandles.add(h.instagram_handle);

    const m       = hotelMetrics[h.instagram_handle];
    const rawER   = m?.er != null ? m.er * 100 : null;
    const vpc     = m?.validPostCount ?? 0;
    // The baseline is the last BASELINE_POSTS valid posts, so its size is
    // simply the valid-post count capped at that limit
    const { hard, soft } = erFlagReasons(vpc, rawER, Math.min(vpc, BASELINE_POSTS));
    // Coverage gate: a hotel that hides likes on most recent posts has ER/rate
    // built from too thin a sample — null them so it's excluded from the medians
    // and sorts to the bottom, exactly like a dormant hotel. Deliberately sets NO
    // er_flag_reason, so there's no ⚠ or caveat on the leaderboard (Neil's call).
    const mostlyHidesLikes = (m?.visibleLikeRatio ?? 0) < MIN_VISIBLE_LIKE_RATIO;
    // Dormancy gate: the ER is a "last 30 posts" median, so it never ages out on
    // its own — a hotel that stopped posting would keep its old number forever.
    // Nulled silently (no ⚠), like mostlyHidesLikes.
    const lastPostedMs = m?.lastPosted ? new Date(m.lastPosted).getTime() : null;
    const dormant = lastPostedMs === null || now - lastPostedMs > DORMANT_DAYS * 24 * 60 * 60 * 1000;

    // The measurability gate: fewer than MEASURABLE_MIN_POSTS visible-like
    // posts within BASELINE_MAX_AGE_DAYS means no honest baseline exists at any
    // sample size — the hotel is ABSENT from the leaderboard, not warned on it
    // (brief 02, 2026-07-31). It stays tracked and scraped (hero counts below
    // use trackedHotelCount, not this list), so it returns by itself once
    // enough readable posts accumulate. The watchlist page has its own
    // fallback row for hotels missing from this list, so a watchlisted
    // unmeasurable hotel still renders there by name.
    if (m && !m.measurable) continue;

    hotelRows.push({
      name:             h.name,
      region:           h.region ?? null,
      country:          h.country ?? null,
      instagram_handle: h.instagram_handle,
      followers_count:  latestFollowers[h.instagram_handle] ?? null,
      // Only a hard flag nulls the ER (excluded from medians, sorts to the
      // bottom). A soft baseline warning keeps the valid ER counted. A
      // mostly-hidden-likes hotel is nulled silently (no flag reason).
      engagement_rate:  hard || mostlyHidesLikes || dormant ? null : rawER,
      recent_rate:      mostlyHidesLikes
        ? { d30: null, d90: null }
        : { d30: m?.recentRate30 ?? null, d90: m?.recentRate90 ?? null },
      posts_per_week:   m?.ppw ?? null,
      last_posted:      m?.lastPosted ?? null,
      er_flag_reason:   hard ?? soft,
      accreditations:   accreditationsFor(h.instagram_handle),
    });
  }

  // ── Valid posts ───────────────────────────────────────────────────────────
  const validForAnalysis = allPosts.filter(hasVisibleLikes);
  const DAY_MS = 24 * 60 * 60 * 1000;
  const recentValidPosts = validForAnalysis.filter(
    p => now - new Date(p.posted_at).getTime() <= outlierWindowMs
  );

  // What's Working — static median-engagement patterns over the last 30 days.
  const whatsWorkingPosts = validForAnalysis.filter(
    p => now - new Date(p.posted_at).getTime() <= WHATS_WORKING_WINDOW_DAYS * DAY_MS
  );
  const whatsWorking = computeWhatsWorking(whatsWorkingPosts, latestFollowers);

  // ── Top posts (breakouts) per time window ─────────────────────────────────
  // Same selection for each window (≥2× the hotel's own median, ranked by
  // multiplier), capped at STANDOUT_LIMIT. "All time" = the top 100 ever. The
  // hero "this week" counts always come from the 7-day window.
  const standout = {} as Record<TimeWindow, OutlierPost[]>;
  let breakout_count = 0;
  let super_breakout_count = 0;
  for (const w of TIME_WINDOWS) {
    const { key, days } = w;
    const windowPosts =
      key === '7d'  ? recentValidPosts :
      days === null ? validForAnalysis :
      validForAnalysis.filter(p => now - new Date(p.posted_at).getTime() <= days * DAY_MS);
    const res = computeStandout(
      windowPosts, hotelMetrics, hotelNameByHandle, hotelCountryByHandle,
      hotelRegionByHandle, storedImageUrl, storedInsight, STANDOUT_LIMIT,
    );
    standout[key] = res.posts;
    if (key === '7d') {
      breakout_count = res.breakout_count;
      super_breakout_count = res.super_breakout_count;
      // Top the week up when it didn't produce enough to look at — see the
      // NEAR_MISS_FLOOR note by the constants. The appended posts are flagged
      // near_miss and sit BELOW every real breakout, so the ranking stays
      // honest and the counts above are already fixed.
      const pool = computeStandout(
        windowPosts, hotelMetrics, hotelNameByHandle, hotelCountryByHandle,
        hotelRegionByHandle, storedImageUrl, storedInsight, STANDOUT_LIMIT,
        { minMultiplier: NEAR_MISS_FLOOR },
      ).posts;
      standout[key] = [...res.posts, ...selectWeekTopUps(res.posts, pool)];
    }
  }

  // ── Landing taster: admin-pinned first, then best NON-COLLAB last-30 ──────
  // Default rule: the best NON-COLLAB breakouts of the last 30 days. "Collab"
  // here means a TRUE Instagram Collab (co-author byline); single-grid tagged
  // partnerships and caption "collaboration with @…" posts are NOT excluded.
  const landingCandidates = validForAnalysis.filter(p =>
    now - new Date(p.posted_at).getTime() <= LANDING_WINDOW_DAYS * DAY_MS &&
    (p.coauthor_usernames?.length ?? 0) === 0
  );
  const autoFeatured = computeStandout(
    landingCandidates, hotelMetrics, hotelNameByHandle, hotelCountryByHandle,
    hotelRegionByHandle, storedImageUrl, storedInsight,
  ).posts;

  // Admin override: any breakout flagged standout_posts.landing_pin is forced to
  // the FRONT of the taster (so it leads the hero + open cards), regardless of
  // age or collab status — the pin overrides the default rule. Pinned posts are
  // drawn from the ALL-TIME breakout pool (unbounded, so a pin outside the top
  // 100 is still honoured), ranked by multiplier, one row per post_id. The auto
  // list then fills the remaining slots, minus anything already pinned. When
  // nothing is pinned this is exactly the old behaviour.
  const hasPins = Object.values(storedInsight).some(v => v.landing_pin);
  let landing_featured = autoFeatured;
  if (hasPins) {
    // The full all-time breakout pool (unbounded, so a pin outside the top 100
    // is still found), sorted by multiplier — orderLandingFeatured lifts the
    // pinned ones to the front.
    const allBreakouts = computeStandout(
      validForAnalysis, hotelMetrics, hotelNameByHandle, hotelCountryByHandle,
      hotelRegionByHandle, storedImageUrl, storedInsight, Number.MAX_SAFE_INTEGER,
    ).posts;
    landing_featured = orderLandingFeatured(autoFeatured, allBreakouts, MAX_STANDOUT_POSTS);
    // Hybrid marquee rotation: first open card cycles the marquee hotels; the
    // other slots rotate through the rest of the pinned set. Advances hourly
    // via the landing page's ISR revalidate (tick = hours since epoch).
    landing_featured = rotateLandingFeatured(
      landing_featured, LANDING_MARQUEE_HANDLES, Math.floor(now / (60 * 60 * 1000)),
    );
  }

  // ── Featured — the curated inspiration shelf ──────────────────────────────
  // Every post carrying standout_posts.editors_pick, best-first. Built in
  // curated mode: the breakout SELECTION gates are all skipped (the editor
  // already selected the post), so a pick stays honoured even after its
  // hotel's median drifts — the multiplier shown is simply vs the CURRENT
  // median. Only a pick with no computable baseline at all is skipped.
  const pickedRaw = validForAnalysis.filter(p => storedInsight[p.post_id]?.editors_pick);
  const featured = pickedRaw.length
    ? selectFeaturedPosts(computeStandout(
        pickedRaw, hotelMetrics, hotelNameByHandle, hotelCountryByHandle,
        hotelRegionByHandle, storedImageUrl, storedInsight, Number.MAX_SAFE_INTEGER,
        { curated: true },
      ).posts)
    : [];

  // ── What's Working — holistic analysis per scope (Last 30 days / All time) ─
  const whatsWorkingData = computeWhatsWorkingData(
    validForAnalysis, allPosts, now, latestFollowers, hotelMetrics,
    hotelNameByHandle, hotelCountryByHandle, hotelRegionByHandle, storedImageUrl,
    storedInsight,
  );

  // ── Week ending — from the data, not the render date ─────────────────────
  // allPosts is ordered newest-first, so the first post carries the latest date.
  const latestPostDate = allPosts[0] ? new Date(allPosts[0].posted_at) : new Date(now);
  const week_ending = latestPostDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const week_ending_long = latestPostDate
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

  // Hero figures count everything TRACKED AND SCRAPED — including hotels the
  // measurability gate keeps off the leaderboard. "200 hotels tracked" is true
  // (we scan them every week); the leaderboard lists only the ones we can
  // honestly measure. Mirrors the old hotelRows rule (deduped, scraped-only).
  const scrapedTracked = allHotels.filter(h => postsByHandle[h.instagram_handle]);
  const trackedHotelCount = new Set(scrapedTracked.map(h => h.instagram_handle)).size;
  const trackedCountryCount = new Set(scrapedTracked.map(h => h.country).filter(Boolean)).size;

  return {
    publish: { cutoff: publishCutoffIso, pending: pendingPosts },
    hidden:  hiddenRoster,
    hotels: hotelRows,
    snapshot:      computeSnapshot(hotelRows),
    whatsWorking,
    whatsWorkingData,
    standout,
    landing_featured,
    featured,
    breakout_count,
    super_breakout_count,
    hotel_count:          trackedHotelCount,
    countries_count:      trackedCountryCount,
    total_posts_analysed: validForAnalysis.length,
    week_ending,
    week_ending_long,
  };
}
