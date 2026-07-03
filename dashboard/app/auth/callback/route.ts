import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Landing point for the Supabase magic-link email. Exchanges the one-time
// code for a session (sets auth cookies), then sends the visitor into the
// gated dashboard, which does its own trial/subscription check.
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
