import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { checkAdminApiAccess } from '@/lib/require-access';
import { PORTFOLIO_CACHE_TAG } from '@/lib/data';

// Hide / un-hide a whole hotel from the dashboard. Admin-gated, service-role
// write (hotels has no anon write policy).
//
// This sets `hotels.hidden` — deliberately NOT `hotels.tracked`. `tracked` is
// the pipeline's scraping scope, so flipping it would silently stop collecting
// the hotel's data and leave an unfillable hole in its history if it were ever
// un-hidden. `hidden` is purely editorial: the scraper keeps working, the
// dashboard just stops counting it.
//
// Hiding is FULL exclusion — the hotel and all its posts leave every figure
// (leaderboard, breakouts, medians, hotel/country counts), so nothing on screen
// can disagree with anything else.

function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// POST { instagram_handle: string, hidden: boolean }
export async function POST(request: NextRequest) {
  const access = await checkAdminApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const handle = typeof body?.instagram_handle === 'string' ? body.instagram_handle.trim() : '';
  if (!handle) return NextResponse.json({ error: 'Missing instagram_handle.' }, { status: 400 });
  if (typeof body?.hidden !== 'boolean') {
    return NextResponse.json({ error: 'hidden must be a boolean.' }, { status: 400 });
  }

  // Update, never upsert: a handle that isn't already a row is a typo, not a
  // new hotel — the pipeline owns that table's rows.
  const { data, error } = await getServiceClient()
    .from('hotels')
    .update({ hidden: body.hidden })
    .eq('instagram_handle', handle)
    .select('instagram_handle');

  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 502 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No hotel with that handle.' }, { status: 404 });
  }

  // Hiding a hotel pulls it and every post it has out of every figure — the
  // cached member view must be rebuilt before anyone reads it again.
  // Next 16 requires a cache-life profile; { expire: 0 } means the stale entry
  // may not be served again at all, which is the only correct answer here.
  revalidateTag(PORTFOLIO_CACHE_TAG, { expire: 0 });

  return NextResponse.json({ ok: true, instagram_handle: handle, hidden: body.hidden, rows: data.length });
}
