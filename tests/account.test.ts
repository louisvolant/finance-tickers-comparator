import { test, describe } from 'node:test';
import assert from 'node:assert';
import { kvGet, kvPut, kvDelete } from '../src/lib/kv.ts';
import { hashPassword, verifyPassword } from '../src/lib/authCrypto.ts';
import { UserRecord, UserTicker } from '../src/lib/types.ts';

describe('Account Settings: Change Password & Delete Account Logic', () => {
  const testUserId = 'test_acc_user_' + Date.now();
  const testEmail = `trader_${Date.now()}@example.com`;
  const initialPassword = 'InitialSecretPass123!';
  const updatedPassword = 'NewStrongPassword456!';

  test('should create user, change password, and verify updated credentials', async () => {
    // 1. Setup user
    const hashedPassword = await hashPassword(initialPassword);
    const user: UserRecord = {
      id: testUserId,
      email: testEmail,
      username: 'trader_pro',
      hashedPassword,
      createdAt: Date.now(),
    };

    await kvPut(`user:by-id:${testUserId}`, user);
    await kvPut(`user:by-email:${testEmail}`, user);

    // 2. Verify initial password
    const isOldValid = await verifyPassword(initialPassword, user.hashedPassword!);
    assert.strictEqual(isOldValid, true);

    // 3. Update password
    const newHashed = await hashPassword(updatedPassword);
    user.hashedPassword = newHashed;
    await kvPut(`user:by-id:${testUserId}`, user);
    await kvPut(`user:by-email:${testEmail}`, user);

    // 4. Verify new password works and old password fails
    const reloaded = await kvGet<UserRecord>(`user:by-id:${testUserId}`);
    assert.ok(reloaded);
    assert.strictEqual(await verifyPassword(updatedPassword, reloaded.hashedPassword!), true);
    assert.strictEqual(await verifyPassword(initialPassword, reloaded.hashedPassword!), false);
  });

  test('should delete user account and clean up associated watchlist', async () => {
    // Attach tickers
    const userTickers: UserTicker[] = [
      { id: 't1', symbol: 'MC.PA', name: 'LVMH', trackingValue: 400, order: 0, createdAt: 1000 },
    ];
    await kvPut(`user:tickers:${testUserId}`, userTickers);

    // Assert tickers exist
    assert.ok(await kvGet(`user:tickers:${testUserId}`));

    // Execute deletion
    await kvDelete(`user:tickers:${testUserId}`);
    await kvDelete(`user:by-id:${testUserId}`);
    await kvDelete(`user:by-email:${testEmail}`);

    // Verify all keys are purged
    assert.strictEqual(await kvGet(`user:tickers:${testUserId}`), null);
    assert.strictEqual(await kvGet(`user:by-id:${testUserId}`), null);
    assert.strictEqual(await kvGet(`user:by-email:${testEmail}`), null);
  });
});
