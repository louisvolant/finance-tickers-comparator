import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  CRON_MAX_SKEW_SEC,
  CRON_SIGNATURE_HEADER,
  CRON_TIMESTAMP_HEADER,
  cronSignaturePayload,
  signCronRequest,
  verifyCronRequest,
} from '../src/lib/cronAuth.ts';

const SECRET = 'test-cron-secret-with-enough-entropy-0123456789';
const PATH = '/api/cron/alerts';
const NOW = 1_800_000_000;

function headersFrom(signed: { timestamp: string; signature: string }): Headers {
  return new Headers({
    [CRON_TIMESTAMP_HEADER]: signed.timestamp,
    [CRON_SIGNATURE_HEADER]: signed.signature,
  });
}

describe('Cron request signing', () => {
  test('binds the signature to the timestamp, method and path', () => {
    assert.strictEqual(
      cronSignaturePayload(NOW, 'post', PATH),
      `${NOW}.POST.${PATH}`
    );
  });

  test('accepts a freshly signed request', async () => {
    const signed = await signCronRequest(SECRET, 'POST', PATH, NOW);
    const result = await verifyCronRequest(SECRET, headersFrom(signed), 'POST', PATH, NOW);

    assert.deepStrictEqual(result, { ok: true });
  });

  test('rejects an expired request even when the signature is valid', async () => {
    const signed = await signCronRequest(SECRET, 'POST', PATH, NOW);
    const result = await verifyCronRequest(
      SECRET,
      headersFrom(signed),
      'POST',
      PATH,
      NOW + CRON_MAX_SKEW_SEC + 1
    );

    assert.deepStrictEqual(result, { ok: false, reason: 'expired' });
  });

  test('accepts a timestamp inside the skew window', async () => {
    const signed = await signCronRequest(SECRET, 'POST', PATH, NOW);
    const result = await verifyCronRequest(
      SECRET,
      headersFrom(signed),
      'POST',
      PATH,
      NOW + CRON_MAX_SKEW_SEC
    );

    assert.deepStrictEqual(result, { ok: true });
  });

  test('rejects a signature reused for another method or path', async () => {
    const signed = await signCronRequest(SECRET, 'POST', PATH, NOW);

    assert.deepStrictEqual(
      await verifyCronRequest(SECRET, headersFrom(signed), 'GET', PATH, NOW),
      { ok: false, reason: 'bad-signature' }
    );
    assert.deepStrictEqual(
      await verifyCronRequest(SECRET, headersFrom(signed), 'POST', '/api/other', NOW),
      { ok: false, reason: 'bad-signature' }
    );
  });

  test('rejects a tampered signature or a different secret', async () => {
    const signed = await signCronRequest(SECRET, 'POST', PATH, NOW);
    const tampered = headersFrom({ ...signed, signature: signed.signature.slice(0, -1) + 'A' });

    assert.deepStrictEqual(
      await verifyCronRequest(SECRET, tampered, 'POST', PATH, NOW),
      { ok: false, reason: 'bad-signature' }
    );
    assert.deepStrictEqual(
      await verifyCronRequest('another-secret', headersFrom(signed), 'POST', PATH, NOW),
      { ok: false, reason: 'bad-signature' }
    );
  });

  test('rejects missing or malformed headers', async () => {
    assert.deepStrictEqual(await verifyCronRequest(SECRET, new Headers(), 'POST', PATH, NOW), {
      ok: false,
      reason: 'missing-signature',
    });

    const noSignature = new Headers({ [CRON_TIMESTAMP_HEADER]: String(NOW) });
    assert.deepStrictEqual(await verifyCronRequest(SECRET, noSignature, 'POST', PATH, NOW), {
      ok: false,
      reason: 'missing-signature',
    });

    const invalidTimestamp = new Headers({
      [CRON_TIMESTAMP_HEADER]: 'not-a-number',
      [CRON_SIGNATURE_HEADER]: 'abc',
    });
    assert.deepStrictEqual(
      await verifyCronRequest(SECRET, invalidTimestamp, 'POST', PATH, NOW),
      { ok: false, reason: 'invalid-timestamp' }
    );
  });
});
