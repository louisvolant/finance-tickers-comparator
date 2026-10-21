import { test, describe } from 'node:test';
import assert from 'node:assert';
import { alertsEnabled, evaluateAlerts, ALERT_REARM_PULLBACK, parseAlertThreshold, validateAlertPair } from '../src/lib/alerts.ts';
import type { TickerQuote } from '../src/lib/types.ts';

const NOW = Date.UTC(2026, 9, 21, 14, 0, 0);

function quote(overrides: Partial<TickerQuote> = {}): TickerQuote {
  return {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 100,
    change: 0,
    changePercent: 0,
    currency: 'USD',
    trailingPE: null,
    forwardPE: null,
    marketCap: null,
    dividendYield: null,
    fiftyTwoWeekHigh: 120,
    fiftyTwoWeekLow: 50,
    dayHigh: 101,
    dayLow: 99,
    epsTrailingTwelveMonths: null,
    beta: null,
    volume: null,
    avgVolume: null,
    exchange: 'NMS',
    quoteType: 'EQUITY',
    updatedAt: NOW,
    ...overrides,
  };
}

function ticker(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tck_1',
    symbol: 'AAPL',
    alertHigh: 110,
    alertLow: 90,
    alertCurrency: 'USD',
    ...overrides,
  } as any;
}

describe('Price alert evaluation', () => {
  test('detects which tickers have at least one threshold', () => {
    assert.strictEqual(alertsEnabled({ alertHigh: 200 }), true);
    assert.strictEqual(alertsEnabled({ alertLow: 50 }), true);
    assert.strictEqual(alertsEnabled({ alertHigh: null, alertLow: null }), false);
    assert.strictEqual(alertsEnabled({}), false);
    assert.strictEqual(alertsEnabled({ alertHigh: 0 }), false);
  });

  test('the first evaluation only arms, it never fires', () => {
    // Price is already above the threshold: subscribing must not notify at once.
    const result = evaluateAlerts(ticker(), quote({ price: 130, dayHigh: 131 }), null, undefined, NOW);

    assert.deepStrictEqual(result.events, []);
    assert.strictEqual(result.state.highArmed, false, 'an already-crossed side starts disarmed');
    assert.strictEqual(result.state.lowArmed, true);
    assert.strictEqual(result.changed, true, 'the initial state must be persisted');
  });

  test('fires on the session high even when the price already reverted', () => {
    const armed = evaluateAlerts(ticker(), quote({ price: 100 }), null, undefined, NOW);

    const result = evaluateAlerts(
      ticker(),
      quote({ price: 104, dayHigh: 112, dayLow: 99 }),
      null,
      armed.state,
      NOW + 5 * 60_000
    );

    assert.strictEqual(result.events.length, 1);
    const event = result.events[0];
    assert.strictEqual(event.side, 'high');
    assert.strictEqual(event.symbol, 'AAPL');
    assert.strictEqual(event.threshold, 110);
    assert.strictEqual(event.observed, 112);
    assert.strictEqual(event.price, 104);
    assert.strictEqual(result.state.highArmed, false);
    assert.strictEqual(result.state.highTriggeredAt, NOW + 5 * 60_000);
  });

  test('stays silent while the price remains above after a trigger', () => {
    const fired = evaluateAlerts(
      ticker({ alertLow: null }),
      quote({ price: 120, dayHigh: 121 }),
      null,
      { highArmed: true, lowArmed: false, highTriggeredAt: null, lowTriggeredAt: null },
      NOW
    );

    const again = evaluateAlerts(
      ticker({ alertLow: null }),
      quote({ price: 118, dayHigh: 122 }),
      null,
      fired.state,
      NOW + 5 * 60_000
    );

    assert.deepStrictEqual(again.events, [], 'no repeat notification without a pullback');
    assert.strictEqual(again.changed, false);
  });

  test('re-arms after the hysteresis pullback and can fire again', () => {
    const belowBand = 110 * (1 - ALERT_REARM_PULLBACK) - 0.01;

    const rearmed = evaluateAlerts(
      ticker({ alertLow: null }),
      quote({ price: belowBand, dayHigh: belowBand, dayLow: belowBand }),
      null,
      { highArmed: false, lowArmed: false, highTriggeredAt: NOW, lowTriggeredAt: null },
      NOW + 5 * 60_000
    );

    assert.strictEqual(rearmed.state.highArmed, true);
    assert.deepStrictEqual(rearmed.events, []);

    const firedAgain = evaluateAlerts(
      ticker({ alertLow: null }),
      quote({ price: 115, dayHigh: 116, dayLow: belowBand }),
      null,
      rearmed.state,
      NOW + 10 * 60_000
    );

    assert.strictEqual(firedAgain.events.length, 1);
    assert.strictEqual(firedAgain.events[0].side, 'high');
  });

  test('fires on the lower threshold using the session low', () => {
    const result = evaluateAlerts(
      ticker({ alertHigh: null }),
      quote({ price: 92, dayHigh: 100, dayLow: 88 }),
      null,
      { highArmed: false, lowArmed: true, highTriggeredAt: null, lowTriggeredAt: null },
      NOW
    );

    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.events[0].side, 'low');
    assert.strictEqual(result.events[0].observed, 88);
    assert.strictEqual(result.state.lowArmed, false);
    assert.strictEqual(result.state.lowTriggeredAt, NOW);
  });

  test('converts a threshold entered in another currency into the listing currency', () => {
    const rates = { EUR: 1, USD: 1.1 };
    // 100 EUR = 110 USD, exactly the listing price.
    const result = evaluateAlerts(
      ticker({ alertHigh: 100, alertLow: null, alertCurrency: 'EUR' }),
      quote({ price: 112, dayHigh: 112, dayLow: 111, currency: 'USD' }),
      rates,
      { highArmed: true, lowArmed: false, highTriggeredAt: null, lowTriggeredAt: null },
      NOW
    );

    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.events[0].threshold, 110);
    assert.strictEqual(result.events[0].thresholdOriginal, 100);
    assert.strictEqual(result.events[0].currency, 'EUR');
  });

  test('never fires when the threshold currency cannot be converted', () => {
    const previous = { highArmed: true, lowArmed: false, highTriggeredAt: null, lowTriggeredAt: null };
    const result = evaluateAlerts(
      ticker({ alertHigh: 100, alertLow: null, alertCurrency: 'EUR' }),
      quote({ price: 500, dayHigh: 500 }),
      null, // no rates
      previous,
      NOW
    );

    assert.deepStrictEqual(result.events, []);
    assert.deepStrictEqual(result.state, previous, 'the arming state is preserved');
    assert.strictEqual(result.changed, false);
  });

  test('ignores a missing side and keeps the other one working', () => {
    const result = evaluateAlerts(
      ticker({ alertHigh: null, alertLow: 90 }),
      quote({ price: 91, dayHigh: 95, dayLow: 89 }),
      null,
      { highArmed: false, lowArmed: true, highTriggeredAt: null, lowTriggeredAt: null },
      NOW
    );

    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.events[0].side, 'low');
  });
});

