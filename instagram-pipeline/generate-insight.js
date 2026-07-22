/**
 * generate-insight.js  — run after each weekly scrape
 *   node generate-insight.js
 *
 * 1. Finds this week's standout posts (overperformance vs hotel's own median).
 * 2. Downloads their FULL media and stores the cover in Supabase Storage.
 *    - Carousels: reads every slide (posts.child_image_urls).
 *    - Videos/Reels: samples frames across the whole clip via ffmpeg
 *      (posts.video_url). Needs ffmpeg installed; falls back to the cover if not.
 * 3. Generates a three-part editorial analysis (what it is / why it worked /
 *    try this) + driver + theme tag per post, via Claude Sonnet 5 (Vision +
 *    adaptive thinking + structured output).
 * 4. Writes to standout_posts so the dashboard's "Editor's note" card reads it.
 *
 * Runs automatically in .github/workflows/weekly-scrape.yml, after the scrape.
 * Targets the current TOP 10 NON-COLLAB breakouts, selected with the SAME rule
 * as the dashboard — see the "Breakout rule" note by the constants below.
 *
 * Prereqs: run setup-post-media.sql; `brew install ffmpeg` for video frames
 * (the workflow installs it; local runs need it too). Needs ANTHROPIC_API_KEY.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileP = promisify(execFile);

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY        = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error('Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY in .env');
  process.exit(1);
}

const sb     = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'standout-images';
const MODEL  = 'claude-sonnet-5';           // near-Opus quality on this vision task at ~40–60% of the cost
const CAROUSEL_MAX   = 10;                   // slides sent per carousel
const VIDEO_FRAMES   = 8;                    // frames sampled across a video/reel

// ── Breakout rule — KEEP IN SYNC with ../hotel-dashboard/lib/data.ts ──────────
// This file is ESM JS and can't import the dashboard's TypeScript computeStandout,
// so the constants below are DUPLICATED from lib/data.ts. lib/data.ts is the
// single source of truth — if the baseline window, threshold or floors change
// there, change them here too, or the weekly generator will annotate a different
// set of posts than the feed's big cards show.
const MAX_STANDOUT            = 10;   // top 10 non-collab breakouts get analysis each run
const OUTLIER_THRESHOLD       = 2;    // post must beat its hotel's median by ≥2×
const BASELINE_POSTS          = 30;   // baseline = median of the hotel's last 30 valid posts
const MIN_ENGAGEMENT          = 500;  // absolute floor; below this is noise (kept in sync with hotel-dashboard/lib/data.ts)
const MIN_BASELINE_ENGAGEMENT = 25;   // hotels with a median below this are excluded
const OUTLIER_WINDOW_DAYS     = 7;    // the "this week" window for breakouts

// ── Prose-stats guards (logging only — not part of the breakout rule) ─────────
const MIN_VALID_POSTS      = 3;    // need ≥3 posts with visible likes for a reliable hotel ER
const ER_ANOMALY_THRESHOLD = 0.10; // ER above 10% is flagged and excluded from prose stats

// ── Helpers ───────────────────────────────────────────────────────────────────

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function normalizeType(t) {
  if (!t) return 'Other';
  switch (t.toLowerCase()) {
    case 'sidecar': return 'Carousel';
    case 'image':   return 'Photo';
    case 'video':   return 'Video';
    case 'reel':    return 'Reel';
    default:        return 'Other';
  }
}

// Fetch image URL and return base64 + mediaType for Vision API, or null on failure.
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
    // Claude Vision accepts up to ~5MB base64 safely — skip oversized images
    if (base64.length > 7_000_000) return null;
    return { base64, mediaType };
  } catch {
    return null;
  }
}

// ── Video frames ────────────────────────────────────────────────────────────
// Claude can't take a raw video, so "watch the whole video" = sample frames
// evenly across its full duration and send them as an image sequence.
let _ffmpegChecked = false;
let _ffmpegOk = false;
async function ffmpegAvailable() {
  if (_ffmpegChecked) return _ffmpegOk;
  _ffmpegChecked = true;
  try { await execFileP('ffmpeg', ['-version']); _ffmpegOk = true; }
  catch { _ffmpegOk = false; console.warn('  ⚠ ffmpeg not found — videos analysed from cover frame only. Install: brew install ffmpeg'); }
  return _ffmpegOk;
}

async function extractVideoFrames(videoUrl, maxFrames = VIDEO_FRAMES) {
  if (!videoUrl || !(await ffmpegAvailable())) return [];
  let dir = null;
  try {
    const res = await fetch(videoUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return [];
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 80_000_000) return [];               // skip absurdly large clips
    dir = await mkdtemp(join(tmpdir(), 'cr-frames-'));
    const inPath = join(dir, 'in.mp4');
    await writeFile(inPath, buf);
    // Probe duration → sample maxFrames evenly across the WHOLE clip.
    let duration = 0;
    try {
      const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', inPath]);
      duration = parseFloat(stdout.trim()) || 0;
    } catch { /* ffprobe may be absent; fall back to a fixed cadence below */ }
    const fps = duration > 0 ? Math.max(0.05, maxFrames / duration) : 0.5;
    await execFileP('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-i', inPath,
      '-vf', `fps=${fps.toFixed(4)},scale=768:-1`,
      '-frames:v', String(maxFrames), '-y', join(dir, 'f_%02d.jpg'),
    ]);
    const files = (await readdir(dir)).filter(f => f.startsWith('f_')).sort();
    const frames = [];
    for (const f of files.slice(0, maxFrames)) {
      const b = await readFile(join(dir, f));
      frames.push({ base64: b.toString('base64'), mediaType: 'image/jpeg' });
    }
    return frames;
  } catch (e) {
    console.warn(`  frame extraction failed: ${e.message}`);
    return [];
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Claude (Sonnet 5, structured) ─────────────────────────────────────────────
// Returns the parsed JSON object. Structured output guarantees the (non-thinking)
// text block is valid JSON matching the schema. Falls back progressively if the
// full request is rejected, so a run never dies on one post.
async function callClaudeStructured(content, schema, maxTokens = 1600) {
  const post = (body) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  const base = { model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] };
  const attempts = [
    { ...base, thinking: { type: 'adaptive' }, output_config: { effort: 'high', format: { type: 'json_schema', schema } } },
    { ...base, output_config: { format: { type: 'json_schema', schema } } },  // no thinking/effort
    base,                                                                       // plain — regex-parse the JSON
  ];
  let lastErr;
  for (const body of attempts) {
    try {
      const res = await post(body);
      if (!res.ok) { lastErr = new Error(`Anthropic ${res.status}: ${await res.text()}`); continue; }
      const data = await res.json();
      const text = (data.content || []).find(b => b.type === 'text')?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { lastErr = new Error('no JSON in response'); continue; }
      return JSON.parse(match[0]);
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error('structured call failed');
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function ensureBucket() {
  const { error } = await sb.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  });
  if (error && !error.message.toLowerCase().includes('already exists')) {
    throw new Error(`Storage bucket error: ${error.message}`);
  }
}

async function uploadImage(postId, imageUrl) {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const buffer  = await res.arrayBuffer();
    const ct      = res.headers.get('content-type') ?? 'image/jpeg';
    const ext     = ct.includes('png') ? 'png' : 'jpg';
    const path    = `${postId}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType: ct, upsert: true });
    if (error) { console.warn(`  upload failed for ${postId}: ${error.message}`); return null; }
    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.warn(`  image error for ${postId}: ${e.message}`);
    return null;
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function getData() {
  const PAGE = 1000;
  const allPosts = [];
  for (let page = 0; ; page++) {
    const { data, error } = await sb
      .from('posts')
      .select('post_id, instagram_handle, likes_count, comments_count, type, posted_at, image_url, post_url, caption, child_image_urls, video_url, coauthor_usernames')
      .not('posted_at', 'is', null)
      .order('posted_at', { ascending: false })
      .order('post_id') // unique tiebreaker — offset pagination over non-unique timestamps can skip rows
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    allPosts.push(...data);
    if (data.length < PAGE) break;
  }

  // Paginate snapshots — a fixed range silently drops hotels once the table
  // outgrows it (~10 scrape runs at 465 hotels per run)
  const snapshots = [];
  for (let page = 0; ; page++) {
    const { data, error } = await sb
      .from('profile_snapshots')
      .select('instagram_handle, followers_count')
      .order('captured_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    snapshots.push(...data);
    if (data.length < PAGE) break;
  }

  const latestFollowers = {};
  for (const s of snapshots ?? []) {
    if (!(s.instagram_handle in latestFollowers)) latestFollowers[s.instagram_handle] = s.followers_count;
  }

  const { data: hotels } = await sb.from('hotels').select('name, country, instagram_handle, tracked');
  const nameByHandle    = Object.fromEntries((hotels ?? []).map(h => [h.instagram_handle, h.name]));
  const countryByHandle = Object.fromEntries((hotels ?? []).map(h => [h.instagram_handle, h.country]));
  // Only tracked hotels appear on the dashboard, so only they can be breakouts.
  const trackedHandles  = new Set((hotels ?? []).filter(h => h.tracked).map(h => h.instagram_handle));

  const valid = allPosts.filter(p => p.likes_count !== -1 && p.likes_count !== null);

  // Per-hotel absolute engagement totals (for Content Radar baseline)
  const hotelPostEngagements = {};
  // Per-hotel post ERs (for prose stats only)
  const hotelPostERs = {};
  for (const p of valid) {
    const eng = p.likes_count + (p.comments_count ?? 0);
    if (!hotelPostEngagements[p.instagram_handle]) hotelPostEngagements[p.instagram_handle] = [];
    hotelPostEngagements[p.instagram_handle].push(eng);
    const f = latestFollowers[p.instagram_handle];
    if (f && f > 0) {
      if (!hotelPostERs[p.instagram_handle]) hotelPostERs[p.instagram_handle] = [];
      hotelPostERs[p.instagram_handle].push(eng / f);
    }
  }

  // Category numbers for prose — exclude hotels with insufficient data or anomalous ER
  const hotelMedians = Object.entries(hotelPostERs)
    .map(([h, ers]) => ({ handle: h, medianER: median(ers), postCount: ers.length }))
    .filter(h => h.medianER !== null
      && h.postCount >= MIN_VALID_POSTS
      && h.medianER <= ER_ANOMALY_THRESHOLD)
    .sort((a, b) => b.medianER - a.medianER);
  const categoryER = median(hotelMedians.map(h => h.medianER));
  const topHotel   = hotelMedians[0];

  const formatERs = {};
  for (const p of valid) {
    const f = latestFollowers[p.instagram_handle];
    if (!f || f <= 0) continue;
    const type = normalizeType(p.type);
    const er   = (p.likes_count + (p.comments_count ?? 0)) / f * 100;
    if (!formatERs[type]) formatERs[type] = [];
    formatERs[type].push(er);
  }
  const formats    = Object.entries(formatERs)
    .map(([label, ers]) => ({ label, medianER: median(ers) }))
    .sort((a, b) => b.medianER - a.medianER);
  const bestFormat = formats[0];

  // Breakouts — MUST match ../hotel-dashboard/lib/data.ts computeStandout:
  //   • tracked hotels only (untracked never show on the dashboard)
  //   • last OUTLIER_WINDOW_DAYS days
  //   • non-collab only (co-author byline excluded — we annotate non-collabs)
  //   • post engagement ≥ MIN_ENGAGEMENT
  //   • hotel baseline = median of its last BASELINE_POSTS valid posts, ≥ MIN_BASELINE_ENGAGEMENT
  //   • multiplier = postEngagement / baseline ≥ OUTLIER_THRESHOLD
  //   • ranked by multiplier desc, top MAX_STANDOUT
  // valid is already ordered newest-first (posts query is posted_at desc), so
  // hotelPostEngagements[handle].slice(0, BASELINE_POSTS) is the last 30 posts.
  const now    = Date.now();
  const windowMs = OUTLIER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const standout = [];

  for (const p of valid) {
    if (!trackedHandles.has(p.instagram_handle)) continue;
    if ((p.coauthor_usernames?.length ?? 0) > 0) continue; // exclude true collabs
    if (now - new Date(p.posted_at).getTime() > windowMs) continue;
    const postEngagement = p.likes_count + (p.comments_count ?? 0);
    if (postEngagement < MIN_ENGAGEMENT) continue;
    const hotelMed = median((hotelPostEngagements[p.instagram_handle] ?? []).slice(0, BASELINE_POSTS));
    if (!hotelMed || hotelMed < MIN_BASELINE_ENGAGEMENT) continue;
    const multiplier = postEngagement / hotelMed;
    if (multiplier < OUTLIER_THRESHOLD) continue;
    standout.push({
      post_id:       p.post_id,
      hotel_name:    nameByHandle[p.instagram_handle] ?? p.instagram_handle,
      hotel_country: countryByHandle[p.instagram_handle] ?? null,
      type:          normalizeType(p.type),
      likes_count:   p.likes_count,
      comments_count: p.comments_count ?? 0,
      image_url:     p.image_url,
      caption:       (p.caption ?? '').slice(0, 1200),   // full-ish caption for context
      multiplier,
      // richer context so the model can reason about WHY it outperformed
      followers:          latestFollowers[p.instagram_handle] ?? null,
      typical_engagement: Math.round(hotelMed),           // the hotel's usual likes+comments
      posted_at:          p.posted_at,
      is_collab:          (p.coauthor_usernames?.length ?? 0) > 0,
      // full media (raw CDN URLs captured at scrape) for whole-carousel / whole-video analysis
      child_image_urls:   p.child_image_urls ?? null,
      video_url:          p.video_url ?? null,
    });
  }
  standout.sort((a, b) => b.multiplier - a.multiplier);

  return {
    top10: standout.slice(0, MAX_STANDOUT),
    categoryER:    (categoryER ? categoryER * 100 : 0).toFixed(2),
    topHotelName:  nameByHandle[topHotel?.handle] ?? topHotel?.handle,
    topHotelER:    topHotel?.medianER ? (topHotel.medianER * 100).toFixed(2) : null,
    bestFormat:    bestFormat?.label,
    bestFormatER:  bestFormat?.medianER?.toFixed(2),
    standoutCount: standout.length,
    topStandout:   standout[0]
      ? { name: nameByHandle[standout[0].post_id] ?? standout[0].hotel_name, multiplier: standout[0].multiplier.toFixed(1) }
      : null,
    hotelsWithData: hotelMedians.length,
  };
}

// ── AI ────────────────────────────────────────────────────────────────────────

const INSIGHT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    what_it_is:    { type: 'string' },
    why_it_worked: { type: 'string' },
    try_this:      { type: 'string' },
    tag:   { type: 'string', enum: ['Collaboration', 'Notable guest', 'Live moment', 'Craft', 'Organic'] },
    theme: { type: 'string', enum: ['Food & Drink', 'The Property', 'Place & Experience', 'Wellness', 'People', 'Events', 'Other / Brand'] },
  },
  required: ['what_it_is', 'why_it_worked', 'try_this', 'tag', 'theme'],
};

const VOICE = `Voice: measured, concrete, proof-first. British English (colour, favourite). No exclamation marks, no hype, no emoji. Name only what you can actually see in the media or read in the caption — never invent a guest, brand, place, or fact. Hedge honestly: these are correlations, not guarantees.`;

const fmtN = n => (n == null ? '?' : Number(n).toLocaleString('en-GB'));

function buildContext(post) {
  const posted = post.posted_at ? new Date(post.posted_at) : null;
  const when = posted ? posted.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '?';
  return [
    `Hotel: ${post.hotel_name} (${post.hotel_country ?? '?'})`,
    `Followers: ${fmtN(post.followers)}`,
    `Format: ${post.type}${post.is_collab ? ' · collaboration (Instagram co-author tag present)' : ''}`,
    `Performance: ${fmtN(post.likes_count)} likes, ${fmtN(post.comments_count)} comments — ${post.multiplier.toFixed(1)}× this hotel's OWN typical post (its usual is ≈ ${fmtN(post.typical_engagement)} likes+comments).`,
    `Posted: ${when}`,
    `Caption: ${post.caption ? `"${post.caption.replace(/\s+/g, ' ').trim()}"` : '(none)'}`,
  ].join('\n');
}

