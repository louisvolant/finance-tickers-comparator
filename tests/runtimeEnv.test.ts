import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert';
import { getEnvVar, setRuntimeEnv } from '../src/lib/env.ts';
import { kvDelete, kvGet, kvList, kvPut } from '../src/lib/kv.ts';

/**
 * Scheduled and queue handlers receive their bindings as an argument, unlike
 * fetch requests where OpenNext exposes them through a request context. These
 * tests lock the injection order used by custom-worker.ts.
 */
describe('Runtime environment injection', () => {
  afterEach(() => {
    setRuntimeEnv(null);
  });

  test('getEnvVar reads the injected Worker bindings before process.env', () => {
    setRuntimeEnv({ CRON_SECRET: 'from-worker', VAPID_SUBJECT: 'mailto:test@example.com' });

    assert.strictEqual(getEnvVar('CRON_SECRET'), 'from-worker');
    assert.strictEqual(getEnvVar('VAPID_SUBJECT'), 'mailto:test@example.com');
    assert.strictEqual(getEnvVar('NOT_SET_ANYWHERE'), undefined);
  });

  test('kvGet/kvPut/kvList/kvDelete use the injected KV binding', async () => {
    const store = new Map<string, string>();

    const fakeKV = {
      get: async (key: string, type?: string) => {
        const raw = store.get(key);
        if (raw === undefined) return null;
        return type === 'json' ? JSON.parse(raw) : raw;
      },
      put: async (key: string, value: string) => {
        store.set(key, value);
      },
      delete: async (key: string) => {
        store.delete(key);
      },
      list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
        keys: Array.from(store.keys())
          .filter((key) => key.startsWith(prefix))
          .map((name) => ({ name })),
      }),
    };

    setRuntimeEnv({ KV: fakeKV });

    await kvPut('runtime:test', { value: 42 });
    assert.deepStrictEqual(await kvGet('runtime:test'), { value: 42 });
    assert.deepStrictEqual(await kvList('runtime:'), ['runtime:test']);

    await kvDelete('runtime:test');
    assert.strictEqual(await kvGet('runtime:test'), null);
  });

  test('injected bindings do not leak once the handler resets them', () => {
    setRuntimeEnv({ CRON_SECRET: 'from-worker' });
    assert.strictEqual(getEnvVar('CRON_SECRET'), 'from-worker');

    setRuntimeEnv(null);
    assert.notStrictEqual(getEnvVar('CRON_SECRET'), 'from-worker');
  });
});
