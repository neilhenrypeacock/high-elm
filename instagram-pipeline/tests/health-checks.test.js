// Fixture tests for the daily health digest: every check must demonstrably
// FIRE on synthetic bad data and stay QUIET on clean data. The sentinel test
// reproduces the exact shape of the July "likes_count = 3" incident.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as freshness from '../health-check/checks/freshness.js';
import * as scrapeOutcome from '../health-check/checks/scrape-outcome.js';
import * as coverage from '../health-check/checks/snapshot-coverage.js';
import * as rowDeltas from '../health-check/checks/row-deltas.js';
import * as sentinels from '../health-check/checks/sentinel-spikes.js';
import * as contradictions from '../health-check/checks/contradictions.js';
import * as nullDrift from '../health-check/checks/null-drift.js';
import * as dupes from '../health-check/checks/duplicate-snapshots.js';
import * as orphans from '../health-check/checks/orphans.js';
import * as shocks from '../health-check/checks/follower-shocks.js';
import * as extremes from '../health-check/checks/extreme-multipliers.js';
import * as impossible from '../health-check/checks/impossible-engagement.js';
import * as breakouts from '../health-check/checks/breakout-sanity.js';
import * as authGate from '../health-check/checks/auth-gate.js';
import * as siteUp from '../health-check/checks/site-up.js';
import * as subs from '../health-check/checks/subscriptions.js';
import * as publishGate from '../health-check/checks/publish-gate.js';
import { subjectLine, renderText } from '../health-check/render.js';
import { ORPHAN_BASELINE } from '../health-check/constants.js';

