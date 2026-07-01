// Throwaway read-only audit script — SELECT only, no writes of any kind.
// Run: node audit-post-counts.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAll(table, columns) {
  const PAGE = 1000;
  let from = 0, rows = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) { console.error(`Error fetching ${table}:`, error); process.exit(1); }
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

// Pass 1: all snapshots — latest per handle gives current follower count
console.log('Fetching profile_snapshots...');
const allSnaps = await fetchAll('profile_snapshots', 'instagram_handle, followers_count, captured_at');
console.log(`  Total snapshot rows: ${allSnaps.length}`);

// Keep only the most recent snapshot per handle
const latestByHandle = {};
for (const row of allSnaps) {
  const prev = latestByHandle[row.instagram_handle];
  if (!prev || row.captured_at > prev.captured_at) {
    latestByHandle[row.instagram_handle] = row;
  }
}
console.log(`  Distinct handles: ${Object.keys(latestByHandle).length}`);

// Rank by followers_count desc, take top 200
const ranked = Object.values(latestByHandle)
  .sort((a, b) => (b.followers_count ?? 0) - (a.followers_count ?? 0))
  .slice(0, 200);

const top200Handles = ranked.map(r => r.instagram_handle);
console.log(`\nTop 200 by followers. #1: ${ranked[0].instagram_handle} (${ranked[0].followers_count?.toLocaleString()} followers)`);
console.log(`                      #200: ${ranked[199].instagram_handle} (${ranked[199].followers_count?.toLocaleString()} followers)`);

// Pass 2: all posts — count per handle
console.log('\nFetching posts...');
const allPosts = await fetchAll('posts', 'instagram_handle, likes_count');
console.log(`  Total post rows: ${allPosts.length}`);

// Aggregate counts per handle for top 200
const counts = {};
for (const h of top200Handles) counts[h] = { total: 0, valid: 0 };
for (const p of allPosts) {
  if (!counts[p.instagram_handle]) continue;
  counts[p.instagram_handle].total++;
  if (p.likes_count !== -1) counts[p.instagram_handle].valid++;
}

// Step 5: compute spread
const validCounts = Object.values(counts).map(c => c.valid).sort((a, b) => a - b);
const median = validCounts[Math.floor(validCounts.length / 2)];
const min = validCounts[0];
const max = validCounts[validCounts.length - 1];

const bucket30plus  = validCounts.filter(n => n >= 30).length;
const bucket20_29   = validCounts.filter(n => n >= 20 && n < 30).length;
const bucket12_19   = validCounts.filter(n => n >= 12 && n < 20).length;
const bucketUnder12 = validCounts.filter(n => n < 12).length;
const solidBaseline = validCounts.filter(n => n >= 20).length;
const needsTopUp    = validCounts.filter(n => n < 12).length;

console.log('\n=== STEP 1: Real column names ===');
console.log('posts.instagram_handle              — links post to hotel (no hotel_id; sister properties share handles)');
console.log('posts.likes_count                   — like count; -1 = hidden likes');
console.log('profile_snapshots.followers_count   — follower count');
console.log('profile_snapshots.instagram_handle  — links snapshot to hotel');
console.log('profile_snapshots.captured_at       — timestamp (latest row = current followers)');

console.log('\n=== STEP 5: Valid-post bucket spread across top 200 ===');
console.log(`  ≥ 30 valid posts:  ${bucket30plus} hotels`);
console.log(`  20–29 valid posts: ${bucket20_29} hotels`);
console.log(`  12–19 valid posts: ${bucket12_19} hotels`);
console.log(`  < 12 valid posts:  ${bucketUnder12} hotels  ← would need top-up`);
console.log(`\n  Median: ${median}  |  Min: ${min}  |  Max: ${max}`);
console.log(`\n  Verdict: ${solidBaseline} of 200 already have ≥20 valid posts; ${needsTopUp} have <12 and would need a targeted top-up scrape.`);

// Show the 4 solid ones for context
const top20solid = Object.entries(counts)
  .map(([h, c]) => ({ h, ...c }))
  .sort((a, b) => b.valid - a.valid)
  .slice(0, 20);
console.log('\n=== Top 20 handles by valid post count ===');
for (const r of top20solid) console.log(`  ${r.h}: ${r.valid} valid / ${r.total} total`);

// Notion STATE note line
console.log('\n=== Notion STATE note line ===');
console.log(`- 1 Jul 2026 — Read-only audit: of the top 200 hotels by followers, ${solidBaseline} already have ≥20 valid posts, ${needsTopUp} have <12 (would need a top-up). No code or data changed.`);