// Build the ordered image blocks for a post: every carousel slide, or frames
// sampled across the whole video, or the single image. Always falls back to the
// stored cover so a post is never analysed blind.
async function buildMediaBlocks(post) {
  const push = (arr, img) => { if (img) arr.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } }); };
  const coverUrl = post.stored_image_url ?? post.image_url;
  const blocks = [];

  if (post.type === 'Carousel' && Array.isArray(post.child_image_urls) && post.child_image_urls.length) {
    const imgs = await Promise.all(post.child_image_urls.slice(0, CAROUSEL_MAX).map(u => fetchImageAsBase64(u)));
    imgs.forEach(i => push(blocks, i));
    if (!blocks.length) push(blocks, await fetchImageAsBase64(coverUrl));
    return { blocks, note: `a carousel of ${blocks.length} slide${blocks.length === 1 ? '' : 's'}, shown in order` };
  }

  if ((post.type === 'Reel' || post.type === 'Video') && post.video_url) {
    const frames = await extractVideoFrames(post.video_url);
    frames.forEach(f => push(blocks, f));
    if (!blocks.length) push(blocks, await fetchImageAsBase64(coverUrl));
    return { blocks, note: blocks.length > 1 ? `${blocks.length} frames sampled evenly across the whole video, in time order` : 'the video cover frame only (full video unavailable)' };
  }

  push(blocks, await fetchImageAsBase64(coverUrl));
  return { blocks, note: 'a single image' };
}

