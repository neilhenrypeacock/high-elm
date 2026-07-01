/**
 * backfill-themes.js — classify theme_tag for existing standout_posts
 *
 * Usage:
 *   node backfill-themes.js --test   ← 5-hotel sample; shows results + cost estimate. STOP HERE.
 *   node backfill-themes.js --full   ← full backfill (only after approval)
 *
 * Prerequisite: run add-theme-tag.sql in Supabase SQL Editor first.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY        = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error('Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY');
  process.exit(1);
}

const MODE = process.argv.includes('--full') ? 'full'
           : process.argv.includes('--test') ? 'test'
           : null;

if (!MODE) {
  console.error('Specify --test (5-hotel sample) or --full (after approval).');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VALID_THEMES = new Set([
  'Food & Drink', 'The Property', 'Place & Experience',
  'Wellness', 'People', 'Events', 'Other / Brand',
]);

// Haiku 4.5 pricing (USD per token)
const COST_INPUT_PER_TOKEN  = 0.80  / 1_000_000;
const COST_OUTPUT_PER_TOKEN = 0.40  / 1_000_000;

// ── Claude helpers ────────────────────────────────────────────────────────────

async function callClaudeRaw(body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', ...body }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return {
    text:         json.content[0].text.trim(),
    inputTokens:  json.usage?.input_tokens  ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
  };
}

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const buffer    = await res.arrayBuffer();
    const ct        = res.headers.get('content-type') ?? 'image/jpeg';
    const mediaType = ct.startsWith('image/png') ? 'image/png'
                    : ct.startsWith('image/gif') ? 'image/gif'
                    : ct.startsWith('image/webp') ? 'image/webp'
                    : 'image/jpeg';
    const base64 = Buffer.from(buffer).toString('base64');
    if (base64.length > 7_000_000) return null;
    return { base64, mediaType };
  } catch {
    return null;
  }
}

// ── Theme classifier ──────────────────────────────────────────────────────────

async function classifyTheme(post) {
  const cap     = post.caption ? `"${post.caption.replace(/\n/g, ' ').slice(0, 200)}"` : '(no caption)';
  const textCtx = `Hotel: ${post.hotel_name} (${post.hotel_country ?? '?'})
Post type: ${post.type ?? 'Unknown'}
Caption: ${cap}`;

  const prompt = `You are classifying a luxury hotel Instagram post into exactly one content theme.

Choose the single most fitting theme from exactly this list — nothing else:
- "Food & Drink" — restaurants, chefs, plated dishes, the bar, afternoon tea, wine
- "The Property" — the physical place: rooms, suites, lobby, architecture, design, art
- "Place & Experience" — destination and activities: landscape, views, skiing, golf, excursions, classes
- "Wellness" — spa, treatments, pools, fitness, the restore/switch-off angle
- "People" — guests, staff, a notable visitor, a human moment; subject is a person
- "Events" — weddings, parties, seasonal openings, celebrations, launches
- "Other / Brand" — genuine misfits only: quote cards, anniversary graphics, reshares. Only use when nothing else genuinely fits.

Rule: pick the single dominant theme. Never invent a new theme.

${textCtx}

Return ONLY valid JSON, no markdown:
{"theme": "..."}`;

  let result;
  if (post._imageBase64 && post._imageMediaType) {
    const content = [
      { type: 'image', source: { type: 'base64', media_type: post._imageMediaType, data: post._imageBase64 } },
      { type: 'text', text: prompt },
    ];
    try {
      result = await callClaudeRaw({ max_tokens: 80, messages: [{ role: 'user', content }] });
    } catch (e) {
      console.warn(`    vision failed for ${post.post_id}: ${e.message} — falling back to text`);
      result = await callClaudeRaw({ max_tokens: 80, messages: [{ role: 'user', content: prompt }] });
    }
  } else {
    result = await callClaudeRaw({ max_tokens: 80, messages: [{ role: 'user', content: prompt }] });
  }

  try {
    const match  = result.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON object in response');
    const parsed = JSON.parse(match[0]);
    if (!parsed.theme) throw new Error('missing theme field');
    const theme  = VALID_THEMES.has(parsed.theme) ? parsed.theme : null;
    if (!theme) console.warn(`    invalid theme returned: "${parsed.theme}"`);
    return { theme, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  } catch (e) {
    console.warn(`    parse failed for ${post.post_id}: ${e.message}`);
    return { theme: null, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== backfill-themes.js  [${MODE} mode] ===\n`);

  // 1. Fetch standout posts that have been analysed but have no theme yet.
  console.log('Fetching standout posts without theme_tag…');
  const { data: standout, error: standoutErr } = await sb
    .from('standout_posts')
    .select('post_id, stored_image_url')
    .is('theme_tag', null)
    .not('post_insight', 'is', null);

  if (standoutErr) throw new Error(`standout_posts fetch failed: ${standoutErr.message}`);
  if (!standout?.length) { console.log('Nothing to backfill — all posts already have theme_tag.'); return; }
  console.log(`  Found ${standout.length} posts without theme_tag.`);

  // 2. Fetch matching post rows (caption, type, handle).
  const postIds = standout.map(p => p.post_id);
  const { data: postRows, error: postErr } = await sb
    .from('posts')
    .select('post_id, instagram_handle, caption, type, image_url')
    .in('post_id', postIds);
  if (postErr) throw new Error(`posts fetch failed: ${postErr.message}`);

  const postMap = Object.fromEntries((postRows ?? []).map(p => [p.post_id, p]));

  // 3. Fetch hotel names + countries.
  const handles = [...new Set((postRows ?? []).map(p => p.instagram_handle).filter(Boolean))];
  const { data: hotels } = await sb
    .from('hotels')
    .select('instagram_handle, name, country')
    .in('instagram_handle', handles);
  const hotelByHandle = Object.fromEntries((hotels ?? []).map(h => [h.instagram_handle, h]));

  // 4. Merge into a flat list of posts to process.
  let toProcess = standout.map(s => {
    const p = postMap[s.post_id] ?? {};
    const h = hotelByHandle[p.instagram_handle] ?? {};
    return {
      post_id:          s.post_id,
      stored_image_url: s.stored_image_url ?? null,
      image_url:        p.image_url ?? null,
      caption:          p.caption ?? null,
      type:             p.type ?? null,
      hotel_name:       h.name ?? p.instagram_handle ?? '?',
      hotel_country:    h.country ?? null,
    };
  });

  // 5. In test mode: limit to posts from the first 5 hotels.
  if (MODE === 'test') {
    const hotelNames = [...new Set(toProcess.map(p => p.hotel_name))];
    const testHotels = new Set(hotelNames.slice(0, 5));
    toProcess = toProcess.filter(p => testHotels.has(p.hotel_name));
    console.log(`\nTest mode — restricting to ${testHotels.size} hotels (${toProcess.length} posts):`);
    for (const name of testHotels) console.log(`  • ${name}`);
  }

  console.log(`\nDownloading images for ${toProcess.length} posts…`);
  const withImages = await Promise.all(toProcess.map(async p => {
    const imageUrl = p.stored_image_url ?? p.image_url;
    if (!imageUrl) return { ...p, _imageBase64: null, _imageMediaType: null };
    const img = await fetchImageAsBase64(imageUrl);
    return { ...p, _imageBase64: img?.base64 ?? null, _imageMediaType: img?.mediaType ?? null };
  }));

  console.log(`\nClassifying themes…`);
  let totalInput = 0, totalOutput = 0;
  const results = [];

  for (const post of withImages) {
    process.stdout.write(`  ${post.hotel_name} / ${post.post_id}: `);
    const { theme, inputTokens, outputTokens } = await classifyTheme(post);
    totalInput  += inputTokens;
    totalOutput += outputTokens;
    results.push({ post_id: post.post_id, hotel_name: post.hotel_name, theme });
    console.log(theme ?? '(null)');
  }

  // 6. Cost summary.
  const testCost  = totalInput * COST_INPUT_PER_TOKEN + totalOutput * COST_OUTPUT_PER_TOKEN;
  console.log(`\n── Results ──────────────────────────────────────────`);
  for (const r of results) {
    console.log(`  ${r.hotel_name.padEnd(40)} → ${r.theme ?? '(unclassified)'}`);
  }
  console.log(`\nTokens:  ${totalInput.toLocaleString()} in / ${totalOutput.toLocaleString()} out`);
  console.log(`Cost:    $${testCost.toFixed(4)} for ${results.length} posts`);

  if (MODE === 'test') {
    // Estimate full-run cost.
    const postsInFullSet = standout.length;
    const avgCostPerPost = testCost / results.length;
    const estimatedFullCost = avgCostPerPost * postsInFullSet;
    console.log(`\n── Full-run estimate ─────────────────────────────────`);
    console.log(`  Total posts needing theme: ${postsInFullSet}`);
    console.log(`  Avg cost / post (test):    $${avgCostPerPost.toFixed(5)}`);
    console.log(`  Estimated full-run cost:   ~$${estimatedFullCost.toFixed(3)}`);
    console.log(`\nNot writing to DB in test mode. Confirm the above, then run:`);
    console.log(`  node backfill-themes.js --full`);
    return;
  }

  // 7. Full mode: write theme_tag to DB.
  console.log(`\nWriting theme_tag to standout_posts…`);
  let ok = 0, fail = 0;
  for (const r of results) {
    if (!r.theme) { fail++; continue; }
    const { error } = await sb
      .from('standout_posts')
      .update({ theme_tag: r.theme })
      .eq('post_id', r.post_id);
    if (error) { console.warn(`  ${r.post_id}: update failed — ${error.message}`); fail++; }
    else ok++;
  }
  console.log(`\nDone — ${ok} updated, ${fail} skipped/failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
