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
  rotateLandingFeatured,
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

const NO_META = [{}, {}, {}, {}] as [
  Record<string, string>,
  Record<string, string | null>,
  Record<string, string | null>,
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
  it('excludes posts below the 100-engagement noise floor even at a huge multiplier', () => {
    const { posts, breakout_count } = computeStandout(
      [post({ likes_count: 90, comments_count: 5 })], // 95 engagement, 3.2× a median of 30
      { hotel_a: metrics({ medianPostEngagement: 30 }) },
      ...NO_META
    );
    expect(posts).toEqual([]);
    expect(breakout_count).toBe(0);
  });

  it('excludes hotels whose baseline median is below the 25-engagement floor', () => {
    const { breakout_count } = computeStandout(
      [post({ likes_count: 300, comments_count: 0 })], // 15× a median of 20 — still excluded
      { hotel_a: metrics({ medianPostEngagement: 20 }) },
      ...NO_META
    );
    expect(breakout_count).toBe(0);
  });

  it('excludes posts under the 2× threshold', () => {
    const { breakout_count } = computeStandout(
      [post({ likes_count: 150, comments_count: 0 })], // 1.5× a median of 100
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
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
      [post({ likes_count: 270, comments_count: 30 })], // 300 vs median 100 = 3×
      { hotel_a: metrics({ medianPostEngagement: 100, medianLikes: 90, medianComments: 10 }) },
      ...NO_META
    );
    expect(posts).toHaveLength(1);
    expect(posts[0].multiplier).toBe(3);
    expect(posts[0].likes_multiple).toBe(3); // 270 / 90
    expect(posts[0].comments_multiple).toBe(3); // 30 / 10
  });

  it('reports a 0 lift (not Infinity) when the median for a metric is 0', () => {
    const { posts } = computeStandout(
      [post({ likes_count: 300, comments_count: 50 })],
      { hotel_a: metrics({ medianPostEngagement: 100, medianLikes: 300, medianComments: 0 }) },
      ...NO_META
    );
    expect(posts[0].comments_multiple).toBe(0);
    expect(Number.isFinite(posts[0].comments_multiple)).toBe(true);
  });

  it('counts all qualifiers but returns at most 25, sorted by multiplier desc', () => {
    const posts = Array.from({ length: 30 }, (_, i) =>
      post({ post_id: `p${i}`, likes_count: 200 + i * 10, comments_count: 0 })
    );
    const result = computeStandout(posts, { hotel_a: metrics({ medianPostEngagement: 100 }) }, ...NO_META);
    expect(result.breakout_count).toBe(30);
    expect(result.posts).toHaveLength(25);
    const multipliers = result.posts.map(p => p.multiplier);
    expect(multipliers).toEqual([...multipliers].sort((a, b) => b - a));
    expect(multipliers[0]).toBeCloseTo(4.9); // 490 / 100
  });

  it('counts super-breakouts at ≥10×', () => {
    const { super_breakout_count, breakout_count } = computeStandout(
      [
        post({ post_id: 'a', likes_count: 999, comments_count: 1 }), // 10×
        post({ post_id: 'b', likes_count: 300, comments_count: 0 }), // 3×
      ],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(breakout_count).toBe(2);
    expect(super_breakout_count).toBe(1);
  });

  it('prefers the stored image URL over the live Instagram CDN link', () => {
    const { posts } = computeStandout(
      [post({ post_id: 'p1', likes_count: 300, image_url: 'https://cdn.instagram.com/live.jpg' })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      {},
      {},
      { p1: 'https://supabase.storage/stored.jpg' },
      {}
    );
    expect(posts[0].image_url).toBe('https://supabase.storage/stored.jpg');
  });

  it('falls back to the handle when the hotel name is unknown', () => {
    const { posts } = computeStandout(
      [post({ likes_count: 300 })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(posts[0].hotel_name).toBe('hotel_a');
  });

  it('flags is_collab from Instagram co-author tags (no other signal needed)', () => {
    const { posts } = computeStandout(
      // benign caption, single grid, no AI tag — only the native co-author tag
      [post({ likes_count: 300, caption: 'A view worth waking up for', coauthor_usernames: ['goodman_gallery'] })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(posts[0].is_collab).toBe(true);
  });

  it('does not flag is_collab when there is no co-author tag', () => {
    const { posts } = computeStandout(
      [post({ likes_count: 300, caption: 'A view worth waking up for', coauthor_usernames: null })],
      { hotel_a: metrics({ medianPostEngagement: 100 }) },
      ...NO_META
    );
    expect(posts[0].is_collab).toBe(false);
  });

  it('does NOT flag caption "collaboration with @…" posts (co-author tag only)', () => {
    const { posts } = computeStandout(
      // explicit collab language, but no native co-author byline → stays in the feed
      [post({ likes_count: 300, caption: 'In collaboration with @luxurybrand', coauthor_usernames: null })],
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
    const insight: (typeof NO_META)[3] = {};
    for (const id of ids) {
      insight[id] = { insight: null, tag: null, theme_tag: null, editors_pick: false, landing_pin: true };
    }
    return [{}, {}, {}, insight];
  };

  const built = (raw: Parameters<typeof post>[0][], meta: typeof NO_META, m: Record<string, HotelMetrics> = M) =>
    computeStandout(raw.map((o) => post(o)), m, ...meta).posts;

  it('returns the auto list unchanged (capped) when nothing is pinned', () => {
    const auto = built([{ post_id: 'p1', likes_count: 400 }, { post_id: 'p2', likes_count: 300 }], NO_META);
    const pool = built([{ post_id: 'p1', likes_count: 400 }], NO_META);
    expect(orderLandingFeatured(auto, pool, 25).map((p) => p.post_id)).toEqual(['p1', 'p2']);
  });

  it('lifts pinned posts to the front (multiplier order), then fills with auto, deduped', () => {
    const auto = built([{ post_id: 'p1', likes_count: 400 }, { post_id: 'p2', likes_count: 300 }], NO_META);
    // All-time pool has an older post p9 that is NOT in the auto list, plus p1 — both pinned.
    const pool = built(
      [{ post_id: 'p1', likes_count: 400 }, { post_id: 'p2', likes_count: 300 }, { post_id: 'p9', likes_count: 250 }],
      metaWithPins(['p9', 'p1']),
    );
    // p1 (4×) and p9 (2.5×) pinned → front in multiplier order; p2 fills; p1 not duplicated.
    expect(orderLandingFeatured(auto, pool, 25).map((p) => p.post_id)).toEqual(['p1', 'p9', 'p2']);
  });

  it('keeps one row per pinned post_id (a co-post is deduped, best grid first)', () => {
    const pool = built(
      [
        { post_id: 'dup', instagram_handle: 'a', likes_count: 400 },
        { post_id: 'dup', instagram_handle: 'b', likes_count: 300 },
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
      Array.from({ length: 5 }, (_, i) => ({ post_id: `a${i}`, likes_count: 200 + i * 10 })),
      NO_META,
    );
    expect(orderLandingFeatured(auto, [], 3)).toHaveLength(3);
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
