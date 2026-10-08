import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTracking } from '../src/lib/tracking';
import { TickerQuote } from '../src/lib/types';

const RATES = { EUR: 1, USD: 1.1, SEK: 11.5, GBP: 0.85 };

function quote(overrides: Partial<TickerQuote>): TickerQuote {
  return {
    symbol: 'TEST',
    name: 'Test',
    price: 110,
    change: 0,
    changePercent: 0,
    currency: 'USD',
    trailingPE: null,
    forwardPE: null,
    marketCap: null,
    dividendYield: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    epsTrailingTwelveMonths: null,
    beta: null,
    volume: null,
    avgVolume: null,
    exchange: 'NMS',
    quoteType: 'EQUITY',
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('Reference value resolution (multi-currency % diff)', () => {
  test('reports no tracking when value is empty', () => {
    const res = resolveTracking({ trackingValue: null, trackingCurrency: null }, quote({}), RATES);
    assert.equal(res.hasTracking, false);
    assert.equal(res.diffPercent, null);
  });

  test('does not convert when reference currency matches the listing currency', () => {
    const res = resolveTracking(
      { trackingValue: 100, trackingCurrency: 'USD' },
      quote({ currency: 'USD', price: 110 }),
      RATES
    );
    assert.equal(res.hasTracking, true);
    assert.equal(res.converted, false);
    assert.equal(res.comparisonValue, 100);
    assert.equal(res.diffPercent, 10);
  });

  test('treats a missing reference currency as the listing currency', () => {
    const res = resolveTracking(
      { trackingValue: 100, trackingCurrency: null },
      quote({ currency: 'USD', price: 100 }),
      RATES
    );
    assert.equal(res.originalCurrency, 'USD');
    assert.equal(res.converted, false);
  });

  test('converts a EUR reference into the USD listing currency', () => {
    // 100 EUR -> 110 USD, price 121 USD -> +10%
    const res = resolveTracking(
      { trackingValue: 100, trackingCurrency: 'EUR' },
      quote({ currency: 'USD', price: 121 }),
      RATES
    );
    assert.equal(res.converted, true);
    assert.equal(res.originalCurrency, 'EUR');
    assert.equal(res.comparisonCurrency, 'USD');
    assert.ok(Math.abs((res.comparisonValue as number) - 110) < 1e-9);
    assert.ok(Math.abs((res.diffPercent as number) - 10) < 1e-9);
  });

  test('keeps the FX-inclusive return consistent when only the rate moves', () => {
    // Reference in EUR 100; USD listing 110 at 1.1. Price stays 110 -> 0%.
    const atParity = resolveTracking(
      { trackingValue: 100, trackingCurrency: 'EUR' },
      quote({ currency: 'USD', price: 110 }),
      RATES
    );
    assert.ok(Math.abs((atParity.diffPercent as number) - 0) < 1e-9);
  });

  test('marks conversion unavailable when the required rate is missing', () => {
    const res = resolveTracking(
      { trackingValue: 100, trackingCurrency: 'SEK' },
      quote({ currency: 'USD', price: 110 }),
      { USD: 1.1 } // no SEK rate
    );
    assert.equal(res.hasTracking, true);
    assert.equal(res.conversionAvailable, false);
    assert.equal(res.diffPercent, null);
  });
});
