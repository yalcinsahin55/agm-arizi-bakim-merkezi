import assert from 'node:assert/strict';
import { isActionAllowedForStatus } from '../lib/breakdown-workflow';

const expected = [
  ['seen', 'atandi', true],
  ['accept', 'atandi', true],
  ['start', 'atandi', true],
  ['submit', 'devam_ediyor', true],
  ['approve', 'onay_bekliyor', true],
  ['revision', 'onay_bekliyor', true],
  ['approve', 'devam_ediyor', false],
  ['submit', 'atandi', false],
] as const;

for (const [action, status, expectedResult] of expected) {
  assert.equal(isActionAllowedForStatus(action, status), expectedResult);
}

console.log(`Workflow transition checks passed: ${expected.length}`);
