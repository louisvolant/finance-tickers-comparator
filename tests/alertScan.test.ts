import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isVenueOpen, planScan } from '../src/lib/alertScan.ts';
import type { UserTicker } from '../src/lib/types.ts';

/** Wednesday 21 October 2026, 12:00 in Paris and 06:00 in New York. */
const PARIS_OPEN = Date.UTC(2026, 9, 21, 10, 0);

function ticker(overrides: Partial<UserTicker> = {}): UserTicker {
  return {
    id: 'tck_1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    trackingValue: null,
    order: 0,
    createdAt: Date.UTC(2026, 0, 1),
    exchangeTimezone: 'Europe/Paris',
    ...overrides,
  };
}

describe('Alert scan planning', () => {
  test('treats a venue as open only inside its regular session', () => {
    assert.strictEqual(isVenueOpen('Europe/Paris', PARIS_OPEN), true);
    // 22:00 in Paris.
    assert.strictEqual(isVenueOpen('Europe/Paris', Date.UTC(2026, 9, 21, 20, 0)), false);
    // Saturday.
    assert.strictEqual(isVenueOpen('Europe/Paris', Date.UTC(2026, 9, 24, 10, 0)), false);
  });

  test('treats unknown venues as open rather than silently skipping them', () => {
    assert.strictEqual(isVenueOpen(null, PARIS_OPEN), true);
    assert.strictEqual(isVenueOpen(undefined, PARIS_OPEN), true);
    assert.strictEqual(isVenueOpen('Pacific/Chatham', PARIS_OPEN), true);
  });

  test('only selects tickers that opted into alerts', () => {
    const entries = [
      {
        userId: 'usr_1',
        tickers: [
          ticker({ id: 'a', alertHigh: 200 }),
          ticker({ id: 'b', alertHigh: null, alertLow: null }),
          ticker({ id: 'c', alertLow: 50 }),
        ],
      },
    ];

    const plan = planScan(entries, PARIS_OPEN);
    assert.deepStrictEqual(
      plan.candidates.map((c) => c.ticker.id),
      ['a', 'c']
    );
  });

  test('skips closed venues and keeps open ones', () => {
    const entries = [
      {
        userId: 'usr_1',
        tickers: [
          ticker({ id: 'paris', symbol: 'MC.PA', exchangeTimezone: 'Europe/Paris', alertHigh: 700 }),
          ticker({ id: 'ny', symbol: 'AAPL', exchangeTimezone: 'America/New_York', alertHigh: 300 }),
        ],
      },
    ];

    const plan = planScan(entries, PARIS_OPEN);
    assert.deepStrictEqual(
      plan.candidates.map((c) => c.ticker.symbol),
      ['MC.PA']
    );
    assert.deepStrictEqual(plan.symbols, ['MC.PA']);
  });

  test('falls back to the timezone stored on the quote', () => {
    const entries = [
      {
        userId: 'usr_1',
        tickers: [
          ticker({
            id: 'ny',
            symbol: 'AAPL',
            exchangeTimezone: null,
            quote: { exchangeTimezone: 'America/New_York' } as any,
            alertHigh: 300,
          }),
        ],
      },
    ];

    assert.deepStrictEqual(planScan(entries, PARIS_OPEN).candidates, []);
  });

  test('never gates futures on the exchange calendar', () => {
    const entries = [
      {
        userId: 'usr_1',
        tickers: [
          ticker({
            id: 'future',
            symbol: 'ES=F',
            exchangeTimezone: 'America/New_York',
            quote: { quoteType: 'FUTURE' } as any,
            alertHigh: 6000,
          }),
        ],
      },
    ];

    // 03:00 UTC, outside every regular session.
    assert.strictEqual(planScan(entries, Date.UTC(2026, 9, 21, 3, 0)).candidates.length, 1);
  });

  test('de-duplicates symbols watched by several users', () => {
    const entries = [
      { userId: 'usr_1', tickers: [ticker({ id: 'a', symbol: 'AAPL', alertHigh: 300 })] },
      { userId: 'usr_2', tickers: [ticker({ id: 'b', symbol: 'aapl', alertLow: 100 })] },
    ];

    const plan = planScan(entries, PARIS_OPEN);
    assert.strictEqual(plan.candidates.length, 2);
    assert.deepStrictEqual(plan.symbols, ['AAPL']);
  });

  test('returns an empty plan when nothing is eligible', () => {
    assert.deepStrictEqual(planScan([], PARIS_OPEN), { candidates: [], symbols: [] });
  });
});
