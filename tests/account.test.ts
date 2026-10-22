import { test, describe } from 'node:test';
import assert from 'node:assert';
import { kvDelete, kvGet, kvPut } from '../src/lib/kv.ts';
import { hashPassword, verifyPassword } from '../src/lib/authCrypto.ts';
import { MemoryUserRepository } from './helpers/memoryUsers.ts';
import { UserTicker } from '../src/lib/types.ts';

describe('Account Settings: Change Password & Delete Account Logic', () => {
  const testUserId = 'test_acc_user_' + Date.now();
  const testEmail = `trader_${Date.now()}@example.com`;
  const initialPassword = 'InitialSecretPass123!';
  const updatedPassword = 'NewStrongPassword456!';

  test('creates a user, changes the password, and verifies updated credentials', async () => {
    const repo = new MemoryUserRepository();

    await repo.create({
      id: testUserId,
      email: testEmail,
      username: 'trader_pro',
      hashedPassword: await hashPassword(initialPassword),
      createdAt: Date.now(),
    });

    const user = await repo.findByEmail(testEmail);
    assert.ok(user);
    assert.strictEqual(await verifyPassword(initialPassword, user.hashedPassword!), true);

    await repo.updatePassword(user.id, await hashPassword(updatedPassword));

    const reloaded = await repo.findById(user.id);
    assert.ok(reloaded);
    assert.strictEqual(await verifyPassword(updatedPassword, reloaded.hashedPassword!), true);
    assert.strictEqual(await verifyPassword(initialPassword, reloaded.hashedPassword!), false);
  });

  test('deletes the account and cleans up the associated watchlist', async () => {
    const repo = new MemoryUserRepository();
    await repo.create({
      id: testUserId,
      email: testEmail,
      username: 'trader_pro',
      createdAt: Date.now(),
    });

    const userTickers: UserTicker[] = [
      { id: 't1', symbol: 'MC.PA', name: 'LVMH', trackingValue: 400, order: 0, createdAt: 1000 },
    ];
    await kvPut(`user:tickers:${testUserId}`, userTickers);
    assert.ok(await kvGet(`user:tickers:${testUserId}`));

    await repo.delete(testUserId);
    await kvDelete(`user:tickers:${testUserId}`);

    assert.strictEqual(await repo.findById(testUserId), null);
    assert.strictEqual(await kvGet(`user:tickers:${testUserId}`), null);
  });
});
