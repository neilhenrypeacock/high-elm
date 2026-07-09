import { NextRequest, NextResponse } from 'next/server';
import { checkApiAccess } from '@/lib/require-access';

// Persists the member's editable profile fields into Supabase Auth
// user_metadata (full_name + hotel_name). Access requires an ACTIVE
// trial/subscription (same gate as the /profile page, via checkApiAccess).
// The cookie-backed client is authenticated AS the member, so updateUser
// writes to their own metadata. Route handlers can set cookies, so the
// refreshed session is saved. Email is intentionally NOT writable here —
// it's the login identity and the Stripe key.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
  const hotelName = typeof body?.hotel_name === 'string' ? body.hotel_name.trim() : '';

  if (fullName.length > 120 || hotelName.length > 160) {
    return NextResponse.json({ error: 'That name is too long.' }, { status: 400 });
  }

  const access = await checkApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { supabase } = access;

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName, hotel_name: hotelName },
  });

  if (error) {
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 502 });
  }

  return NextResponse.json({ full_name: fullName, hotel_name: hotelName });
}
