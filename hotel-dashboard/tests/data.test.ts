import { describe, it, expect } from 'vitest';
import {
  median,
  mean,
  normalizeType,
  captionBucket,
  captionSuggestsCollab,
  groupMedianER,
  computeSnapshot,
  computeWhatsWorking,
  computeStandout,
  parseInsight,
  orderLandingFeatured,
  buildCollabNote,
  rotateLandingFeatured,
  selectFeaturedPosts,
  selectWeekTopUps,
  hasVisibleLikes,
  erFlagReasons,
  type RawPost,
  type HotelMetrics,
  type HotelRow,
} from '../lib/data';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function post(overrides: Partial<RawPost> = {}): RawPost {
  return {
    post_id: 'p1',
    instagram_handle: 'hotel_a',
    likes_count: 100,
    comments_count: 10,
    posted_at: '2026-06-30T14:00:00Z',
    type: 'Image',
    caption: 'A short caption',
    image_url: null,
    post_url: null,
    coauthor_usernames: null,
    ...overrides,
  };
}

function metrics(overrides: Partial<HotelMetrics> = {}): HotelMetrics {
  return {
    er: 0.01,
    ppw: 2,
    lastPosted: '2026-06-30T14:00:00Z',
    medianPostEngagement: 100,
    medianLikes: 90,
    medianComments: 10,
    followers: 10_000,
    validPostCount: 20,
    visibleLikeRatio: 1,
    recentRate30: 5,
    recentRate90: 4,
    ...overrides,
  };
}

function hotelRow(overrides: Partial<HotelRow> = {}): HotelRow {
  return {
    name: 'Hotel A',
    region: 'Europe',
    country: 'France',
    instagram_handle: 'hotel_a',
    followers_count: 10_000,
    engagement_rate: 1.0,
    recent_rate: { d30: 5, d90: 4 },
    posts_per_week: 2,
    last_posted: '2026-06-30T14:00:00Z',
    er_flag_reason: null,
    accreditations: [],
    ...overrides,
  };
}

const NO_META = [{}, {}, {}, {}, {}] as [
  Record<string, string>,          // hotelNameByHandle
  Record<string, string | null>,   // hotelCountryByHandle
  Record<string, string | null>,   // hotelRegionByHandle
  Record<string, string | null>,   // storedImageUrl
  Record<string, { insight: string | null; tag: string | null; theme_tag: string | null; editors_pick: boolean; landing_pin: boolean }>,
];

// ─── median / mean ────────────────────────────────────────────────────────────

