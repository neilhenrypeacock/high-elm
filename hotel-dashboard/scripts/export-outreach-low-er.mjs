#!/usr/bin/env node
/**
 * Export a batch of hotels for contact-finding, ordered by LOWEST engagement
 * rate — the hotels with a real audience whose posts aren't landing.
 *
 * READ-ONLY. Sibling to export-outreach-batch.mjs, which orders by posting
 * activity instead. Neither touches breakout, baseline or threshold logic, and
 * nothing here should ever be imported by the app: the ER computed below is for
 * outreach triage only, and is deliberately its own local calculation.
 *
 * ER method (mirrors the leaderboard's definition in lib/data.ts):
 *   median of (likes + comments) / followers, over the hotel's most recent 30
 *   posts with a VISIBLE like count, within the last 90 days.
 *
 * Hidden like counts — the reason this script exists in the shape it does.
 * Instagram hides likes on a growing share of posts. The scraper writes three
 * different sentinels for that, and only two are documented:
 *   - likes_count = null  (952 rows)
 *   - likes_count = -1    (118 rows)
 *   - likes_count = 3     (813 rows)  <-- UNDOCUMENTED
 * The third is unmistakable in the distribution: exactly 3 likes occurs 813
 * times while 1 occurs 0 times, 2 twice and 4 three times — a 200x spike at a
 * single value. 112 of those rows carry more than 20 comments (one has 468),
 * which no genuine 3-like post does. Counting them as real drags a hotel's
 * median ER to near zero and puts whoever the scraper failed on at the top of a
 * "lowest ER" list. Before this exclusion the top of this very batch was
 * Mandarin Oriental Paris at 0.003% and Ashford Castle at 0.014%; after it,
 * Ashford Castle sits 49th at 0.427%.
 *
 * NB `hasVisibleLikes` in lib/data.ts filters null and -1 but NOT 3, so the
 * product itself is still counting these rows. That is a separate fix and is
 * deliberately not made here.
 *
 * Usage:
 *   node scripts/export-outreach-low-er.mjs
 *   node scripts/export-outreach-low-er.mjs --limit 30 --countries "France,Italy"
 *
 * Credentials come from ../keys/.env.supabase (SUPABASE_URL + a key).
 */
import fs from 'node:fs';
import path from 'node:path';

const ARGV = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = ARGV.indexOf(`--${name}`);
  return i === -1 ? fallback : ARGV[i + 1];
};

const DEFAULT_COUNTRIES = 'United Kingdom,Ireland,France,Germany,Italy,Spain,' +
  'Netherlands,Switzerland,Austria,Belgium,Portugal';
// --region takes precedence over --countries when passed (e.g. --region Europe).
const REGION = (arg('region', '') || '').trim().toLowerCase();
const COUNTRIES = arg('countries', DEFAULT_COUNTRIES)
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const LIMIT = Number(arg('limit', '50')) || Infinity;
const OUT = arg('out', 'outreach/apollo-batch-02-europe-low-er.csv');
// Drop everything on a shared brand domain — a contact lookup on those returns
// the group's head office, not the property's own social lead.
const INDEPENDENT_ONLY = ARGV.includes('--independent-only');
// hotels.tracked is the pipeline's scraping scope, not an outreach scope. An
// untracked hotel can still be a good target — it just isn't in the product yet.
const INCLUDE_UNTRACKED = ARGV.includes('--include-untracked');
// Block the UK first, then everyone else; lowest ER first inside each block.
const UK_FIRST = ARGV.includes('--uk-first');

const ACTIVITY_DAYS = 90;   // window for both the post count and the ER sample
const ER_POSTS = 30;        // most recent N visible-like posts, as the leaderboard does
const MIN_FOLLOWERS = 30;   // sanity floor; non-binding on tracked luxury hotels
const MIN_POSTS_90D = 5;    // enough recent activity to be worth contacting
const MIN_VALID_POSTS = 5;  // enough VISIBLE-like posts for the median to mean anything

// ---------- credentials ----------
function findEnvFile(start) {
  for (let dir = start; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'keys', '.env.supabase');
    if (fs.existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) return null;
  }
}
const ENV_PATH = findEnvFile(import.meta.dirname);
if (!ENV_PATH) {
  console.error('Could not find keys/.env.supabase in any parent directory.');
  process.exit(1);
}
const env = Object.fromEntries(
  fs.readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);
const BASE = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
if (!BASE || !KEY) {
  console.error('SUPABASE_URL and a key are required in keys/.env.supabase');
  process.exit(1);
}
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function fetchAll(table, select, extra = '') {
  const rows = [];
  const page = 1000;
  for (let offset = 0; ; offset += page) {
    const url = `${BASE}/rest/v1/${table}?select=${select}${extra}&limit=${page}&offset=${offset}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`${table} -> ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < page) break;
  }
  return rows;
}

// ---------- helpers ----------
const norm = h => (h ?? '').trim().toLowerCase().replace(/^@/, '').replace(/\/+$/, '');

/** The three hidden-like sentinels. See the header comment. */
const isHiddenLikes = likes => likes === null || likes === -1 || likes === 3;

