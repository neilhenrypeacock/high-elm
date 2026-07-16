import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { allowRequest, clientIp } from '@/lib/rate-limit';

// Forgot-password request. Sends a Supabase password-recovery email; the link
// lands on /auth/callback (type=recovery), which establishes a short recovery
// session and forwards the visitor to /auth/new-password to set a new one.
//
// Always returns ok for a validly-formatted address — we don't reveal whether
// an account exists. Rate-limited per IP and per target address, like the
// magic-link route. Requires the recovery redirect (/auth/callback) in the
// Supabase Redirect URLs allow-list.
export async function POST(request: NextRequest) {
  if (!allowRequest(`reset-ip:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a minute.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  if (!allowRequest(`reset-email:${email}`, 3, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many reset emails requested for this address — try again later.' }, { status: 429 });
  }

  const origin = new URL(request.url).origin;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: 'Could not send the reset email. Try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
