// Scrape runner across all TRACKED hotels (beta: the 200 most-followed —
// see setup-tracked.sql). ONE runner, three modes selected by env
// (see instagram-pipeline/APIFY-COST.md and the package.json scripts):
//   • weekly  — npm run weekly   (SCRAPE_WINDOW_DAYS=10)  routine delta refresh
//   • monthly — npm run monthly  (SCRAPE_WINDOW_DAYS=35)  deep sweep; re-refreshes
//               a month so posts that go viral late still surface
//   • full    — npm run full     (SCRAPE_FULL=1)          baseline rebuild,
//               30 posts/hotel, no window (manual only — rare, e.g. new hotels)
// Windowed modes pull only posts newer than N days (onlyPostsNewerThan). The
// breakout baseline is computed by the dashboard from posts ALREADY stored in
// Supabase (posts upsert), so history accumulates and each run needs only deltas.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';
import { run } from './scrape.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });

const BATCH_SIZE = 50;

// ─── mode selection (see header + APIFY-COST.md) ─────────────────────────────
// full mode: count-based, no date window — every hotel's last SCRAPE_POST_LIMIT
// posts (baseline rebuild). windowed modes (weekly/monthly): onlyPostsNewerThan
// does the real windowing; SCRAPE_POST_CEILING is a per-hotel safety cap so a
// pathological account can't run away with cost (50 clears a normal 35-day month
// of luxury-hotel posting without truncating).
const FULL = process.env.SCRAPE_FULL === '1';
const WINDOW_DAYS = Number(process.env.SCRAPE_WINDOW_DAYS) || 10;
const POST_CEILING = Number(process.env.SCRAPE_POST_CEILING) || 50;
const FULL_POST_LIMIT = Number(process.env.SCRAPE_POST_LIMIT) || 30;

// onlyPostsNewerThan as a YYYY-MM-DD date the Apify actor accepts (null in full mode).
const postsNewerThan = FULL
  ? null
  : new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
const resultsLimit = FULL ? FULL_POST_LIMIT : POST_CEILING;
const modeLabel = FULL
  ? `FULL SCRAPE — ${FULL_POST_LIMIT} posts/hotel`
  : `SCRAPE — last ${WINDOW_DAYS} days (since ${postsNewerThan})`;

// ─── fetch tracked handles from Supabase ──────────────────────────────────────

const { data: hotelRows, error } = await supabase
  .from('hotels')
  .select('instagram_handle')
  .eq('tracked', true)
  .order('instagram_handle');

if (error) {
  console.error('Failed to load hotels:', error.message);
  process.exit(1);
}

const allHandles = [...new Set(
  hotelRows.map(r => r.instagram_handle).filter(Boolean)
)].sort();

console.log(`\n════════════════════════════════════════════`);
console.log(modeLabel);
console.log(`${allHandles.length} tracked handles | ${FULL ? 'Limit' : 'Cap'}: ${resultsLimit}/hotel | Batch size: ${BATCH_SIZE}`);
console.log(`════════════════════════════════════════════\n`);

// ─── split into batches ───────────────────────────────────────────────────────

const batches = [];
for (let i = 0; i < allHandles.length; i += BATCH_SIZE) {
  batches.push(allHandles.slice(i, i + BATCH_SIZE));
}

console.log(`Running ${batches.length} batches of up to ${BATCH_SIZE} hotels each.\n`);

// ─── run each batch ───────────────────────────────────────────────────────────

let totalProfiles = 0;
let totalPosts = 0;
const allSkipped = [];

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  console.log(`\n─── Batch ${i + 1} / ${batches.length} (${batch.length} hotels) ───`);

  try {
    const summary = await run(batch, { postsNewerThan, resultsLimit });
    totalProfiles += summary.profilesLoaded;
    totalPosts += summary.postsLoaded;
    allSkipped.push(...summary.skipped);
    console.log(`    Batch ${i + 1} done: ${summary.profilesLoaded} profiles, ${summary.postsLoaded} posts`);
  } catch (err) {
    console.error(`    Batch ${i + 1} failed: ${err.message}`);
    console.error('    Skipping this batch and continuing...');
    allSkipped.push(...batch);
  }
}

// ─── final report ─────────────────────────────────────────────────────────────

console.log(`\n════════════════════════════════════════════`);
console.log(`SCRAPE COMPLETE`);
console.log(`════════════════════════════════════════════`);
console.log(`Profiles loaded: ${totalProfiles} / ${allHandles.length}`);
console.log(`Posts collected: ${totalPosts}`);

if (allSkipped.length) {
  console.log(`\nHandles that returned nothing (${allSkipped.length}):`);
  allSkipped.forEach(h => console.log(`  @${h}`));
  console.log('\nYou can re-run these manually by editing the handles list in test-run.js.');
} else {
  console.log('\nAll handles returned data. ✅');
}
