// Did a scrape run succeed? Pulled out of scrape-run.js as a pure function so
// it can be TESTED — the whole point of this file.
//
// This project's recurring failure is the safeguard with no path to failure: a
// check that has never gone red because it *cannot*. The 1 Aug scrape is the
// canonical case — every batch threw, the loop caught each one, the run printed
// SCRAPE COMPLETE and exited 0, and GitHub showed a green tick over a week that
// collected nothing. The exit-code rules below are the guard against that, so
// they get a test that proves each one can fire.

// A run where at least this share of batches failed is escalated to a hard
// failure even though the surviving batches collected posts. At the current
// 50-hotel batch size that is ~100 hotels missing a week — far past what the
// next run's overlapping window is meant to paper over.
export const ESCALATION_RATIO = 0.5;

// Apify run statuses that mean the actor finished its work. Anything else —
// FAILED, ABORTED, TIMED-OUT — can still leave a partial dataset behind, which
// upserts perfectly cleanly and is exactly how a half-scraped week used to pass
// for a whole one.
export const TERMINAL_OK = 'SUCCEEDED';

// An Apify run that ends FAILED, ABORTED or TIMED-OUT can still have written a
// partial dataset — and a partial dataset upserts as cleanly as a whole one.
// That is how a batch dying after 30 of its 50 hotels used to pass for a
// complete week: nothing threw, the posts saved, the run reported success and
// twenty hotels silently missed the scrape.
//
// So scrape.js CHECKS the status rather than only logging it. Throwing hands the
// batch to the runner's existing error handling, which lists every handle as
// skipped and folds into the counts above. It does discard partial results we
// already paid for — deliberately: the windowed scrapes overlap, so the next run
// refetches them, and a loud failure is worth more than a few cents of Apify
// credit.
export function assertSucceeded(run, label) {
  if (run?.status !== TERMINAL_OK) {
    throw new Error(
      `${label} actor run ${run?.id ?? '(no id)'} ended ${run?.status ?? 'with no status'}, ` +
        `not ${TERMINAL_OK} — treating this batch as failed rather than ingesting a partial dataset.`,
    );
  }
}

/**
 * @param {{batchCount: number, failedCount: number, totalPosts: number}} run
 * @returns {{ok: boolean, code: 'ok'|'partial'|'all-failed'|'no-posts'|'mass-failure', reason: string}}
 */
export function classifyScrape({ batchCount, failedCount, totalPosts }) {
  if (batchCount > 0 && failedCount === batchCount) {
    return {
      ok: false,
      code: 'all-failed',
      reason: 'Every batch failed — nothing was scraped.',
    };
  }

  if (totalPosts === 0) {
    return {
      ok: false,
      code: 'no-posts',
      reason: 'No posts were collected, so nothing in Supabase changed.',
    };
  }

  if (failedCount > 0 && failedCount >= batchCount * ESCALATION_RATIO) {
    return {
      ok: false,
      code: 'mass-failure',
      reason: `${failedCount} of ${batchCount} batches failed — too much of the week is missing to wait for the next run.`,
    };
  }

  if (failedCount > 0) {
    return {
      ok: true,
      code: 'partial',
      reason: `${failedCount} of ${batchCount} batches failed, but ${totalPosts} posts were still collected.`,
    };
  }

  return { ok: true, code: 'ok', reason: `${totalPosts} posts collected across ${batchCount} batches.` };
}
