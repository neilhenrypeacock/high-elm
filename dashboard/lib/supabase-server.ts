import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cookie-backed Supabase client for reading the logged-in user's session in
// Server Components and Route Handlers. Separate from lib/supabase.ts, which
// stays a plain service-role/anon client for the dashboard's data fetching —
// this one carries the visitor's own auth cookies, that one doesn't.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render — middleware refreshes the
          // session instead, so a failed write here is safe to ignore.
        }
      },
    },
  });
}
