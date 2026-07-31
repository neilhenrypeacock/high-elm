// node --test — no test framework dependency; run with `npm test` in this folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLikesCount } from '../likes.js';

test('real like counts pass through unchanged', () => {
  assert.equal(normalizeLikesCount(0), 0);
  assert.equal(normalizeLikesCount(1), 1);
  assert.equal(normalizeLikesCount(2), 2);
  assert.equal(normalizeLikesCount(4), 4);
  assert.equal(normalizeLikesCount(27_233), 27_233);
});

test('the 3 preview-count leak is stored as null', () => {
  // The Jun/Jul 2026 actor behaviour: hidden-like posts arrive as likesCount: 3
  // (the 3-avatar "liked by A, B and others" preview). 813 of these reached the
  // DB as "genuine" 3-like posts before the audit caught it.
  assert.equal(normalizeLikesCount(3), null);
});

test('the -1 hidden sentinel is stored as null', () => {
  assert.equal(normalizeLikesCount(-1), null);
});

test('missing or unreadable values are stored as null', () => {
  assert.equal(normalizeLikesCount(null), null);
  assert.equal(normalizeLikesCount(undefined), null);
  assert.equal(normalizeLikesCount(NaN), null);
  assert.equal(normalizeLikesCount(Infinity), null);
  assert.equal(normalizeLikesCount('3'), null); // strings are not counts
  assert.equal(normalizeLikesCount(-7), null);  // any negative is a sentinel shape
});
