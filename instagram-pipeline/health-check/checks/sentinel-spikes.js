// Check 5 — sentinel spike detection: the generalised "likes_count = 3" net.
// The 3 bug's signature was one small value appearing ~200x more often than
// its neighbours because a hidden-count placeholder was stored as if real.
// This scans the frequency distribution of small like/comment counts over
// recently-captured posts and flags any value that towers over the values
// around it. It also hard-fails if a KNOWN sentinel (-1 or 3) shows up in
// freshly captured rows — that means the likes.js normalisation regressed.

import {
  SENTINEL_MAX_VALUE, SENTINEL_SPIKE_RATIO, SENTINEL_NEIGHBOURS,
  SENTINEL_MIN_COUNT, KNOWN_SENTINELS, SENTINEL_SCAN_DAYS,
} from '../constants.js';
import { daysAgoIso, median } from '../lib.js';

export const id = 'sentinel-spikes';
export const name = 'Sentinel value scan (likes & comments)';

/** Pure: values -> spike list. Exported for fixture tests. */
export function findSpikes(values) {
  const freq = new Map();
  for (const v of values) {
    if (typeof v !== 'number' || v < 0 || v >= SENTINEL_MAX_VALUE) continue;
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  const spikes = [];
  for (const [value, count] of freq) {
    if (count < SENTINEL_MIN_COUNT) continue;
    const neighbours = [];
    for (let d = 1; d <= SENTINEL_NEIGHBOURS; d++) {
      neighbours.push(freq.get(value - d) ?? 0, freq.get(value + d) ?? 0);
    }
    const norm = Math.max(1, median(neighbours) ?? 0);
    if (count / norm >= SENTINEL_SPIKE_RATIO) spikes.push({ value, count, norm });
  }
  return spikes.sort((a, b) => b.count - a.count);
}

export function evaluate(likesValues, commentsValues, freshKnownSentinelCount) {
  if (freshKnownSentinelCount > 0) {
    return {
      status: 'fail',
      headline: `${freshKnownSentinelCount} freshly captured post(s) carry a KNOWN hidden-likes sentinel (-1 or 3).`,
      details: ['The likes.js normalisation should make this impossible — the scraper-side fix has regressed. Do not trust new baselines until resolved.'],
    };
  }
  const likeSpikes = findSpikes(likesValues);
  const commentSpikes = findSpikes(commentsValues);
  const all = [...likeSpikes.map((s) => ({ ...s, field: 'likes' })), ...commentSpikes.map((s) => ({ ...s, field: 'comments' }))];
  if (all.length) {
    return {
      status: 'warn',
      headline: `Suspicious repeated value(s) found: ${all.map((s) => `${s.field}=${s.value} appears ${s.count}× (neighbours ~${s.norm})`).join('; ')}.`,
      details: [
        'This is the signature of a hidden-count placeholder being stored as real data — the class of bug that poisoned 57 hotels\' baselines in July.',
        'If the same value appears here for several days running, treat it as confirmed and add it to the sentinel list in likes.js.',
      ],
    };
  }
  return {
    status: 'ok',
    headline: `No suspicious value spikes across ${likesValues.length.toLocaleString()} like-counts and ${commentsValues.length.toLocaleString()} comment-counts scanned.`,
    details: [],
  };
}

export async function run(ctx) {
  const since = daysAgoIso(SENTINEL_SCAN_DAYS, ctx.now);
  const scanned = ctx.data.postsYear.filter((p) => p.captured_at && p.captured_at >= since);
  const likes = scanned.map((p) => p.likes_count).filter((v) => typeof v === 'number');
  const comments = scanned.map((p) => p.comments_count).filter((v) => typeof v === 'number');
  const freshCut = daysAgoIso(7, ctx.now);
  const freshKnown = scanned.filter(
    (p) => p.captured_at >= freshCut && KNOWN_SENTINELS.includes(p.likes_count),
  ).length;
  return evaluate(likes, comments, freshKnown);
}
