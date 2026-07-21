/**
 * check-images.js  — run before any backfill decision
 *   node check-images.js
 *
 * Reports:
 *   1. standout_posts — how many have a permanent stored_image_url vs NULL
 *   2. posts (last 90 days) — how many rows have any image_url at all
 *   3. Apify cost estimate for a full re-scrape of affected handles
 *
 * No writes — read-only diagnostic.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  // ── 1. standout_posts ─────────────────────────────────────────────────────
  const { data: spAll, error: spErr } = await sb
    .from('standout_posts')
    .select('post_id, stored_image_url');
  if (spErr) throw spErr;

  const spTotal    = spAll.length;
  const spHasImage = spAll.filter(r => r.stored_image_url).length;
  const spBroken   = spTotal - spHasImage;

  console.log('\n── standout_posts ────────────────────────────────');
  console.log(`   Total rows:            ${spTotal}`);
  console.log(`   Has stored_image_url:  ${spHasImage}`);
  console.log(`   Missing (broken):      ${spBroken}`);

  // ── 2. posts table — last 90 days ─────────────────────────────────────────
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPosts, error: pErr } = await sb
    .from('posts')
    .select('post_id, image_url, instagram_handle')
    .gte('posted_at', since);
  if (pErr) throw pErr;

  const pTotal       = recentPosts.length;
  const pHasUrl      = recentPosts.filter(r => r.image_url).length;
  const pMissingUrl  = pTotal - pHasUrl;

  // Identify how many unique handles have posts with raw Instagram CDN URLs
  // (scontent-*.cdninstagram.com or similar) — those are the expired ones.
  const cdnPattern  = /cdninstagram\.com|scontent\.|fbcdn\.net/;
  const rawCdnPosts = recentPosts.filter(r => r.image_url && cdnPattern.test(r.image_url));
  const affectedHandles = [...new Set(rawCdnPosts.map(r => r.instagram_handle))];

  console.log('\n── posts (last 90 days) ──────────────────────────');
  console.log(`   Total posts:           ${pTotal}`);
  console.log(`   Has image_url:         ${pHasUrl}`);
  console.log(`   Missing image_url:     ${pMissingUrl}`);
  console.log(`   With raw CDN URL:      ${rawCdnPosts.length} (these will be broken)`);
  console.log(`   Affected handles:      ${affectedHandles.length}`);

  // ── 3. Apify cost estimate ────────────────────────────────────────────────
  // apify/instagram-post-scraper is pay-per-result: $2.30 per 1,000 results on
  // the Starter tier (~$2.70 on Free). See APIFY-COST.md. Re-scraping 30 posts
  // per handle to get fresh images:
  const postsPerHandle   = 30;
  const pricePerPost     = 0.0023; // $2.30 / 1000 (Starter tier)
  const estimatedCost    = affectedHandles.length * postsPerHandle * pricePerPost;
  const handlesToReScrape = affectedHandles.length;

  console.log('\n── Apify re-scrape estimate ──────────────────────');
  console.log(`   Handles needing re-scrape:  ${handlesToReScrape}`);
  console.log(`   Posts per handle (assumed): ${postsPerHandle}`);
  console.log(`   Apify cost @ $2.30/1k:      $${estimatedCost.toFixed(2)}`);
  console.log(`   Note: actual cost depends on your plan & actor compute units.`);
  console.log(`   Apify dashboard → https://console.apify.com/billing for exact usage.`);

  console.log('\n── What the forward fix covers ───────────────────');
  console.log('   New scrapes (from now on): images uploaded to Supabase Storage ✓');
  console.log('   Existing posts with CDN URLs: still broken — need re-scrape to fix.');
  console.log('   standout_posts with stored_image_url set: already permanent ✓');
  console.log('\n── Next steps (do NOT run without approval) ──────');
  console.log('   1. Run generate-insight.js now — it will re-upload images for this');
  console.log('      week\'s standout posts and fix stored_image_url for those rows.');
  console.log('   2. For a full historical backfill: report the above numbers to Neil');
  console.log('      and await explicit approval before running any Apify re-scrape.');
}

main().catch(err => { console.error(err); process.exit(1); });
