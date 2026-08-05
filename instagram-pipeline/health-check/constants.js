// health-check/constants.js — every tunable threshold in one place.
//
// The digest is REPORT-ONLY: nothing in health-check/ ever writes to Supabase,
// calls Apify, or calls an AI. It reads, it judges, it emails. Tune numbers
// here; the checks themselves never hardcode a threshold.

// ── Pipeline health ──────────────────────────────────────────────────────────
export const FRESH_WARN_DAYS = 8;    // newest post older than this → ⚠️ (one weekly scrape + a day's grace)
export const FRESH_FAIL_DAYS = 10;   // → 🔴
export const SCRAPE_STALE_DAYS = 8;  // no scheduled scrape RUN found within this → ⚠️
export const COVERAGE_WINDOW_DAYS = 8;   // "last scrape cycle" = snapshots within this window
export const COVERAGE_WARN = 0.90;   // < 90% of tracked hotels snapshotted → ⚠️
export const COVERAGE_FAIL = 0.75;   // < 75% → 🔴 (a scrape that "succeeded" but skipped batches)
export const DELTA_RUNAWAY_ROWS = 20_000; // >20k posts ingested in 24h → ⚠️ (runaway, not a scrape)

// ── Data integrity (the "next likes_count = 3" net) ─────────────────────────
export const SENTINEL_SCAN_DAYS = 30;    // scan posts CAPTURED in this window
export const SENTINEL_MAX_VALUE = 200;   // only small values can be sentinels
export const SENTINEL_SPIKE_RATIO = 10;  // value appears ≥10× its neighbours' median → suspect
export const SENTINEL_NEIGHBOURS = 5;    // ±5 neighbours define "normal" for a value
export const SENTINEL_MIN_COUNT = 20;    // ignore spikes below this absolute count (tiny-sample noise)
export const KNOWN_SENTINELS = [-1, 3];  // must mirror instagram-pipeline/likes.js — drift-tested
export const CONTRADICTION_MIN_COMMENTS = 20;  // comments > 20 with likes < 10 = suspect row
export const CONTRADICTION_MAX_LIKES = 10;
export const NULL_DRIFT_WARN_PP = 15;    // null-likes share jumps ≥15 percentage points vs norm → ⚠️
export const FOLLOWER_SHOCK_PCT = 20;    // latest snapshot moved >20% vs previous → ⚠️

// Orphan posts baseline: handles present in `posts` with no `hotels` row, as
// counted 2026-08-04 (50 — down from the 31 Jul audit's 51). A NEW handle
// appearing here means the scraper ingested an account nobody added to hotels.
export const ORPHAN_BASELINE = [
  'amarahotelcy', 'aureliohotel', 'bairroaltohotel', 'botanicsanctuaryantwerp',
  'calimykonos', 'canavescollection', 'canavesoiasuites', 'chablehotels',
  'chablemaroma', 'cheetahplains', 'cliniquelaprairie', 'dangleterrecph',
  'dar_ahlam', 'domaine.louise', 'domainedelacavalerie', 'eloundabay',
  'eloundabeach', 'eloundacollection', 'elysiumhotel', 'eriro.alpinehide',
  'fairmontgoldenprague', 'fawnbluffprivatelodge', 'goldene.rose_karthaus',
  'gracestmoritz', 'grandhotellestroisrois', 'hotel_goldgasse_salzburg',
  'hotel_stein_salzburg', 'hotelcanferrereta', 'hotelsantfrancesc', 'ibizabay',
  'kisawasanctuary', 'kristianialech', 'laroqqahotel', 'metropolemonaco',
  'nobumarbella', 'palazzo.talia', 'peppercollection', 'portoelounda',
  'posttraunkirchen', 'sao_lourenco_do_barrocal', 'sixsensesbhutan',
  'sixsensesfortbarwara', 'sixsenseskanuhura', 'sixsenseslaamu',
  'sixsenseszilpasyon', 'terre_blanche', 'thecharleshotelmunich',
  'thesukhothaibangkok', 'tulahclinicalwellness', 'villafeltrinelli',
];

// ── Post anomalies ───────────────────────────────────────────────────────────
// These four MIRROR hotel-dashboard/lib/data.ts and must never drift from it —
// tests/health-constants.test.js reads the dashboard source and asserts they
// match. Change them THERE first; this file follows.
export const OUTLIER_THRESHOLD = 2;        // = data.ts OUTLIER_THRESHOLD
export const MIN_ENGAGEMENT = 500;         // = data.ts MIN_ENGAGEMENT
export const MIN_BASELINE_ENGAGEMENT = 25; // = data.ts MIN_BASELINE_ENGAGEMENT
export const BASELINE_POSTS = 30;          // = data.ts BASELINE_POSTS (last N visible-like posts)
export const BASELINE_MAX_AGE_DAYS = 365;  // = data.ts BASELINE_MAX_AGE_DAYS

export const EXTREME_MULTIPLIER = 50;      // list breakouts ≥50× — display caps there; cause deserves a look
export const IMPOSSIBLE_ENGAGEMENT_RATIO = 1.5; // likes+comments > 150% of followers → surface it
export const BREAKOUT_INFLATED_RATIO = 3;  // 7d breakout count >3× the 28-day daily-average pace → ⚠️

// ── Business & access ────────────────────────────────────────────────────────
export const PROD_ORIGIN = 'https://www.hotelcontentradar.com';
// Words that must NEVER appear in what a logged-out visitor receives from
// /dashboard. Real hotel names beat markup heuristics: if one of these is in
// the body, member data is leaking regardless of status code.
export const GATE_CANARIES = ['Ashford Castle', 'The Connaught', 'Estelle Manor', 'hotel_region', 'BREAKOUTS THIS WEEK'];
export const PUBLISH_STALE_WARN_DAYS = 7;  // Monday publish forgotten → ⚠️
export const PUBLISH_STALE_FAIL_DAYS = 14; // two missed weeks → 🔴

// ── Email ────────────────────────────────────────────────────────────────────
export const ALERT_EMAIL = process.env.ALERT_EMAIL ?? 'neil@highelmstudio.com';
// onboarding@resend.dev is the safe default (works without domain config).
// Once the verified highelmstudio.com sender is confirmed in Resend, set
// ALERT_FROM in the workflow env — no code change needed.
export const ALERT_FROM = process.env.ALERT_FROM ?? 'Content Radar <onboarding@resend.dev>';
