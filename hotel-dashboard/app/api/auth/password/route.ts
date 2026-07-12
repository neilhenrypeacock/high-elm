import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { allowRequest, clientIp } from '@/lib/rate-limit';

// Set (or change) the signed-in member's password — how magic-link-era
// accounts add a password. Session-only gate, deliberately NOT the
// subscription gate: a lapsed member may still manage their credentials.
export async function POST(request: NextRequest) {
  if (!allowRequest(`password:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a minute.' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password needs at least 8 characters.' }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Supabase rejects re-using the current password — pass that through readably.
    const same = /different from the old password|same/i.test(error.message);
    return NextResponse.json(
      { error: same ? 'That’s already your password — choose a new one.' : 'Could not save the password. Try again.' },
      { status: same ? 400 : 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
