import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOgCounts,
  parseAbbreviated,
  classifyLikeCheck,
  classifyLikeRun,
  roundingSlack,
  OVERSTATEMENT_TOLERANCE,
  FAIL_RATIO,
  MIN_CHECKED,
  SEVERE_RATIO,
} from '../likes-check.js';

// Same standard as scrape-outcome.test.js: the point is not that the rules are
// clever, it is that each one has a demonstrated path to firing. Several cases
// below are the REAL figures from the 2026-08-07 audit, so if the rule ever
// stops catching them, a test says so.

const og = (desc) => `<meta property="og:description" content="${desc}" />`;

describe('parseOgCounts — reading the live post', () => {
  test('exact counts', () => {
    const r = parseOgCounts(og('162 likes, 2 comments - rafflesdoha on June 3, 2026: &quot;hello'));
    assert.deepEqual(r, { likes: 162, comments: 2, author: 'rafflesdoha', rounded: false });
  });

  test('thousands separators', () => {
    assert.equal(parseOgCounts(og('1,228 likes, 26 comments - chevalblancofficial on October 27, 2023: &quot;x')).likes, 1228);
  });

  test('abbreviated counts are flagged as rounded', () => {
    const r = parseOgCounts(og('51K likes, 699 comments - lemeuriceparis on July 4, 2025: &quot;x'));
    assert.equal(r.likes, 51000);
    assert.equal(r.rounded, true);
  });

  test('the author is the account Instagram names, not the grid we filed it under', () => {
    // The real DbVz7z4gcyq case: stored against @rwmayakoba, owned by the parent brand.
    assert.equal(parseOgCounts(og('370 likes, 12 comments - rosewoodhotels on July 28, 2026: &quot;x')).author, 'rosewoodhotels');
  });

  test('singular "1 like, 1 comment" still parses', () => {
    const r = parseOgCounts(og('1 like, 1 comment - somehotel on May 1, 2026: &quot;x'));
    assert.equal(r.likes, 1);
    assert.equal(r.comments, 1);
  });

  test('a login-walled page yields null rather than a wrong number', () => {
    assert.equal(parseOgCounts('<html><head><title>Login • Instagram</title></head></html>'), null);
  });

  test('non-string input yields null', () => {
    assert.equal(parseOgCounts(undefined), null);
    assert.equal(parseOgCounts(null), null);
  });

  test('an og:description that is not the counts format yields null', () => {
    assert.equal(parseOgCounts(og('See photos and videos from Some Hotel')), null);
  });
});

describe('parseAbbreviated', () => {
  test('plain, comma, K and M', () => {
    assert.equal(parseAbbreviated('746'), 746);
    assert.equal(parseAbbreviated('20,174'), 20174);
    assert.equal(parseAbbreviated('51K'), 51000);
    assert.equal(parseAbbreviated('1.2M'), 1200000);
  });
  test('junk yields null, not NaN', () => {
    assert.equal(parseAbbreviated('lots'), null);
    assert.equal(parseAbbreviated(''), null);
    assert.equal(parseAbbreviated(42), null);
  });
});

