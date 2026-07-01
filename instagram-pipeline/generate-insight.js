/**
 * generate-insight.js  — run after each weekly scrape
 *   node generate-insight.js
 *
 * 1. Finds the top 15 standout posts (overperformance vs hotel's own median).
 * 2. Downloads their images and stores them in Supabase Storage (permanent URLs).
 * 3. Generates a one-line insight + driver tag per post via Claude.
 * 4. Generates the prose overview + 3 one-line takeaways via Claude.
 * 5. Writes everything to the database so the dashboard reads it at load time.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY        = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error('Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY in .env');
  process.exit(1);
}

const sb     = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'standout-images';
const MAX_STANDOUT = 15;
const MIN_ENGAGEMENT       = 100;  // p30 of portfolio; filters micro-engagement noise
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

async function callClaude(prompt, maxTokens = 512) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return (await res.json()).content[0].text.trim();
}

// Send multi-modal content (image + text) to Claude Vision.
async function callClaudeWithContent(content, maxTokens = 512) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return (await res.json()).content[0].text.trim();
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
      .select('post_id, instagram_handle, likes_count, comments_count, type, posted_at, image_url, post_url, caption')
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

  const { data: hotels } = await sb.from('hotels').select('name, country, instagram_handle');
  const nameByHandle    = Object.fromEntries((hotels ?? []).map(h => [h.instagram_handle, h.name]));
  const countryByHandle = Object.fromEntries((hotels ?? []).map(h => [h.instagram_handle, h.country]));

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

  // Standout posts — last 7 days, ≥ 2× hotel absolute engagement median, ≥ MIN_ENGAGEMENT floor
  const now    = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const standout = [];

  for (const p of valid) {
    if (now - new Date(p.posted_at).getTime() > weekMs) continue;
    const postEngagement = p.likes_count + (p.comments_count ?? 0);
    if (postEngagement < MIN_ENGAGEMENT) continue;
    const hotelMed = median(hotelPostEngagements[p.instagram_handle] ?? []);
    if (!hotelMed) continue;
    const multiplier = postEngagement / hotelMed;
    if (multiplier < 2) continue;
    standout.push({
      post_id:       p.post_id,
      hotel_name:    nameByHandle[p.instagram_handle] ?? p.instagram_handle,
      hotel_country: countryByHandle[p.instagram_handle] ?? null,
      type:          normalizeType(p.type),
      likes_count:   p.likes_count,
      comments_count: p.comments_count ?? 0,
      image_url:     p.image_url,
      caption:       (p.caption ?? '').slice(0, 200),
      multiplier,
    });
  }
  standout.sort((a, b) => b.multiplier - a.multiplier);

  return {
    top15: standout.slice(0, MAX_STANDOUT),
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

async function generateOnePostInsight(post) {
  const cap     = post.caption ? `"${post.caption.replace(/\n/g, ' ')}"` : '(no caption)';
  const textCtx = `Hotel: ${post.hotel_name} (${post.hotel_country ?? '?'})
Post type: ${post.type}
Likes: ${post.likes_count.toLocaleString()} | Multiplier: ${post.multiplier.toFixed(1)}× hotel's own median
Caption: ${cap}`;

  const instructions = `You are writing a micro-insight for a luxury hotel Instagram intelligence dashboard.

Write a JSON object with exactly three fields:
- "insight": ONE plain-English sentence (max 12 words) describing what this specific post was about, inferred from the image and caption. Be concrete and specific — name what you see.
- "tag": ONE of exactly: "Collaboration" | "Notable guest" | "Live moment" | "Craft" | "Organic"
  Collaboration = co-branded with another hotel, brand, or creator. Notable guest = visiting celebrity, chef, athlete, or public figure. Live moment = seasonal, cultural, or trending event. Craft = showcasing culinary, design, or service excellence. Organic = genuine guest story or no obvious external hook.
- "theme": ONE of exactly: "Food & Drink" | "The Property" | "Place & Experience" | "Wellness" | "People" | "Events" | "Other / Brand"
  Food & Drink = restaurants, chefs, plated dishes, the bar, afternoon tea, wine.
  The Property = the physical place: rooms, suites, lobby, architecture, design, art.
  Place & Experience = destination and activities: landscape, views, skiing, golf, excursions, classes.
  Wellness = spa, treatments, pools, fitness, the restore/switch-off angle.
  People = guests, staff, a notable visitor, a human moment; subject is a person.
  Events = weddings, parties, seasonal openings, celebrations, launches.
  Other / Brand = genuine misfits only: quote cards, anniversary graphics, reshares. Only use when nothing else genuinely fits — this is the escape hatch, not the default. Rule: pick the single dominant theme. Never invent a new theme.

${textCtx}

Return ONLY valid JSON, no markdown:
{"insight": "...", "tag": "...", "theme": "..."}`;

  // Attempt vision call if we have a stored image (base64)
  let raw;
  if (post._imageBase64 && post._imageMediaType) {
    const content = [
      {
        type: 'image',
        source: { type: 'base64', media_type: post._imageMediaType, data: post._imageBase64 },
      },
      { type: 'text', text: instructions },
    ];
    try {
      raw = await callClaudeWithContent(content, 300);
    } catch (e) {
      console.warn(`  vision call failed for ${post.post_id}: ${e.message} — falling back to text`);
      raw = await callClaude(instructions, 200);
    }
  } else {
    raw = await callClaude(instructions, 200);
  }

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no object');
    const parsed = JSON.parse(match[0]);
    if (!parsed.insight || !parsed.tag) throw new Error('missing fields');
    return { insight: parsed.insight, tag: parsed.tag, theme: parsed.theme ?? null };
  } catch (e) {
    console.warn(`  parse failed for ${post.post_id}: ${e.message}`);
    return { insight: null, tag: null, theme: null };
  }
}

async function generatePostInsights(posts) {
  if (!posts.length) return [];

  // Download all images in parallel first
  const withImages = await Promise.all(posts.map(async p => {
    if (!p.stored_image_url && !p.image_url) return { ...p, _imageBase64: null, _imageMediaType: null };
    const imageUrl = p.stored_image_url ?? p.image_url;
    const result   = await fetchImageAsBase64(imageUrl);
    return {
      ...p,
      _imageBase64:    result?.base64    ?? null,
      _imageMediaType: result?.mediaType ?? null,
    };
  }));

  // Process each post individually in parallel via Vision
  const insights = await Promise.all(withImages.map(p => generateOnePostInsight(p)));
  return insights;
}

// Weekly prose/takeaways generation removed 2026-07-01 — the redesigned
// dashboard computes its own summary lines and never read the insights table.

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Ensuring storage bucket exists…');
  await ensureBucket();

  console.log('\nPulling data from Supabase…');
  const { top15, ...numbers } = await getData();
  console.log(`Standout posts this week: ${top15.length}`);
  console.log('Numbers:', JSON.stringify(numbers, null, 2));

  console.log('\nUploading standout images to storage…');
  const enriched = await Promise.all(top15.map(async p => {
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