async function generateOnePostInsight(post) {
  const instructions = `You are the analyst for Content Radar, a weekly Instagram intelligence product for luxury hotels. This post significantly beat its OWN hotel's usual engagement. Write the editor's note a hotel marketing team will read.

You are shown ${post._mediaNote}. Study all of it before answering.

${VOICE}

${buildContext(post)}

Return:
- what_it_is: one concrete sentence — what the post actually is, from the media and caption.
- why_it_worked: one or two sentences on why THIS post outperformed this hotel's own baseline. Tie the creative choice (framing, pacing, sequence, subject, timing) to the numbers. Be specific, not generic.
- try_this: one sentence a hotel marketer could act on to replicate the effect.
- tag: Collaboration (co-branded with another hotel/brand/creator) | Notable guest (visiting public figure) | Live moment (seasonal/cultural/trending event) | Craft (culinary/design/service excellence) | Organic (genuine story, no external hook).
- theme: Food & Drink | The Property (rooms, architecture, art) | Place & Experience (destination, activities, views) | Wellness | People | Events | Other / Brand (quote cards, graphics, reshares — escape hatch only).`;

  const content = post._imageBlocks.length
    ? [...post._imageBlocks, { type: 'text', text: instructions }]
    : instructions;
  try {
    const r = await callClaudeStructured(content, INSIGHT_SCHEMA);
    const note = [
      `What it is: ${r.what_it_is}`,
      `Why it worked: ${r.why_it_worked}`,
      // Dashboard renders this as "Consider this" (the AI insight card); keep the
      // label in sync so freshly-generated notes need no re-parsing rename.
      `Consider this: ${r.try_this}`,
    ].join('\n');
    return { insight: note, tag: r.tag ?? null, theme: r.theme ?? null };
  } catch (e) {
    console.warn(`  insight failed for ${post.post_id}: ${e.message}`);
    return { insight: null, tag: null, theme: null };
  }
}

