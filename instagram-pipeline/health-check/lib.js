// health-check/lib.js — shared plumbing for the checks. Read-only by design:
// this module exposes SELECTs and HTTP GETs, nothing else, so no check can
// accidentally write.

import { createClient } from '@supabase/supabase-js';

export function supabaseClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Page through a select until exhausted (Supabase caps at 1,000 rows/page). */
export async function pagedSelect(build) {
  const PAGE = 1000;
  const rows = [];
  for (let page = 0; ; page++) {
    const { data, error } = await build().range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Row count without downloading rows. */
export async function countExact(build) {
  const { count, error } = await build();
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const daysAgoIso = (days, now = Date.now()) =>
  new Date(now - days * 86_400_000).toISOString();

export const ageDays = (iso, now = Date.now()) => (now - new Date(iso).getTime()) / 86_400_000;

/** GitHub REST GET. Uses the workflow's own GITHUB_TOKEN; returns null when
 *  the token or repo is missing (local runs) so callers degrade gracefully. */
export async function ghApi(path) {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return null;
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status}`);
  return res.json();
}

// The dashboard's rule, mirrored (drift-tested against lib/data.ts +
// likes.js): null, -1 and 3 all mean "Instagram hid this count".
export const hasVisibleLikes = (likes) =>
  typeof likes === 'number' && likes !== -1 && likes !== 3 && likes >= 0;

export const engagement = (p) => (p.likes_count ?? 0) + (p.comments_count ?? 0);

/** Per-hotel baseline median over its last BASELINE_POSTS visible-like posts
 *  within BASELINE_MAX_AGE_DAYS — same shape as the dashboard's. `posts` must
 *  be newest-first. */
export function hotelMedians(posts, { baselinePosts, maxAgeDays, now = Date.now() }) {
  const cutoff = now - maxAgeDays * 86_400_000;
  const byHotel = new Map();
  for (const p of posts) {
    if (!hasVisibleLikes(p.likes_count)) continue;
    if (new Date(p.posted_at).getTime() < cutoff) continue;
    let list = byHotel.get(p.instagram_handle);
    if (!list) byHotel.set(p.instagram_handle, (list = []));
    if (list.length < baselinePosts) list.push(engagement(p));
  }
  const medians = new Map();
  for (const [handle, engs] of byHotel) medians.set(handle, median(engs));
  return medians;
}
