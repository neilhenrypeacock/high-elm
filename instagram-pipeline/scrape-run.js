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
import { classifyScrape } from './scrape-outcome.js';

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
// Batches that THREW, as opposed to batches that ran and returned nothing.
// Kept apart from allSkipped because the two mean different things: a thrown
// batch is our problem (auth, billing, actor down), an empty one is usually
// just a hotel that hasn't posted inside the window.
const failedBatches = [];

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
    failedBatches.push({ n: i + 1, message: err.message });
  }
}

// ─── final report ─────────────────────────────────────────────────────────────

// Classified BEFORE the banner is printed, so the banner can never say COMPLETE
// over a run that is about to exit 1.
const outcome = classifyScrape({
  batchCount: batches.length,
  failedCount: failedBatches.length,
  totalPosts,
});

console.log(`\n════════════════════════════════════════════`);
console.log(outcome.ok ? 'SCRAPE COMPLETE' : 'SCRAPE FAILED');
console.log(`════════════════════════════════════════════`);
console.log(`Profiles loaded: ${totalProfiles} / ${allHandles.length}`);
console.log(`Posts collected: ${totalPosts}`);
if (failedBatches.length) {
  console.log(`Batches failed:  ${failedBatches.length} / ${batches.length}`);
}

if (allSkipped.length) {
  console.log(`\nHandles that returned nothing (${allSkipped.length}):`);
  allSkipped.forEach(h => console.log(`  @${h}`));
  console.log('\nYou can re-run these manually by editing the handles list in test-run.js.');
} else {
  console.log('\nAll handles returned data. ✅');
}

// ─── did this run actually achieve anything? ─────────────────────────────────
//
// WHY THIS EXISTS (2026-08-04): on 1 Aug all four batches threw
// "Too many outstanding invoices" (an unpaid Apify bill), the loop above caught
// each one and continued, and the run then printed SCRAPE COMPLETE and exited 0.
// GitHub showed a green tick. check-freshness.js ran next and ALSO passed, because
// the newest post was 5 days old against its 8-day limit — so a scrape that
// collected literally nothing looked, from the outside, like a healthy week.
// The data was 8 days stale before anyone noticed.
//
// Catching a batch error so the other batches still run is right. Reporting
// success afterwards is not. A run that collected nothing has failed, whatever
// the reason, and must exit non-zero so the workflow fails and GitHub emails.
//
// A SMALL partial run still exits 0: one or two batches failing while the rest
// return data is usually a flaky actor call, and the next scrape's overlapping
// window closes the hole (see APIFY-COST.md). That stays a loud warning.
//
// A LARGE one does not (added 2026-08-05, review finding 2). Half the batches
// failing is ~100 hotels missing the week — well past what an overlapping window
// is meant to absorb, and it usually means something systemic (billing, the
// actor, Instagram) rather than one bad call. The rules live in
// scrape-outcome.js so they can be tested; see the note at the top of that file.

const uniqueErrors = [...new Set(failedBatches.map(b => b.message))];

if (!outcome.ok) {
  console.error(`\n❌ ${outcome.reason}`);
  if (uniqueErrors.length) uniqueErrors.forEach(m => console.error(`   ${m}`));

  if (outcome.code === 'all-failed') {
    console.error(`   Check https://console.apify.com/billing first: an unpaid invoice or the`);
    console.error(`   monthly usage cap stops every actor call and reads exactly like this.`);
  }
  if (outcome.code === 'no-posts' && !uniqueErrors.length) {
    console.error(`   No batch threw, so the actor returned empty results for every handle.`);
  }
  if (outcome.code === 'mass-failure') {
    console.error(`   ${totalPosts} posts did land, so the data is not empty — it is INCOMPLETE.`);
    console.error(`   Re-run once the cause is fixed rather than waiting for the next schedule.`);
  }

  process.exit(1);
}

if (outcome.code === 'partial') {
  console.warn(`\n⚠ Partial run: ${outcome.reason}`);
  uniqueErrors.forEach(m => console.warn(`   ${m}`));
  console.warn(`   This exits 0 — the next run's overlapping window should fill the gap.`);
  console.warn(`   Investigate if it repeats.`);
}
