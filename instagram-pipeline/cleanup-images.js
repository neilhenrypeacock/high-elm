// cleanup-images.js — prune the `standout-images` Storage bucket.
//
// WHY THIS EXISTS (2026-07-30): scrape.js stores an image for EVERY scraped post,
// but the dashboard only ever renders a small fraction of them. That put the
// bucket at 3.2 GB against a 1 GB free-tier limit. This script deletes every
// object no view can reach.
//
// Deleting an image affects NO figure on the dashboard. Engagement lives in the
// `posts` columns; baselines, medians, ER, breakout selection and the What's
// Working buckets never read the image. A post whose image is gone falls back to
// the branded MEDIA_PLACEHOLDER gradient — the same path already taken by the
// ~5% of rows on expired Instagram CDN URLs.
//
// KEEP RULES — an object survives if its post is on a tracked, non-hidden hotel
// AND any one of:
//   · posted within KEEP_RECENT_DAYS (covers the landing taster's 30-day window
//     and the dashboard's 7d/30d views, plus margin)
//   · engagement >= KEEP_MULTIPLE x its hotel's median (breakouts, and the
//     margin matters: a post below 2x today can cross the line later if its
//     hotel's median drifts down, so we keep from 1.5x)
//   · it carries editors_pick or landing_pin (editorial, must never vanish)
//   · a member has saved it
// Orphans — objects with no `posts` row pointing at them — are always deleted.
//
// Run it after each scrape to hold the steady state.
//
//   node cleanup-images.js            # dry run, prints what WOULD go
//   node cleanup-images.js --apply    # actually deletes

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET            = 'standout-images';
const KEEP_RECENT_DAYS  = 35;
const KEEP_MULTIPLE     = 1.5;
const BASELINE_POSTS    = 30;   // mirrors lib/data.ts BASELINE_POSTS
const MIN_ENGAGEMENT    = 500;  // mirrors lib/data.ts MIN_ENGAGEMENT
const PAGE              = 1000;
const DELETE_BATCH      = 100;

const APPLY = process.argv.includes('--apply');

// ─── helpers ─────────────────────────────────────────────────────────────────

// Mirrors hasVisibleLikes in lib/data.ts: Instagram hides likes as null on most
// carousels and as -1 on a few older rows. Both mean "no usable engagement".
const hasVisibleLikes = p => p.likes_count !== null && p.likes_count !== -1;

const engagementOf = p => p.likes_count + (p.comments_count ?? 0);

function median(sorted) {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Storage object name as it appears in a public URL, e.g. ".../standout-images/ABC.webp"
function objectNameFromUrl(url) {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

async function fetchAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function listAllObjects() {
  const objects = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET)
      .list('', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`storage list: ${error.message}`);
    objects.push(...data);
    if (data.length < PAGE) return objects;
  }
}

