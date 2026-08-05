// health-check/run-digest.js — the daily health digest runner.
//
// Runs every check, renders ONE email, and sends it — green or red, every
// day, so a MISSING email is itself an alarm. Report-only by contract:
// nothing here writes to Supabase, calls Apify, or calls an AI. A crashed
// check reports itself as 🔴 "failed to run" and never kills the digest.
//
//   node health-check/run-digest.js              # fetch, check, email
//   DIGEST_DRY_RUN=1 node health-check/run-digest.js   # print, don't email
//
// Exit codes: 0 = digest delivered (even if it reports red findings — the
// email IS the alert channel); 1 = the digest itself could not run or could
// not be delivered, so GitHub's workflow-failure email becomes the backstop.

import 'dotenv/config';
import { supabaseClient, pagedSelect, countExact, daysAgoIso, ghApi } from './lib.js';
import { BASELINE_MAX_AGE_DAYS, ALERT_EMAIL, ALERT_FROM } from './constants.js';
import { subjectLine, renderText, renderHtml } from './render.js';

import * as freshness from './checks/freshness.js';
import * as scrapeOutcome from './checks/scrape-outcome.js';
import * as snapshotCoverage from './checks/snapshot-coverage.js';
import * as rowDeltas from './checks/row-deltas.js';
import * as sentinelSpikes from './checks/sentinel-spikes.js';
import * as contradictions from './checks/contradictions.js';
import * as nullDrift from './checks/null-drift.js';
import * as duplicateSnapshots from './checks/duplicate-snapshots.js';
import * as orphans from './checks/orphans.js';
import * as followerShocks from './checks/follower-shocks.js';
import * as extremeMultipliers from './checks/extreme-multipliers.js';
import * as impossibleEngagement from './checks/impossible-engagement.js';
import * as breakoutSanity from './checks/breakout-sanity.js';
import * as authGate from './checks/auth-gate.js';
import * as siteUp from './checks/site-up.js';
import * as subscriptions from './checks/subscriptions.js';
import * as publishGate from './checks/publish-gate.js';

// scrape-outcome runs FIRST because row-deltas reads its result via ctx.shared.
const CHECKS = [
  scrapeOutcome, freshness, snapshotCoverage, rowDeltas,
  sentinelSpikes, contradictions, nullDrift, duplicateSnapshots, orphans, followerShocks,
  extremeMultipliers, impossibleEngagement, breakoutSanity,
  authGate, siteUp, subscriptions, publishGate,
];

async function buildContext() {
  const supabase = supabaseClient();
  const now = Date.now();
  const ctx = {
    supabase, now, fetch, ghApi, shared: {},
    pagedSelect, countExact,
    data: {},
  };

  // One shared pull of the posts year — several checks slice it different ways.
  ctx.data.postsYear = await pagedSelect(() =>
    supabase.from('posts')
      .select('post_id, instagram_handle, posted_at, captured_at, likes_count, comments_count, post_url')
      .gte('posted_at', daysAgoIso(BASELINE_MAX_AGE_DAYS, now))
      .not('posted_at', 'is', null)
      .order('posted_at', { ascending: false })
      .order('post_id', { ascending: true }));

  const hotels = await pagedSelect(() =>
    supabase.from('hotels').select('instagram_handle, tracked, hidden'));
  ctx.data.allHotelHandles = hotels.map((h) => h.instagram_handle).filter(Boolean);
  ctx.data.trackedHandles = [...new Set(
    hotels.filter((h) => h.tracked && !h.hidden).map((h) => h.instagram_handle).filter(Boolean),
  )];

  ctx.data.snapshots40 = await pagedSelect(() =>
    supabase.from('profile_snapshots')
      .select('instagram_handle, followers_count, captured_at')
      .gte('captured_at', daysAgoIso(40, now)));

  return ctx;
}

async function sendEmail(subject, text, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: ALERT_FROM, to: [ALERT_EMAIL], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend refused the email: ${res.status} ${await res.text()}`);
}

async function main() {
  let ctx;
  try {
    ctx = await buildContext();
  } catch (err) {
    // Can't even read the database — that IS the finding. Try to say so by
    // email; either way exit 1 so GitHub's failure email fires.
    console.error(`digest could not read Supabase: ${err.message}`);
    if (process.env.RESEND_API_KEY && !process.env.DIGEST_DRY_RUN) {
      try {
        await sendEmail(
          '🔴 Content Radar: the health checker cannot reach the database',
          `The daily digest could not read Supabase at all: ${err.message}\n\nThis is the same signature as the 2 Aug storage restriction — check https://supabase.com/dashboard first.`,
        );
      } catch (e) { console.error(e.message); }
    }
    process.exit(1);
  }

  const results = [];
  for (const check of CHECKS) {
    try {
      const r = await check.run(ctx);
      results.push({ id: check.id, name: check.name, ...r });
      console.log(`${r.status.toUpperCase().padEnd(4)} ${check.name}: ${r.headline}`);
    } catch (err) {
      // A crashed check is itself a finding — never kills the digest.
      results.push({
        id: check.id, name: check.name, status: 'fail',
        headline: 'This check failed to run.',
        details: [String(err.message ?? err)],
      });
      console.error(`FAIL ${check.name}: check crashed — ${err.message}`);
    }
  }

  const subject = subjectLine(results, ctx.now);
  const text = renderText(results, { runUrl: process.env.RUN_URL, now: ctx.now });
  const html = renderHtml(results, { runUrl: process.env.RUN_URL, now: ctx.now });

  console.log(`\n═══ ${subject} ═══\n`);
  console.log(text);

  if (process.env.DIGEST_DRY_RUN) {
    console.log('\n(DIGEST_DRY_RUN set — no email sent)');
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('\nRESEND_API_KEY is not set — the digest was computed but NOT delivered.');
    process.exit(1); // a digest nobody receives is a broken digest
  }
  await sendEmail(subject, text, html);
  console.log(`\ndigest emailed to ${ALERT_EMAIL}`);
}

main().catch((err) => {
  console.error(`digest failed: ${err.message}`);
  process.exit(1);
});
