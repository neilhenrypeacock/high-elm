// compress-images.js — re-encode everything already in `standout-images`.
//
// WHY (2026-07-30): every object written before this date is Instagram's
// full-resolution file stored byte-for-byte (~329 kB each). scrape.js now
// resizes + WebP-encodes on the way in, but that only helps NEW posts. This is
// the one-off backfill for the existing bucket. Run it after cleanup-images.js
// so you only pay to re-encode the objects you're actually keeping.
//
// IN-PLACE, SAME PATH. An object stays at `<postId>.jpg` even though its bytes
// are now WebP — only the Content-Type changes, which is what browsers actually
// dispatch on. Doing it this way means NOT ONE URL changes, so `posts.image_url`
// and `standout_posts.stored_image_url` need no rewrite and there is no window
// where a renamed object leaves a dead link on the dashboard. Objects written
// from here on by scrape.js are correctly named `.webp`; these keep the old
// extension until their post is re-scraped, which is cosmetic only.
//
//   node compress-images.js            # dry run: samples 20, projects the saving
//   node compress-images.js --apply    # re-encode the whole bucket

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET          = 'standout-images';
const IMAGE_MAX_WIDTH = 1000;  // keep in step with scrape.js
const IMAGE_QUALITY   = 80;
const PAGE            = 1000;
const CONCURRENCY     = 8;
const SAMPLE          = 20;
// Anything at or below this is too small to be worth the round trip.
const SKIP_UNDER      = 120 * 1024;

const APPLY = process.argv.includes('--apply');

const mb = bytes => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

async function listAllObjects() {
  const objects = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET)
      .list('', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`storage list: ${error.message}`);
    objects.push(...data);
    if (data.length < PAGE) return objects;
  }
}

// Returns { before, after } byte counts, or null if the object was skipped/failed.
async function recompress(obj, { write }) {
  const before = obj.metadata?.size ?? 0;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(obj.name);
    if (error) throw new Error(error.message);
    const original = Buffer.from(await data.arrayBuffer());

    const buffer = await sharp(original)
      .rotate()
      .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: IMAGE_QUALITY })
      .toBuffer();

    // Never make an object bigger — some already-small images inflate under a
    // re-encode, and there is nothing to gain by writing those back.
    if (buffer.length >= before) return { before, after: before, skipped: true };

    if (write) {
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(obj.name, buffer, { contentType: 'image/webp', upsert: true });
      if (upErr) throw new Error(upErr.message);
    }
    return { before, after: buffer.length };
  } catch (e) {
    console.warn(`\n  skipped ${obj.name}: ${e.message}`);
    return null;
  }
}

// Simple fixed-size worker pool — the bucket has thousands of objects and firing
// them all at once just gets us rate-limited.
async function pool(items, worker) {
  const results = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }));
  return results;
}

async function main() {
  console.log(APPLY ? '⚠  APPLY MODE — objects will be overwritten\n' : 'Dry run (pass --apply to write)\n');

  console.log('Listing bucket…');
  const all = await listAllObjects();
  // Skip anything already WebP: this script is the only thing that writes WebP
  // into old-extension paths, so its own output is self-identifying. Without
  // this a second run re-encodes everything it just did — 1,240 downloads for
  // ~9 MB of rounding. Size alone isn't the signal; a big image stays big.
  const targets = all.filter(o =>
    (o.metadata?.size ?? 0) > SKIP_UNDER && o.metadata?.mimetype !== 'image/webp'
  );
  const totalBytes = all.reduce((n, o) => n + (o.metadata?.size ?? 0), 0);

  console.log(`  ${all.length} objects, ${mb(totalBytes)}`);
  console.log(`  ${targets.length} above ${Math.round(SKIP_UNDER / 1024)} kB and not yet WebP\n`);

  if (!targets.length) { console.log('Nothing to do.'); return; }

  if (!APPLY) {
    const sample = targets.slice(0, SAMPLE);
    console.log(`Sampling ${sample.length} to project the saving…`);
    const done = (await pool(sample, o => recompress(o, { write: false }))).filter(Boolean);
    const before = done.reduce((n, r) => n + r.before, 0);
    const after  = done.reduce((n, r) => n + r.after, 0);
    const ratio  = after / before;
    console.log(`\n  sample: ${mb(before)} → ${mb(after)}  (${(ratio * 100).toFixed(0)}% of original)`);
    const projected = totalBytes - targets.reduce((n, o) => n + (o.metadata?.size ?? 0), 0) * (1 - ratio);
    console.log(`  projected bucket: ${mb(totalBytes)} → ~${mb(projected)}`);
    console.log('\nDry run — nothing written. Re-run with --apply.');
    return;
  }

  console.log('Re-encoding…');
  let n = 0, before = 0, after = 0;
  const results = await pool(targets, async o => {
    const r = await recompress(o, { write: true });
    n++;
    if (n % 25 === 0) process.stdout.write(`\r  ${n}/${targets.length}`);
    return r;
  });
  for (const r of results.filter(Boolean)) { before += r.before; after += r.after; }

  console.log(`\n\nDone. ${mb(before)} → ${mb(after)}, freed ~${mb(before - after)}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
