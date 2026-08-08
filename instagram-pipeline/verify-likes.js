// Check the breakouts we are about to SHOW against the live Instagram posts.
//
// A hotel can disprove a number on its own post in ten seconds. On 7 Aug 2026 it
// would have succeeded: four of the top 20 all-time breakouts stored a like count
// higher than the live post — Jumeirah Al Naseem at 36,202 against a real 315.
// The cause is upstream (see the long note in likes-check.js: the Apify actor
// returns a wrong and UNSTABLE likesCount for some collab Reels), so there is no
// mapping to correct and re-scraping does not reliably fix it. Checking the
// number against the post is the only thing that works whatever the cause.
//
//   node verify-likes.js                      # check the PUBLISHED feed, report, exit 1 if bad
//   node verify-likes.js --include-pending    # also check what Publish is about to release
//   node verify-likes.js --limit=40           # check more of the ranked list
//   node verify-likes.js --window=7           # only this week's feed
//   node verify-likes.js --json               # machine-readable, for the digest
//   node verify-likes.js --apply              # ALSO hide the offenders (writes)
//
// The pipeline runs it with --include-pending, and that matters: straight after
// a scrape the new posts sit BEHIND dashboard_settings.publish_cutoff, so the
// default view would check last week's feed and pass while the bad rows waited
// to be released. /admin sees through the gate for the same reason.
//
// Reads Supabase and Instagram. Costs no Apify credit and calls no AI. Default
// mode writes NOTHING — it reports and sets an exit code, which is what a
// pipeline step needs.
//
// ⚠ Deliberately not in the dashboard's render path. It is dozens of HTTP
// requests, and the member view is cached for ten minutes and shared across
// everyone; this belongs beside the scrape, once a week, before Publish.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { hasVisibleLikes } from './likes.js';
import { parseOgCounts, classifyLikeCheck, classifyLikeRun } from './likes-check.js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Breakout rule — KEEP IN SYNC with ../hotel-dashboard/lib/data.ts ──────────
// Duplicated for the same reason generate-insight.js duplicates it: this is ESM
// JS and cannot import the dashboard's TypeScript computeStandout. lib/data.ts
// is the single source of truth. If a threshold moves there, move it here, or
// this will verify a different set of posts than the feed displays — which is
// the one way this check could quietly stop protecting anything.
const OUTLIER_THRESHOLD       = 2;
const BASELINE_POSTS          = 30;
const MIN_ENGAGEMENT          = 500;
const MIN_BASELINE_ENGAGEMENT = 25;
const MIN_VISIBLE_LIKE_RATIO  = 0.5;
const MEASURABLE_MIN_POSTS    = 12;
const BASELINE_MAX_AGE_DAYS   = 365;
const RECENT_POSTS            = 30;

// ── Flags ─────────────────────────────────────────────────────────────────────
const argv      = process.argv.slice(2);
const hasFlag   = n => argv.includes(`--${n}`);
const flagValue = n => {
  const hit = argv.find(a => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : null;
};
const APPLY = hasFlag('apply');
const JSON_OUT = hasFlag('json');
const INCLUDE_PENDING = hasFlag('include-pending');
const LIMIT = positiveInt(flagValue('limit'), 25, 'limit');
const WINDOW_DAYS = flagValue('window') ? positiveInt(flagValue('window'), 0, 'window') : null;
// Politeness between Instagram requests. Not a rate limit we have been given —
// a self-imposed one, so a weekly check never looks like scraping.
const DELAY_MS = positiveInt(process.env.VERIFY_DELAY_MS, 2500, 'VERIFY_DELAY_MS');

function positiveInt(raw, fallback, label) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`--${label} must be a positive whole number (got "${raw}")`);
    process.exit(1);
  }
  return n;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const median = v => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
};

// ── Load exactly what the member view loads ──────────────────────────────────

