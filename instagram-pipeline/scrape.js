import 'dotenv/config';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

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

// Downloads imageUrl and uploads to Supabase Storage. Returns permanent public
// URL on success, or null so the caller can fall back to the raw CDN URL.
async function uploadImage(postId, imageUrl) {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const ct     = res.headers.get('content-type') ?? 'image/jpeg';
    const ext    = ct.includes('png') ? 'png' : 'jpg';
    const path   = `${postId}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: ct, upsert: true });
    if (error) { console.warn(`  upload failed for ${postId}: ${error.message}`); return null; }
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
    ...(postsNewerThan ? { onlyPostsNewerThan: postsNewerThan } : { resultsLimit }),
  };
  const run = await apify.actor(ACTOR_POSTS).call(input);
  console.log(`      Post actor finished: ${run.status}`);

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

  const [profileMap, postsByHandle] = await Promise.all([
    scrapeProfiles(handles),
    scrapePosts(handles, resultsLimit, postsNewerThan),
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

        return {
          post_id,
          instagram_handle: h,
          posted_at:        p.timestamp || null,
          type:             p.type || null,
          likes_count:      p.likesCount ?? null,
          comments_count:   p.commentsCount ?? null,
          caption,
          hashtags:         p.hashtags ?? parseHashtags(caption),
          mentions:         p.mentions ?? parseMentions(caption),
          post_url:         p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : null),
          image_url:        storedUrl ?? rawImageUrl,
        };
      })
    ).then(rows => rows.filter(Boolean));

    try {
      if (profile) await saveProfile(profile);
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