const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function rootDomain(website) {
  try { return new URL(website).hostname.replace(/^www\./i, ''); } catch { return ''; }
}
function isDeepPath(website) {
  try { return new URL(website).pathname.split('/').filter(Boolean).length > 0; } catch { return false; }
}
const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Accreditation pins, read straight out of the generated map the app uses, so
 * the CSV can't drift from what a hotel's page shows. Parsed rather than
 * imported — this is a .mjs script and the map is a .ts module.
 */
function loadAccreditations() {
  const file = path.join(import.meta.dirname, '..', 'lib', 'accreditations.generated.ts');
  const map = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*"([^"]+)":\s*\[(.*)\],\s*$/);
    if (!m) continue;
    map.set(m[1], [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1]));
  }
  return map;
}

// ---------- pull ----------
const [hotels, posts, snapshots] = await Promise.all([
  fetchAll('hotels', 'id,name,instagram_handle,country,region,website,sources,tracked,hidden'),
  fetchAll('posts', 'instagram_handle,posted_at,likes_count,comments_count'),
  fetchAll('profile_snapshots', 'instagram_handle,followers_count,captured_at', '&order=captured_at.desc'),
]);
const accreditations = loadAccreditations();

// latest follower snapshot per handle
const followers = new Map();
for (const s of snapshots) {
  const h = norm(s.instagram_handle);
  if (!followers.has(h)) followers.set(h, s.followers_count);
}

// per-handle activity within the window
const cutoff = Date.now() - ACTIVITY_DAYS * 86_400_000;
const activity = new Map();
for (const p of posts) {
  const h = norm(p.instagram_handle);
  if (!h) continue;
  const at = Date.parse(p.posted_at);
  if (!Number.isFinite(at) || at < cutoff) continue;
  const e = activity.get(h) ?? { posts90: 0, hidden: 0, visible: [] };
  e.posts90 += 1;
  if (isHiddenLikes(p.likes_count)) e.hidden += 1;
  else e.visible.push({ at, engagement: (p.likes_count ?? 0) + (p.comments_count ?? 0) });
  activity.set(h, e);
}

// how many hotels in the WHOLE table share each root domain
const domainUse = new Map();
for (const h of hotels) {
  const d = rootDomain(h.website ?? '');
  if (d) domainUse.set(d, (domainUse.get(d) ?? 0) + 1);
}
/**
 * Three bands, not two — the batch-01 script collapsed the last two into
 * `group`, which is too blunt once you need volume:
 *
 *   group                 shared root domain. 27 hotels sit on
 *                         mandarinoriental.com; a lookup returns the group.
 *   independent-deep-path own unshared domain, but the URL is a sub-page
 *                         (/en/properties/x). Sometimes a brand site with only
 *                         one property in our table (beaumier.com,
 *                         montecarlosbm.com), sometimes just a hotel that links
 *                         its English page (sirenuse.it/en/, sacher.com/en/).
 *                         The URL alone can't tell them apart — eyeball these.
 *   independent           own unshared domain, root URL. Safe to bulk-upload.
 */
const ownershipOf = h => {
  if ((domainUse.get(rootDomain(h.website)) ?? 1) > 1) return 'group';
  return isDeepPath(h.website) ? 'independent-deep-path' : 'independent';
};

// ---------- measure ----------
const inScope = hotels.filter(h => {
  if (!INCLUDE_UNTRACKED && h.tracked !== true) return false;
  return REGION
    ? (h.region ?? '').trim().toLowerCase() === REGION
    : COUNTRIES.includes((h.country ?? '').trim().toLowerCase());
});

const measured = inScope.map(h => {
  const key = norm(h.instagram_handle);
  const followerCount = followers.get(key) ?? 0;
  const a = activity.get(key) ?? { posts90: 0, hidden: 0, visible: [] };
  const sample = [...a.visible].sort((x, y) => y.at - x.at).slice(0, ER_POSTS);
  const er = followerCount > 0 && sample.length
    ? median(sample.map(v => v.engagement / followerCount))
    : null;
  return { h, followerCount, posts90: a.posts90, hidden: a.hidden, validN: sample.length, er };
});

const rejected = [];
const eligible = measured.filter(r => {
  const why =
    !(r.h.website ?? '').trim() ? 'no website' :
    // profile_snapshots only covers tracked hotels, so an untracked hotel has no
    // follower count at all. That is "unmeasurable", not "small" — ER needs a
    // denominator. Flip the hotel to tracked and the next scrape gives it one.
    r.followerCount === 0 ? 'no follower snapshot (untracked → no ER denominator)' :
    r.followerCount < MIN_FOLLOWERS ? `followers < ${MIN_FOLLOWERS}` :
    r.posts90 < MIN_POSTS_90D ? `posts_90d < ${MIN_POSTS_90D}` :
    r.validN < MIN_VALID_POSTS ? `only ${r.validN} visible-like posts (${r.hidden} hidden)` :
    r.er === null ? 'no computable ER' :
    INDEPENDENT_ONLY && ownershipOf(r.h) === 'group'
      ? `group-run (${domainUse.get(rootDomain(r.h.website))} hotels on ${rootDomain(r.h.website)})` : null;
  if (why) rejected.push({ ...r, why });
  return !why;
});

