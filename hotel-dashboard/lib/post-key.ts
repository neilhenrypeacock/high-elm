// Stable identity of a breakout post — the dashboard keys posts on the composite
// (post_id, instagram_handle), since a co-post appears on more than one grid.
// Pure + client-safe (no server imports), so client components can use it without
// pulling in the server-only Supabase helpers in lib/saves.ts.
export function postKey(post_id: string, instagram_handle: string): string {
  return `${post_id}|${instagram_handle}`;
}
