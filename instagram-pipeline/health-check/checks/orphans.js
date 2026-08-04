// Check 9 — new orphan handles. An account with posts in the database but no
// hotels row is invisible to the product (paid-for data going nowhere). 50
// are known and baselined; a NEW one means something scraped an account
// nobody added to the roster.

import { ORPHAN_BASELINE } from '../constants.js';

export const id = 'orphans';
export const name = 'Orphan post handles';

export function evaluate(postHandles, hotelHandles) {
  const hotels = new Set(hotelHandles);
  const baseline = new Set(ORPHAN_BASELINE);
  const orphans = [...new Set(postHandles)].filter((h) => h && !hotels.has(h));
  const fresh = orphans.filter((h) => !baseline.has(h));
  if (fresh.length) {
    return {
      status: 'warn',
      headline: `${fresh.length} NEW orphan handle(s) appeared beyond the known ${ORPHAN_BASELINE.length}: ${fresh.slice(0, 10).join(', ')}.`,
      details: ['Either add hotels rows for them or work out how the scraper picked them up.'],
    };
  }
  return {
    status: 'ok',
    headline: `${orphans.length} orphan handles, all previously known (baseline ${ORPHAN_BASELINE.length}).`,
    details: [],
  };
}

export async function run(ctx) {
  return evaluate(
    ctx.data.postsYear.map((p) => p.instagram_handle),
    ctx.data.allHotelHandles,
  );
}
