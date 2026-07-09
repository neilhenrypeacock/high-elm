import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Save / unsave a breakout post for the logged-in member. The cookie-backed
// client is authenticated AS the member, so RLS (auth.uid() = user_id) enforces
// that they can only touch their own rows — we still set user_id explicitly so
// the insert passes the WITH CHECK policy.

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// POST { post: OutlierPost } → save (idempotent upsert). Stores a snapshot so
// Saved keeps rendering after the post ages out of the live breakout window.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const post = body?.post;
  const post_id = typeof post?.post_id === 'string' ? post.post_id : '';
  const instagram_handle = typeof post?.instagram_handle === 'string' ? post.instagram_handle : '';

  if (!post_id || !instagram_handle) {
    return NextResponse.json({ error: 'Invalid post.' }, { status: 400 });
  }

  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { error } = await supabase
    .from('saved_posts')
    .upsert(
      { user_id: user.id, post_id, instagram_handle, post },
      { onConflict: 'user_id,post_id,instagram_handle' },
    );

  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 502 });
  return NextResponse.json({ saved: true });
}

// DELETE { post_id, instagram_handle } → unsave.
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const post_id = typeof body?.post_id === 'string' ? body.post_id : '';
  const instagram_handle = typeof body?.instagram_handle === 'string' ? body.instagram_handle : '';

  if (!post_id || !instagram_handle) {
    return NextResponse.json({ error: 'Invalid post.' }, { status: 400 });
  }

  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', post_id)
    .eq('instagram_handle', instagram_handle);

  if (error) return NextResponse.json({ error: 'Could not remove.' }, { status: 502 });
  return NextResponse.json({ saved: false });
}
