import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Landing point for every Supabase auth email: magic-link login, signup
// confirmation, and password recovery all point here.
//
// Primary path: the token-hash flow (verifyOtp). Our links are sent SERVER-SIDE
// (the Stripe webhook right after checkout, and the /login resend), so there is
// no PKCE code_verifier in the visitor's browser — the stateless token_hash is
// the only thing that can establish a session for a link the browser didn't
// initiate. Requires the Supabase email templates to point here as:
//   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink   (Magic Link)
//   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup      (Confirm signup)
//   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery    (Reset Password)
//
// Fallback: the PKCE ?code= flow, for any link that does carry a verifier.
// On success we set the auth cookies. Recovery links land on /auth/new-password
// (so the visitor sets a new one); everything else enters the gated dashboard.
// On failure we send the visitor back to /login with a flag.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');

  const supabase = await createServerSupabaseClient();

  let failed = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = !!error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = !!error;
  } else {
    failed = true;
  }

  if (failed) {
    return NextResponse.redirect(new URL('/login?error=link', request.url));
  }
  // Recovery: the session we just set is only for choosing a new password.
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/auth/new-password', request.url));
  }
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
