import assert from 'node:assert/strict';
import test from 'node:test';
import { can } from '../lib/permissions';
import type { Role } from '../types';

const roles: Role[] = ['yonetici', 'teknisyen', 'operator', 'goruntuleyici'];

test('yonetici (admin) has unrestricted access to any action string', () => {
  assert.equal(can('yonetici', 'breakdown:create'), true);
  assert.equal(can('yonetici', 'breakdown:delete-own'), true);
  assert.equal(can('yonetici', 'anything-not-a-real-action'), true);
});

test('teknisyen can only act on assigned-job actions, never create/edit/report:view', () => {
  assert.equal(can('teknisyen', 'breakdown:view-assigned'), true);
  assert.equal(can('teknisyen', 'breakdown:accept'), true);
  assert.equal(can('teknisyen', 'breakdown:start'), true);
  assert.equal(can('teknisyen', 'breakdown:report'), true);
  assert.equal(can('teknisyen', 'breakdown:create'), false);
  assert.equal(can('teknisyen', 'breakdown:edit-own'), false);
  assert.equal(can('teknisyen', 'breakdown:delete-own'), false);
  assert.equal(can('teknisyen', 'report:view'), false);
  assert.equal(can('teknisyen', 'breakdown:view-all'), false);
});

test('operator can create/edit/delete only their own records, never view-all or report:view', () => {
  assert.equal(can('operator', 'breakdown:create'), true);
  assert.equal(can('operator', 'breakdown:edit-own'), true);
  assert.equal(can('operator', 'breakdown:delete-own'), true);
  assert.equal(can('operator', 'breakdown:view-own'), true);
  assert.equal(can('operator', 'breakdown:view-all'), false);
  assert.equal(can('operator', 'report:view'), false);
  assert.equal(can('operator', 'breakdown:accept'), false);
});

test('goruntuleyici (read-only viewer) can never mutate breakdowns', () => {
  assert.equal(can('goruntuleyici', 'breakdown:view-all'), true);
  assert.equal(can('goruntuleyici', 'report:view'), true);
  assert.equal(can('goruntuleyici', 'breakdown:create'), false);
  assert.equal(can('goruntuleyici', 'breakdown:edit-own'), false);
  assert.equal(can('goruntuleyici', 'breakdown:delete-own'), false);
  assert.equal(can('goruntuleyici', 'breakdown:accept'), false);
  assert.equal(can('goruntuleyici', 'breakdown:start'), false);
});

test('no non-admin role is ever granted the wildcard "*" action literally', () => {
  for (const role of roles) {
    if (role === 'yonetici') continue;
    assert.equal(can(role, '*'), false, `${role} should not match a literal "*" action`);
  }
});
