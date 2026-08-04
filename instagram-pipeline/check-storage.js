// check-storage.js — how close is the image bucket to Supabase's storage cap?
//
// WHY THIS EXISTS (2026-08-04): on 2 Aug the `standout-images` bucket passed the
// 1 GB free-tier limit and Supabase restricted the WHOLE project API — every
// table read returned HTTP 402, not just storage. Auth, the dashboard and the
// pipeline all went down together, and the public site kept serving a stale ISR
// render, so nothing looked wrong from outside. The first real signal was a
// Sentry alert at 02:06 BST, roughly a day after the bucket crossed the line.
//
// cleanup-images.js is the cure. This is the alarm: it says the bucket is
// filling BEFORE the cap turns into an outage, because recovering from the
// restriction needs a billing action no script can take.
//
// Same shape as check-freshness.js: exits non-zero when over the fail line so
// the GitHub Actions run FAILS (GitHub emails the repo owner — the baseline
// alert), and additionally emails ALERT_EMAIL via Resend when RESEND_API_KEY is
// set. A warning emails but exits 0, so a warning never fails a scrape.
//
// Read-only: lists objects and adds up their sizes. It never deletes — that is
// cleanup-images.js's job, deliberately kept in a separate script so the alarm
// can run daily on a schedule that deletes nothing.
//
//   node check-storage.js
//
// Env: STORAGE_CAP_MB (default 1024, the free-tier limit), STORAGE_WARN_PCT
// (default 70), STORAGE_FAIL_PCT (default 90). Raise the cap here if the
// project ever moves to a paid plan.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'standout-images';
const PAGE = 1000;

const CAP_MB = Number(process.env.STORAGE_CAP_MB ?? 1024);
const WARN_PCT = Number(process.env.STORAGE_WARN_PCT ?? 70);
const FAIL_PCT = Number(process.env.STORAGE_FAIL_PCT ?? 90);
const ALERT_EMAIL = process.env.ALERT_EMAIL ?? 'neil@highelmstudio.com';
const ALERT_FROM = process.env.ALERT_FROM ?? 'Content Radar <onboarding@resend.dev>';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sendAlert(subject, body) {
  if (!process.env.RESEND_API_KEY) {
    console.log('(RESEND_API_KEY not set — relying on the workflow-failure email instead)');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: ALERT_FROM, to: [ALERT_EMAIL], subject, text: body }),
  });
  if (!res.ok) {
    console.error(`alert email failed: ${res.status} ${await res.text()}`);
  } else {
    console.log(`alert email sent to ${ALERT_EMAIL}`);
  }
}

// Mirrors listAllObjects in cleanup-images.js — the bucket is flat, so one
// paginated list covers it.
async function listAllObjects() {
  const objects = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`storage list: ${error.message}`);
    objects.push(...data);
    if (data.length < PAGE) return objects;
  }
}

let objects;
try {
  objects = await listAllObjects();
} catch (err) {
  // A 402 here means the restriction has ALREADY happened. Say so plainly
  // rather than reporting it as a generic list failure.
  const restricted = /402|restricted|quota/i.test(err.message);
  const subject = restricted
    ? 'Content Radar: Supabase is RESTRICTED (storage quota)'
    : 'Content Radar: storage check FAILED';
  const body = restricted
    ? `Supabase has restricted the project API — every table read is failing, not just ` +
      `storage. This needs a billing action in the Supabase dashboard; no script can ` +
      `clear it. Original error: ${err.message}`
    : `The storage check could not reach Supabase: ${err.message}`;
  console.error(body);
  await sendAlert(subject, body);
  process.exit(1);
}

const bytes = objects.reduce((sum, o) => sum + (o.metadata?.size ?? 0), 0);
const usedMb = bytes / (1024 * 1024);
const pct = (usedMb / CAP_MB) * 100;

console.log(
  `${BUCKET}: ${objects.length} objects, ${usedMb.toFixed(0)} MB of ${CAP_MB} MB ` +
    `(${pct.toFixed(1)}%, warn ${WARN_PCT}%, fail ${FAIL_PCT}%)`
);

const shared =
  `The ${BUCKET} bucket is at ${usedMb.toFixed(0)} MB of the ${CAP_MB} MB cap ` +
  `(${pct.toFixed(1)}%), across ${objects.length} objects.\n\n` +
  `Going over the cap does not just break images — Supabase restricts the whole ` +
  `project API, so the dashboard, auth and the pipeline all stop.\n\n` +
  `To bring it down, run the pruner from instagram-pipeline:\n` +
  `  node cleanup-images.js            # dry run, prints what would go\n` +
  `  node cleanup-images.js --apply    # actually deletes`;

if (pct >= FAIL_PCT) {
  console.error(`OVER THE FAIL LINE: ${pct.toFixed(1)}%`);
  await sendAlert(`Content Radar: image storage at ${pct.toFixed(0)}% of the cap`, shared);
  process.exit(1);
}

if (pct >= WARN_PCT) {
  console.warn(`WARNING: ${pct.toFixed(1)}% of the cap used`);
  await sendAlert(`Content Radar: image storage at ${pct.toFixed(0)}% — worth a prune`, shared);
  process.exit(0);
}

console.log('Storage has room. ✅');
