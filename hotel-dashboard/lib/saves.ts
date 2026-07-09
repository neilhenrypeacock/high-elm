import { createServerSupabaseClient } from './supabase-server';
import { postKey } from './post-key';
import type { OutlierPost } from './data';

// Per-user Save (posts) + Watchlist (hotels) storage. Reads/writes go through the
// cookie-backed client authenticated AS the member, so Supabase RLS (auth.uid() =
// user_id) enforces that each user only ever touches their own rows. Tables:
// saved_posts + watchlist_hotels (see instagram-pipeline/setup-saves.sql).
// The post identity helper lives in lib/post-key.ts (client-safe).

export type WatchlistEntry = { instagram_handle: string; hotel_name: string | null };

// ── Reads (server components) ────────────────────────────────────────────────

/** Composite keys of the current user's saved posts, for marking the feed. */
export async function getSavedPostKeys(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('saved_posts').select('post_id, instagram_handle');
  if (error || !data) return [];
  return data.map(r => postKey(r.post_id, r.instagram_handle));
}

/** The current user's saved posts as full display snapshots (newest first). */
export async function getSavedPosts(): Promise<OutlierPost[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('saved_posts')
    .select('post')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(r => r.post as OutlierPost).filter(Boolean);
}

/** Instagram handles on the current user's watchlist. */
export async function getWatchlistHandles(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('watchlist_hotels').select('instagram_handle');
  if (error || !data) return [];
  return data.map(r => r.instagram_handle);
}

/** The current user's watchlist rows (newest first), for the Watchlist page to
 *  re-join against live leaderboard data. */
export async function getWatchlistEntries(): Promise<WatchlistEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('watchlist_hotels')
    .select('instagram_handle, hotel_name')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as WatchlistEntry[];
}
