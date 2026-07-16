/**
 * set-insight.js — manually set an Editor's note, Editor's Pick, and/or the
 * feature-on-homepage flag on a post.
 *
 *   node set-insight.js <post_id> --insight "What it is… Why it worked… Try this…"
 *   node set-insight.js <post_id> --pick
 *   node set-insight.js <post_id> --unpick
 *   node set-insight.js <post_id> --feature      # pin to front of the homepage taster
 *   node set-insight.js <post_id> --unfeature
 *   node set-insight.js <post_id> --insight "…" --pick --feature
 *
 * Upserts into standout_posts (post_id is the primary key), touching only the
 * fields you pass — an existing stored image / other fields are left intact.
 * The dashboard reads post_insight + editors_pick + landing_pin at load time and
 * renders the "Editor's note" callout, the "Editor's Pick" badge, and forces any
 * featured post to the front of the public landing taster (hero + open cards).
 *
 * This is the write path for the weekly "show this week's breakouts → dictate the
 * angle → save" flow. Run after the scrape. Requires editors_pick to exist
 * (setup-editors-pick.sql) before --pick/--unpick, and landing_pin
 * (setup-landing-pin.sql) before --feature/--unfeature will work.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const [postId, ...rest] = process.argv.slice(2);
if (!postId || postId.startsWith('--')) {
  console.error('Usage: node set-insight.js <post_id> [--insight "…"] [--pick | --unpick] [--feature | --unfeature]');
  process.exit(1);
}

const row = { post_id: postId };
for (let i = 0; i < rest.length; i++) {
  const arg = rest[i];
  if (arg === '--insight')          row.post_insight = rest[++i] ?? '';
  else if (arg === '--pick')        row.editors_pick = true;
  else if (arg === '--unpick')      row.editors_pick = false;
  else if (arg === '--feature')     row.landing_pin = true;
  else if (arg === '--unfeature')   row.landing_pin = false;
  else { console.error(`Unknown argument: ${arg}`); process.exit(1); }
}

if (Object.keys(row).length === 1) {
  console.error('Nothing to set. Pass --insight "…" and/or --pick / --unpick and/or --feature / --unfeature.');
  process.exit(1);
}

const { error } = await sb.from('standout_posts').upsert(row, { onConflict: 'post_id' });
if (error) {
  console.error(`Upsert failed for ${postId}: ${error.message}`);
  process.exit(1);
}
console.log(`✓ standout_posts[${postId}] set: ${Object.keys(row).filter(k => k !== 'post_id').join(', ')}`);
