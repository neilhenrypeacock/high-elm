import 'dotenv/config';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { normalizeLikesCount } from './likes.js';
import { assertSucceeded } from './scrape-outcome.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });

const ACTOR_POSTS    = 'apify/instagram-post-scraper';
const ACTOR_PROFILES = 'apify/instagram-profile-scraper';
const BUCKET         = 'standout-images';

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseHashtags(caption = '') {
  return [...caption.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase());
}

function parseMentions(caption = '') {
  return [...caption.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase());
}

// Instagram's native co-author tag ("X and Y" byline). The post scraper returns
// it as `coauthorProducers: [{ username, full_name, is_verified, ... }]`. This is
// ground-truth collab data — and unlike the caption/cross-grid heuristics it also
// catches collabs with UNTRACKED accounts. We keep just the lowercased handles.
// Returns null (not []) when absent so "unknown" stays distinct from "none".
function parseCoauthors(item) {
  const raw = item?.coauthorProducers;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const handles = raw
    .map(c => (c?.username || '').toLowerCase().trim())
    .filter(Boolean);
  return handles.length ? [...new Set(handles)] : null;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  });
  if (error && !error.message.toLowerCase().includes('already exists')) {
    throw new Error(`Storage bucket error: ${error.message}`);
  }
}

// Downloads imageUrl, re-encodes it small, and uploads to Supabase Storage.
// Returns permanent public URL on success, or null so the caller can fall back
// to the raw CDN URL.
//
// WHY THE RE-ENCODE (2026-07-30): we used to store Instagram's full-resolution
// file byte-for-byte — ~329 kB each, which put the bucket 3.2× over the 1 GB
// free-tier limit. The dashboard never renders an image wider than a ~400px box
// (800px on a 2× display), so IMAGE_MAX_WIDTH at WebP q80 costs ~70-90 kB for
// no visible loss. `rotate()` with no argument applies the EXIF orientation
// before we strip metadata, otherwise some phone-shot uploads come out sideways.
const IMAGE_MAX_WIDTH = 1000;
const IMAGE_QUALITY   = 80;

