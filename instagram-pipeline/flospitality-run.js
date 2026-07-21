// Flospitality client-portfolio scrape — SCOPED, one-off (2026-07-21)
//
// Pulls recent Instagram data for the Flospitality client hotels so they can be
// benchmarked AGAINST the tracked luxury network — WITHOUT joining it. Reuses
// scrape.js exactly as the weekly pipeline does (same actors, same image
// download to `standout-images`, same upserts into `posts` + `profile_snapshots`).
//
// HARD GUARDRAIL: this script refuses to scrape any handle that is `tracked = true`
// in the `hotels` table. Tracked hotels are the benchmark; re-scraping them here is
// out of scope. It also skips the DMC/no-handle rows and the FLAG "decision needed"
// rows in the CSV. So it scrapes ONLY the client hotels that are NOT in the benchmark.
//
// Run from this folder (needs .env + node_modules):  node flospitality-run.js
// It does NOT touch the `hotels` table, runs no SQL, and never calls full-run.js.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { run } from './scrape.js';

const CSV_PATH = '/Users/neilpeacock/flospitality_handles.csv';
const POSTS_PER_HOTEL = 30;
const BATCH_SIZE = 50;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── parse the CSV (handles quoted fields with embedded commas) ───────────────
function splitCsv(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const rawCsv = readFileSync(CSV_PATH, 'utf8');
const lines = rawCsv.split(/\r?\n/).filter(l => l.trim().length);
const header = splitCsv(lines[0]).map(h => h.trim());
const rows = lines.slice(1).map(l => {
  const f = splitCsv(l); const o = {};
  header.forEach((h, i) => (o[h] = (f[i] || '').trim()));
  return o;
});

const cleanHandles = [];
const flagged = [];
const excluded = [];
for (const r of rows) {
  const handle = (r.instagram_handle || '').replace(/^@/, '').toLowerCase().trim();
  const conf = (r.confidence || '').toLowerCase();
  if (!handle) { excluded.push(r.hotel_name); continue; }
  if (r.verified === 'FLAG' || conf === 'decision needed') { flagged.push({ name: r.hotel_name, handle }); continue; }
  if (conf === 'excluded') { excluded.push(r.hotel_name); continue; }
  cleanHandles.push(handle);
}
const uniqueClean = [...new Set(cleanHandles)];

// ─── guardrail: never scrape a tracked (benchmark) hotel ──────────────────────
const { data: trackedRows, error: tErr } = await supabase
  .from('hotels').select('instagram_handle').eq('tracked', true);
if (tErr) { console.error('Failed to load tracked hotels:', tErr.message); process.exit(1); }
const trackedSet = new Set(trackedRows.map(r => r.instagram_handle.toLowerCase()));

const toScrape = uniqueClean.filter(h => !trackedSet.has(h));
const skippedTracked = uniqueClean.filter(h => trackedSet.has(h));

console.log('\n════════════════════════════════════════════════════════');
console.log('FLOSPITALITY SCOPED SCRAPE');
console.log('════════════════════════════════════════════════════════');
console.log(`Clean handles in CSV:        ${uniqueClean.length}`);
console.log(`Skipped (already tracked):   ${skippedTracked.length} -> ${skippedTracked.join(', ')}`);
console.log(`FLAG (decision needed):      ${flagged.length} -> ${flagged.map(f => '@' + f.handle).join(', ')}`);
console.log(`Excluded (DMC/no handle):    ${excluded.length} -> ${excluded.join(', ')}`);
console.log(`\nWILL SCRAPE:                 ${toScrape.length} handles`);
console.log(`Posts per hotel: ${POSTS_PER_HOTEL} | Batch size: ${BATCH_SIZE}`);

// ─── before-counts (posts rows per handle) ────────────────────────────────────
async function postCounts(handles) {
  const counts = {};
  for (const h of handles) {
    const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('instagram_handle', h);
    counts[h] = count ?? 0;
  }
  return counts;
}
const before = await postCounts(toScrape);
const beforeTotal = Object.values(before).reduce((a, b) => a + b, 0);
console.log(`\nExisting posts across the ${toScrape.length} handles (before): ${beforeTotal}`);

// ─── scrape in batches (mirrors full-run.js) ──────────────────────────────────
const batches = [];
for (let i = 0; i < toScrape.length; i += BATCH_SIZE) batches.push(toScrape.slice(i, i + BATCH_SIZE));

let totalProfiles = 0, totalPosts = 0;
const allSkipped = [];
for (let i = 0; i < batches.length; i++) {
  console.log(`\n─── Batch ${i + 1}/${batches.length} (${batches[i].length} hotels) ───`);
  try {
    const summary = await run(batches[i], { resultsLimit: POSTS_PER_HOTEL });
    totalProfiles += summary.profilesLoaded;
    totalPosts += summary.postsLoaded;
    allSkipped.push(...summary.skipped);
  } catch (err) {
    console.error(`    Batch ${i + 1} failed: ${err.message}`);
    allSkipped.push(...batches[i]);
  }
}

// ─── after-counts + report ────────────────────────────────────────────────────
const after = await postCounts(toScrape);
const afterTotal = Object.values(after).reduce((a, b) => a + b, 0);

console.log('\n════════════════════════════════════════════════════════');
console.log('FLOSPITALITY SCRAPE COMPLETE');
console.log('════════════════════════════════════════════════════════');
console.log(`Profiles loaded:  ${totalProfiles} / ${toScrape.length}`);
console.log(`Post rows written this run (upserts): ${totalPosts}`);
console.log(`Posts table for these handles: ${beforeTotal} -> ${afterTotal} (net new: ${afterTotal - beforeTotal})`);
if (allSkipped.length) {
  console.log(`\nHandles that returned nothing (${allSkipped.length}): ${allSkipped.map(h => '@' + h).join(', ')}`);
}
console.log('\nPer-handle before -> after:');
for (const h of toScrape) {
  const flagNothing = after[h] === 0 ? '  ⚠ no data' : '';
  console.log(`  @${h}: ${before[h]} -> ${after[h]}${flagNothing}`);
}
