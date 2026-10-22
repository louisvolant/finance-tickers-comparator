import { test, expect } from '@playwright/test';

/**
 * D1-specific account invariants.
 *
 * The e2e web server runs with AUTH_BACKEND=d1, so these requests exercise the
 * real D1 adapter and the unique email index rather than the KV fallback.
 */
test.describe('D1 account storage', () => {
  test('registration enforces a unique email and returns 409 on the second attempt', async ({
    request,
  }) => {
    const email = `d1_unique_${Date.now()}@example.com`;
    const payload = { email, password: 'Password123!', username: 'd1_unique' };

    const first = await request.post('/api/auth/register', { data: payload });
    expect(first.status()).toBe(201);

    const second = await request.post('/api/auth/register', {
      data: { ...payload, username: 'd1_unique_duplicate' },
    });
    expect(second.status()).toBe(409);
    expect(await second.json()).toMatchObject({
      error: 'An account with this email already exists',
    });

    // The first response set the session cookie in this request context.
    const deleted = await request.delete('/api/auth/delete_my_account');
    expect(deleted.status()).toBe(200);
  });
});
