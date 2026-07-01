// CHECKPOINT 2 — Full run across all 465 hotels
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
const POST_WINDOW = '14 days';

// ─── fetch all unique handles from Supabase ───────────────────────────────────

const { data: hotelRows, error } = await supabase
  .from('hotels')
  .select('instagram_handle')
  .order('instagram_handle');

if (error) {
  console.error('Failed to load hotels:', error.message);
  process.exit(1);
}

const allHandles = [...new Set(
  hotelRows.map(r => r.instagram_handle).filter(Boolean)
)].sort();

console.log(`\n════════════════════════════════════════════`);
console.log(`FULL RUN — ${allHandles.length} unique handles`);
console.log(`Post window: ${POST_WINDOW} | Batch size: ${BATCH_SIZE}`);
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
    const summary = await run(batch, { postsNewerThan: POST_WINDOW });
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