async function uploadImage(postId, imageUrl) {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const original = Buffer.from(await res.arrayBuffer());

    let buffer = original;
    let contentType = 'image/webp';
    let ext = 'webp';
    try {
      buffer = await sharp(original)
        .rotate()
        .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: IMAGE_QUALITY })
        .toBuffer();
    } catch (e) {
      // Un-decodable image (rare). Store the original rather than lose the post's
      // media entirely — the cleanup script will drop it if it never renders.
      console.warn(`  resize failed for ${postId}, storing original: ${e.message}`);
      contentType = res.headers.get('content-type') ?? 'image/jpeg';
      ext = contentType.includes('png') ? 'png' : 'jpg';
    }

    const path = `${postId}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
    if (error) { console.warn(`  upload failed for ${postId}: ${error.message}`); return null; }

    // Older runs wrote `<postId>.jpg`/`.png`. Now that this post lives at .webp,
    // drop the superseded object so re-scrapes don't leave a full-size orphan.
    if (ext === 'webp') {
      await supabase.storage.from(BUCKET).remove([`${postId}.jpg`, `${postId}.png`]).catch(() => {});
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.warn(`  image error for ${postId}: ${e.message}`);
    return null;
  }
}

// ─── DB writes ────────────────────────────────────────────────────────────────

async function saveProfile(profile) {
  const { error } = await supabase.from('profile_snapshots').insert(profile);
  if (error) throw new Error(`profile_snapshots insert failed: ${error.message}`);
}

// profile_snapshots is INSERT-only (a growing history), so a re-run — e.g.
// retrying a failed batch the same day — would otherwise add a duplicate row
// per hotel. posts/image upserts are naturally idempotent; this check makes
// snapshots match: any handle already snapshotted since UTC midnight is
// skipped. Fails open (empty set) so a check error never blocks a scrape.
async function snapshotsCapturedToday(handles) {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('profile_snapshots')
    .select('instagram_handle')
    .in('instagram_handle', handles)
    .gte('captured_at', midnight.toISOString());
  if (error) {
    console.warn(`  snapshot dedupe check failed (${error.message}) — proceeding without`);
    return new Set();
  }
  return new Set((data ?? []).map(r => r.instagram_handle));
}

async function savePosts(posts) {
  if (!posts.length) return;
  const { error } = await supabase.from('posts').upsert(posts, {
    onConflict: 'post_id,instagram_handle',
    ignoreDuplicates: false,
  });
  if (error) throw new Error(`posts upsert failed: ${error.message}`);
}

// ─── STEP 1: scrape profiles ──────────────────────────────────────────────────

async function scrapeProfiles(handles) {
  console.log('\n[1/2] Running profile scraper...');
  const run = await apify.actor(ACTOR_PROFILES).call({ usernames: handles });
  console.log(`      Profile actor finished: ${run.status}`);
  assertSucceeded(run, 'Profile');

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  console.log(`      Profile items returned: ${items.length}`);

  // Build a map of handle → profile row
  const profiles = {};
  for (const item of items) {
    const handle = (item.username || item.inputUrl || '').toLowerCase().replace(/.*instagram\.com\//, '').replace(/\/$/, '');
    if (!handle) continue;
    profiles[handle] = {
      instagram_handle: handle,
      followers_count: item.followersCount ?? null,
      follows_count:   item.followingCount ?? null,
      posts_count:     item.postsCount ?? null,
      full_name:       item.fullName ?? null,
      biography:       item.biography ?? null,
      is_verified:     item.verified ?? item.isVerified ?? null,
    };
  }
  return profiles;
}

// ─── STEP 2: scrape posts ─────────────────────────────────────────────────────

async function scrapePosts(handles, resultsLimit, postsNewerThan) {
  console.log('\n[2/2] Running post scraper...');
  const input = {
    username: handles,
    skipPinnedPosts: false,
    dataDetailLevel: 'detailedData',
    // With a date window, onlyPostsNewerThan does the real windowing but we still
    // pass resultsLimit as a per-hotel safety ceiling so a runaway account can't
    // balloon cost. Count-based mode (no window) uses resultsLimit alone.
    ...(postsNewerThan
      ? { onlyPostsNewerThan: postsNewerThan, resultsLimit }
      : { resultsLimit }),
  };
  const run = await apify.actor(ACTOR_POSTS).call(input);
  console.log(`      Post actor finished: ${run.status}`);
  assertSucceeded(run, 'Post');

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  console.log(`      Post items returned: ${items.length}`);

  // Group by the GRID that was queried (inputUrl), NOT the post's owner — a
  // collaboration owned by a partner account (e.g. @jumeirah co-posting on
  // @jumeirahburjalarab's grid) must be attributed to the hotel whose grid it
  // appeared on. inputUrl is the profile the actor actually visited. Falls back
  // to ownerUsername if inputUrl is ever missing.
  const byHandle = {};
  for (const item of items) {
    const fromInput = (item.inputUrl || '').toLowerCase().replace(/.*instagram\.com\//, '').replace(/\/+$/, '');
    const handle = fromInput || (item.ownerUsername || '').toLowerCase();
    if (!handle) continue;
    if (!byHandle[handle]) byHandle[handle] = [];
    byHandle[handle].push(item);
  }
  return byHandle;
}

// ─── main run function ────────────────────────────────────────────────────────

export async function run(handles, { resultsLimit = 30, postsNewerThan = null } = {}) {
  console.log(`\nStarting scrape for ${handles.length} handle(s): ${handles.join(', ')}`);

  await ensureBucket();

  const [profileMap, postsByHandle, alreadySnapped] = await Promise.all([
    scrapeProfiles(handles),
    scrapePosts(handles, resultsLimit, postsNewerThan),
    snapshotsCapturedToday(handles.map(h => h.toLowerCase())),
  ]);

  const summary = {
    profilesLoaded: 0,
    postsLoaded: 0,
    skipped: [],
    sampleProfiles: [],
    samplePosts: [],
  };

  for (const requestedHandle of handles) {
    const h = requestedHandle.toLowerCase();
    const profile = profileMap[h];
    const postItems = postsByHandle[h] || [];

    if (!profile && !postItems.length) {
      console.log(`  ⚠️  No data for @${h}`);
      summary.skipped.push(h);
      continue;
    }

    // Keep every post on the hotel's grid — INCLUDING collaborations owned by a
    // partner account. A co-post appears on each partner's grid and is stored
    // once per grid (composite key post_id + instagram_handle), so it's measured
    // against each hotel's own baseline. If a partner collab is outperforming,
    // it surfaces as a breakout for the hotel it appeared on.
    // Images are uploaded to Supabase Storage in parallel to get permanent URLs.
    const seen = new Set();
    const candidates = postItems;

    const posts = await Promise.all(
      candidates.map(async p => {
        const post_id = p.id || p.shortCode || p.url;
        if (!post_id || seen.has(post_id)) return null;
        seen.add(post_id);

        const caption      = p.caption || '';
        const rawImageUrl  = p.displayUrl || null;
        const storedUrl    = rawImageUrl ? await uploadImage(post_id, rawImageUrl) : null;

        // Full media for the AI analysis (generate-insight.js) — so it sees the
        // WHOLE carousel and the WHOLE video, not just the cover. Raw CDN URLs
        // (they expire); the insight job fetches them right after the scrape.
        // Carousel: Apify returns `images` (all slide display URLs) and/or
        // `childPosts` (per-slide objects). Video/Reel: `videoUrl` is the mp4.
        const childImageUrls = Array.isArray(p.images) && p.images.length
          ? p.images.slice(0, 12)
          : Array.isArray(p.childPosts) && p.childPosts.length
            ? p.childPosts.map(c => c.displayUrl).filter(Boolean).slice(0, 12)
            : null;
        const videoUrl = p.videoUrl
          || (Array.isArray(p.childPosts) ? p.childPosts.find(c => c.videoUrl)?.videoUrl : null)
          || null;

        return {
          post_id,
          instagram_handle: h,
          posted_at:        p.timestamp || null,
          type:             p.type || null,
          // normalizeLikesCount (likes.js): the actor's hidden-likes sentinels
          // (-1, and the `3` preview-count leak) are stored as null, the DB's
          // one convention for "no readable like count".
          likes_count:      normalizeLikesCount(p.likesCount),
          comments_count:   p.commentsCount ?? null,
          caption,
          hashtags:         p.hashtags ?? parseHashtags(caption),
          mentions:         p.mentions ?? parseMentions(caption),
          coauthor_usernames: parseCoauthors(p),
          post_url:         p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : null),
          image_url:        storedUrl ?? rawImageUrl,
          child_image_urls: childImageUrls,
          video_url:        videoUrl,
        };
      })
    ).then(rows => rows.filter(Boolean));

    try {
      if (profile && alreadySnapped.has(h)) {
        console.log(`  ↺  @${h}: snapshot already captured today — not duplicating`);
      } else if (profile) {
        await saveProfile(profile);
      }
      await savePosts(posts);

      summary.profilesLoaded++;
      summary.postsLoaded += posts.length;

      if (summary.sampleProfiles.length < 3 && profile) summary.sampleProfiles.push(profile);
      if (summary.samplePosts.length < 3 && posts[0]) summary.samplePosts.push(posts[0]);

      const followerStr = profile?.followers_count?.toLocaleString() ?? 'no follower data';
      console.log(`  ✅  @${h}: ${followerStr} followers, ${posts.length} posts`);
    } catch (err) {
      console.error(`  ❌  @${h}: ${err.message}`);
      summary.skipped.push(h);
    }
  }

  return summary;
}
