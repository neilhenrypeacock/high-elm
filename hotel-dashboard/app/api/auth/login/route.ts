import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { allowRequest, clientIp } from '@/lib/rate-limit';

// Password login. Available in BOTH modes (beta and post-launch) — accounts
// created during the beta keep their passwords after Stripe comes back on.
// The magic-link route stays as the no-password fallback.
export async function POST(request: NextRequest) {
  if (!allowRequest(`login-ip:${clientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a minute.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  // Per-account brute-force guard on top of the per-IP one.
  if (!allowRequest(`login-email:${email}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts for this account — try again later.' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Unconfirmed address is a distinct, actionable case — tell them plainly
    // (this doesn't leak anything a signup attempt wouldn't already reveal).
    const unconfirmed =
      error.code === 'email_not_confirmed' || /not confirmed|confirm your email/i.test(error.message);
    if (unconfirmed) {
      return NextResponse.json(
        { error: 'That email hasn’t been confirmed yet — check your inbox for the confirmation link.', code: 'unconfirmed' },
        { status: 401 }
      );
    }
    // One message for wrong-email and wrong-password — don't confirm which.
    return NextResponse.json({ error: 'Wrong email or password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
