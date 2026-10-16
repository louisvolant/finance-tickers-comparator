import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildMarketSessions, easterSunday, zonedWallClockToEpoch } from '../src/lib/marketCalendar';

const utc = (y: number, m: number, d: number, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const has = (sessions: { opensAt: number }[], epoch: number) => sessions.some((s) => s.opensAt === epoch);

describe('Exchange trading calendars', () => {
  test('Easter Sunday matches known dates', () => {
    assert.equal(easterSunday(2026).toISOString().slice(0, 10), '2026-04-05');
    assert.equal(easterSunday(2025).toISOString().slice(0, 10), '2025-04-20');
  });

  test('converts exchange wall-clock time across the DST switch', () => {
    // Paris is UTC+2 in summer, UTC+1 in winter.
    assert.equal(zonedWallClockToEpoch(2026, 10, 16, 9, 0, 'Europe/Paris'), utc(2026, 10, 16, 7, 0));
    assert.equal(zonedWallClockToEpoch(2026, 10, 26, 9, 0, 'Europe/Paris'), utc(2026, 10, 26, 8, 0));
  });

  test('returns null for unknown timezones', () => {
    assert.equal(buildMarketSessions('Asia/Tokyo', utc(2026, 10, 16, 12)), null);
    assert.equal(buildMarketSessions(null, utc(2026, 10, 16, 12)), null);
  });

  test('returns ten regular sessions with the Paris opening hours', () => {
    const sessions = buildMarketSessions('Europe/Paris', utc(2026, 10, 16, 12))!;
    assert.equal(sessions.length, 10);
    assert.equal(sessions[0].opensAt, utc(2026, 10, 16, 7, 0));
    assert.equal(sessions[0].closesAt, utc(2026, 10, 16, 15, 30));
  });

  test('never schedules a session on a weekend', () => {
    const sessions = buildMarketSessions('Europe/Paris', utc(2026, 10, 16, 12))!;
    for (const s of sessions) {
      const weekday = new Date(s.opensAt).getUTCDay();
      assert.ok(weekday !== 0 && weekday !== 6, `weekend session at ${new Date(s.opensAt).toISOString()}`);
    }
  });

  test('keeps the same local opening time after the DST switch', () => {
    const sessions = buildMarketSessions('Europe/Paris', utc(2026, 10, 16, 12))!;
    assert.ok(has(sessions, utc(2026, 10, 26, 8, 0)), 'Monday 26 Oct opens at 09:00 CET (08:00Z)');
  });

  test('skips Labour Day for Euronext Paris', () => {
    const sessions = buildMarketSessions('Europe/Paris', utc(2026, 4, 30, 12))!;
    assert.ok(!has(sessions, utc(2026, 5, 1, 7, 0)), '1 May is closed');
    assert.ok(has(sessions, utc(2026, 5, 4, 7, 0)), 'Monday 4 May is open');
  });

  test('skips Good Friday and Easter Monday for Euronext Paris', () => {
    const sessions = buildMarketSessions('Europe/Paris', utc(2026, 3, 31, 12))!;
    assert.ok(!has(sessions, utc(2026, 4, 3, 7, 0)), 'Good Friday is closed');
    assert.ok(!has(sessions, utc(2026, 4, 6, 7, 0)), 'Easter Monday is closed');
    assert.ok(has(sessions, utc(2026, 4, 7, 7, 0)), 'Tuesday 7 April is open');
  });

  test('keeps Euronext Paris open on holidays only Paris ignores', () => {
    const sessions = buildMarketSessions('Europe/Paris', utc(2026, 5, 7, 12))!;
    assert.ok(has(sessions, utc(2026, 5, 8, 7, 0)), 'Victory Day (8 May) is a trading day for Euronext');
  });

  test('keeps NYSE open on Columbus Day, which is a federal but not exchange holiday', () => {
    // Columbus Day 2026 is Monday 12 October: NYSE trades that day.
    const sessions = buildMarketSessions('America/New_York', utc(2026, 10, 9, 15))!;
    assert.ok(has(sessions, utc(2026, 10, 12, 13, 30)), 'NYSE trades on Columbus Day');
    assert.ok(has(sessions, utc(2026, 10, 13, 13, 30)), 'Tuesday 13 October is open at 09:30 EDT');
  });

  test('closes NYSE on Good Friday', () => {
    const sessions = buildMarketSessions('America/New_York', utc(2026, 4, 2, 15))!;
    assert.ok(!has(sessions, utc(2026, 4, 3, 13, 30)), 'Good Friday is closed for NYSE');
  });
});
