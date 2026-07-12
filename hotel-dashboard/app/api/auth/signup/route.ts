import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { upsertSubscriptionByEmail } from '@/lib/subscriptions';
import { allowRequest, clientIp } from '@/lib/rate-limit';
import { stripeDisabled, BETA_TRIAL_DAYS } from '@/lib/auth-mode';

// Beta signup: creates the account (email + password), starts the free trial,
// and signs the visitor in — one POST, no card, no email round-trip.
//
// ONLY enabled while STRIPE_DISABLED=true (see lib/auth-mode.ts): this route
// hands out free trials, so it must never run alongside the paid checkout
// flow. At launch the flag comes off and /start-trial goes back to Stripe.
//
// The account is created with email_confirm so the address works for magic
// links immediately. Beta trade-off, documented: we don't verify the visitor
// owns the address — the paywall is off, so the blast radius is a trial
// account with a mistyped email.
export async function POST(request: NextRequest) {
  if (!stripeDisabled()) {
    return NextResponse.json(
      { error: 'Signups go through checkout — start your trial from the pricing page.' },
      { status: 403 }
    );
  }

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

  // Create the user (service role — auth admin API). email_confirm marks the
  // address verified so the password works immediately and magic links keep
  // working as a fallback login.
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, ...(hotelName ? { hotel_name: hotelName } : {}) },
  });

  if (createError) {
    // Existing address → point at login rather than leaking anything else.
    const exists = /already|registered|exists/i.test(createError.message);
    return NextResponse.json(
      exists
        ? { error: 'That email already has an account — log in instead.', code: 'exists' }
        : { error: 'Could not create your account. Try again.' },
      { status: exists ? 409 : 502 }
    );
  }

  // Start the trial. If this write fails the account still exists, so surface
  // a retryable error rather than leaving them half set up and signed in.
  const trialEnd = new Date(Date.now() + BETA_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  try {
    await upsertSubscriptionByEmail(email, { status: 'trialing', trial_end: trialEnd });
  } catch {
    return NextResponse.json(
      { error: 'Your account was created but the trial could not start — try logging in.' },
      { status: 502 }
    );
  }

  // Sign them in — the SSR client sets the session cookies on this response.
  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json(
      { error: 'Account created — log in with your new password.', code: 'created' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
