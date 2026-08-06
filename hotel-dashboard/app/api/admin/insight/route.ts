import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { checkAdminApiAccess } from '@/lib/require-access';
import { PORTFOLIO_CACHE_TAG } from '@/lib/data';

// Per-post write path for the /admin weekly review: the homepage feature pin
// (landing_pin) and removal (hidden). Admin-gated (checkAdminApiAccess); the
// actual write uses the SERVICE-ROLE client, not the member client, because
// standout_posts has no anon write policy. Upsert keyed on post_id (its primary
// key), touching only the fields sent, so a co-post's flag applies to every
// grid it appears on.
//
// ⚠ This route no longer writes `post_insight` or `editors_pick` (removed
// 2026-08-05). The card copy members read is written by the AI at scrape time
// (instagram-pipeline/generate-insight.js) and is not editable by hand from the
// app; `instagram-pipeline/set-insight.js` is still there as a break-glass CLI.
// Restoring the withdrawn Featured shelf would mean putting an editors_pick
// branch back here.

// Service-role client. Never exposed to the browser — server route only.
function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// POST { post_id, landing_pin?: boolean, hidden?: boolean }
//   - landing_pin omitted → feature-on-homepage flag left unchanged
//   - hidden omitted      → removal state left unchanged
export async function POST(request: NextRequest) {
  const access = await checkAdminApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const post_id = typeof body?.post_id === 'string' ? body.post_id.trim() : '';
  if (!post_id) {
    return NextResponse.json({ error: 'Missing post_id.' }, { status: 400 });
  }

  const row: { post_id: string; landing_pin?: boolean; hidden?: boolean } = { post_id };

  if ('landing_pin' in (body ?? {})) {
    if (typeof body.landing_pin !== 'boolean') {
      return NextResponse.json({ error: 'landing_pin must be a boolean.' }, { status: 400 });
    }
    row.landing_pin = body.landing_pin;
  }

  // hidden = full exclusion: the post drops out of every figure, not just the
  // lists. Keyed on post_id, so a co-post is hidden on every partner's grid.
  if ('hidden' in (body ?? {})) {
    if (typeof body.hidden !== 'boolean') {
      return NextResponse.json({ error: 'hidden must be a boolean.' }, { status: 400 });
    }
    row.hidden = body.hidden;
  }

  if (Object.keys(row).length === 1) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error } = await getServiceClient()
    .from('standout_posts')
    .upsert(row, { onConflict: 'post_id' });

  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 502 });

  // Both flags change what members see, so the cached member view has to go.
  // Without this a removed post would sit on the dashboard for up to ten
  // minutes after the tick — which is the whole reason the review flow exists.
  // Next 16 requires a cache-life profile; { expire: 0 } means the stale entry
  // may not be served again at all, which is the only correct answer here.
  revalidateTag(PORTFOLIO_CACHE_TAG, { expire: 0 });

  return NextResponse.json({
    ok: true,
    post_id,
    landing_pin: row.landing_pin,
    hidden: row.hidden,
  });
}
