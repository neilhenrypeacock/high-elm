import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { checkAdminApiAccess } from '@/lib/require-access';
import { PORTFOLIO_CACHE_TAG } from '@/lib/data';

// The publish gate. Members only see posts dated at or before
// dashboard_settings.publish_cutoff, so a Sunday-night scrape lands invisibly;
// this route moves the cutoff to now, releasing the reviewed week in one go.
//
// Admin-gated, service-role write (dashboard_settings has a read-only anon
// policy, so only the service-role key can move the gate).
//
// The cutoff is set server-side from the database clock, never from the
// request body — a client-supplied timestamp could release posts that were
// never reviewed, or black out the dashboard by winding the gate backwards.

function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// POST {} → move the cutoff to now
export async function POST() {
  const access = await checkAdminApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const now = new Date().toISOString();
  const { data, error } = await getServiceClient()
    .from('dashboard_settings')
    .update({ publish_cutoff: now, published_at: now })
    .eq('id', true)
    .select('publish_cutoff, published_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not publish.' }, { status: 502 });
  if (!data) return NextResponse.json({ error: 'Settings row missing.' }, { status: 500 });

  // This is the refresh mechanism for the cached member view, not the 10-minute
  // window: Publish is the moment the week becomes visible, so members must see
  // it on their very next page load, not up to ten minutes later.
  // Next 16 requires a cache-life profile; { expire: 0 } means the stale entry
  // may not be served again at all, which is the only correct answer here.
  revalidateTag(PORTFOLIO_CACHE_TAG, { expire: 0 });

  return NextResponse.json({ ok: true, publish_cutoff: data.publish_cutoff });
}
