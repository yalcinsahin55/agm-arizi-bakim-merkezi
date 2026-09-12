import assert from 'node:assert/strict';
import test from 'node:test';
import { isMondayInTurkey, isNightShift, isOffHours, turkeyDateKey, turkeyIsWeekend, turkeyWeekStart } from '../lib/tz';

// Yardımcı: verilen Türkiye yerel saatine karşılık gelen UTC anını üretir (UTC+3 sabit).
function turkeyTime(isoLocal: string): Date {
  return new Date(new Date(`${isoLocal}Z`).getTime() - 3 * 60 * 60 * 1000);
}

test('night shift starts exactly at 20:00 Turkey time (inclusive)', () => {
  assert.equal(isNightShift(turkeyTime('2026-09-14T19:59:00')), false);
  assert.equal(isNightShift(turkeyTime('2026-09-14T20:00:00')), true);
});

test('night shift ends exactly at 06:00 Turkey time (exclusive)', () => {
  assert.equal(isNightShift(turkeyTime('2026-09-15T05:59:00')), true);
  assert.equal(isNightShift(turkeyTime('2026-09-15T06:00:00')), false);
});

test('daytime hours are never classified as night shift', () => {
  assert.equal(isNightShift(turkeyTime('2026-09-14T12:00:00')), false);
  assert.equal(isNightShift(turkeyTime('2026-09-14T06:01:00')), false);
  assert.equal(isNightShift(turkeyTime('2026-09-14T19:00:00')), false);
});

test('turkeyDateKey reflects Turkey-local date even near the UTC day boundary', () => {
  // 2026-09-14 23:00 UTC = 2026-09-15 02:00 Türkiye — tarih bir sonraki gün olmalı.
  assert.equal(turkeyDateKey(new Date('2026-09-14T23:00:00Z')), '2026-09-15');
  // 2026-09-15 00:30 UTC = 2026-09-15 03:30 Türkiye — hâlâ aynı gün.
  assert.equal(turkeyDateKey(new Date('2026-09-15T00:30:00Z')), '2026-09-15');
});

test('isMondayInTurkey correctly identifies Monday and rejects other days', () => {
  // 2026-09-14 bir Pazartesi'dir.
  assert.equal(isMondayInTurkey(turkeyTime('2026-09-14T10:00:00')), true);
  assert.equal(isMondayInTurkey(turkeyTime('2026-09-15T10:00:00')), false);
  assert.equal(isMondayInTurkey(turkeyTime('2026-09-20T10:00:00')), false);
});

test('turkeyWeekStart returns the same Monday for every day within that week', () => {
  const monday = '2026-09-14';
  assert.equal(turkeyWeekStart(turkeyTime('2026-09-14T00:01:00')), monday);
  assert.equal(turkeyWeekStart(turkeyTime('2026-09-17T15:00:00')), monday);
  assert.equal(turkeyWeekStart(turkeyTime('2026-09-20T23:59:00')), monday);
  // Bir sonraki Pazartesi farklı bir hafta anahtarı üretmeli.
  assert.equal(turkeyWeekStart(turkeyTime('2026-09-21T00:01:00')), '2026-09-21');
});

test('turkeyIsWeekend is true for all of Saturday and Sunday, false on weekdays', () => {
  // 2026-09-19 Cumartesi, 2026-09-20 Pazar.
  assert.equal(turkeyIsWeekend(turkeyTime('2026-09-19T00:30:00')), true);
  assert.equal(turkeyIsWeekend(turkeyTime('2026-09-19T14:00:00')), true);
  assert.equal(turkeyIsWeekend(turkeyTime('2026-09-20T23:00:00')), true);
  assert.equal(turkeyIsWeekend(turkeyTime('2026-09-18T14:00:00')), false);
  assert.equal(turkeyIsWeekend(turkeyTime('2026-09-21T14:00:00')), false);
});

test('isOffHours covers weekday nights, all-day Saturday, and all-day Sunday', () => {
  // Hafta içi gündüz: mesai dışı değil.
  assert.equal(isOffHours(turkeyTime('2026-09-16T14:00:00')), false);
  // Hafta içi gece: mesai dışı.
  assert.equal(isOffHours(turkeyTime('2026-09-16T21:00:00')), true);
  // Cumartesi gündüz (gece penceresinde olmasa bile): mesai dışı.
  assert.equal(isOffHours(turkeyTime('2026-09-19T11:00:00')), true);
  // Pazar gündüz: mesai dışı.
  assert.equal(isOffHours(turkeyTime('2026-09-20T11:00:00')), true);
  // Pazartesi 05:00 (Pazar gecesinin devamı, gece penceresi zaten kapsıyor): mesai dışı.
  assert.equal(isOffHours(turkeyTime('2026-09-21T05:00:00')), true);
  // Pazartesi 09:00: normal mesai.
  assert.equal(isOffHours(turkeyTime('2026-09-21T09:00:00')), false);
});
