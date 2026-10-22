import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Import KV module
import { kvGet, kvPut, kvDelete, kvList, kvListAll } from '../src/lib/kv.ts';

describe('KV Storage Adapter', () => {
  const testKey = 'test_unit_key_' + Date.now();
  const testVal = { symbol: 'AAPL', price: 230.5 };

  test('should put and get a value', async () => {
    await kvPut(testKey, testVal);
    const retrieved = await kvGet(testKey);
    assert.deepStrictEqual(retrieved, testVal);
  });

  test('should list keys matching a prefix', async () => {
    const list = await kvList('test_unit_');
    assert.ok(list.includes(testKey));
  });

  test('should list every key under a prefix, not just the first page', async () => {
    const a = 'test_listall_a_' + Date.now();
    const b = 'test_listall_b_' + Date.now();

    await kvPut(a, 1);
    await kvPut(b, 2);

    const list = await kvListAll('test_listall_');

    assert.deepStrictEqual(list.sort(), [a, b].sort());

    await kvDelete(a);
    await kvDelete(b);
  });

  test('should delete a key', async () => {
    await kvDelete(testKey);
    const retrieved = await kvGet(testKey);
    assert.strictEqual(retrieved, null);
  });
});