async function page(table, select, tweak = q => q) {
  const PAGE = 1000;
  const out = [];
  for (let p = 0; ; p++) {
    const { data, error } = await tweak(sb.from(table).select(select)).range(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

async function loadFeed() {
  const [posts, hotels, standout, settings] = await Promise.all([
    page('posts', 'post_id, instagram_handle, likes_count, comments_count, type, posted_at, post_url, coauthor_usernames',
      q => q.not('posted_at', 'is', null).order('posted_at', { ascending: false }).order('post_id')),
    page('hotels', 'name, instagram_handle, tracked, hidden'),
    page('standout_posts', 'post_id, hidden'),
    page('dashboard_settings', 'publish_cutoff'),
  ]);

  // The same three exclusions the member view applies, in the same order.
  const hiddenHotels = new Set(hotels.filter(h => h.hidden === true).map(h => h.instagram_handle));
  const tracked = new Set(hotels.filter(h => h.tracked && !hiddenHotels.has(h.instagram_handle)).map(h => h.instagram_handle));
  const hiddenPosts = new Set(standout.filter(r => r.hidden === true).map(r => r.post_id));
  // Missing/unreadable settings row means the gate is open, matching lib/data.ts:
  // the gate must never black out the dashboard, and it must never black out this
  // check either.
  const cutoff = INCLUDE_PENDING || !settings[0]?.publish_cutoff
    ? Infinity
    : new Date(settings[0].publish_cutoff).getTime();
  const nameBy = Object.fromEntries(hotels.map(h => [h.instagram_handle, h.name]));

  const seen = new Set();
  const visible = [];
  for (const p of posts) {
    if (!tracked.has(p.instagram_handle)) continue;
    if (hiddenPosts.has(p.post_id)) continue;
    const key = `${p.post_id}|${p.instagram_handle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (new Date(p.posted_at).getTime() > cutoff) continue; // the Monday publish gate
    visible.push(p);
  }
  return { visible, nameBy };
}

/** The ranked breakout list a member sees, best-first. Mirrors computeStandout. */
function rankBreakouts(visible, nameBy) {
  const byHandle = {};
  for (const p of visible) (byHandle[p.instagram_handle] ??= []).push(p);

  const now = Date.now();
  const oldest = now - BASELINE_MAX_AGE_DAYS * 864e5;
  const metrics = {};
  for (const [handle, hp] of Object.entries(byHandle)) {
    const recent = hp.slice(0, RECENT_POSTS);
    const visibleRatio = recent.length ? recent.filter(hasVisibleLikes).length / recent.length : 0;
    const windowPosts = hp.filter(p => hasVisibleLikes(p) && new Date(p.posted_at).getTime() >= oldest);
    const base = windowPosts.slice(0, BASELINE_POSTS);
    metrics[handle] = {
      visibleRatio,
      measurable: windowPosts.length >= MEASURABLE_MIN_POSTS,
      baseline: median(base.map(p => p.likes_count + (p.comments_count ?? 0))),
    };
  }

  const windowMs = WINDOW_DAYS ? WINDOW_DAYS * 864e5 : Infinity;
  const out = [];
  for (const p of visible) {
    if (!hasVisibleLikes(p)) continue;
    if (now - new Date(p.posted_at).getTime() > windowMs) continue;
    const m = metrics[p.instagram_handle];
    if (!m?.baseline) continue;
    const engagement = p.likes_count + (p.comments_count ?? 0);
    if (engagement < MIN_ENGAGEMENT) continue;
    if (m.baseline < MIN_BASELINE_ENGAGEMENT) continue;
    if (m.visibleRatio < MIN_VISIBLE_LIKE_RATIO) continue;
    if (!m.measurable) continue;
    const multiplier = engagement / m.baseline;
    if (multiplier < OUTLIER_THRESHOLD) continue;
    out.push({
      post_id: p.post_id,
      handle: p.instagram_handle,
      hotel: nameBy[p.instagram_handle] ?? p.instagram_handle,
      type: p.type ?? 'Unknown', // nullable in the DB; only ever used for display and grouping
      stored_likes: p.likes_count,
      stored_comments: p.comments_count ?? 0,
      posted_at: p.posted_at,
      post_url: p.post_url,
      multiplier,
      is_collab: (p.coauthor_usernames?.length ?? 0) > 0,
    });
  }
  out.sort((a, b) => b.multiplier - a.multiplier);
  return out;
}

// ── The live read ─────────────────────────────────────────────────────────────
// Crawler UA on purpose: Instagram serves og:description to crawlers and a
// login wall to everything else. Two UAs tried before giving up, because a
// single transient failure should not read as a deleted post.
const CRAWLER_UAS = [
  'Googlebot/2.1 (+http://www.google.com/bot.html)',
  'facebookexternalhit/1.1',
];

async function readLive(url) {
  if (!url) return null;
  for (const ua of CRAWLER_UAS) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': ua }, redirect: 'follow' });
      if (!res.ok) continue;
      const parsed = parseOgCounts(await res.text());
      if (parsed) return parsed;
    } catch {
      // network blip — fall through to the next UA
    }
    await sleep(500);
  }
  return null;
}

// ── Run ───────────────────────────────────────────────────────────────────────

const { visible, nameBy } = await loadFeed();
const ranked = rankBreakouts(visible, nameBy);
const sample = ranked.slice(0, LIMIT);

if (!JSON_OUT) {
  console.log('════════════════════════════════════════════');
  console.log(`VERIFY LIKES — top ${sample.length} of ${ranked.length} breakouts${WINDOW_DAYS ? ` (last ${WINDOW_DAYS} days)` : ''}${INCLUDE_PENDING ? ' · including unpublished' : ''}`);
  console.log('════════════════════════════════════════════\n');
}

const results = [];
for (const post of sample) {
  const live = await readLive(post.post_url);
  const verdict = classifyLikeCheck({ stored: post.stored_likes, live });
  results.push({ ...post, live_likes: live?.likes ?? null, live_author: live?.author ?? null, live_rounded: live?.rounded ?? null, ...verdict });
  if (!JSON_OUT) {
    const mark = { ok: '  ok', overstated: '  ✗ ', unverified: '  ? ', skipped: '  – ' }[verdict.code];
    const authorNote = live?.author && live.author.toLowerCase() !== post.handle.toLowerCase()
      ? `  [co-post, Instagram names @${live.author}]` : '';
    console.log(`${mark} ${post.multiplier.toFixed(1).padStart(7)}x  ${post.type.padEnd(8)} @${post.handle.slice(0, 24).padEnd(24)} ${verdict.reason}${authorNote}`);
  }
  await sleep(DELAY_MS);
}

const overstated = results.filter(r => r.code === 'overstated');
const unverified = results.filter(r => r.code === 'unverified');
const checked = results.filter(r => r.code === 'ok' || r.code === 'overstated').length;
const outcome = classifyLikeRun({ checked, overstated: overstated.length, unverified: unverified.length });

if (JSON_OUT) {
  console.log(JSON.stringify({ outcome, checked, overstated: overstated.length, unverified: unverified.length, results }, null, 2));
} else {
  console.log(`\n════════════════════════════════════════════`);
  console.log(outcome.ok ? 'LIKES VERIFIED' : 'LIKES NOT VERIFIED');
  console.log('════════════════════════════════════════════');
  console.log(`Checked:     ${checked}`);
  console.log(`Overstated:  ${overstated.length}`);
  console.log(`Unverified:  ${unverified.length}`);
  console.log(`\n${outcome.ok ? '✅' : '❌'} ${outcome.reason}`);

  if (overstated.length) {
    // By type, because that is where the pattern was: the 7 Aug sample found
    // 6 of 14 Videos overstated and 0 of 14 photos/carousels.
    const byType = {};
    for (const r of overstated) byType[r.type] = (byType[r.type] ?? 0) + 1;
    console.log(`\nOverstated by post type: ${Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(' · ')}`);
    console.log('\nRemove these in /admin before publishing, or re-run with --apply:');
    for (const r of overstated) {
      console.log(`  ${r.post_id}  @${r.handle}  ${r.reason}`);
      console.log(`      ${r.post_url}`);
    }
  }
}

if (APPLY && overstated.length) {
  // Hiding, not correcting. We do not know the true figure — the live count is
  // rounded above ~10k, and the actor has proved it can report a different wrong
  // number on a different day — so writing a "fixed" like count would be
  // inventing data. standout_posts.hidden is the flag the product already uses
  // for "do not show this post", it excludes the post from every figure rather
  // than just the card, and Neil can undo it from the /admin hidden chips. Keyed
  // on post_id, so a co-post hides on every partner's grid at once, which is
  // what we want: the bad number is the same one on both.
  const rows = overstated.map(r => ({ post_id: r.post_id, hidden: true }));
  const { error } = await sb.from('standout_posts').upsert(rows, { onConflict: 'post_id' });
  if (error) {
    console.error(`\n❌ Could not hide the overstated posts: ${error.message}`);
    process.exit(1);
  }
  console.log(`\nHid ${rows.length} post(s). Un-hide from the /admin "Hidden from members" chips.`);
  console.log('⚠ The dashboard caches the member view for 10 minutes — hit Publish in /admin to clear it now.');
}

if (!outcome.ok) process.exit(1);
