import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Add / remove a hotel from the logged-in member's watchlist. Same auth model as
// /api/saves: cookie-backed client + explicit user_id so RLS (auth.uid() =
// user_id) enforces per-user isolation.

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// POST { instagram_handle, hotel_name? } → follow (idempotent upsert).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const instagram_handle = typeof body?.instagram_handle === 'string' ? body.instagram_handle : '';
  const hotel_name = typeof body?.hotel_name === 'string' ? body.hotel_name.slice(0, 200) : null;

  if (!instagram_handle) {
    return NextResponse.json({ error: 'Invalid hotel.' }, { status: 400 });
  }

  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

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

  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { error } = await supabase
    .from('watchlist_hotels')
    .delete()
    .eq('user_id', user.id)
    .eq('instagram_handle', instagram_handle);

  if (error) return NextResponse.json({ error: 'Could not remove.' }, { status: 502 });
  return NextResponse.json({ saved: false });
}
