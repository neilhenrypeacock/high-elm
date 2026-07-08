import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Signs the member out (clears the Supabase auth cookies) and returns them to the
// marketing home. POST-only: a GET could be fired by link prefetch and log people
// out unexpectedly. The AppShell "Log out" control submits a POST form here.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