describe('Alert threshold validation', () => {
  test('distinguishes an omitted field from an explicit clear', () => {
    assert.deepStrictEqual(parseAlertThreshold(undefined), {
      provided: false,
      valid: true,
      value: null,
    });
    assert.deepStrictEqual(parseAlertThreshold(null), {
      provided: true,
      valid: true,
      value: null,
    });
    assert.deepStrictEqual(parseAlertThreshold(''), {
      provided: true,
      valid: true,
      value: null,
    });
  });

  test('accepts positive numbers and rounds them', () => {
    assert.deepStrictEqual(parseAlertThreshold(210.123456), {
      provided: true,
      valid: true,
      value: 210.1235,
    });
    assert.deepStrictEqual(parseAlertThreshold('42.5'), {
      provided: true,
      valid: true,
      value: 42.5,
    });
  });

  test('rejects zero, negatives and non-numeric input', () => {
    for (const raw of [0, -5, 'abc', NaN, Infinity, {}, []]) {
      assert.deepStrictEqual(parseAlertThreshold(raw), {
        provided: true,
        valid: false,
        value: null,
      });
    }
  });

  test('requires the lower threshold to be below the upper one', () => {
    assert.strictEqual(validateAlertPair(200, 150), null);
    assert.strictEqual(validateAlertPair(200, null), null);
    assert.strictEqual(validateAlertPair(null, null), null);
    assert.ok(validateAlertPair(150, 150));
    assert.ok(validateAlertPair(150, 200));
  });
});
