import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pickAthlFromChart } from '../src/lib/athl.ts';

describe('ATH/ATL snapshot', () => {
  const now = Date.UTC(2026, 9, 21); // 21 October 2026

  test('uses the historical extremes of the series', () => {
    const { ath, atl } = pickAthlFromChart(
      [
        { date: Date.UTC(2020, 0, 1), high: 100, low: 10, close: 50 },
        { date: Date.UTC(2021, 5, 1), high: 250, low: 20, close: 200 },
        { date: Date.UTC(2026, 8, 1), high: 300, low: 120, close: 280 },
      ],
      now
    );

    assert.strictEqual(ath, 300);
    assert.strictEqual(atl, 10);
  });

  test('ignores the in-progress monthly candle', () => {
    const { ath, atl } = pickAthlFromChart(
      [
        { date: Date.UTC(2020, 0, 1), high: 100, low: 10, close: 50 },
        { date: Date.UTC(2021, 5, 1), high: 250, low: 20, close: 200 },
        // Current month: its high already contains today's price.
        { date: Date.UTC(2026, 9, 1), high: 999, low: 1, close: 500 },
      ],
      now
    );

    assert.strictEqual(ath, 250, 'the current month must not become the ATH');
    assert.strictEqual(atl, 10, 'the current month must not become the ATL');
  });

  test('falls back to closes when highs and lows are missing', () => {
    const { ath, atl } = pickAthlFromChart(
      [
        { date: Date.UTC(2022, 0, 1), close: 42 },
        { date: Date.UTC(2023, 0, 1), close: 12 },
        { date: Date.UTC(2024, 0, 1), close: 87 },
      ],
      now
    );

    assert.strictEqual(ath, 87);
    assert.strictEqual(atl, 12);
  });

  test('accepts second-based timestamps and undated points', () => {
    const { ath, atl } = pickAthlFromChart(
      [
        { date: Date.UTC(2019, 0, 1) / 1000, high: 15, low: 3 },
        { high: 40, low: 2 }, // no date: always kept
      ],
      now
    );

    assert.strictEqual(ath, 40);
    assert.strictEqual(atl, 2);
  });

  test('returns nulls for an empty series', () => {
    assert.deepStrictEqual(pickAthlFromChart([], now), { ath: null, atl: null });
  });
});
