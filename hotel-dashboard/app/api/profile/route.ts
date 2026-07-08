import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Persists the member's editable profile fields into Supabase Auth
// user_metadata (full_name + hotel_name). No schema change, no new table — the
// cookie-backed client is authenticated AS the member, so updateUser writes to
// their own metadata. Route handlers can set cookies, so the refreshed session
// is saved. Email is intentionally NOT writable here — it's the login identity
// and the Stripe key.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
  const hotelName = typeof body?.hotel_name === 'string' ? body.hotel_name.trim() : '';

  if (fullName.length > 120 || hotelName.length > 160) {
    return NextResponse.json({ error: 'That name is too long.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName, hotel_name: hotelName },
  });

  if (error) {
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 502 });
  }

  return NextResponse.json({ full_name: fullName, hotel_name: hotelName });
}