describe('median', () => {
  it('returns null for an empty list', () => {
    expect(median([])).toBeNull();
  });

  it('returns the middle value for odd-length lists', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('averages the two middle values for even-length lists', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('does not mutate its input', () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });

  it('is robust to outliers (the reason it is used as the baseline)', () => {
    expect(median([1, 2, 3, 1_000_000])).toBe(2.5);
  });
});

describe('mean', () => {
  it('returns null for an empty list', () => {
    expect(mean([])).toBeNull();
  });

  it('averages values', () => {
    expect(mean([1, 2, 3])).toBe(2);
  });
});

// ─── normalizeType / captionBucket ───────────────────────────────────────────

describe('normalizeType', () => {
  it.each([
    ['Sidecar', 'Carousel'],
    ['sidecar', 'Carousel'],
    ['Image', 'Photo'],
    ['Video', 'Video'],
    ['Reel', 'Reel'],
    ['GraphSidecar', 'Other'],
  ])('maps %s → %s', (input, expected) => {
    expect(normalizeType(input)).toBe(expected);
  });

  it('maps null to Other', () => {
    expect(normalizeType(null)).toBe('Other');
  });
});

describe('captionBucket', () => {
  it('treats a missing caption as Short', () => {
    expect(captionBucket(null)).toBe('Short');
  });

  it('buckets on the 100 / 300 char boundaries', () => {
    expect(captionBucket('x'.repeat(99))).toBe('Short');
    expect(captionBucket('x'.repeat(100))).toBe('Medium');
    expect(captionBucket('x'.repeat(299))).toBe('Medium');
    expect(captionBucket('x'.repeat(300))).toBe('Long');
  });
});

// ─── captionSuggestsCollab ───────────────────────────────────────────────────

describe('captionSuggestsCollab', () => {
  it('flags explicit collaboration language', () => {
    expect(captionSuggestsCollab('In collaboration with @brand')).toBe(true);
    expect(captionSuggestsCollab('A collab with our friends at @x')).toBe(true);
    expect(captionSuggestsCollab('In partnership with @luxurycars')).toBe(true);
    expect(captionSuggestsCollab('We partnered with @chef for this')).toBe(true);
    expect(captionSuggestsCollab('Paid partnership with @brand')).toBe(true);
    expect(captionSuggestsCollab('@thehotel x @thebrand — a new suite')).toBe(true);
  });

  it('does not flag incidental @-mentions or lookalike words', () => {
    expect(captionSuggestsCollab('Dinner by @chefname was unforgettable')).toBe(false);
    expect(captionSuggestsCollab('Relax @home with our spa ritual')).toBe(false);
    expect(captionSuggestsCollab('Six suites with a view')).toBe(false);
    expect(captionSuggestsCollab(null)).toBe(false);
    expect(captionSuggestsCollab('')).toBe(false);
  });
});

// ─── groupMedianER ───────────────────────────────────────────────────────────

describe('groupMedianER', () => {
  it('groups by label, reports median ER as a percentage, and counts', () => {
    const result = groupMedianER(
      [
        { er: 0.01, label: 'Photo' },
        { er: 0.03, label: 'Photo' },
        { er: 0.02, label: 'Video' },
      ],
      ['Video', 'Photo']
    );
    expect(result).toEqual([
      { label: 'Video', value: 2, count: 1 },
      { label: 'Photo', value: 2, count: 2 },
    ]);
  });

  it('drops labels with no posts instead of emitting zeros', () => {
    const result = groupMedianER([{ er: 0.01, label: 'Photo' }], ['Video', 'Photo']);
    expect(result.map(r => r.label)).toEqual(['Photo']);
  });
});

// ─── computeSnapshot ─────────────────────────────────────────────────────────

describe('computeSnapshot', () => {
  it('takes medians across hotels, skipping nulls (flagged hotels)', () => {
    const snapshot = computeSnapshot([
      hotelRow({ engagement_rate: 1.0, posts_per_week: 1, followers_count: 1000 }),
      hotelRow({ engagement_rate: 3.0, posts_per_week: 3, followers_count: 3000 }),
      hotelRow({ engagement_rate: null, posts_per_week: null, followers_count: null, er_flag_reason: 'flagged' }),
    ]);
    expect(snapshot).toEqual({ median_er: 2.0, median_ppw: 2, median_followers: 2000 });
  });

  it('returns all nulls for an empty portfolio', () => {
    expect(computeSnapshot([])).toEqual({ median_er: null, median_ppw: null, median_followers: null });
  });
});

// ─── computeWhatsWorking ─────────────────────────────────────────────────────

describe('computeWhatsWorking', () => {
  it('skips posts from hotels with no follower count', () => {
    const result = computeWhatsWorking(
      [post({ instagram_handle: 'no_followers' })],
      { no_followers: null }
    );
    expect(result.by_format).toEqual([]);
  });

  it('computes ER against followers and buckets by format, day, and hour block', () => {
    const result = computeWhatsWorking(
      [
        // Tuesday 14:00 UTC → Afternoon block; 200 engagement / 10k followers = 2%
        post({ likes_count: 180, comments_count: 20, posted_at: '2026-06-30T14:00:00Z', type: 'Video' }),
      ],
      { hotel_a: 10_000 }
    );
    expect(result.by_format).toEqual([{ label: 'Video', value: 2, count: 1 }]);
    expect(result.by_day).toEqual([{ label: 'Tue', value: 2, count: 1 }]);
    expect(result.by_hour_block).toEqual([{ label: 'Afternoon (12–17)', value: 2, count: 1 }]);
  });

  it('sorts formats by ER descending', () => {
    const result = computeWhatsWorking(
      [
        post({ post_id: 'a', type: 'Image', likes_count: 100, comments_count: 0 }),
        post({ post_id: 'b', type: 'Video', likes_count: 300, comments_count: 0 }),
      ],
      { hotel_a: 10_000 }
    );
    expect(result.by_format.map(f => f.label)).toEqual(['Video', 'Photo']);
  });
});

// ─── hasVisibleLikes / erFlagReasons ─────────────────────────────────────────

describe('hasVisibleLikes', () => {
  it('excludes the -1 hidden-likes sentinel and null, keeps real counts', () => {
    expect(hasVisibleLikes({ likes_count: -1 })).toBe(false);
    expect(hasVisibleLikes({ likes_count: null })).toBe(false);
    expect(hasVisibleLikes({ likes_count: 0 })).toBe(true);
    expect(hasVisibleLikes({ likes_count: 250 })).toBe(true);
  });
});

describe('erFlagReasons', () => {
  it('hard-flags hotels with fewer than 3 visible-likes posts', () => {
    const { hard } = erFlagReasons(2, 1.5, 20);
    expect(hard).toMatch(/Only 2 posts/);
  });

  it('hard-flags implausibly high ER (>10%)', () => {
    const { hard } = erFlagReasons(20, 12.34, 20);
    expect(hard).toMatch(/unusually high/);
  });

  it('accepts ER exactly at the 10% threshold', () => {
    const { hard } = erFlagReasons(20, 10, 20);
    expect(hard).toBeNull();
  });

  it('soft-flags a thin breakout baseline WITHOUT hard-flagging — the ER stays valid', () => {
    const { hard, soft } = erFlagReasons(20, 1.5, 5);
    expect(hard).toBeNull(); // valid ER must NOT be nulled for a baseline warning
    expect(soft).toMatch(/low-confidence/);
  });

  it('returns no flags for a healthy hotel', () => {
    expect(erFlagReasons(20, 1.5, 20)).toEqual({ hard: null, soft: null });
  });
});

// ─── computeStandout ─────────────────────────────────────────────────────────

describe('computeStandout', () => {
  it('excludes posts below the engagement noise floor even at a huge multiplier', () => {
    const { posts, breakout_count } = computeStandout(
      [post({ likes_count: 480, comments_count: 0 })], // 480 engagement (< 500 floor), 16× a median of 30
      { hotel_a: metrics({ medianPostEngagement: 30 }) },
      ...NO_META
    );
    expect(posts).toEqual([]);
    expect(breakout_count).toBe(0);
  });

  it('excludes hotels whose baseline median is below the 25-engagement floor', () => {
    const { breakout_count } = computeStandout(
      [post({ likes_count: 600, comments_count: 0 })], // 30× a median of 20 — still excluded (median < 25)
      { hotel_a: metrics({ medianPostEngagement: 20 }) },
      ...NO_META
    );
    expect(breakout_count).toBe(0);
  });

  it('excludes posts under the 2× threshold', () => {
    const { breakout_count } = computeStandout(
      [post({ likes_count: 700, comments_count: 0 })], // 1.4× a median of 500 (clears eng floor; fails 2×)
      { hotel_a: metrics({ medianPostEngagement: 500 }) },
      ...NO_META
    );
    expect(breakout_count).toBe(0);
  });

  it('excludes breakouts from hotels that hide likes on most recent posts', () => {
    const { breakout_count } = computeStandout(
      [post({ likes_count: 500, comments_count: 0 })], // 5× a median of 100 — a real breakout
      { hotel_a: metrics({ medianPostEngagement: 100, visibleLikeRatio: 0.4 }) }, // but < 50% coverage
      ...NO_META
    );
    expect(breakout_count).toBe(0);
  });

  it('keeps breakouts from a hotel exactly at the coverage floor', () => {
    const { breakout_count } = computeStandout(
      [post({ likes_count: 500, comments_count: 0 })],
      { hotel_a: metrics({ medianPostEngagement: 100, visibleLikeRatio: 0.5 }) }, // 50% is allowed
      ...NO_META
    );
    expect(breakout_count).toBe(1);
  });

  it('skips hotels with no baseline (zero or missing median)', () => {
    const { breakout_count } = computeStandout(
      [
        post({ post_id: 'a', instagram_handle: 'zero_median', likes_count: 500 }),
        post({ post_id: 'b', instagram_handle: 'unknown_hotel', likes_count: 500 }),
      ],
      { zero_median: metrics({ medianPostEngagement: 0 }) },
      ...NO_META
    );
    expect(breakout_count).toBe(0);
  });

  it('computes the multiplier and per-metric lifts', () => {
    const { posts } = computeStandout(
      [post({ likes_count: 540, comments_count: 60 })], // 600 vs median 200 = 3×
      { hotel_a: metrics({ medianPostEngagement: 200, medianLikes: 180, medianComments: 20 }) },
      ...NO_META
    );
    expect(posts).toHaveLength(1);
    expect(posts[0].multiplier).toBe(3);
    expect(posts[0].likes_multiple).toBe(3); // 540 / 180
    expect(posts[0].comments_multiple).toBe(3); // 60 / 20
  });

  it('reports a 0 lift (not Infinity) when the median for a metric is 0', () => {
    const { posts } = computeStandout(
      [post({ likes_count: 600, comments_count: 100 })],
      { hotel_a: metrics({ medianPostEngagement: 200, medianLikes: 600, medianComments: 0 }) },
      ...NO_META
    );
    expect(posts[0].comments_multiple).toBe(0);
    expect(Number.isFinite(posts[0].comments_multiple)).toBe(true);
  });

  it('counts all qualifiers but returns at most 25, sorted by multiplier desc', () => {
    const posts = Array.from({ length: 30 }, (_, i) =>
      post({ post_id: `p${i}`, likes_count: 600 + i * 10, comments_count: 0 })
    );
    const result = computeStandout(posts, { hotel_a: metrics({ medianPostEngagement: 100 }) }, ...NO_META);
    expect(result.breakout_count).toBe(30);
    expect(result.posts).toHaveLength(25);
    const multipliers = result.posts.map(p => p.multiplier);
    expect(multipliers).toEqual([...multipliers].sort((a, b) => b - a));
    expect(multipliers[0]).toBeCloseTo(8.9); // 890 / 100
  });

  it('counts super-breakouts at ≥10×', () => {
    const { super_breakout_count, breakout_count } = computeStandout(
      [
        post({ post_id: 'a', likes_count: 999, comments_count: 1 }), // 10×
        post({ post_id: 'b', likes_count: 600, comments_count: 0 }), // 6×
      ],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(breakout_count).toBe(2);
    expect(super_breakout_count).toBe(1);
  });

  it('prefers the stored image URL over the live Instagram CDN link', () => {
    const { posts } = computeStandout(
      [post({ post_id: 'p1', likes_count: 600, image_url: 'https://cdn.instagram.com/live.jpg' })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      {}, // names
      {}, // countries
      {}, // regions
      { p1: 'https://supabase.storage/stored.jpg' },
      {}
    );
    expect(posts[0].image_url).toBe('https://supabase.storage/stored.jpg');
  });

  it('carries the hotel region onto the post (drives the destination filter)', () => {
    const { posts } = computeStandout(
      [post({ post_id: 'p1', likes_count: 600 })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      {}, // names
      { hotel_a: 'France' }, // countries
      { hotel_a: 'Europe' }, // regions
      {},
      {},
    );
    expect(posts[0].hotel_region).toBe('Europe');
    expect(posts[0].hotel_country).toBe('France');
  });

  it('leaves the region null when the hotel has none', () => {
    const { posts } = computeStandout(
      [post({ post_id: 'p1', likes_count: 600 })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META,
    );
    expect(posts[0].hotel_region).toBeNull();
  });

  it('falls back to the handle when the hotel name is unknown', () => {
    const { posts } = computeStandout(
      [post({ likes_count: 600 })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(posts[0].hotel_name).toBe('hotel_a');
  });

  it('flags is_collab from Instagram co-author tags (no other signal needed)', () => {
    const { posts } = computeStandout(
      // benign caption, single grid, no AI tag — only the native co-author tag
      [post({ likes_count: 600, caption: 'A view worth waking up for', coauthor_usernames: ['goodman_gallery'] })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(posts[0].is_collab).toBe(true);
  });

  it('does not flag is_collab when there is no co-author tag', () => {
    const { posts } = computeStandout(
      [post({ likes_count: 600, caption: 'A view worth waking up for', coauthor_usernames: null })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(posts[0].is_collab).toBe(false);
  });

  it('does NOT flag caption "collaboration with @…" posts (co-author tag only)', () => {
    const { posts } = computeStandout(
      // explicit collab language, but no native co-author byline → stays in the feed
      [post({ likes_count: 600, caption: 'In collaboration with @luxurybrand', coauthor_usernames: null })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(posts[0].is_collab).toBe(false);
  });
});

// ─── parseInsight (AI insight card) ──────────────────────────────────────────

describe('parseInsight', () => {
  it('returns null for empty / whitespace / null input', () => {
    expect(parseInsight(null)).toBeNull();
    expect(parseInsight('')).toBeNull();
    expect(parseInsight('   \n ')).toBeNull();
  });

  it('splits the standard three-part note', () => {
    const raw = 'What it is: A teaser video.\nWhy it worked: Live, high-stakes energy.\nConsider this: Build short teasers.';
    expect(parseInsight(raw)).toEqual({
      whatItIs: 'A teaser video.',
      whyItWorked: 'Live, high-stakes energy.',
      considerThis: 'Build short teasers.',
      freeform: null,
    });
  });

  it('treats the legacy "Try this" label as considerThis', () => {
    const raw = 'What it is: X.\nWhy it worked: Y.\nTry this: Z.';
    expect(parseInsight(raw)?.considerThis).toBe('Z.');
  });

  it('handles a subset of labels (only why it worked)', () => {
    const p = parseInsight('Why it worked: It leaned on nostalgia.');
    expect(p).toEqual({ whatItIs: null, whyItWorked: 'It leaned on nostalgia.', considerThis: null, freeform: null });
  });

  it('returns short unlabelled text as freeform', () => {
    const p = parseInsight('Macao Orchestra flash mob summer concert event');
    expect(p).toEqual({ whatItIs: null, whyItWorked: null, considerThis: null, freeform: 'Macao Orchestra flash mob summer concert event' });
  });

  it('is order-independent and ignores label casing', () => {
    const raw = 'why it worked: B.\nWHAT IT IS: A.';
    const p = parseInsight(raw);
    expect(p?.whatItIs).toBe('A.');
    expect(p?.whyItWorked).toBe('B.');
    expect(p?.freeform).toBeNull();
  });
});

// ─── orderLandingFeatured (homepage pin priority) ────────────────────────────

describe('orderLandingFeatured', () => {
  const M = { hotel_a: metrics({ medianPostEngagement: 100 }) };

  // storedInsight META tuple that marks the given post_ids as landing_pin=true.
  const metaWithPins = (ids: string[]): typeof NO_META => {
    const insight: (typeof NO_META)[4] = {};
    for (const id of ids) {
      insight[id] = { insight: null, tag: null, theme_tag: null, editors_pick: false, landing_pin: true };
    }
    return [{}, {}, {}, {}, insight];
  };

  const built = (raw: Parameters<typeof post>[0][], meta: typeof NO_META, m: Record<string, HotelMetrics> = M) =>
    computeStandout(raw.map((o) => post(o)), m, ...meta).posts;

  it('returns the auto list unchanged (capped) when nothing is pinned', () => {
    const auto = built([{ post_id: 'p1', likes_count: 800 }, { post_id: 'p2', likes_count: 600 }], NO_META);
    const pool = built([{ post_id: 'p1', likes_count: 800 }], NO_META);
    expect(orderLandingFeatured(auto, pool, 25).map((p) => p.post_id)).toEqual(['p1', 'p2']);
  });

  it('lifts pinned posts to the front (multiplier order), then fills with auto, deduped', () => {
    const auto = built([{ post_id: 'p1', likes_count: 800 }, { post_id: 'p2', likes_count: 600 }], NO_META);
    // All-time pool has an older post p9 that is NOT in the auto list, plus p1 — both pinned.
    const pool = built(
      [{ post_id: 'p1', likes_count: 800 }, { post_id: 'p2', likes_count: 600 }, { post_id: 'p9', likes_count: 500 }],
      metaWithPins(['p9', 'p1']),
    );
    // p1 (8.1×) and p9 (5.1×) pinned → front in multiplier order; p2 fills; p1 not duplicated.
    expect(orderLandingFeatured(auto, pool, 25).map((p) => p.post_id)).toEqual(['p1', 'p9', 'p2']);
  });

  it('keeps one row per pinned post_id (a co-post is deduped, best grid first)', () => {
    const pool = built(
      [
        { post_id: 'dup', instagram_handle: 'a', likes_count: 800 },
        { post_id: 'dup', instagram_handle: 'b', likes_count: 600 },
      ],
      metaWithPins(['dup']),
      { a: metrics({ medianPostEngagement: 100 }), b: metrics({ medianPostEngagement: 100 }) },
    );
    const result = orderLandingFeatured([], pool, 25);
    expect(result).toHaveLength(1);
    expect(result[0].post_id).toBe('dup');
  });

  it('caps the result at the limit', () => {
    const auto = built(
      Array.from({ length: 5 }, (_, i) => ({ post_id: `a${i}`, likes_count: 600 + i * 10 })),
      NO_META,
    );
    expect(orderLandingFeatured(auto, [], 3)).toHaveLength(3);
  });
});

// ─── selectFeaturedPosts (the Featured shelf) ────────────────────────────────

describe('selectFeaturedPosts', () => {
  const M = { hotel_a: metrics({ medianPostEngagement: 100 }) };

  // storedInsight META tuple that marks the given post_ids as editors_pick=true.
  const metaWithPicks = (ids: string[]): typeof NO_META => {
    const insight: (typeof NO_META)[4] = {};
    for (const id of ids) {
      insight[id] = { insight: null, tag: null, theme_tag: null, editors_pick: true, landing_pin: false };
    }
    return [{}, {}, {}, {}, insight];
  };

  const built = (raw: Parameters<typeof post>[0][], meta: typeof NO_META, m: Record<string, HotelMetrics> = M) =>
    computeStandout(raw.map((o) => post(o)), m, ...meta, Number.MAX_SAFE_INTEGER).posts;

  it('returns only picked posts, keeping the pool order (best first)', () => {
    const pool = built(
      [
        { post_id: 'p1', likes_count: 800 },
        { post_id: 'p2', likes_count: 700 },
        { post_id: 'p3', likes_count: 600 },
      ],
      metaWithPicks(['p3', 'p1']),
    );
    expect(selectFeaturedPosts(pool).map((p) => p.post_id)).toEqual(['p1', 'p3']);
  });

  it('returns an empty list when nothing is picked (or the pool is empty)', () => {
    const pool = built([{ post_id: 'p1', likes_count: 800 }], NO_META);
    expect(selectFeaturedPosts(pool)).toEqual([]);
    expect(selectFeaturedPosts([])).toEqual([]);
  });

  it('honours a pick that no longer clears the breakout gates (curated pool)', () => {
    // 250+10 engagement against a median of 16: below MIN_ENGAGEMENT (500) and
    // below MIN_BASELINE_ENGAGEMENT (25) — invisible to the normal breakout
    // pool, but curated mode skips every selection gate so the pick surfaces.
    const raw = [post({ post_id: 'drifted', likes_count: 250 })];
    const meta = metaWithPicks(['drifted']);
    const thinBaseline = { hotel_a: metrics({ medianPostEngagement: 16 }) };
    const strict = computeStandout(raw, thinBaseline, ...meta, Number.MAX_SAFE_INTEGER).posts;
    expect(strict).toHaveLength(0);
    const curated = computeStandout(raw, thinBaseline, ...meta, Number.MAX_SAFE_INTEGER, { curated: true }).posts;
    expect(selectFeaturedPosts(curated).map((p) => p.post_id)).toEqual(['drifted']);
    expect(curated[0].multiplier).toBeCloseTo(260 / 16); // vs the current median, shown as-is
  });

  it('still skips a pick with no computable baseline, even in curated mode', () => {
    const raw = [post({ post_id: 'nobase', likes_count: 900 })];
    const noMedian = { hotel_a: metrics({ medianPostEngagement: null }) };
    const curated = computeStandout(raw, noMedian, ...metaWithPicks(['nobase']), Number.MAX_SAFE_INTEGER, { curated: true }).posts;
    expect(curated).toHaveLength(0);
  });

  it('keeps one row per picked post_id (a co-post is deduped, best grid wins)', () => {
    const pool = built(
      [
        { post_id: 'dup', instagram_handle: 'a', likes_count: 800 },
        { post_id: 'dup', instagram_handle: 'b', likes_count: 600 },
      ],
      metaWithPicks(['dup']),
      { a: metrics({ medianPostEngagement: 100 }), b: metrics({ medianPostEngagement: 200 }) },
    );
    const result = selectFeaturedPosts(pool);
    expect(result).toHaveLength(1);
    // Pool is multiplier-sorted, so the 8× grid (a) wins over the 3× grid (b).
    expect(result[0].instagram_handle).toBe('a');
  });
});

// ─── rotateLandingFeatured (hybrid marquee rotation) ─────────────────────────

describe('rotateLandingFeatured', () => {
  const MARQUEE = ['savoy', 'estelle', 'connaught'];

  // A pinned OutlierPost stub — only the fields the rotation reads.
  const pin = (post_id: string, instagram_handle: string, landing_pin = true) =>
    ({ post_id, instagram_handle, landing_pin }) as Parameters<typeof rotateLandingFeatured>[0][number];

  // 8 pinned posts (3 marquee + 5 others), multiplier order, like production.
  const eight = [
    pin('raffles', 'raffleslondon.theowo'),
    pin('carlton', 'carltoncannes'),
    pin('connaught', 'connaught'),
    pin('meurice', 'lemeuriceparis'),
    pin('reschio', 'reschio'),
    pin('savoy', 'savoy'),
    pin('gstaad', 'gstaadpalace'),
    pin('estelle', 'estelle'),
  ];

  it('returns the list unchanged when nothing (or only one post) is pinned', () => {
    const unpinned = [pin('a', 'x', false), pin('b', 'y', false)];
    expect(rotateLandingFeatured(unpinned, MARQUEE, 7)).toEqual(unpinned);
    const one = [pin('a', 'savoy')];
    expect(rotateLandingFeatured(one, MARQUEE, 7)).toEqual(one);
  });

  it('always leads with a marquee post, cycling per tick', () => {
    const leads = [0, 1, 2, 3].map(t => rotateLandingFeatured(eight, MARQUEE, t)[0].instagram_handle);
    for (const h of leads) expect(MARQUEE).toContain(h);
    expect(new Set(leads.slice(0, 3)).size).toBe(3); // three ticks → all three marquee hotels
    expect(leads[3]).toBe(leads[0]);                 // tick 3 wraps back around
  });

  it('rotates the remaining slots through the rest of the pinned set', () => {
    const slotsAt = (t: number) => rotateLandingFeatured(eight, MARQUEE, t).slice(1, 5).map(p => p.post_id);
    expect(slotsAt(0)).not.toEqual(slotsAt(1)); // ring advances each tick
    // Over a full day every pinned post appears in the visible 5 at least once.
    const seen = new Set<string>();
    for (let t = 0; t < 24; t++) {
      rotateLandingFeatured(eight, MARQUEE, t).slice(0, 5).forEach(p => seen.add(p.post_id));
    }
    expect(seen.size).toBe(8);
  });

  it('never duplicates a post within the visible slots', () => {
    for (let t = 0; t < 24; t++) {
      const visible = rotateLandingFeatured(eight, MARQUEE, t).slice(0, 5).map(p => p.post_id);
      expect(new Set(visible).size).toBe(visible.length);
    }
  });

  it('preserves every post: unshown pins queue after the slots, filler after them', () => {
    const filler = [pin('f1', 'other_a', false), pin('f2', 'other_b', false)];
    const out = rotateLandingFeatured([...eight, ...filler], MARQUEE, 5);
    expect(out).toHaveLength(10);
    expect(out.slice(0, 8).every(p => p.landing_pin)).toBe(true); // all pins before filler
    expect(out.slice(8).map(p => p.post_id)).toEqual(['f1', 'f2']); // filler order kept
  });

  it('falls back to plain rotation when no pinned post is from a marquee hotel', () => {
    const noMarquee = eight.filter(p => !MARQUEE.includes(p.instagram_handle));
    const out = rotateLandingFeatured(noMarquee, MARQUEE, 2);
    expect(out).toHaveLength(noMarquee.length);
    expect(new Set(out.map(p => p.post_id)).size).toBe(noMarquee.length);
    expect(out.slice(0, 5).map(p => p.post_id)).not.toEqual(noMarquee.slice(0, 5).map(p => p.post_id));
  });

  it('handles fewer pinned posts than slots', () => {
    const three = [pin('savoy', 'savoy'), pin('a', 'x'), pin('b', 'y')];
    const out = rotateLandingFeatured(three, MARQUEE, 4);
    expect(out).toHaveLength(3);
    expect(out[0].instagram_handle).toBe('savoy');
    expect(new Set(out.map(p => p.post_id)).size).toBe(3);
  });
});

// ─── buildCollabNote (the collaboration note in What's Working) ───────────────

describe('buildCollabNote', () => {
  const FOLLOWERS = { hotel_a: 10_000 };

  /** n posts, `collab` marking them as true Instagram co-authored posts. */
  const posts = (n: number, likes: number, collab: boolean) =>
    Array.from({ length: n }, (_, i) =>
      post({
        post_id: `${collab ? 'c' : 's'}${i}`,
        likes_count: likes,
        comments_count: 0,
        coauthor_usernames: collab ? ['partner'] : null,
      }),
    );

  it('returns null below the 30-collab threshold', () => {
    const scope = [...posts(29, 400, true), ...posts(100, 200, false)];
    expect(buildCollabNote(scope, [], FOLLOWERS, 'month')).toBeNull();
  });

  it('returns null when there are no solo posts to compare against', () => {
    expect(buildCollabNote(posts(40, 400, true), [], FOLLOWERS, 'month')).toBeNull();
  });

  it('reports the multiple when collabs outperform', () => {
    const scope = [...posts(40, 400, true), ...posts(100, 200, false)];
    const note = buildCollabNote(scope, [], FOLLOWERS, 'month');
    expect(note?.headline.highlight).toBe('2.0× the engagement');
    expect(note?.note).toContain('40 collaboration posts vs 100 solo');
  });

  it('flips the copy when collabs UNDER-perform', () => {
    const scope = [...posts(40, 100, true), ...posts(100, 400, false)];
    const note = buildCollabNote(scope, [], FOLLOWERS, 'month');
    expect(note?.headline.highlight).toContain('0.3×');
    expect(note?.headline.post).toContain('not automatically the stronger play');
  });

  it('says so plainly when the two are level', () => {
    const scope = [...posts(40, 200, true), ...posts(100, 200, false)];
    const note = buildCollabNote(scope, [], FOLLOWERS, 'month');
    expect(note?.headline.highlight).toBe('about the same as solo posts');
  });

  it('reports the breakout share against the list it was given', () => {
    const scope = [...posts(40, 400, true), ...posts(60, 200, false)];
    const breakouts = [
      { post_id: 'b1', is_collab: true },
      { post_id: 'b2', is_collab: true },
      { post_id: 'b3', is_collab: false },
      { post_id: 'b4', is_collab: false },
    ] as Parameters<typeof buildCollabNote>[1];
    const note = buildCollabNote(scope, breakouts, FOLLOWERS, 'month');
    expect(note?.note).toContain('2 of the 4 breakouts shown this month');
    expect(note?.note).toContain('40% of posts'); // 40 collabs of 100 posts
  });

  it('omits the breakout clause when there are no breakouts in scope', () => {
    const scope = [...posts(40, 400, true), ...posts(100, 200, false)];
    expect(buildCollabNote(scope, [], FOLLOWERS, 'month')?.note).not.toContain('breakouts shown');
  });
});

// ─── selectWeekTopUps — the empty-week fallback ───────────────────────────────

describe('selectWeekTopUps', () => {
  // Only the fields the selector reads.
  const p = (post_id: string, multiplier: number, is_collab = false) =>
    ({ post_id, instagram_handle: `h_${post_id}`, multiplier, is_collab, near_miss: false }) as Parameters<typeof selectWeekTopUps>[0][number];

  it('adds nothing when the week already stands up on its own', () => {
    const breakouts = [p('a', 9), p('b', 6), p('c', 4), p('d', 3), p('e', 2.2)];
    const pool = [...breakouts, p('f', 1.6), p('g', 1.4)];
    expect(selectWeekTopUps(breakouts, pool)).toEqual([]);
  });

  it('tops up a collab-only week with the best solo posts', () => {
    // The real shape of the week ending 27 Jul: every breakout a collab.
    const breakouts = [p('c1', 84, true), p('c2', 31, true), p('c3', 19, true), p('c4', 18, true), p('c5', 16, true)];
    const pool = [...breakouts, p('s1', 1.66), p('s2', 1.61), p('s3', 1.55), p('s4', 1.41), p('c6', 1.9, true)];

    const topUps = selectWeekTopUps(breakouts, pool);
    expect(topUps.map(t => t.post_id)).toEqual(['s1', 's2', 's3']);
    expect(topUps.every(t => t.near_miss)).toBe(true);
    // The solo shortfall is filled before anything else, so the higher-scoring
    // collab near-miss doesn't crowd out the posts a hotel can act on alone.
    expect(topUps.map(t => t.post_id)).not.toContain('c6');
  });

  it('fills to the minimum post count once the solo floor is met', () => {
    const breakouts = [p('b1', 5)];
    const pool = [...breakouts, p('s1', 1.9), p('s2', 1.8), p('s3', 1.7), p('c1', 1.95, true), p('s4', 1.4)];
    const topUps = selectWeekTopUps(breakouts, pool);
    // 1 breakout + 4 top-ups = the 5-post minimum; solo floor (3) satisfied first,
    // then the best remaining candidate regardless of collab status.
    expect(topUps).toHaveLength(4);
    expect(topUps.map(t => t.post_id)).toEqual(['c1', 's1', 's2', 's3']);
  });

  it('never promotes a real breakout into the top-ups, or repeats one', () => {
    const breakouts = [p('a', 3, true)];
    const pool = [p('a', 3, true), p('s1', 1.5), p('s2', 1.4), p('s3', 1.3), p('s4', 1.26)];
    const topUps = selectWeekTopUps(breakouts, pool);
    expect(topUps.map(t => t.post_id)).not.toContain('a');
    expect(new Set(topUps.map(t => t.post_id)).size).toBe(topUps.length);
    expect(topUps.every(t => t.multiplier < 2)).toBe(true);
  });

  it('returns what it can when the pool is thin, rather than inventing posts', () => {
    const breakouts: Parameters<typeof selectWeekTopUps>[0] = [];
    const pool = [p('s1', 1.4)];
    expect(selectWeekTopUps(breakouts, pool).map(t => t.post_id)).toEqual(['s1']);
  });

  it('leaves its inputs untouched', () => {
    const breakouts = [p('c1', 9, true)];
    const pool = [...breakouts, p('s1', 1.7)];
    selectWeekTopUps(breakouts, pool);
    expect(pool.every(x => x.near_miss === false)).toBe(true);
  });
});
