// Full run across all TRACKED hotels (beta: the 200 most-followed —
// see setup-tracked.sql). Scrapes each hotel's last N posts; those posts
// are the hotel's breakout baseline.
// Run with: npm run full

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

// Incremental scrape window (cost control — see APIFY-COST.md). We pull only
// posts newer than N days instead of a fixed 30-per-hotel: the breakout baseline
// is computed by the dashboard from posts ALREADY stored in Supabase (posts
// upsert), so history accumulates and each run only needs the new deltas.
// Default 10 days for the weekly cron. A future monthly deep-sweep sets
// SCRAPE_WINDOW_DAYS=35 (via its own workflow) to re-refresh a month of
// engagement and catch posts that go viral weeks after publishing.
const WINDOW_DAYS = Number(process.env.SCRAPE_WINDOW_DAYS) || 10;
// Per-hotel safety ceiling: onlyPostsNewerThan does the real windowing, but we
// also cap results per hotel so a pathological account can't run away with cost.
// 50 clears a normal 35-day month of luxury-hotel posting without truncating.
const POST_CEILING = Number(process.env.SCRAPE_POST_CEILING) || 50;

// onlyPostsNewerThan as a YYYY-MM-DD date the Apify actor accepts.
const postsNewerThan = new Date(Date.now() - WINDOW_DAYS * 86_400_000)
  .toISOString()
  .slice(0, 10);

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
console.log(`FULL RUN — ${allHandles.length} tracked handles`);
console.log(`Window: last ${WINDOW_DAYS} days (since ${postsNewerThan}) | Cap: ${POST_CEILING}/hotel | Batch size: ${BATCH_SIZE}`);
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
    const summary = await run(batch, { postsNewerThan, resultsLimit: POST_CEILING });
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
console.log(`FULL RUN COMPLETE`);
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
