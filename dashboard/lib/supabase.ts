import { createClient } from '@supabase/supabase-js';

// Server-side only — keys never go to the browser.
//
// Preferred: SUPABASE_ANON_KEY + read-only RLS policies (see supabase/rls.sql).
// The dashboard only reads, so it should not hold a key that can write.
// Falls back to the service-role key so the app keeps working until the
// anon key is added to .env.local / Vercel env.
export function getSupabase() {
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_ANON_KEY) {
    console.warn(
      'SUPABASE_ANON_KEY not set — falling back to service-role key. ' +
        'Add the anon key and apply supabase/rls.sql to run read-only.'
    );
  }
  return createClient(process.env.SUPABASE_URL!, key!, {
    auth: { persistSession: false },
  });
}
