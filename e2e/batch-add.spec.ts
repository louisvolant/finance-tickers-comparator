import { test, expect } from '@playwright/test';

/**
 * Batch add flow: paste a mixed list, submit, and verify the per-symbol outcome
 * plus the resulting watchlist. The authenticated path exercises the batch API;
 * the guest test exercises the local IndexedDB path and the shortcut from the
 * single-search modal.
 */
test.describe('Batch ticker add', () => {
  test('adds several symbols at once and reports unknown ones', async ({ page }) => {
    const timestamp = Date.now();
    const email = `batch_${timestamp}@example.com`;
    const username = `batch_${timestamp}`;
    const password = 'Password123!';

    await page.goto('/');
    await page.getByRole('button', { name: /Sign In|Connexion/i }).first().click();
    await page.getByRole('button', { name: /Create Account|Créer un compte/i }).click();
    await page.fill('input[placeholder="johndoe"]', username);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Registration triggers the first authenticated watchlist fetch. Wait for
    // it so the guest demo tickers (AAPL, MC.PA, ...) are replaced by the empty
    // server list before opening the batch modal.
    const tickersLoaded = page.waitForResponse(
      (response) => response.url().includes('/api/tickers') && response.request().method() === 'GET'
    );
    await page.locator('form button[type="submit"]').click();
    await tickersLoaded;
    await expect(page.getByText(username, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/No Tickers in Your Watchlist|Aucun ticker/i)).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId('batch-add-open').click();
    await page.getByTestId('batch-add-input').fill('TSLA, AMZN; NOTAREALSYMBOL');
    await page.getByTestId('batch-add-submit').click();

    await expect(page.getByTestId('batch-add-results')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('batch-added-TSLA')).toBeVisible();
    await expect(page.getByTestId('batch-added-AMZN')).toBeVisible();
    await expect(page.getByTestId('batch-failed-NOTAREALSYMBOL')).toBeVisible();

    await page.getByTestId('batch-add-close').click();

    await expect(page.locator('[data-symbol="TSLA"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-symbol="AMZN"]').first()).toBeVisible();

    await page.request.delete('/api/auth/delete_my_account');
  });

  test('the single-search modal links to batch add and works for guests', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Add Ticker|Ajouter/i }).first().click();
    await expect(page.getByTestId('search-open-batch')).toBeVisible();
    await page.getByTestId('search-open-batch').click();

    // The guest watchlist is seeded with demo tickers; use symbols that are not
    // part of that seed so they are actually added.
    await page.getByTestId('batch-add-input').fill('TSLA, AMZN');
    await page.getByTestId('batch-add-submit').click();

    await expect(page.getByTestId('batch-add-results')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('batch-added-TSLA')).toBeVisible();
    await expect(page.getByTestId('batch-added-AMZN')).toBeVisible();

    await page.getByTestId('batch-add-close').click();
    await expect(page.locator('[data-symbol="TSLA"]').first()).toBeVisible({ timeout: 10000 });
  });
});
