import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMarketStatus,
  formatExchangeTime,
  describeOpeningDay,
} from '../src/lib/marketStatus';

const MIN = 60_000;
const at = (h: number, m = 0) => Date.UTC(2026, 9, 16, h, m);

// Monday 09:00-17:30 venue hours, expressed in UTC for readability.
const sessions = [
  { opensAt: at(7), closesAt: at(15, 30) },
  { opensAt: Date.UTC(2026, 9, 19, 7), closesAt: Date.UTC(2026, 9, 19, 15, 30) },
];

describe('Market status derived from sessions', () => {
  test('returns null when no session is known', () => {
    assert.equal(getMarketStatus(null, at(10)), null);
    assert.equal(getMarketStatus([], at(10)), null);
  });

  test('reports open during a session, with the closing time', () => {
    const status = getMarketStatus(sessions, at(10));
    assert.equal(status?.kind, 'open');
    assert.equal(status?.at, at(15, 30));
  });

  test('reports just closed within 30 minutes of the close', () => {
    const status = getMarketStatus(sessions, at(15, 40));
    assert.equal(status?.kind, 'just_closed');
    assert.equal(status?.minutes, 10);
  });

  test('stops saying just closed after 30 minutes', () => {
    const status = getMarketStatus(sessions, at(16, 5));
    assert.equal(status?.kind, 'closed');
    assert.equal(status?.at, Date.UTC(2026, 9, 19, 7));
  });

  test('reports opens soon within 60 minutes of the open', () => {
    const status = getMarketStatus(sessions, Date.UTC(2026, 9, 19, 6, 30));
    assert.equal(status?.kind, 'opens_soon');
    assert.equal(status?.minutes, 30);
  });

  test('reports closed with the next opening when the open is far away', () => {
    const status = getMarketStatus(sessions, at(3));
    assert.equal(status?.kind, 'closed');
    assert.equal(status?.at, at(7));
  });

  test('returns null when every known session is in the past', () => {
    assert.equal(getMarketStatus(sessions, Date.UTC(2026, 9, 25, 12)), null);
  });
});

describe('Venue-time formatting', () => {
  test('formats the wall-clock time in the venue timezone with a 24h clock', () => {
    // 15:30Z is 17:30 in Paris in October (CEST).
    assert.equal(formatExchangeTime(at(15, 30), 'Europe/Paris', 'en'), '17:30');
    assert.equal(formatExchangeTime(at(15, 30), 'Europe/Paris', 'fr'), '17:30');
  });

  test('says today, tomorrow or the weekday for an opening', () => {
    const now = at(18);
    assert.deepEqual(describeOpeningDay(at(20), 'Europe/Paris', now, 'en'), { kind: 'today' });
    assert.deepEqual(
      describeOpeningDay(Date.UTC(2026, 9, 17, 7), 'Europe/Paris', now, 'en'),
      { kind: 'tomorrow' }
    );
    const later = describeOpeningDay(Date.UTC(2026, 9, 19, 7), 'Europe/Paris', now, 'en');
    assert.equal(later.kind, 'weekday');
    assert.equal((later as { name: string }).name, 'Monday');
    assert.equal(
      (describeOpeningDay(Date.UTC(2026, 9, 19, 7), 'Europe/Paris', now, 'fr') as { name: string }).name,
      'lundi'
    );
  });

  test('uses the venue calendar day, not the viewer one', () => {
    // 03:30 UTC on 17 Oct is still 16 Oct in New York, but already 17 Oct in Paris.
    const nowNy = Date.UTC(2026, 9, 17, 3, 30);
    const opensParis = Date.UTC(2026, 9, 17, 7);
    assert.deepEqual(describeOpeningDay(opensParis, 'Europe/Paris', nowNy, 'en'), { kind: 'today' });
  });

  test('minutes are never negative in the just-closed state', () => {
    const status = getMarketStatus(sessions, at(15, 30) + MIN);
    assert.equal(status?.minutes, 1);
  });
});
