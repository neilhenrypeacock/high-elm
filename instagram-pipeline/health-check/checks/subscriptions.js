// Check 16 — subscriptions pulse. Counts per status, nothing personal (no
// emails in the digest, ever). Pre-launch this confirms the table is intact;
// post-launch it doubles as the tiny daily business line. Deltas aren't
// stored anywhere — yesterday's digest email IS the history.

export const id = 'subscriptions';
export const name = 'Subscriptions';

export function evaluate(statusCounts) {
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const parts = Object.entries(statusCounts).sort().map(([s, n]) => `${n} ${s}`);
  return {
    status: 'ok',
    headline: total === 0
      ? 'Subscriptions table is empty.'
      : `${total} subscription row(s): ${parts.join(', ')}.`,
    details: [],
  };
}

export async function run(ctx) {
  const rows = await ctx.pagedSelect(() => ctx.supabase.from('subscriptions').select('status'));
  const counts = {};
  for (const r of rows) counts[r.status ?? 'unknown'] = (counts[r.status ?? 'unknown'] ?? 0) + 1;
  return evaluate(counts);
}