const NOW = Date.parse('2026-08-04T07:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 86_400_000).toISOString();

test('freshness: bands', () => {
  assert.equal(freshness.evaluate(daysAgo(2), NOW).status, 'ok');
  assert.equal(freshness.evaluate(daysAgo(9), NOW).status, 'warn');
  assert.equal(freshness.evaluate(daysAgo(11), NOW).status, 'fail');
  assert.equal(freshness.evaluate(null, NOW).status, 'fail');
});

test('scrape outcome: failure and staleness fire, success passes', () => {
  const run = (conclusion, days) => ({ conclusion, name: 'weekly-scrape', run_started_at: daysAgo(days), html_url: 'x' });
  assert.equal(scrapeOutcome.evaluate(run('success', 1), [], NOW).status, 'ok');
  const failed = scrapeOutcome.evaluate(run('failure', 1), [{ name: 'Scrape', conclusion: 'failure' }], NOW);
  assert.equal(failed.status, 'fail');
  assert.ok(failed.details.join(' ').includes('Scrape'));
  assert.equal(scrapeOutcome.evaluate(run('success', 9), [], NOW).status, 'warn');
  assert.equal(scrapeOutcome.evaluate(null, [], NOW).status, 'warn');
});

test('snapshot coverage: the batch-failure case fires', () => {
  const tracked = Array.from({ length: 200 }, (_, i) => `h${i}`);
  assert.equal(coverage.evaluate(tracked, tracked).status, 'ok');
  assert.equal(coverage.evaluate(tracked, tracked.slice(0, 170)).status, 'warn'); // 85%
  assert.equal(coverage.evaluate(tracked, tracked.slice(0, 100)).status, 'fail'); // 50% — the 1 Aug shape
  assert.equal(coverage.evaluate([], []).status, 'fail');
});

test('row deltas: scrape-ran-but-wrote-nothing fires', () => {
  assert.equal(rowDeltas.evaluate(900, 200, true).status, 'ok');
  assert.equal(rowDeltas.evaluate(0, 0, true).status, 'fail'); // green tick, empty run
  assert.equal(rowDeltas.evaluate(0, 0, false).status, 'ok'); // quiet non-scrape day
  assert.equal(rowDeltas.evaluate(50_000, 200, true).status, 'warn'); // runaway
});

test('sentinel spikes: reproduces the likes=3 incident and stays quiet on clean data', () => {
  // Clean: a natural decaying distribution, every value a modest count.
  const clean = [];
  for (let v = 0; v < 200; v++) for (let i = 0; i < Math.max(1, 40 - Math.floor(v / 5)); i++) clean.push(v);
  assert.equal(sentinels.findSpikes(clean).length, 0);
  // Poisoned: same distribution plus the historical shape — value 3 spiking ~200x its neighbours.
  const poisoned = [...clean, ...Array(800).fill(3)];
  const spikes = sentinels.findSpikes(poisoned);
  assert.equal(spikes.length, 1);
  assert.equal(spikes[0].value, 3);
  assert.equal(sentinels.evaluate(poisoned, clean, 0).status, 'warn');
  assert.equal(sentinels.evaluate(clean, clean, 0).status, 'ok');
  // A KNOWN sentinel in freshly captured rows is an immediate red.
  assert.equal(sentinels.evaluate(clean, clean, 3).status, 'fail');
});

test('contradictions: high comments + tiny likes fires; sentinel rows do not', () => {
  const bad = [{ instagram_handle: 'x', posted_at: daysAgo(1), likes_count: 4, comments_count: 60 }];
  const sentinelRow = [{ instagram_handle: 'x', posted_at: daysAgo(1), likes_count: -1, comments_count: 60 }];
  const fine = [{ instagram_handle: 'x', posted_at: daysAgo(1), likes_count: 900, comments_count: 60 }];
  assert.equal(contradictions.evaluate(bad).status, 'warn');
  assert.equal(contradictions.evaluate(sentinelRow).status, 'ok'); // -1 is excluded, not contradictory
  assert.equal(contradictions.evaluate(fine).status, 'ok');
});

test('null drift: a 15-point jump fires', () => {
  assert.equal(nullDrift.evaluate(100, 35, 1000, 160).status, 'warn'); // 35% vs 16%
  assert.equal(nullDrift.evaluate(100, 18, 1000, 160).status, 'ok');
  assert.equal(nullDrift.evaluate(0, 0, 1000, 160).status, 'ok');
});

test('duplicate snapshots: one hotel twice in a day fires', () => {
  const rows = [
    { instagram_handle: 'a', captured_at: '2026-08-04T05:00:00Z' },
    { instagram_handle: 'a', captured_at: '2026-08-04T09:00:00Z' },
  ];
  assert.equal(dupes.evaluate(rows).status, 'fail');
  assert.equal(dupes.evaluate([rows[0], { instagram_handle: 'a', captured_at: '2026-08-03T05:00:00Z' }]).status, 'ok');
});

test('orphans: only NEW handles beyond the baseline fire', () => {
  const hotels = ['tracked1'];
  assert.equal(orphans.evaluate(['tracked1', ORPHAN_BASELINE[0]], hotels).status, 'ok');
  const r = orphans.evaluate(['tracked1', 'brand-new-orphan'], hotels);
  assert.equal(r.status, 'warn');
  assert.ok(r.headline.includes('brand-new-orphan'));
});

test('follower shocks: >20% move fires either direction', () => {
  const snap = (h, f, d) => ({ instagram_handle: h, followers_count: f, captured_at: daysAgo(d) });
  assert.equal(shocks.evaluate([snap('a', 100_000, 8), snap('a', 70_000, 1)], ['a']).status, 'warn');
  assert.equal(shocks.evaluate([snap('a', 100_000, 8), snap('a', 103_000, 1)], ['a']).status, 'ok');
  assert.equal(shocks.evaluate([snap('untracked', 100, 8), snap('untracked', 1, 1)], ['a']).status, 'ok');
});

test('extreme multipliers: >=50x listed, below stays quiet', () => {
  const medians = new Map([['a', 100]]);
  const post = (likes) => ({ instagram_handle: 'a', post_id: 'p', posted_at: daysAgo(1), likes_count: likes, comments_count: 0 });
  assert.equal(extremes.evaluate([post(6000)], medians).status, 'warn'); // 60x
  assert.equal(extremes.evaluate([post(3000)], medians).status, 'ok'); // 30x
  assert.equal(extremes.evaluate([post(6000)], new Map([['a', 10]])).status, 'ok'); // median below floor → not judged
});

test('impossible engagement: >150% of followers fires', () => {
  const followers = new Map([['a', 10_000]]);
  const post = (likes) => ({ instagram_handle: 'a', posted_at: daysAgo(1), likes_count: likes, comments_count: 0 });
  assert.equal(impossible.evaluate([post(16_000)], followers).status, 'warn');
  assert.equal(impossible.evaluate([post(9_000)], followers).status, 'ok');
});

test('breakout sanity: zero fails, inflated warns, normal passes', () => {
  assert.equal(breakouts.evaluate(0, 40).status, 'fail');
  assert.equal(breakouts.evaluate(40, 40).status, 'warn'); // 4x the ~10/week pace
  assert.equal(breakouts.evaluate(11, 40).status, 'ok');
  // countBreakouts applies the dashboard's gates
  const medians = new Map([['a', 300]]);
  const mk = (likes) => ({ instagram_handle: 'a', likes_count: likes, comments_count: 0 });
  assert.equal(breakouts.countBreakouts([mk(700)], medians), 1); // 2.3x and >=500
  assert.equal(breakouts.countBreakouts([mk(400)], medians), 0); // under MIN_ENGAGEMENT
  assert.equal(breakouts.countBreakouts([mk(null)], medians), 0); // hidden likes
});

test('auth gate: accepts the streamed-redirect shape, fails on canaries', () => {
  const redirectShell = '<html>… NEXT_REDIRECT;replace;/login;307 … url=/login …</html>';
  assert.equal(authGate.evaluate(200, redirectShell).status, 'ok');
  assert.equal(authGate.evaluate(307, '').status, 'ok');
  assert.equal(authGate.evaluate(200, '<html>Ashford Castle 0.4x BREAKOUTS THIS WEEK</html>').status, 'fail');
  assert.equal(authGate.evaluate(200, '<html>a full page with no redirect marker</html>').status, 'fail');
});

test('site up + subscriptions + publish gate', () => {
  assert.equal(siteUp.evaluate(200).status, 'ok');
  assert.equal(siteUp.evaluate(500).status, 'fail');
  assert.ok(subs.evaluate({ active: 1 }).headline.includes('1 active'));
  assert.equal(publishGate.evaluate(daysAgo(2), 10, NOW).status, 'ok');
  assert.equal(publishGate.evaluate(daysAgo(8), 300, NOW).status, 'warn');
  assert.equal(publishGate.evaluate(daysAgo(15), 800, NOW).status, 'fail');
  assert.equal(publishGate.evaluate(null, 0, NOW).status, 'ok');
});

test('render: subject reflects worst status; body puts red first and includes the footer rule', () => {
  const ok = { id: 'a', name: 'A', status: 'ok', headline: 'fine', details: [] };
  const warn = { id: 'b', name: 'B', status: 'warn', headline: 'hmm', details: ['look'] };
  const fail = { id: 'c', name: 'C', status: 'fail', headline: 'broken', details: ['fix'] };
  assert.ok(subjectLine([ok, ok], NOW).startsWith('✅'));
  assert.ok(subjectLine([ok, warn], NOW).startsWith('⚠️'));
  assert.ok(subjectLine([ok, warn, fail], NOW).startsWith('🔴'));
  assert.ok(subjectLine([ok, warn, fail], NOW).includes('2 issues'));
  const text = renderText([ok, warn, fail], { now: NOW });
  assert.ok(text.indexOf('broken') < text.indexOf('hmm'));
  assert.ok(text.indexOf('hmm') < text.indexOf('fine'));
  assert.ok(text.includes('missing morning email'));
});
