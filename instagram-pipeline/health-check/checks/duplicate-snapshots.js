// Check 8 — duplicate snapshots. The 9 Jul dedupe guarantees one follower
// snapshot per hotel per UTC day; a duplicate means that regression came
// back and growth charts will double-count.

import { daysAgoIso } from '../lib.js';

export const id = 'duplicate-snapshots';
export const name = 'Snapshot dedupe integrity';

export function evaluate(rows) {
  const seen = new Map();
  const dupes = new Set();
  for (const r of rows) {
    const key = `${r.instagram_handle}|${String(r.captured_at).slice(0, 10)}`;
    if (seen.has(key)) dupes.add(key);
    seen.set(key, true);
  }
  if (dupes.size) {
    return {
      status: 'fail',
      headline: `${dupes.size} hotel-day(s) have MORE than one follower snapshot — the dedupe has regressed.`,
      details: [...dupes].slice(0, 10).map((k) => k.replace('|', ' on ')),
    };
  }
  return { status: 'ok', headline: 'Exactly one snapshot per hotel per day, as designed.', details: [] };
}

export async function run(ctx) {
  const rows = await ctx.pagedSelect(() =>
    ctx.supabase.from('profile_snapshots').select('instagram_handle, captured_at')
      .gte('captured_at', daysAgoIso(8, ctx.now)));
  return evaluate(rows);
}
