import { getSupabase } from './supabase';
import { accreditationsFor } from './accreditations';
import { fmtFollowers } from './format';

// ─── Constants ────────────────────────────────────────────────────────────────
// Shared "recent window" — the leaderboard ER and the breakout baseline both use
// each hotel's last N valid posts (matches the pipeline's 30-posts-per-scrape).
// One source of truth so the two never drift apart.
const RECENT_POSTS        = 30;
const HOTEL_ER_POSTS      = RECENT_POSTS;
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
// Landing taster slot count: 3 open cards + 2 blurred behind the lock overlay.
const LANDING_SLOTS           = 5;
// Curated-taster marquee (Neil, 2026-07-21): when posts are pinned, the FIRST
// open card always shows a post from one of these best-known hotels (cycling
// hourly); the remaining slots rotate through the rest of the pinned set.
// Handles, not post_ids, so the rule survives re-pinning a different post.
const LANDING_MARQUEE_HANDLES = ['thesavoylondon', 'estellemanor', 'theconnaught'];
// Absolute engagement floor — posts below this threshold are treated as noise.
const MIN_ENGAGEMENT          = 100;
// Baseline floor — hotels whose median engagement is below this are excluded
// from breakout detection: "94× a median of 3" is technically true but reads
// as noise on a sales asset. Tunable.
const MIN_BASELINE_ENGAGEMENT = 25;
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
  /** Null when flagged (too few posts or anomalous value) — excluded from all stats */
  engagement_rate: number | null;
  /** Leaderboard rate — total engagement (likes+comments) over the last N days
   *  ÷ followers × 100, per selectable window. Null when the hotel has no valid
   *  posts in the window (dormant) or no follower count. */
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
/** One cell of the month-in-review stat bar: a figure, its caption, and a delta
 *  line (period-over-period for 'month', a baseline label for 'all'). */
export type WwStat = { figure: string; caption: string; delta: string; dir: WwDeltaDir };
/** An observation card: a headline stat, a title, and an explanatory paragraph. */
export type WwObservation = { stat: string; title: string; text: string };
export type WhatsWorkingScope = {
  /** Format / caption / day / hour median-engagement bars for this scope. */
  set: WhatsWorkingSet;
  /** The four-cell month-in-review stat bar. */
  stats: WwStat[];
  /** Up to three data-derived observation cards. */
  observations: WwObservation[];
  /** Top 5 breakouts of the scope. */
  bestPosts: OutlierPost[];
  bestPostsTitle: string;
  /** Editorial lede shown under the section title. */
  lede: string;
};
export type WhatsWorkingData = Record<WwScope, WhatsWorkingScope>;

