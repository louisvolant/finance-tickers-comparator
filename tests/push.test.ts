import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isAcceptablePushEndpoint, parsePushSubscription } from '../src/lib/push.ts';
import { urlBase64ToUint8Array } from '../src/lib/pushClient.ts';

describe('Push subscription validation', () => {
  test('accepts public HTTPS push endpoints', () => {
    assert.strictEqual(
      isAcceptablePushEndpoint('https://fcm.googleapis.com/fcm/send/abc123'),
      true
    );
    assert.strictEqual(
      isAcceptablePushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/xyz'),
      true
    );
    assert.strictEqual(isAcceptablePushEndpoint('https://web.push.apple.com/QGVsbG8'), true);
  });

  test('rejects non-HTTPS, local and IP-literal endpoints', () => {
    for (const endpoint of [
      'http://fcm.googleapis.com/fcm/send/abc', // not https
      'https://localhost/push', // local
      'https://device.local/push', // mDNS
      'https://127.0.0.1/push', // IPv4 literal
      'https://[::1]/push', // IPv6 literal
      'not-a-url',
      '',
      null,
      undefined,
      42,
    ]) {
      assert.strictEqual(isAcceptablePushEndpoint(endpoint), false, String(endpoint));
    }
  });

  test('validates a complete browser subscription', () => {
    const parsed = parsePushSubscription({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      expirationTime: null,
      keys: {
        p256dh: 'B'.repeat(87),
        auth: 'a'.repeat(22),
      },
    });

    assert.ok(parsed);
    assert.strictEqual(parsed.endpoint, 'https://fcm.googleapis.com/fcm/send/abc123');
    assert.strictEqual(parsed.expirationTime, null);
    assert.strictEqual(parsed.keys.p256dh.length, 87);
  });

  test('rejects incomplete or malformed subscriptions', () => {
    const valid = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      expirationTime: null,
      keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) },
    };

    assert.strictEqual(parsePushSubscription(null), null);
    assert.strictEqual(parsePushSubscription({}), null);
    assert.strictEqual(parsePushSubscription({ ...valid, endpoint: 'http://x.dev/p' }), null);
    assert.strictEqual(parsePushSubscription({ ...valid, keys: undefined }), null);
    assert.strictEqual(
      parsePushSubscription({ ...valid, keys: { p256dh: 'short', auth: 'a'.repeat(22) } }),
      null
    );
    assert.strictEqual(
      parsePushSubscription({ ...valid, keys: { p256dh: 'B'.repeat(87), auth: 'short' } }),
      null
    );
  });
});

describe('VAPID key decoding', () => {
  test('decodes a base64url key into bytes', () => {
    // "+/8=" in standard base64, written URL-safe.
    assert.deepStrictEqual(Array.from(urlBase64ToUint8Array('-_8')), [0xfb, 0xff]);
  });

  test('handles padding and standard base64 input', () => {
    assert.deepStrictEqual(Array.from(urlBase64ToUint8Array('AQID')), [1, 2, 3]);
    assert.deepStrictEqual(Array.from(urlBase64ToUint8Array('AQI=')), [1, 2]);
  });
});
