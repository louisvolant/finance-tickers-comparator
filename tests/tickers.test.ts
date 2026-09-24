import { test, describe } from 'node:test';
import assert from 'node:assert';
import { kvGet, kvPut } from '../src/lib/kv.ts';
import { UserTicker } from '../src/lib/types.ts';

describe('Watchlist Tickers & Reordering Logic', () => {
  const testUserId = 'test_user_reorder_' + Date.now();
  const tickersKey = `user:tickers:${testUserId}`;

  const initialTickers: UserTicker[] = [
    { id: '1', symbol: 'AAPL', name: 'Apple Inc.', trackingValue: 200, order: 0, createdAt: 1000 },
    { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', trackingValue: 400, order: 1, createdAt: 2000 },
    { id: '3', symbol: 'MC.PA', name: 'LVMH', trackingValue: 500, order: 2, createdAt: 3000 },
  ];

  test('should store and retrieve user tickers', async () => {
    await kvPut(tickersKey, initialTickers);
    const retrieved = await kvGet<UserTicker[]>(tickersKey);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.length, 3);
    assert.strictEqual(retrieved[0].symbol, 'AAPL');
  });

  test('should compute % diff correctly against tracking value', () => {
    // Current price: 230, trackingValue: 200 -> diff: +15%
    const currentPrice = 230;
    const trackingValue = 200;
    const diff = ((currentPrice - trackingValue) / trackingValue) * 100;
    assert.strictEqual(diff.toFixed(2), '15.00');

    // Current price: 180, trackingValue: 200 -> diff: -10%
    const currentPrice2 = 180;
    const diff2 = ((currentPrice2 - trackingValue) / trackingValue) * 100;
    assert.strictEqual(diff2.toFixed(2), '-10.00');
  });

  test('should reorder tickers according to new orderedIds array', async () => {
    const desiredOrder = ['3', '1', '2']; // MC.PA first, then AAPL, then MSFT
    const tickers = (await kvGet<UserTicker[]>(tickersKey)) || [];

    const tickerMap = new Map(tickers.map((t) => [t.id, t]));
    const reordered: UserTicker[] = [];

    desiredOrder.forEach((id, index) => {
      const item = tickerMap.get(id);
      if (item) {
        item.order = index;
        reordered.push(item);
      }
    });

    await kvPut(tickersKey, reordered);

    const updated = (await kvGet<UserTicker[]>(tickersKey)) || [];
    assert.strictEqual(updated[0].symbol, 'MC.PA');
    assert.strictEqual(updated[0].order, 0);
    assert.strictEqual(updated[1].symbol, 'AAPL');
    assert.strictEqual(updated[1].order, 1);
    assert.strictEqual(updated[2].symbol, 'MSFT');
    assert.strictEqual(updated[2].order, 2);
  });
});
