// Check 17 — publish-gate staleness. Members only see posts up to the
// publish_cutoff timestamp; the Monday routine is supposed to move it. A
// forgotten Monday previously had NO watcher — members just quietly stayed
// on last week's data.

import { PUBLISH_STALE_WARN_DAYS, PUBLISH_STALE_FAIL_DAYS } from '../constants.js';
import { ageDays } from '../lib.js';

export const id = 'publish-gate';
export const name = 'Monday publish gate';

export function evaluate(publishCutoff, pendingCount, now = Date.now()) {
  if (!publishCutoff) {
    return {
      status: 'ok',
      headline: 'No publish gate set — everything is published (the gate\'s designed fallback).',
      details: [],
    };
  }
  const age = ageDays(publishCutoff, now);
  const line = `Last published ${age.toFixed(1)} days ago; ${pendingCount} newer post(s) are held back from members.`;
  if (age > PUBLISH_STALE_FAIL_DAYS) {
    return { status: 'fail', headline: `Two Mondays missed — members are on ${age.toFixed(0)}-day-old data. ${line}`, details: ['Review /admin and press "Publish to members".'] };
  }
  if (age > PUBLISH_STALE_WARN_DAYS) {
    return { status: 'warn', headline: `The Monday publish looks forgotten. ${line}`, details: ['Review /admin and press "Publish to members". The landing page refreshes within an hour of publishing.'] };
  }
  return { status: 'ok', headline: line, details: [] };
}

export async function run(ctx) {
  const { data, error } = await ctx.supabase
    .from('dashboard_settings').select('publish_cutoff').eq('id', true).maybeSingle();
  if (error) throw new Error(error.message);
  const cutoff = data?.publish_cutoff ?? null;
  let pending = 0;
  if (cutoff) {
    pending = await ctx.countExact(() =>
      ctx.supabase.from('posts').select('post_id', { count: 'exact', head: true }).gt('posted_at', cutoff));
  }
  return evaluate(cutoff, pending, ctx.now);
}