const isUK = r => (r.h.country ?? '').trim().toLowerCase() === 'united kingdom';
eligible.sort((a, b) =>
  (UK_FIRST ? (isUK(b) - isUK(a)) : 0) ||
  a.er - b.er ||
  b.followerCount - a.followerCount
);
const selected = eligible.slice(0, LIMIT);

// ---------- write ----------
// `tracked` is appended to the batch-02 header set: with --include-untracked in
// play, whether a row is live in the product is information the CSV must carry.
const COLUMNS = [
  'hotel_id', 'instagram_handle', 'hotel_name', 'root_domain', 'website',
  'followers_count', 'er_median', 'posts_last_90d', 'ownership',
  'hotels_sharing_domain', 'accreditations', 'sources', 'country', 'region',
  'tracked',
];
const toRow = r => [
  r.h.id,
  r.h.instagram_handle,
  r.h.name,
  rootDomain(r.h.website),
  r.h.website,
  r.followerCount,
  // percentage, 3 dp — 0.093 means 0.093% of followers engage with a median post
  (r.er * 100).toFixed(3),
  r.posts90,
  ownershipOf(r.h),
  domainUse.get(rootDomain(r.h.website)) ?? 1,
  (accreditations.get(norm(r.h.instagram_handle)) ?? []).join('; '),
  r.h.sources ?? '',
  r.h.country,
  r.h.region,
  r.h.tracked === true ? 'yes' : 'no',
].map(csvCell).join(',');

const outPath = path.resolve(process.cwd(), OUT);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, [COLUMNS.join(','), ...selected.map(toRow)].join('\n') + '\n');

// ---------- report ----------
const hiddenTotal = inScope.reduce((n, h) => n + (activity.get(norm(h.instagram_handle))?.hidden ?? 0), 0);
const postsTotal = inScope.reduce((n, h) => n + (activity.get(norm(h.instagram_handle))?.posts90 ?? 0), 0);

console.log(`Scope            : ${REGION ? `region = ${REGION}` : `${COUNTRIES.length} countries`}` +
  `${INCLUDE_UNTRACKED ? ', tracked + untracked' : ', tracked only'}` +
  `${INDEPENDENT_ONLY ? ', independent only' : ''}`);
console.log(`Hotels in scope  : ${inScope.length}`);
console.log(`Hidden-like posts: ${hiddenTotal} of ${postsTotal} in the 90d window (${(hiddenTotal / postsTotal * 100).toFixed(1)}%) — excluded from ER`);
console.log(`Eligible         : ${eligible.length}`);
console.log(`Exported         : ${selected.length} -> ${OUT}`);
if (selected.length < LIMIT && LIMIT !== Infinity) {
  console.log(`\n⚠ Asked for ${LIMIT}, the data only yields ${selected.length}. Nothing was padded.`);
}

const tally = xs => Object.entries(xs.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {}))
  .sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');

if (rejected.length) {
  const bucket = r =>
    r.why.startsWith('group-run') ? 'group-run' :
    r.why.startsWith('only ') ? 'too few visible-like posts' : r.why;
  const byReason = rejected.reduce((m, r) => ((m[bucket(r)] ??= []).push(r), m), {});
  console.log(`\nRejected (${rejected.length}): ${tally(rejected.map(bucket))}`);
  // Only the reasons worth eyeballing are listed hotel-by-hotel. The two bulk
  // buckets are a roll-call of the untracked long tail and every chain property.
  const BULK = new Set(['group-run', 'no follower snapshot (untracked → no ER denominator)']);
  for (const [reason, rs] of Object.entries(byReason)) {
    if (BULK.has(reason)) { console.log(`  ${reason}: ${rs.length} hotels (not listed)`); continue; }
    console.log(`  ${reason}:`);
    for (const r of rs) console.log(`    ${r.h.name} (${r.h.country}) — ${r.why}`);
  }
}

console.log(`\nOwnership in the export : ${tally(selected.map(r => ownershipOf(r.h)))}`);
console.log(`Tracked in the export   : ${tally(selected.map(r => r.h.tracked === true ? 'tracked' : 'untracked'))}`);
console.log(`Countries in the export : ${tally(selected.map(r => r.h.country))}`);
if (selected.length) {
  const uk = selected.filter(isUK), rest = selected.filter(r => !isUK(r));
  const span = xs => xs.length ? `${(xs[0].er * 100).toFixed(3)}% – ${(xs.at(-1).er * 100).toFixed(3)}%` : '—';
  console.log(`ER range, UK block      : ${span(uk)} (${uk.length} hotels)`);
  console.log(`ER range, rest of Europe: ${span(rest)} (${rest.length} hotels)`);
}

const missing = selected.filter(r => !rootDomain(r.h.website) || !(r.h.website ?? '').trim());
console.log(`Rows missing website/root_domain: ${missing.length}`);
