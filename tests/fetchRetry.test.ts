import { test, describe } from 'node:test';
import assert from 'node:assert';
import { fetchJsonWithRetry } from '../src/lib/utils.ts';

/**
 * Replace global.fetch with a scripted stub so the retry behaviour can be
 * asserted deterministically, without depending on the network.
 */
function stubFetch(responses: Array<{ status: number; body?: any }>) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  let i = 0;

  (globalThis as any).fetch = async (url: string) => {
    calls.push(String(url));
    const scripted = responses[Math.min(i, responses.length - 1)];
    i++;
    const status = scripted.status;
    const body = scripted.body ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as any;
  };

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

describe('fetchJsonWithRetry', () => {
  test('resolves immediately on a successful first attempt', async () => {
    const stub = stubFetch([{ status: 200, body: { ok: true } }]);
    try {
      const data = await fetchJsonWithRetry('/api/test');
      assert.deepStrictEqual(data, { ok: true });
      assert.strictEqual(stub.calls.length, 1, 'should not retry a successful response');
    } finally {
      stub.restore();
    }
  });

  test('retries a transient 500 and returns the eventual success', async () => {
    const stub = stubFetch([
      { status: 500 },
      { status: 500 },
      { status: 200, body: { chart: [1, 2, 3] } },
    ]);
    try {
      const data = await fetchJsonWithRetry('/api/test');
      assert.deepStrictEqual(data, { chart: [1, 2, 3] });
      assert.strictEqual(stub.calls.length, 3, 'should have retried twice before succeeding');
    } finally {
      stub.restore();
    }
  });

  test('retries 429 rate limiting', async () => {
    const stub = stubFetch([{ status: 429 }, { status: 200, body: { recovered: true } }]);
    try {
      const data = await fetchJsonWithRetry('/api/test');
      assert.deepStrictEqual(data, { recovered: true });
      assert.strictEqual(stub.calls.length, 2);
    } finally {
      stub.restore();
    }
  });

  test('gives up after the configured number of retries', async () => {
    const stub = stubFetch([{ status: 503 }]);
    try {
      await assert.rejects(() => fetchJsonWithRetry('/api/test', {}, 2));
      assert.strictEqual(stub.calls.length, 3, 'initial attempt + 2 retries');
    } finally {
      stub.restore();
    }
  });

  test('does not retry a deterministic 404', async () => {
    const stub = stubFetch([{ status: 404 }]);
    try {
      await assert.rejects(() => fetchJsonWithRetry('/api/test'));
      assert.strictEqual(stub.calls.length, 1, 'a 404 must fail fast');
    } finally {
      stub.restore();
    }
  });

  test('retries network errors thrown by fetch itself', async () => {
    const original = globalThis.fetch;
    const calls: number[] = [];
    let i = 0;
    (globalThis as any).fetch = async () => {
      calls.push(i++);
      if (calls.length < 3) throw new Error('Failed to fetch');
      return { ok: true, status: 200, json: async () => ({ ok: true }) } as any;
    };
    try {
      const data = await fetchJsonWithRetry('/api/test');
      assert.deepStrictEqual(data, { ok: true });
      assert.strictEqual(calls.length, 3);
    } finally {
      globalThis.fetch = original;
    }
  });
});