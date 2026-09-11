import assert from 'node:assert/strict';
import test from 'node:test';
import { canPerformBreakdownAction, isActionAllowedForStatus } from '../lib/breakdown-workflow';

const base = { status: 'atandi' as const, assignedTechnicianId: 'tech-1', archived: false };

test('only assigned technician can acknowledge a job', () => {
  assert.equal(canPerformBreakdownAction('accept', 'teknisyen', base, 'tech-1'), true);
  assert.equal(canPerformBreakdownAction('accept', 'teknisyen', base, 'tech-2'), false);
  assert.equal(canPerformBreakdownAction('accept', 'operator', base, 'tech-1'), false);
});

test('manager approval is allowed only while waiting for approval', () => {
  assert.equal(isActionAllowedForStatus('approve', 'onay_bekliyor'), true);
  assert.equal(isActionAllowedForStatus('approve', 'devam_ediyor'), false);
  assert.equal(canPerformBreakdownAction('approve', 'yonetici', {
    ...base,
    status: 'onay_bekliyor',
  }, 'manager-1'), true);
});

test('archived records reject every workflow action', () => {
  assert.equal(canPerformBreakdownAction('start', 'teknisyen', {
    ...base,
    archived: true,
  }, 'tech-1'), false);
});
