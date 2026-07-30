#!/usr/bin/env node
/**
 * Export a batch of hotels for contact-finding (Apollo etc).
 *
 * READ-ONLY. Touches no calculation logic — no breakout, baseline or engagement
 * maths lives here, and none should ever be added. The only derived figure is a
 * plain count of posts in the last 90 days.
 *
 * Selection rules:
 *   - tracked = true
 *   - has at least one row in `posts` (matched on instagram_handle)
 *   - has a non-blank `website`
 *   - country in COUNTRIES (default: UK + Ireland)
 *   - independently-run only, unless --include-groups is passed (see below)
 *   - ordered by recent posting activity (posts in last 90 days), then followers
 *
 * Independent vs group is read off the website URL, not off brand knowledge.
 * A hotel is treated as GROUP-run when either signal fires:
 *   - its root domain is shared with another hotel in the `hotels` table
 *     (fourseasons.com covers 44 properties, maybourne.com 4, ...)
 *   - its website is a deep path under a brand site (/en/hotels/claridges)
 * Both mean a contact-finding tool returns the group's head office rather than
 * the property's own social lead, so a cold email lands in the wrong inbox.
 * On the UK+Ireland set the two signals agree exactly: 10 independent, 11 group.
 *
 * Usage:
 *   node scripts/export-outreach-batch.mjs
 *   node scripts/export-outreach-batch.mjs --include-groups
 *   node scripts/export-outreach-batch.mjs --countries "France,Italy" --limit 30 \
 *     --out outreach/apollo-batch-02-france-italy.csv
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

const COUNTRIES = arg('countries', 'United Kingdom,Ireland')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const LIMIT = Number(arg('limit', '0')) || Infinity;
const OUT = arg('out', 'outreach/apollo-batch-01-uk-ireland.csv');
const INCLUDE_GROUPS = ARGV.includes('--include-groups');
const ACTIVITY_DAYS = 90;

// ---------- credentials ----------
// Walk up from this file looking for the monorepo's keys/ folder, so the script
// works from a git worktree as well as the checked-out repo.
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

/** Fetch every row of a table, paginating 1,000 at a time. */
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

const handleOf = h => (h.instagram_handle ?? '').trim().toLowerCase();

