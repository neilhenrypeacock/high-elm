import { getSupabase } from './supabase';
import { accreditationsFor } from './accreditations';

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

export type DashboardData = {
  hotels: HotelRow[];
  snapshot: Snapshot;
  /** What's Working medians — static, over the last WHATS_WORKING_WINDOW_DAYS */
  whatsWorking: WhatsWorkingSet;
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

/** Instagram hides like counts on some posts — the pipeline stores those as -1. */
export function hasVisibleLikes(p: { likes_count: number | null }): boolean {
  return p.likes_count !== -1 && p.likes_count !== null;
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

// High-precision caption signal for collaborations. Instagram co-posts made with
// an UNTRACKED account leave no duplicate grid row and no AI driver_tag, so they
// slip past the structural check. These explicit phrases are chosen to catch the
// obvious ones ("in collaboration with @…", "paid partnership", "x @brand")
// without flagging incidental @-mentions ("dinner by @chef"). Case-insensitive.
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
  storedInsight: Record<string, { insight: string | null; tag: string | null; theme_tag: string | null }>,
  limit: number = MAX_STANDOUT_POSTS,
  handlesByPostId?: Map<string, Set<string>>,
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
      // Display-only collab tag — same signals landing_featured excludes on.
      // 1) same post_id on >1 tracked grid, 2) AI driver_tag, 3) explicit
      // collab language in the caption (catches collabs with UNTRACKED accounts).
      is_collab:            (handlesByPostId?.get(p.post_id)?.size ?? 1) > 1 ||
                            storedInsight[p.post_id]?.tag === 'Collaboration' ||
                            captionSuggestsCollab(p.caption),
    });
  }
  // Count ALL qualifying posts before slicing for the hero panel
  const breakout_count       = standout.length;
  const super_breakout_count = standout.filter(p => p.multiplier >= 10).length;
  standout.sort((a, b) => b.multiplier - a.multiplier);
  return { posts: standout.slice(0, limit), breakout_count, super_breakout_count };
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
  };
  const standoutRows: StandoutRow[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('standout_posts')
      .select('post_id, stored_image_url, post_insight, driver_tag, theme_tag')
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
      .select('post_id, instagram_handle, likes_count, comments_count, posted_at, type, caption, image_url, post_url')
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
  const storedInsight:  Record<string, { insight: string | null; tag: string | null; theme_tag: string | null }> = {};
  for (const r of standoutRows) {
    storedImageUrl[r.post_id] = r.stored_image_url ?? null;
    storedInsight[r.post_id]  = { insight: r.post_insight ?? null, tag: r.driver_tag ?? null, theme_tag: r.theme_tag ?? null };
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

    hotelMetrics[handle] = {
      er,
      ppw,
      lastPosted:    posts[0]?.posted_at ?? null,
      medianPostEngagement,
      medianLikes,
      medianComments,
      followers,
      validPostCount: validPosts.length,
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
  // Collab map (shared by the feed's is_collab tag and the landing taster's
  // non-collab filter): a co-post is stored once per partner grid, so the same
  // post_id under >1 tracked handle means a collab. Built once, used by both.
  const handlesByPostId = new Map<string, Set<string>>();
  for (const p of allPosts) {
    let s = handlesByPostId.get(p.post_id);
    if (!s) handlesByPostId.set(p.post_id, s = new Set());
    s.add(p.instagram_handle);
  }

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
      storedImageUrl, storedInsight, STANDOUT_LIMIT, handlesByPostId,
    );
    standout[key] = res.posts;
    if (key === '7d') {
      breakout_count = res.breakout_count;
      super_breakout_count = res.super_breakout_count;
    }
  }

  // ── Landing taster: best NON-COLLAB breakouts of the last 30 days ────────
  // Uses the shared handlesByPostId map above: same post_id under >1 handle =
  // collab (a collab with an UNTRACKED account leaves no duplicate row and can't
  // be detected from this data — the AI driver_tag is used as a second guard).
  const landingCandidates = validForAnalysis.filter(p =>
    now - new Date(p.posted_at).getTime() <= LANDING_WINDOW_DAYS * DAY_MS &&
    (handlesByPostId.get(p.post_id)?.size ?? 1) === 1 &&
    storedInsight[p.post_id]?.tag !== 'Collaboration' &&
    !captionSuggestsCollab(p.caption)
  );
  const landing_featured = computeStandout(
    landingCandidates, hotelMetrics, hotelNameByHandle, hotelCountryByHandle,
    storedImageUrl, storedInsight,
  ).posts;

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
