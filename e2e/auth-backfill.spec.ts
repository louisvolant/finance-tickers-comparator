import { test, expect } from '@playwright/test';

/**
 * The backfill route is temporary and secret-gated. This test only asserts the
 * gate; the actual KV -> D1 run is an operational step documented in the README.
 */
test.describe('Temporary account backfill endpoint', () => {
  test('rejects missing credentials', async ({ request }) => {
    const response = await request.post('/api/admin/migrate-users', { data: {} });
    expect(response.status()).toBe(401);
  });
});