export type DashboardData = {
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
  /** Total posts qualifying ≥2× this week (before top-25 slice) */
  breakout_count: number;
  /** Posts qualifying ≥10× this week */
  super_breakout_count: number;
  /** Global: top-10 vs rest, by overall ER */
  frequency: { top10_ppw: number; rest_ppw: number };
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

/** Instagram hides like counts on some posts — the pipeline stores those as -1 or null. */
export function hasVisibleLikesCount(likes_count: number | null): boolean {
  return likes_count !== -1 && likes_count !== null;
}
/** Object form of {@link hasVisibleLikesCount} — the single source of truth for the hidden-likes rule. */
export function hasVisibleLikes(p: { likes_count: number | null }): boolean {
  return hasVisibleLikesCount(p.likes_count);
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
  /** Leaderboard rate: total engagement over the last 30 / 90 days ÷ followers × 100 */
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

/** Median posts/week across hotels that posted in the window (cadence, all posts). */
function medianPPWInWindow(posts: RawPost[], windowDays: number): number | null {
  const byHandle: Record<string, number> = {};
  for (const p of posts) byHandle[p.instagram_handle] = (byHandle[p.instagram_handle] ?? 0) + 1;
  const weeks = windowDays / 7;
  const vals = Object.values(byHandle).map(c => c / weeks);
  return median(vals);
}

function pluralFormat(label: string): string {
  const map: Record<string, string> = { Reel: 'Reels', Video: 'Videos', Carousel: 'Carousels', Photo: 'Photos', Other: 'other posts' };
  return map[label] ?? `${label}s`;
}

const MINUS = '−';
/** Format a period-over-period delta with sign, magnitude and dir. Differences
 *  smaller than half the smallest representable unit read as flat. */
function fmtDelta(diff: number, decimals: number, unit: string, period: string): { delta: string; dir: WwDeltaDir } {
  const eps = Math.pow(10, -decimals) / 2;
  if (Math.abs(diff) < eps) return { delta: `No change ${period}`, dir: 'flat' };
  const sign = diff > 0 ? '+' : MINUS;
  return { delta: `${sign}${Math.abs(diff).toFixed(decimals)}${unit} ${period}`, dir: diff > 0 ? 'up' : 'down' };
}

/** Up to three data-derived observation cards for a scope. */
function buildObservations(set: WhatsWorkingSet, breakouts: OutlierPost[], onRecord: boolean): WwObservation[] {
  const obs: WwObservation[] = [];
  const scopeWord = onRecord ? 'all-time' : 'this period';

  // 1) Which format is carrying the breakouts.
  const fmt = [...set.by_format].sort((a, b) => b.value - a.value);
  if (fmt.length >= 2 && breakouts.length) {
    const top = fmt[0];
    const low = fmt[fmt.length - 1];
    const share = Math.round((breakouts.filter(p => p.type === top.label).length / breakouts.length) * 100);
    if (share > 0) {
      obs.push({
        stat: `${share}%`,
        title: `${pluralFormat(top.label)} are carrying the portfolio`,
        text: `${share}% of ${scopeWord} breakouts were ${pluralFormat(top.label).toLowerCase()} — ${top.value.toFixed(2)}% median engagement against ${low.value.toFixed(2)}% for ${pluralFormat(low.label).toLowerCase()}.`,
      });
    }
  }

  // 2) The single biggest breakout (breakouts are sorted by multiplier desc).
  const best = breakouts[0];
  if (best) {
    obs.push({
      stat: `${best.multiplier.toFixed(1)}×`,
      title: 'The biggest breakout',
      text: `${best.hotel_name} beat its own median by ${best.multiplier.toFixed(1)}× — the strongest single result ${onRecord ? 'on record' : 'this period'}.`,
    });
  }

  // 3) Mid-size accounts punching above their weight.
  const top10 = breakouts.slice(0, 10).filter(p => p.hotel_followers != null);
  if (top10.length) {
    const smallest = top10.reduce((a, b) => (b.hotel_followers! < a.hotel_followers! ? b : a));
    obs.push({
      stat: fmtFollowers(smallest.hotel_followers),
      title: 'Mid-size accounts punch up',
      text: `Some of the biggest multiples come from smaller followings like ${smallest.hotel_name} (${fmtFollowers(smallest.hotel_followers)}) — a leaner baseline means a genuine hit reads as a breakout.`,
    });
  }

  return obs;
}

const WW_LEDE: Record<WwScope, string> = {
  month:
    'What moved across the tracked hotels over the last 30 days — the patterns behind the breakouts, and the posts that drove them. Correlation, honestly hedged, not a guarantee.',
  all:
    'Across everything we’ve tracked, the steady patterns behind the biggest breakouts — more stable, and more telling, than any single week suggests.',
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
  storedImageUrl: Record<string, string | null>,
  storedInsight: Record<string, { insight: string | null; tag: string | null; theme_tag: string | null; editors_pick: boolean; landing_pin: boolean }>,
  standout: Record<TimeWindow, OutlierPost[]>,
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
    computeStandout(posts, hotelMetrics, hotelNameByHandle, hotelCountryByHandle, storedImageUrl, storedInsight, STANDOUT_LIMIT);
  const mRes = breakoutsIn(monthPosts);
  const pRes = breakoutsIn(prevPosts);
  const aRes = breakoutsIn(allValid);

  const erM = medianPostERPct(monthPosts, latestFollowers);
  const erP = medianPostERPct(prevPosts, latestFollowers);
  const erA = medianPostERPct(allValid, latestFollowers);
  const ppwM = medianPPWInWindow(monthCadence, 30);
  const ppwP = medianPPWInWindow(prevCadence, 30);

  const period = 'vs prev. 30d';
  const dER    = fmtDelta((erM ?? 0) - (erP ?? 0), 2, ' pts', period);
  const dBreak = fmtDelta(mRes.breakout_count - pRes.breakout_count, 0, '', period);
  const dSuper = fmtDelta(mRes.super_breakout_count - pRes.super_breakout_count, 0, '', period);
  const dPpw   = fmtDelta((ppwM ?? 0) - (ppwP ?? 0), 1, '', period);

  const monthStats: WwStat[] = [
    { figure: erM != null ? `${erM.toFixed(2)}%` : '—', caption: 'Median engagement rate', delta: dER.delta, dir: dER.dir },
    { figure: `${mRes.breakout_count}`, caption: 'Breakouts ≥2× this month', delta: dBreak.delta, dir: dBreak.dir },
    { figure: `${mRes.super_breakout_count}`, caption: 'Cleared 10× this month', delta: dSuper.delta, dir: dSuper.dir },
    { figure: ppwM != null ? ppwM.toFixed(1) : '—', caption: 'Median posts / week', delta: dPpw.delta, dir: dPpw.dir },
  ];

  const bestAll = standout.all[0];
  const allStats: WwStat[] = [
    { figure: erA != null ? `${erA.toFixed(2)}%` : '—', caption: 'Median engagement rate', delta: 'All-time baseline', dir: 'flat' },
    { figure: `${aRes.breakout_count}`, caption: 'Breakouts ≥2× on record', delta: 'since tracking began', dir: 'flat' },
    { figure: `${aRes.super_breakout_count}`, caption: 'Cleared 10× (super-breakouts)', delta: 'all time', dir: 'flat' },
    { figure: bestAll ? `${bestAll.multiplier.toFixed(1)}×` : '—', caption: 'Best multiple on record', delta: bestAll ? bestAll.hotel_name : '—', dir: 'flat' },
  ];

  const setMonth = computeWhatsWorking(monthPosts, latestFollowers);
  const setAll   = computeWhatsWorking(allValid, latestFollowers);

  return {
    month: {
      set: setMonth,
      stats: monthStats,
      observations: buildObservations(setMonth, mRes.posts, false),
      bestPosts: standout['30d'].slice(0, 5),
      bestPostsTitle: 'Best posts this month',
      lede: WW_LEDE.month,
    },
    all: {
      set: setAll,
      stats: allStats,
      observations: buildObservations(setAll, aRes.posts, true),
      bestPosts: standout.all.slice(0, 5),
      bestPostsTitle: 'Best posts on record',
      lede: WW_LEDE.all,
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
  storedImageUrl: Record<string, string | null>,
  storedInsight: Record<string, { insight: string | null; tag: string | null; theme_tag: string | null; editors_pick: boolean; landing_pin: boolean }>,
  limit: number = MAX_STANDOUT_POSTS,
): { posts: OutlierPost[]; breakout_count: number; super_breakout_count: number } {
  const standout: OutlierPost[] = [];
  for (const p of recentValidPosts) {
    const m = hotelMetrics[p.instagram_handle];
    const postEngagement = p.likes_count + (p.comments_count ?? 0);
    if (postEngagement < MIN_ENGAGEMENT) continue;
    if (!m?.medianPostEngagement || m.medianPostEngagement < MIN_BASELINE_ENGAGEMENT) continue;
    const multiplier = postEngagement / m.medianPostEngagement;
    if (multiplier < OUTLIER_THRESHOLD) continue;
    const medL = m.medianLikes    ?? 1;
    const medC = m.medianComments ?? 1;
    standout.push({
      hotel_name:           hotelNameByHandle[p.instagram_handle] ?? p.instagram_handle,
      hotel_country:        hotelCountryByHandle[p.instagram_handle] ?? null,
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
    });
  }
  // Count ALL qualifying posts before slicing for the hero panel
  const breakout_count       = standout.length;
  const super_breakout_count = standout.filter(p => p.multiplier >= 10).length;
  standout.sort((a, b) => b.multiplier - a.multiplier);
  return { posts: standout.slice(0, limit), breakout_count, super_breakout_count };
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
export async function getPortfolioData(): Promise<DashboardData> {
  const supabase = getSupabase();
  const PAGE = 1000;

  // Beta: only tracked hotels (the 200 most-followed — see
  // instagram-pipeline/setup-tracked.sql). Untracked hotels stay in the
  // database but are invisible to the dashboard.
  const hotelsRes = await supabase
    .from('hotels')
    .select('name, region, country, instagram_handle')
    .eq('tracked', true)
    .order('name');
  if (hotelsRes.error) throw new Error(hotelsRes.error.message);
  const trackedHandles = new Set((hotelsRes.data ?? []).map(h => h.instagram_handle));

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
  };
  const standoutRows: StandoutRow[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('standout_posts')
      .select('post_id, stored_image_url, post_insight, driver_tag, theme_tag, editors_pick, landing_pin')
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

  // Paginate posts
  const allPosts: RawPost[] = [];
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
      // Untracked hotels' historical posts stay in the DB but out of the stats
      if (!trackedHandles.has(p.instagram_handle)) continue;
      // Rows can shift between pages if the pipeline uploads mid-fetch
      const key = `${p.post_id}|${p.instagram_handle}`;
      if (seenPostKeys.has(key)) continue;
      seenPostKeys.add(key);
      allPosts.push(p);
    }
    if (data.length < PAGE) break;
  }

  const allHotels = hotelsRes.data ?? [];

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

    // Overall ER — mean over the hotel's last 30 valid posts (RECENT_POSTS, the
    // same recent window as the breakout baseline). Used for the leaderboard.
    const recentERs = followers && followers > 0
      ? validPosts.slice(0, HOTEL_ER_POSTS).map(p => (p.likes_count! + (p.comments_count ?? 0)) / followers)
      : [];
    const er = mean(recentERs);

    // Breakout baseline: median engagement across the hotel's last 30 valid
    // posts — matches what the pipeline scrapes per run, and stays recent as
    // history accumulates.
    const baselinePosts    = validPosts.slice(0, BASELINE_POSTS);
    const baseLikes        = baselinePosts.map(p => p.likes_count!);
    const baseComments     = baselinePosts.map(p => p.comments_count ?? 0);
    const baseEngagements  = baseLikes.map((l, i) => l + baseComments[i]);
    const medianPostEngagement = median(baseEngagements);
    const medianLikes          = median(baseLikes);
    const medianComments       = median(baseComments);

    // Posts per week (last 28 days)
    const recentCount = posts.filter(p => now - new Date(p.posted_at).getTime() < weekWindowMs).length;
    const ppw = recentCount / (POSTS_WEEK_WINDOW / 7);

    // Leaderboard rate — TOTAL engagement (likes+comments) over the last N days
    // ÷ followers × 100. A period "reach relative to size": rewards both post
    // quality AND frequency. Null when the hotel has no valid posts in the window
    // (dormant → sorts to the bottom) or no follower count.
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
      recentRate30:  rateOverDays(30),
      recentRate90:  rateOverDays(90),
    };
  }

  // ── Hotel rows (deduped, scraped-only) ────────────────────────────────────
  const seenHandles        = new Set<string>();
  const hotelRows: HotelRow[] = [];
  const hotelNameByHandle:    Record<string, string>      = {};
  const hotelCountryByHandle: Record<string, string | null> = {};

  for (const h of allHotels) {
    // First entry wins for duplicated handles — keeps cards and leaderboard
    // showing the same hotel name
    if (!(h.instagram_handle in hotelNameByHandle)) {
      hotelNameByHandle[h.instagram_handle]    = h.name;
      hotelCountryByHandle[h.instagram_handle] = h.country ?? null;
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

    hotelRows.push({
      name:             h.name,
      region:           h.region ?? null,
      country:          h.country ?? null,
      instagram_handle: h.instagram_handle,
      followers_count:  latestFollowers[h.instagram_handle] ?? null,
      // Only a hard flag nulls the ER (excluded from medians, sorts to the
      // bottom). A soft baseline warning keeps the valid ER counted.
      engagement_rate:  hard ? null : rawER,
      recent_rate:      { d30: m?.recentRate30 ?? null, d90: m?.recentRate90 ?? null },
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
      storedImageUrl, storedInsight, STANDOUT_LIMIT,
    );
    standout[key] = res.posts;
    if (key === '7d') {
      breakout_count = res.breakout_count;
      super_breakout_count = res.super_breakout_count;
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
    storedImageUrl, storedInsight,
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
      storedImageUrl, storedInsight, Number.MAX_SAFE_INTEGER,
    ).posts;
    landing_featured = orderLandingFeatured(autoFeatured, allBreakouts, MAX_STANDOUT_POSTS);
    // Hybrid marquee rotation: first open card cycles the marquee hotels; the
    // other slots rotate through the rest of the pinned set. Advances hourly
    // via the landing page's ISR revalidate (tick = hours since epoch).
    landing_featured = rotateLandingFeatured(
      landing_featured, LANDING_MARQUEE_HANDLES, Math.floor(now / (60 * 60 * 1000)),
    );
  }

  // ── What's Working — holistic analysis per scope (Last 30 days / All time) ─
  const whatsWorkingData = computeWhatsWorkingData(
    validForAnalysis, allPosts, now, latestFollowers, hotelMetrics,
    hotelNameByHandle, hotelCountryByHandle, storedImageUrl, storedInsight,
    standout,
  );

  // ── Global frequency (top 10 vs rest by overall ER) ──────────────────────
  const rankedByOverall = [...hotelRows]
    .filter(h => h.engagement_rate !== null && h.posts_per_week !== null)
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0));
  const frequency = {
    top10_ppw: mean(rankedByOverall.slice(0, 10).map(h => h.posts_per_week!)) ?? 0,
    rest_ppw:  mean(rankedByOverall.slice(10).map(h => h.posts_per_week!))    ?? 0,
  };

  // ── Week ending — from the data, not the render date ─────────────────────
  // allPosts is ordered newest-first, so the first post carries the latest date.
  const latestPostDate = allPosts[0] ? new Date(allPosts[0].posted_at) : new Date(now);
  const week_ending = latestPostDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const week_ending_long = latestPostDate
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

  return {
    hotels: hotelRows,
    snapshot:      computeSnapshot(hotelRows),
    whatsWorking,
    whatsWorkingData,
    standout,
    landing_featured,
    breakout_count,
    super_breakout_count,
    frequency,
    hotel_count:          hotelRows.length,
    countries_count:      new Set(hotelRows.map(h => h.country).filter(Boolean)).size,
    total_posts_analysed: validForAnalysis.length,
    week_ending,
    week_ending_long,
  };
}