// Bounded-concurrency map — caps simultaneous video downloads / ffmpeg / API calls.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function generatePostInsights(posts) {
  if (!posts.length) return [];
  return mapLimit(posts, 4, async (p) => {
    const { blocks, note } = await buildMediaBlocks(p);
    return generateOnePostInsight({ ...p, _imageBlocks: blocks, _mediaNote: note });
  });
}

// Weekly prose/takeaways generation removed 2026-07-01 — the redesigned
// dashboard computes its own summary lines and never read the insights table.

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Ensuring storage bucket exists…');
  await ensureBucket();

  console.log('\nPulling data from Supabase…');
  const { top10, ...numbers } = await getData();
  console.log(`Top non-collab breakouts this week: ${top10.length}`);
  console.log('Numbers:', JSON.stringify(numbers, null, 2));

  console.log('\nUploading standout images to storage…');
  const enriched = await Promise.all(top10.map(async p => {
    if (!p.image_url) { console.log(`  ${p.post_id}: no image`); return { ...p, stored_image_url: null }; }
    process.stdout.write(`  ${p.post_id}: `);
    const url = await uploadImage(p.post_id, p.image_url);
    console.log(url ? 'uploaded' : 'failed');
    return { ...p, stored_image_url: url };
  }));

  console.log('\nGenerating per-post insights…');
  const insights = await generatePostInsights(enriched);

  console.log('\nUpserting standout_posts table…');
  for (let i = 0; i < enriched.length; i++) {
    const p   = enriched[i];
    const ins = insights[i] ?? {};
    const { error } = await sb.from('standout_posts').upsert({
      post_id:          p.post_id,
      stored_image_url: p.stored_image_url,
      post_insight:     ins.insight ?? null,
      driver_tag:       ins.tag ?? null,
      theme_tag:        ins.theme ?? null,
      updated_at:       new Date().toISOString(),
    });
    if (error) console.warn(`  ${p.post_id}: upsert failed — ${error.message}`);
    else console.log(`  ${p.post_id}: "${ins.insight}" [${ins.tag}] [${ins.theme}]`);
  }

  console.log(`\nDone — ${enriched.length} standout posts enriched.`);
}

main().catch(err => { console.error(err); process.exit(1); });
