import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminApiAccess } from '@/lib/require-access';

// Editorial write path — sets the Editor's note (post_insight) and/or Editor's
// Pick (editors_pick) on a breakout, the in-app replacement for the
// instagram-pipeline/set-insight.js CLI. Admin-gated (checkAdminApiAccess); the
// actual write uses the SERVICE-ROLE client, not the member client, because
// standout_posts has no anon write policy. Upsert keyed on post_id (its primary
// key), touching only the fields sent — mirroring set-insight.js exactly, so a
// co-post's note applies to every grid it appears on.

const MAX_INSIGHT = 3000; // matches the saved-post insight cap

// Service-role client. Never exposed to the browser — server route only.
function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// POST { post_id, insight?: string | null, editors_pick?: boolean }
//   - insight omitted        → note left unchanged
//   - insight "" / whitespace → note cleared (stored null)
//   - editors_pick omitted   → pick left unchanged
export async function POST(request: NextRequest) {
  const access = await checkAdminApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const post_id = typeof body?.post_id === 'string' ? body.post_id.trim() : '';
  if (!post_id) {
    return NextResponse.json({ error: 'Missing post_id.' }, { status: 400 });
  }

  const row: { post_id: string; post_insight?: string | null; editors_pick?: boolean } = { post_id };

  if ('insight' in (body ?? {})) {
    const raw = body.insight;
    if (raw === null) {
      row.post_insight = null;
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim().slice(0, MAX_INSIGHT);
      row.post_insight = trimmed.length ? trimmed : null;
    } else {
      return NextResponse.json({ error: 'insight must be a string or null.' }, { status: 400 });
    }
  }

  if ('editors_pick' in (body ?? {})) {
    if (typeof body.editors_pick !== 'boolean') {
      return NextResponse.json({ error: 'editors_pick must be a boolean.' }, { status: 400 });
    }
    row.editors_pick = body.editors_pick;
  }

  if (Object.keys(row).length === 1) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error } = await getServiceClient()
    .from('standout_posts')
    .upsert(row, { onConflict: 'post_id' });

  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 502 });

  return NextResponse.json({
    ok: true,
    post_id,
    post_insight: row.post_insight,
    editors_pick: row.editors_pick,
  });
}
