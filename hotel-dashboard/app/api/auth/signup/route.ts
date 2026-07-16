import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { allowRequest, clientIp } from '@/lib/rate-limit';

// Account creation (email + password). Creates the Supabase auth user via the
// public signUp flow and lets Supabase send a "confirm your email" link — the
// visitor must click it before they can log in. NO trial is started here: a
// confirmed, logged-in member with no active trial lands on /start-trial and
// begins their 14-day Stripe trial there. NO session is set here either — the
// account isn't usable until the address is confirmed.
//
// Requires Supabase → Authentication → Email → "Confirm email" to be ON, and
// the confirm/redirect URL (/auth/callback) in the Redirect URLs allow-list.
export async function POST(request: NextRequest) {
  if (!allowRequest(`signup:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a minute.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
  const hotelName = typeof body?.hotel_name === 'string' ? body.hotel_name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!fullName) {
    return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password needs at least 8 characters.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: fullName, ...(hotelName ? { hotel_name: hotelName } : {}) },
    },
  });

  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      exists
        ? { error: 'That email already has an account — log in instead.', code: 'exists' }
        : { error: 'Could not create your account. Try again.' },
      { status: exists ? 409 : 502 }
    );
  }

  // With "Confirm email" on, signing up an address that already exists returns
  // an obfuscated user with an empty identities array and sends no email
  // (Supabase's anti-enumeration behaviour). Surface the friendly "log in
  // instead" path rather than a silent success that never delivers a link.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return NextResponse.json(
      { error: 'That email already has an account — log in instead.', code: 'exists' },
      { status: 409 }
    );
  }

  // Success: Supabase has sent the confirmation email. The form shows a
  // "check your inbox" state — there is deliberately no session yet.
  return NextResponse.json({ ok: true, confirm: true });
}
