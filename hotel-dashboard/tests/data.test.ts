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
  Record<string, { insight: string | null; tag: string | null; theme_tag: string | null }>,
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
