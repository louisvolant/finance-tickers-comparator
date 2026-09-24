import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getQuote, searchTickers } from '../src/lib/yahooFinance.ts';

describe('Yahoo Finance Service', () => {
  test('should search for popular tickers like LVMH and Apple', async () => {
    const results = await searchTickers('Apple');
    assert.ok(Array.isArray(results));
    assert.ok(results.length > 0);
    const hasApple = results.some((r) => r.symbol === 'AAPL');
    assert.ok(hasApple, 'Results should contain AAPL');
  });

  test('should fetch and normalize quote for AAPL with PE ratios', async () => {
    const quote = await getQuote('AAPL');
    assert.ok(quote);
    assert.strictEqual(quote.symbol, 'AAPL');
    assert.ok(typeof quote.price === 'number' && quote.price > 0);
    assert.ok(typeof quote.currency === 'string');
    // AAPL should have trailingPE or forwardPE
    assert.ok(quote.trailingPE !== null || quote.forwardPE !== null, 'AAPL should have PE multiples');
  });

  test('should fetch European ticker MC.PA (LVMH)', async () => {
    const quote = await getQuote('MC.PA');
    assert.ok(quote);
    assert.strictEqual(quote.symbol, 'MC.PA');
    assert.strictEqual(quote.currency, 'EUR');
    assert.ok(quote.price > 0);
  });
});
