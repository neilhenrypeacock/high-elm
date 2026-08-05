// Check 10 — follower shocks. A tracked hotel's follower count moving >20%
// between consecutive snapshots is either real news (crisis, viral moment,
// account change) or a scrape glitch about to distort every rate — both
// deserve same-day eyes.

import { FOLLOWER_SHOCK_PCT } from '../constants.js';

export const id = 'follower-shocks';
export const name = 'Follower-count shocks';

/** snapshots: [{instagram_handle, followers_count, captured_at}] any order. */
export function evaluate(snapshots, trackedHandles) {
  const tracked = new Set(trackedHandles);
  const byHotel = new Map();
  for (const s of snapshots) {
    if (!tracked.has(s.instagram_handle) || typeof s.followers_count !== 'number') continue;
    (byHotel.get(s.instagram_handle) ?? byHotel.set(s.instagram_handle, []).get(s.instagram_handle))
      .push(s);
  }
  const shocks = [];
  for (const [handle, rows] of byHotel) {
    rows.sort((a, b) => (a.captured_at < b.captured_at ? 1 : -1)); // newest first
    const [latest, prev] = rows;
    if (!latest || !prev || !prev.followers_count) continue;
    const movePct = ((latest.followers_count - prev.followers_count) / prev.followers_count) * 100;
    if (Math.abs(movePct) > FOLLOWER_SHOCK_PCT) {
      shocks.push({ handle, movePct, from: prev.followers_count, to: latest.followers_count });
    }
  }
  if (shocks.length) {
    return {
      status: 'warn',
      headline: `${shocks.length} hotel(s) moved >${FOLLOWER_SHOCK_PCT}% in followers since the previous snapshot.`,
      details: shocks.slice(0, 10).map(
        (s) => `@${s.handle}: ${s.from.toLocaleString()} → ${s.to.toLocaleString()} (${s.movePct > 0 ? '+' : ''}${s.movePct.toFixed(1)}%)`,
      ),
    };
  }
  return { status: 'ok', headline: 'No follower-count shocks — biggest moves are ordinary growth.', details: [] };
}

export async function run(ctx) {
  return evaluate(ctx.data.snapshots40, ctx.data.trackedHandles);
}
