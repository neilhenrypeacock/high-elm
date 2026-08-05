// Drift guard: the digest MIRRORS a handful of dashboard constants (it can't
// import TypeScript from hotel-dashboard). This test reads the dashboard
// source as text and fails the moment the two disagree — per the Phase 2
// brief: "import/mirror it with a test asserting it matches, never redefine
// it silently". If this test fails, change health-check/constants.js to
// match lib/data.ts — never the other way round.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OUTLIER_THRESHOLD, MIN_ENGAGEMENT, MIN_BASELINE_ENGAGEMENT,
  BASELINE_POSTS, BASELINE_MAX_AGE_DAYS, KNOWN_SENTINELS,
} from '../health-check/constants.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataTs = readFileSync(join(here, '../../hotel-dashboard/lib/data.ts'), 'utf8');
const likesJs = readFileSync(join(here, '../likes.js'), 'utf8');

const dashConst = (name) => {
  const m = dataTs.match(new RegExp(`const ${name}\\s*=\\s*([A-Z_0-9]+|\\d+)`));
  assert.ok(m, `could not find ${name} in lib/data.ts — the constant moved or was renamed`);
  // Follow one level of aliasing (e.g. BASELINE_POSTS = RECENT_POSTS).
  return /^\d+$/.test(m[1]) ? Number(m[1]) : dashConst(m[1]);
};

test('mirrored thresholds match hotel-dashboard/lib/data.ts', () => {
  assert.equal(OUTLIER_THRESHOLD, dashConst('OUTLIER_THRESHOLD'));
  assert.equal(MIN_ENGAGEMENT, dashConst('MIN_ENGAGEMENT'));
  assert.equal(MIN_BASELINE_ENGAGEMENT, dashConst('MIN_BASELINE_ENGAGEMENT'));
  assert.equal(BASELINE_POSTS, dashConst('BASELINE_POSTS'));
  assert.equal(BASELINE_MAX_AGE_DAYS, dashConst('BASELINE_MAX_AGE_DAYS'));
});

test('mirrored sentinel list matches likes.js', () => {
  for (const s of KNOWN_SENTINELS) {
    assert.ok(likesJs.includes(String(s)), `sentinel ${s} not found in likes.js HIDDEN_LIKE_SENTINELS`);
  }
  const m = likesJs.match(/HIDDEN_LIKE_SENTINELS\s*=\s*new Set\(\[([^\]]*)\]/);
  assert.ok(m, 'HIDDEN_LIKE_SENTINELS not found in likes.js');
  const pipelineList = m[1].split(',').map((x) => Number(x.trim())).sort();
  assert.deepEqual(pipelineList, [...KNOWN_SENTINELS].sort());
});

test('the dashboard sentinel exclusion still covers 3 (hasVisibleLikesCount)', () => {
  assert.ok(/!==\s*3/.test(dataTs), 'lib/data.ts no longer excludes likes_count === 3 — digest assumptions broken');
});
