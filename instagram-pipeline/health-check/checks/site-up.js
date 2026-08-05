// Check 15 — site up. One caveat learned on 2 Aug: the public page serves a
// cached copy, so a 200 here does NOT prove the data layer is alive — the
// database checks in this digest are that proof. This just confirms the
// front door exists.

import { PROD_ORIGIN } from '../constants.js';

export const id = 'site-up';
export const name = 'Public site responds';

export function evaluate(status) {
  if (status !== 200) {
    return {
      status: 'fail',
      headline: `The public landing page returned HTTP ${status}.`,
      details: ['Check Vercel status and the domain\'s DNS (the Namecheap suspension in July started exactly like this).'],
    };
  }
  return { status: 'ok', headline: 'Landing page returns 200. (Cached — data-layer health is judged by the database checks, not this.)', details: [] };
}

export async function run(ctx) {
  const res = await ctx.fetch(`${PROD_ORIGIN}/`, { redirect: 'follow' });
  return evaluate(res.status);
}