describe('classifyLikeCheck — one post', () => {
  test('an exact match is ok', () => {
    assert.equal(classifyLikeCheck({ stored: 49989, live: { likes: 50000, rounded: true } }).code, 'ok');
  });

  test('stored LOWER than live is ok — the post kept earning likes after the scrape', () => {
    // Rank 1 of the audit's top 20: stored 46,067, live ~54,000. Normal, not a defect.
    const r = classifyLikeCheck({ stored: 46067, live: { likes: 54000, rounded: true } });
    assert.equal(r.code, 'ok');
    assert.ok(r.ratio < 1);
  });

  test('the la Mamounia Reel is caught', () => {
    const r = classifyLikeCheck({ stored: 4603, live: { likes: 746, rounded: false } });
    assert.equal(r.code, 'overstated');
    assert.ok(r.ratio > 6);
  });

  test('the Jumeirah Al Naseem Reel is caught', () => {
    assert.equal(classifyLikeCheck({ stored: 36202, live: { likes: 315, rounded: false } }).code, 'overstated');
  });

  test('the smallest real offender — Le Meurice at 1.9x — is still caught', () => {
    // The narrowest gap in the audit sample. If tolerance is ever widened past
    // this, the check stops catching the quiet end of the defect.
    assert.equal(classifyLikeCheck({ stored: 99009, live: { likes: 51000, rounded: true } }).code, 'overstated');
  });

  test('rounding alone never trips it: "51K" is treated as up to 51,499', () => {
    assert.equal(classifyLikeCheck({ stored: 51499, live: { likes: 51000, rounded: true } }).code, 'ok');
  });

  test('a figure just inside tolerance passes, just outside fails', () => {
    const live = { likes: 1000, rounded: false };
    assert.equal(classifyLikeCheck({ stored: 1000 * (1 + OVERSTATEMENT_TOLERANCE), live }).code, 'ok');
    assert.equal(classifyLikeCheck({ stored: 1000 * (1 + OVERSTATEMENT_TOLERANCE) + 1, live }).code, 'overstated');
  });

  test('a hidden-likes post is skipped, not judged', () => {
    assert.equal(classifyLikeCheck({ stored: null, live: { likes: 500, rounded: false } }).code, 'skipped');
  });

  test('an unreadable post is unverified, not assumed fine', () => {
    assert.equal(classifyLikeCheck({ stored: 5000, live: null }).code, 'unverified');
  });

  test('a live zero against a stored figure is overstated, not a divide-by-zero', () => {
    const r = classifyLikeCheck({ stored: 900, live: { likes: 0, rounded: false } });
    assert.equal(r.code, 'overstated');
    assert.equal(r.ratio, Infinity);
  });

  test('both zero is ok', () => {
    assert.equal(classifyLikeCheck({ stored: 0, live: { likes: 0, rounded: false } }).code, 'ok');
  });
});

describe('roundingSlack', () => {
  test('K-scale gets 500, M-scale gets 50k', () => {
    assert.equal(roundingSlack(51000), 500);
    assert.equal(roundingSlack(1200000), 50000);
  });
});

describe('classifyLikeRun — should the run fail?', () => {
  test('a clean feed passes', () => {
    const r = classifyLikeRun({ checked: 25, overstated: 0, unverified: 0 });
    assert.equal(r.ok, true);
    assert.equal(r.code, 'clean');
  });

  test('one MILDLY bad post in 25 reports but does not stop the pipeline', () => {
    const r = classifyLikeRun({ checked: 25, overstated: 1, unverified: 0, worstRatio: 1.9 });
    assert.equal(r.ok, true);
    assert.match(r.reason, /remove them in \/admin/);
  });

  test('one EGREGIOUS post fails on its own — the 8 Aug Marsa Al Arab case', () => {
    // 111,846 stored against a live 182. One in thirty is under the ratio limit,
    // and the first version of this rule let it pass. It must not.
    const r = classifyLikeRun({ checked: 30, overstated: 1, unverified: 0, worstRatio: 614.5 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'severe');
  });

  test('severity is checked before proportion', () => {
    const r = classifyLikeRun({ checked: 100, overstated: 1, unverified: 0, worstRatio: SEVERE_RATIO });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'severe');
  });

  test('just under the severity bar falls back to the ratio rule', () => {
    const r = classifyLikeRun({ checked: 30, overstated: 1, unverified: 0, worstRatio: SEVERE_RATIO - 0.01 });
    assert.equal(r.ok, true);
  });

  test('a live-zero post (ratio Infinity) fails and reads sensibly', () => {
    const r = classifyLikeRun({ checked: 30, overstated: 1, unverified: 0, worstRatio: Infinity });
    assert.equal(r.ok, false);
    assert.match(r.reason, /live zero/);
  });

  test('the 7 Aug state — roughly a fifth overstated — goes red', () => {
    const r = classifyLikeRun({ checked: 28, overstated: 6, unverified: 0, worstRatio: 2 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'overstated');
  });

  test('the top-20 state — 4 of 20 — goes red', () => {
    assert.equal(classifyLikeRun({ checked: 20, overstated: 4, unverified: 0, worstRatio: 2 }).ok, false);
  });

  test('a sample too small to judge fails rather than passing on two posts', () => {
    const r = classifyLikeRun({ checked: MIN_CHECKED - 1, overstated: 0, unverified: 20 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'too-few-checked');
  });

  test('exactly at the fail ratio passes; one more fails', () => {
    const atLimit = Math.round(20 * FAIL_RATIO);
    assert.equal(classifyLikeRun({ checked: 20, overstated: atLimit, unverified: 0, worstRatio: 2 }).ok, true);
    assert.equal(classifyLikeRun({ checked: 20, overstated: atLimit + 1, unverified: 0, worstRatio: 2 }).ok, false);
  });
});
