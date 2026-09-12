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

test('manager actions are rejected for archived records too, even for the correct status', () => {
  assert.equal(canPerformBreakdownAction('approve', 'yonetici', {
    status: 'onay_bekliyor',
    assignedTechnicianId: 'tech-1',
    archived: true,
  }, 'manager-1'), false);
});

test('a technician can never trigger a manager-only action (approve/revision), regardless of status', () => {
  assert.equal(canPerformBreakdownAction('approve', 'teknisyen', {
    status: 'onay_bekliyor',
    assignedTechnicianId: 'tech-1',
    archived: false,
  }, 'tech-1'), false);
  assert.equal(canPerformBreakdownAction('revision', 'teknisyen', {
    status: 'onay_bekliyor',
    assignedTechnicianId: 'tech-1',
    archived: false,
  }, 'tech-1'), false);
});

test('a manager can never trigger a technician-only action (accept/start/submit)', () => {
  assert.equal(canPerformBreakdownAction('accept', 'yonetici', base, 'manager-1'), false);
  assert.equal(canPerformBreakdownAction('start', 'yonetici', base, 'manager-1'), false);
  assert.equal(canPerformBreakdownAction('submit', 'yonetici', { ...base, status: 'devam_ediyor' }, 'manager-1'), false);
});

test('operator and goruntuleyici roles can never perform any workflow action', () => {
  for (const role of ['operator', 'goruntuleyici'] as const) {
    assert.equal(canPerformBreakdownAction('accept', role, base, 'tech-1'), false);
    assert.equal(canPerformBreakdownAction('approve', role, { ...base, status: 'onay_bekliyor' }, 'manager-1'), false);
  }
});
