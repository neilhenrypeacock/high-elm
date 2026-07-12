import { NextRequest, NextResponse } from 'next/server';
import { checkApiAccess } from '@/lib/require-access';
import type { OutlierPost } from '@/lib/data';

// Save / unsave a breakout post for the logged-in member. Access requires an
// ACTIVE trial/subscription (same gate as the pages, via checkApiAccess) — a
// lapsed member keeps their session but loses write access. The cookie-backed
// client is authenticated AS the member, so RLS (auth.uid() = user_id) enforces
// that they can only touch their own rows — we still set user_id explicitly so
// the insert passes the WITH CHECK policy.

// The stored snapshot is rebuilt server-side from a whitelist — never persist
// the raw client payload. Shape mirrors OutlierPost (lib/data.ts), which is
// what getSavedPosts() casts back to for the Saved page.
const MAX_STR = 3000; // captions/insights are the longest legitimate fields

function str(v: unknown, max = MAX_STR): string | null {
  return typeof v === 'string' ? v.slice(0, max) : null;
}
function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function sanitizePost(raw: Record<string, unknown>, post_id: string, instagram_handle: string): OutlierPost {
  return {
    hotel_name:             str(raw.hotel_name, 200) ?? instagram_handle,
    hotel_country:          str(raw.hotel_country, 100),
    hotel_followers:        numOrNull(raw.hotel_followers),
    instagram_handle,
    post_id,
    type:                   str(raw.type, 40),
    likes_count:            num(raw.likes_count),
    comments_count:         num(raw.comments_count),
    image_url:              str(raw.image_url, 1000),
    post_url:               str(raw.post_url, 1000),
    multiplier:             num(raw.multiplier),
    likes_multiple:         num(raw.likes_multiple),
    comments_multiple:      num(raw.comments_multiple),
    hotel_typical_total:    numOrNull(raw.hotel_typical_total),
    hotel_typical_likes:    numOrNull(raw.hotel_typical_likes),
    hotel_typical_comments: numOrNull(raw.hotel_typical_comments),
    posted_at:              str(raw.posted_at, 40) ?? '',
    post_insight:           str(raw.post_insight),
    driver_tag:             str(raw.driver_tag, 60),
    theme_tag:              str(raw.theme_tag, 60),
    is_collab:              raw.is_collab === true,
    editors_pick:           raw.editors_pick === true,
  };
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

  const access = await checkApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { supabase, user } = access;

  const { error } = await supabase
    .from('saved_posts')
    .upsert(
      { user_id: user.id, post_id, instagram_handle, post: sanitizePost(post, post_id, instagram_handle) },
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

  const access = await checkApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const { supabase, user } = access;

  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', post_id)
    .eq('instagram_handle', instagram_handle);

  if (error) return NextResponse.json({ error: 'Could not remove.' }, { status: 502 });
  return NextResponse.json({ saved: false });
}
