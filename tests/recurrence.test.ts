import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyRecurrence } from '../lib/recurrence';

test('no warning below the recurrence threshold', () => {
  assert.equal(classifyRecurrence(0), null);
  assert.equal(classifyRecurrence(1), null);
});

test('"orta" (medium) warning for 2-3 prior records in the window', () => {
  assert.equal(classifyRecurrence(2), 'orta');
  assert.equal(classifyRecurrence(3), 'orta');
});

test('"yuksek" (high) warning for 4 or more prior records', () => {
  assert.equal(classifyRecurrence(4), 'yuksek');
  assert.equal(classifyRecurrence(20), 'yuksek');
});

test('negative counts (should never occur, but must fail safe) produce no warning', () => {
  assert.equal(classifyRecurrence(-1), null);
});
