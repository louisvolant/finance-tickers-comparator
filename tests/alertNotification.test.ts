import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildAlertNotification, UserAlertEvent } from '../src/lib/alertNotification.ts';

function event(overrides: Partial<UserAlertEvent> = {}): UserAlertEvent {
  return {
    userId: 'usr_1',
    tickerId: 'tck_1',
    symbol: 'AAPL',
    side: 'high',
    threshold: 210,
    observed: 212,
    price: 211.4,
    priceCurrency: 'USD',
    thresholdOriginal: 210,
    currency: 'USD',
    ...overrides,
  };
}

describe('Alert notification payloads', () => {
  test('a single alert names the ticker, the threshold and the observed price', () => {
    const notification = buildAlertNotification([event()]);

    assert.ok(notification.title.includes('AAPL'));
    assert.ok(notification.title.includes('$210.00'));
    assert.ok(notification.body.includes('$211.40'));
    assert.ok(notification.body.includes('$212.00'));
    assert.strictEqual(notification.url, '/ticker/AAPL');
    assert.strictEqual(notification.tag, 'alert-AAPL-high');
  });

  test('distinguishes the lower side', () => {
    const notification = buildAlertNotification([
      event({ side: 'low', threshold: 90, observed: 88, thresholdOriginal: 90 }),
    ]);

    assert.ok(notification.title.includes('AAPL'));
    assert.ok(notification.body.toLowerCase().includes('session low'));
    assert.strictEqual(notification.tag, 'alert-AAPL-low');
  });

  test('groups several alerts of the same user into one notification', () => {
    const notification = buildAlertNotification([
      event({ symbol: 'AAPL' }),
      event({ symbol: 'MC.PA', currency: 'EUR', priceCurrency: 'EUR', thresholdOriginal: 700, threshold: 700 }),
    ]);

    assert.strictEqual(notification.title, '2 price alerts triggered');
    assert.ok(notification.body.includes('AAPL'));
    assert.ok(notification.body.includes('MC.PA'));
    assert.strictEqual(notification.url, '/');
    assert.strictEqual(notification.tag, 'price-alerts');
  });

  test('caps the body to three lines plus a counter', () => {
    const notification = buildAlertNotification([
      event({ symbol: 'AAPL' }),
      event({ symbol: 'MSFT' }),
      event({ symbol: 'NVDA' }),
      event({ symbol: 'AMZN' }),
      event({ symbol: 'META' }),
    ]);

    assert.strictEqual(notification.title, '5 price alerts triggered');
    assert.ok(notification.body.includes('+2 more'));
    assert.ok(!notification.body.includes('META'));
  });

  test('falls back to a neutral payload for an empty list', () => {
    const notification = buildAlertNotification([]);
    assert.strictEqual(notification.url, '/');
    assert.strictEqual(notification.body, '');
  });
});
