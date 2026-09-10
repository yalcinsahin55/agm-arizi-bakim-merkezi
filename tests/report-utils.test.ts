import assert from 'node:assert/strict';
import test from 'node:test';
import { average, csvEscape, minutesBetween } from '../lib/report-utils';

test('minutesBetween handles valid dates and prevents negative durations', () => {
  assert.equal(minutesBetween('2026-09-09T10:00:00Z', '2026-09-09T11:35:00Z'), 95);
  assert.equal(minutesBetween('2026-09-09T11:35:00Z', '2026-09-09T10:00:00Z'), 0);
  assert.equal(minutesBetween(null, '2026-09-09T10:00:00Z'), null);
});

test('average returns rounded integer or null', () => {
  assert.equal(average([10, 11, 12]), 11);
  assert.equal(average([]), null);
});

test('csvEscape prevents spreadsheet formula injection', () => {
  assert.equal(csvEscape('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(csvEscape('motor,1'), '"motor,1"');
});
