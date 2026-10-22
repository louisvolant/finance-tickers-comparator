import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  MAX_BATCH_TICKERS,
  parseTickerSymbols,
} from '../src/lib/batchTickers.ts';

describe('Batch ticker parsing', () => {
  test('splits on commas, semicolons, spaces and new lines', () => {
    assert.deepStrictEqual(
      parseTickerSymbols('AAPL, msft;MC.PA\nAIR.PA  NVDA'),
      ['AAPL', 'MSFT', 'MC.PA', 'AIR.PA', 'NVDA']
    );
  });

  test('de-duplicates case-insensitively and ignores empty entries', () => {
    assert.deepStrictEqual(parseTickerSymbols('aapl, AAPL;; , msft'), ['AAPL', 'MSFT']);
  });

  test('handles empty input', () => {
    assert.deepStrictEqual(parseTickerSymbols(''), []);
    assert.deepStrictEqual(parseTickerSymbols(null), []);
    assert.deepStrictEqual(parseTickerSymbols(undefined), []);
  });

  test('exposes a batch limit aligned with one Yahoo quote request', () => {
    assert.strictEqual(MAX_BATCH_TICKERS, 25);
  });
});
