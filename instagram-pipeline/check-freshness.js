// check-freshness.js — is the dashboard's data stale?
//
// Compares the newest posts.posted_at against FRESHNESS_MAX_DAYS (default 8:
// one weekly scrape + a day's grace). Exits non-zero when stale so the GitHub
// Actions run FAILS — GitHub emails the repo owner on workflow failure, which
// is the baseline alert. If RESEND_API_KEY is set, it additionally sends a
// plain email to ALERT_EMAIL via Resend (same provider planned for the
// Supabase Auth SMTP step, so one account covers both).
//
// Read-only: never writes to the database. Run: node check-freshness.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const MAX_DAYS = Number(process.env.FRESHNESS_MAX_DAYS ?? 8);
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

const { data, error } = await supabase
  .from('posts')
  .select('posted_at')
  .not('posted_at', 'is', null)
  .order('posted_at', { ascending: false })
  .limit(1);

if (error) {
  console.error(`freshness check could not query Supabase: ${error.message}`);
  await sendAlert(
    'Content Radar: freshness check FAILED',
    `The freshness check could not reach Supabase: ${error.message}`
  );
  process.exit(1);
}

const newest = data?.[0]?.posted_at;
if (!newest) {
  console.error('freshness check: posts table returned no rows');
  await sendAlert('Content Radar: no post data found', 'The posts table returned no rows.');
  process.exit(1);
}

const ageDays = (Date.now() - new Date(newest).getTime()) / (24 * 60 * 60 * 1000);
console.log(`Newest post: ${newest} (${ageDays.toFixed(1)} days old, limit ${MAX_DAYS})`);

if (ageDays > MAX_DAYS) {
  const msg =
    `The newest post in the Content Radar database is ${ageDays.toFixed(1)} days old ` +
    `(limit: ${MAX_DAYS}). The weekly scrape has probably failed or not run — ` +
    `check the GitHub Actions "weekly-scrape" workflow, or run the pipeline manually ` +
    `(instagram-pipeline: npm run weekly).`;
  console.error(`STALE: ${msg}`);
  await sendAlert(`Content Radar: data is ${Math.round(ageDays)} days stale`, msg);
  process.exit(1);
}

console.log('Data is fresh. ✅');
