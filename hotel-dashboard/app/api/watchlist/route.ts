import { NextRequest, NextResponse } from 'next/server';
import { checkApiAccess } from '@/lib/require-access';

// Add / remove a hotel from the logged-in member's watchlist. Access requires
// an ACTIVE trial/subscription (same gate as the pages, via checkApiAccess).
// Same auth model as /api/saves: cookie-backed client + explicit user_id so
// RLS (auth.uid() = user_id) enforces per-user isolation.

// POST { instagram_handle, hotel_name? } → follow (idempotent upsert).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const instagram_handle = typeof body?.instagram_handle === 'string' ? body.instagram_handle : '';
  const hotel_name = typeof body?.hotel_name === 'string' ? body.hotel_name.slice(0, 200) : null;

  if (!instagram_handle) {
    return NextResponse.json({ error: 'Invalid hotel.' }, { status: 400 });
  }

  const access = await checkApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { supabase, user } = access;

  const { error } = await supabase
    .from('watchlist_hotels')
    .upsert({ user_id: user.id, instagram_handle, hotel_name }, { onConflict: 'user_id,instagram_handle' });

  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 502 });
  return NextResponse.json({ saved: true });
}

// DELETE { instagram_handle } → unfollow.
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const instagram_handle = typeof body?.instagram_handle === 'string' ? body.instagram_handle : '';

  if (!instagram_handle) {
    return NextResponse.json({ error: 'Invalid hotel.' }, { status: 400 });
  }

  const access = await checkApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { supabase, user } = access;

  const { error } = await supabase
    .from('watchlist_hotels')
    .delete()
    .eq('user_id', user.id)
    .eq('instagram_handle', instagram_handle);

  if (error) return NextResponse.json({ error: 'Could not remove.' }, { status: 502 });
  return NextResponse.json({ saved: false });
}
