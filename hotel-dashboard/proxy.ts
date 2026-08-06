import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// Refreshes the Supabase auth session cookie on every non-static request, per
// the standard @supabase/ssr Next.js App Router pattern. Needed so a session
// started via the magic-link callback stays valid across subsequent visits.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  // signature-mark.png is excluded because it is fetched by email clients (Gmail's
  // image proxy, Outlook) on behalf of readers who have no session to refresh. Running
  // the Supabase getUser() round-trip in front of it adds latency for nothing, and
  // would take the logo down with the data layer — see the Aug 2026 storage incident,
  // where a restricted project 402'd every Supabase call.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|signature-mark.png).*)'],
};