const mb = bytes => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(APPLY ? '⚠  APPLY MODE — objects will be deleted\n' : 'Dry run (pass --apply to delete)\n');

  console.log('Reading database…');
  const [hotels, posts, standout, saved] = await Promise.all([
    fetchAll('hotels', 'instagram_handle,tracked,hidden'),
    fetchAll('posts', 'post_id,instagram_handle,posted_at,likes_count,comments_count,image_url'),
    fetchAll('standout_posts', 'post_id,editors_pick,landing_pin,stored_image_url'),
    fetchAll('saved_posts', 'post_id'),
  ]);

  const hotelByHandle = new Map(hotels.map(h => [h.instagram_handle, h]));
  const editorial = new Set(
    standout.filter(s => s.editors_pick || s.landing_pin).map(s => s.post_id)
  );
  const savedIds = new Set(saved.map(s => s.post_id));

  // Per-hotel baseline: median engagement over the last BASELINE_POSTS valid posts.
  const byHandle = new Map();
  for (const p of posts) {
    if (!byHandle.has(p.instagram_handle)) byHandle.set(p.instagram_handle, []);
    byHandle.get(p.instagram_handle).push(p);
  }
  const baseline = new Map();
  for (const [handle, list] of byHandle) {
    const engs = list
      .filter(hasVisibleLikes)
      .sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at))
      .slice(0, BASELINE_POSTS)
      .map(engagementOf)
      .sort((a, b) => a - b);
    baseline.set(handle, median(engs));
  }

  const recentCutoff = Date.now() - KEEP_RECENT_DAYS * 86_400_000;

  // Build the keep set of OBJECT NAMES. standout_posts.stored_image_url takes
  // priority in the UI, so a kept post keeps both of its possible objects.
  const keep = new Set();
  const storedByPostId = new Map(
    standout.filter(s => s.stored_image_url).map(s => [s.post_id, s.stored_image_url])
  );

  const reasons = { recent: 0, breakout: 0, editorial: 0, saved: 0 };

  for (const p of posts) {
    const hotel = hotelByHandle.get(p.instagram_handle);
    const onLiveHotel = hotel?.tracked && !hotel?.hidden;

    // Editorial and saved posts are kept unconditionally — a member's saved item
    // must not disappear because their hotel was later untracked or hidden.
    const isEditorial = editorial.has(p.post_id);
    const isSaved     = savedIds.has(p.post_id);

    let why = null;
    if (isEditorial)      why = 'editorial';
    else if (isSaved)     why = 'saved';
    else if (onLiveHotel) {
      const med = baseline.get(p.instagram_handle);
      const eng = hasVisibleLikes(p) ? engagementOf(p) : null;
      if (new Date(p.posted_at).getTime() >= recentCutoff) why = 'recent';
      else if (med && eng !== null && eng >= MIN_ENGAGEMENT && eng >= KEEP_MULTIPLE * med) why = 'breakout';
    }
    if (!why) continue;

    reasons[why]++;
    for (const url of [p.image_url, storedByPostId.get(p.post_id)]) {
      const name = objectNameFromUrl(url);
      if (name) keep.add(name);
    }
  }

  console.log('Listing bucket…');
  const objects = await listAllObjects();

  const doomed = objects.filter(o => !keep.has(o.name));
  const sizeOf = o => o.metadata?.size ?? 0;
  const totalBytes  = objects.reduce((n, o) => n + sizeOf(o), 0);
  const doomedBytes = doomed.reduce((n, o) => n + sizeOf(o), 0);

  console.log('\n─── Keeping ───');
  console.log(`  recent (<= ${KEEP_RECENT_DAYS}d)      ${reasons.recent}`);
  console.log(`  breakouts (>= ${KEEP_MULTIPLE}x)     ${reasons.breakout}`);
  console.log(`  editor's pick / pinned  ${reasons.editorial}`);
  console.log(`  saved by a member       ${reasons.saved}`);

  console.log('\n─── Bucket ───');
  console.log(`  now      ${objects.length} objects, ${mb(totalBytes)}`);
  console.log(`  deleting ${doomed.length} objects, ${mb(doomedBytes)}`);
  console.log(`  after    ${objects.length - doomed.length} objects, ${mb(totalBytes - doomedBytes)}`);

  if (!doomed.length) { console.log('\nNothing to do.'); return; }

  if (!APPLY) {
    console.log('\nDry run — nothing deleted. Re-run with --apply to proceed.');
    return;
  }

  console.log('\nDeleting…');
  let done = 0;
  for (let i = 0; i < doomed.length; i += DELETE_BATCH) {
    const batch = doomed.slice(i, i + DELETE_BATCH).map(o => o.name);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) { console.error(`  batch failed: ${error.message}`); continue; }
    done += batch.length;
    process.stdout.write(`\r  ${done}/${doomed.length}`);
  }
  console.log(`\n\nDone. Deleted ${done} objects, freed ~${mb(doomedBytes)}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
