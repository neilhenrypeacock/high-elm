import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminApiAccess } from '@/lib/require-access';

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

  return NextResponse.json({ ok: true, publish_cutoff: data.publish_cutoff });
}
