import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeRegex } from '../lib/escape-regex';

test('escapes every character with special meaning in a JS/Mongo regex', () => {
  const special = '.*+?^${}()|[]\\';
  const escaped = escapeRegex(special);
  // Her özel karakterin önüne bir ters slash eklenmiş olmalı.
  for (const ch of special) {
    assert.ok(escaped.includes(`\\${ch}`), `expected ${ch} to be escaped`);
  }
});

test('a classic ReDoS-style pattern is neutralized into a literal string match', () => {
  const malicious = '(a+)+$';
  const escaped = escapeRegex(malicious);
  const re = new RegExp(escaped, 'i');
  // Kaçışlanmış hali sadece kendisiyle birebir eşleşir, regex olarak yorumlanmaz.
  assert.equal(re.test('(a+)+$'), true);
  assert.equal(re.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaX'), false);
});

test('plain alphanumeric search terms are left unchanged', () => {
  assert.equal(escapeRegex('ARZ-2026-000123'), 'ARZ-2026-000123');
  assert.equal(escapeRegex('Motor 4'), 'Motor 4');
});

test('a NoSQL-injection-style operator string is treated as literal text, not parsed', () => {
  const attempt = '{"$ne": null}';
  const escaped = escapeRegex(attempt);
  const re = new RegExp(escaped, 'i');
  assert.equal(re.test(attempt), true);
  assert.equal(re.test('anything else'), false);
});