/** Apollo matches on the registrable domain, not a deep path. */
function rootDomain(website) {
  try {
    return new URL(website).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

/** True when the website is a sub-page of a brand site rather than its own root. */
function isDeepPath(website) {
  try {
    return new URL(website).pathname.split('/').filter(Boolean).length > 0;
  } catch {
    return false;
  }
}

const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ---------- pull ----------
const [hotels, posts, snapshots] = await Promise.all([
  fetchAll('hotels', 'id,name,instagram_handle,country,region,website,sources,gold_list_listings,tracked'),
  fetchAll('posts', 'instagram_handle,posted_at'),
  fetchAll('profile_snapshots', 'instagram_handle,followers_count,captured_at', '&order=captured_at.desc'),
]);

// latest follower snapshot per handle
const followers = new Map();
for (const s of snapshots) {
  if (!followers.has(s.instagram_handle)) followers.set(s.instagram_handle, s.followers_count);
}

// post activity per handle
const cutoff = Date.now() - ACTIVITY_DAYS * 86_400_000;
const activity = new Map();
for (const p of posts) {
  const handle = (p.instagram_handle ?? '').trim().toLowerCase();
  if (!handle) continue;
  const entry = activity.get(handle) ?? { total: 0, recent: 0, latest: 0 };
  entry.total += 1;
  const at = Date.parse(p.posted_at);
  if (Number.isFinite(at)) {
    if (at >= cutoff) entry.recent += 1;
    if (at > entry.latest) entry.latest = at;
  }
  activity.set(handle, entry);
}

// How many hotels in the WHOLE table share each root domain. Counted across all
// 764 rows, not just the batch, so a chain is caught even when only one of its
// properties is in scope.
const domainUse = new Map();
for (const h of hotels) {
  const d = rootDomain(h.website ?? '');
  if (d) domainUse.set(d, (domainUse.get(d) ?? 0) + 1);
}
const ownershipOf = h => {
  const shared = domainUse.get(rootDomain(h.website)) ?? 1;
  return shared > 1 || isDeepPath(h.website) ? 'group' : 'independent';
};

// ---------- select ----------
const inScope = hotels.filter(h =>
  h.tracked === true &&
  activity.has(handleOf(h)) &&
  COUNTRIES.includes((h.country ?? '').trim().toLowerCase())
);
const noWebsite = inScope.filter(h => !(h.website ?? '').trim());
const withWebsite = inScope.filter(h => (h.website ?? '').trim());
const groups = withWebsite.filter(h => ownershipOf(h) === 'group');

const byReach = (a, b) => {
  const ra = activity.get(handleOf(a)).recent;
  const rb = activity.get(handleOf(b)).recent;
  if (rb !== ra) return rb - ra;
  return (followers.get(handleOf(b)) ?? 0) - (followers.get(handleOf(a)) ?? 0);
};
const selected = withWebsite
  .filter(h => INCLUDE_GROUPS || ownershipOf(h) === 'independent')
  .sort(byReach)
  .slice(0, LIMIT);

// ---------- write ----------
const COLUMNS = [
  'hotel_id', 'hotel_name', 'website', 'root_domain', 'ownership',
  'hotels_sharing_domain', 'country', 'region', 'instagram_handle', 'followers',
  'posts_last_90d', 'posts_total', 'last_posted', 'accreditation_lists',
  'gold_list_editions',
];
const toRow = h => {
  const a = activity.get(handleOf(h));
  return [
    h.id,
    h.name,
    h.website,
    rootDomain(h.website),
    ownershipOf(h),
    domainUse.get(rootDomain(h.website)) ?? 1,
    h.country,
    h.region,
    h.instagram_handle,
    followers.get(handleOf(h)) ?? '',
    a.recent,
    a.total,
    a.latest ? new Date(a.latest).toISOString().slice(0, 10) : '',
    h.sources ?? '',
    h.gold_list_listings ?? '',
  ].map(csvCell).join(',');
};

function writeCsv(relPath, rows) {
  const outPath = path.resolve(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, [COLUMNS.join(','), ...rows.map(toRow)].join('\n') + '\n');
}

writeCsv(OUT, selected);

// The group-run properties aren't discarded — they're parked in a sibling file
// so they can be picked up later via LinkedIn rather than a domain lookup.
const DEFERRED = OUT.replace(/\.csv$/, '-deferred-groups.csv');
if (!INCLUDE_GROUPS && groups.length) writeCsv(DEFERRED, [...groups].sort(byReach));

// ---------- report ----------
console.log(`Countries            : ${COUNTRIES.join(', ')}`);
console.log(`In scope             : ${inScope.length} (tracked + has posts + country match)`);
console.log(`Excluded (no website): ${noWebsite.length}`);
console.log(`Excluded (group-run) : ${INCLUDE_GROUPS ? 0 : groups.length}`);
console.log(`Exported             : ${selected.length} -> ${OUT}`);

if (!INCLUDE_GROUPS && groups.length) {
  console.log(`Deferred             : ${groups.length} -> ${DEFERRED}`);
  console.log('\nGroup-run, held back (contact tools return the group, not the property):');
  for (const h of [...groups].sort(byReach)) {
    const d = rootDomain(h.website);
    console.log(`  ${h.name} — ${d} (${domainUse.get(d)} properties on this domain)`);
  }
}

const stillShared = new Map();
for (const h of selected) {
  const d = rootDomain(h.website);
  stillShared.set(d, (stillShared.get(d) ?? 0) + 1);
}
const dupes = [...stillShared.entries()].filter(([, n]) => n > 1);
if (dupes.length) {
  console.log('\n⚠ Shared domains still present in the export:');
  for (const [d, n] of dupes) console.log(`  ${d} x${n}`);
}
