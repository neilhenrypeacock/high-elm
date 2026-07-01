import { createClient } from '@supabase/supabase-js';

// Server-side only — service role key never goes to the browser
export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
