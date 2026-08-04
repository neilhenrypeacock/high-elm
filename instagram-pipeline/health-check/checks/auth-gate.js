// Check 14 — auth gate probe. Would a logged-out stranger see member data?
// This is the check that would have caught the 9 Jul ungated-production
// regression within a day instead of by audit.
//
// IMPORTANT SHAPE NOTE: Next.js App Router serves a server-side redirect as
// HTTP 200 whose small body is a redirect envelope (NEXT_REDIRECT + a meta
// refresh to /login). That IS the gate working. So the pass condition is:
// a real 3xx, OR a 200 whose body contains the redirect marker AND none of
// the canary strings that only ever appear in real member data.

import { PROD_ORIGIN, GATE_CANARIES } from '../constants.js';

export const id = 'auth-gate';
export const name = 'Auth gate (logged-out /dashboard)';

export function evaluate(status, body) {
  const canariesFound = GATE_CANARIES.filter((c) => body.includes(c));
  if (canariesFound.length) {
    return {
      status: 'fail',
      headline: 'MEMBER DATA IS REACHABLE LOGGED-OUT — the dashboard gate is not holding.',
      details: [`HTTP ${status}; found in the response: ${canariesFound.join(', ')}.`,
        'Treat as an emergency: check lib/require-access.ts and the latest deploy immediately.'],
    };
  }
  const isRedirect = (status >= 300 && status < 400) ||
    (status === 200 && (body.includes('NEXT_REDIRECT') || body.includes('url=/login')));
  if (!isRedirect) {
    return {
      status: 'fail',
      headline: `Logged-out /dashboard returned HTTP ${status} without a recognisable redirect — the gate's behaviour changed.`,
      details: ['No member data was detected in the body, but the response shape is unexpected. Verify manually in a private browser window.'],
    };
  }
  return { status: 'ok', headline: 'Logged-out visitors are redirected to /login with zero data in the response.', details: [] };
}

export async function run(ctx) {
  const res = await ctx.fetch(`${PROD_ORIGIN}/dashboard`, { redirect: 'manual' });
  const body = await res.text();
  return evaluate(res.status, body);
}
