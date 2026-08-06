import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assertSucceeded, classifyScrape, ESCALATION_RATIO, TERMINAL_OK } from '../scrape-outcome.js';

// The point of these tests is not that the rules are clever. It is that each one
// has a demonstrated path to firing — this project's recurring bug is the
// safeguard that has never gone red because it cannot.

describe('classifyScrape — what counts as a successful run', () => {
  test('a clean run is ok', () => {
    const r = classifyScrape({ batchCount: 4, failedCount: 0, totalPosts: 918 });
    assert.equal(r.ok, true);
    assert.equal(r.code, 'ok');
  });

  test('every batch failing is a hard failure — the 1 Aug case', () => {
    const r = classifyScrape({ batchCount: 4, failedCount: 4, totalPosts: 0 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'all-failed');
  });

  test('collecting nothing is a hard failure even when no batch threw', () => {
    const r = classifyScrape({ batchCount: 4, failedCount: 0, totalPosts: 0 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'no-posts');
  });

  test('half the batches failing is escalated, even with posts collected', () => {
    const r = classifyScrape({ batchCount: 4, failedCount: 2, totalPosts: 400 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'mass-failure');
  });

  test('one batch of four failing stays a warning, not a failure', () => {
    const r = classifyScrape({ batchCount: 4, failedCount: 1, totalPosts: 700 });
    assert.equal(r.ok, true);
    assert.equal(r.code, 'partial');
  });

  test('the escalation boundary is where the ratio says it is', () => {
    const batchCount = 10;
    const justUnder = Math.ceil(batchCount * ESCALATION_RATIO) - 1;
    const atThreshold = Math.ceil(batchCount * ESCALATION_RATIO);

    assert.equal(classifyScrape({ batchCount, failedCount: justUnder, totalPosts: 500 }).code, 'partial');
    assert.equal(classifyScrape({ batchCount, failedCount: atThreshold, totalPosts: 500 }).code, 'mass-failure');
  });

  test('a single-batch run that fails is all-failed, not mass-failure', () => {
    // test5 / one-batch re-runs: the more specific message is the useful one.
    const r = classifyScrape({ batchCount: 1, failedCount: 1, totalPosts: 0 });
    assert.equal(r.code, 'all-failed');
  });

  test('every outcome carries a reason worth printing', () => {
    const runs = [
      { batchCount: 4, failedCount: 0, totalPosts: 900 },
      { batchCount: 4, failedCount: 4, totalPosts: 0 },
      { batchCount: 4, failedCount: 0, totalPosts: 0 },
      { batchCount: 4, failedCount: 2, totalPosts: 400 },
      { batchCount: 4, failedCount: 1, totalPosts: 700 },
    ];
    for (const run of runs) {
      const { reason } = classifyScrape(run);
      assert.ok(reason.length > 20, `reason too thin for ${JSON.stringify(run)}: ${reason}`);
    }
  });

});

describe('assertSucceeded — the Apify terminal-status check', () => {
  test('lets a SUCCEEDED run through', () => {
    assert.doesNotThrow(() => assertSucceeded({ id: 'run_1', status: TERMINAL_OK }, 'Post'));
  });

  // The whole finding: each of these can leave a PARTIAL dataset behind, which
  // upserts perfectly cleanly. Before this check they were logged and ignored.
  for (const status of ['FAILED', 'ABORTED', 'TIMED-OUT', 'RUNNING', 'READY']) {
    test(`throws on a run that ended ${status}`, () => {
      assert.throws(
        () => assertSucceeded({ id: 'run_1', status }, 'Post'),
        (err) => err.message.includes(status) && err.message.includes('run_1'),
      );
    });
  }

  test('throws rather than trusting a run object with no status at all', () => {
    assert.throws(() => assertSucceeded({}, 'Profile'));
    assert.throws(() => assertSucceeded(null, 'Profile'));
  });
});
