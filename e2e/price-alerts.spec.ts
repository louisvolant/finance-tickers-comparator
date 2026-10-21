import { test, expect } from '@playwright/test';

/**
 * Price alerts are per-ticker and opt-in: this walks the real flow (account,
 * watchlist, ticker page) and checks that enabling seeds both thresholds from
 * the ATH/ATL snapshot, that they survive a reload, and that they can be
 * disabled again.
 */
test.describe('Per-ticker price alerts', () => {
  const timestamp = Date.now();
  const email = `alerts_${timestamp}@example.com`;
  const username = `alerts_${timestamp}`;
  const password = 'Password123!';

  test('enable alerts from the ticker page, persist them, then disable them', async ({ page }) => {
    await page.goto('/');

    // Register a throwaway account.
    await page.getByRole('button', { name: /Sign In|Connexion/i }).first().click();
    await page.getByRole('button', { name: /Create Account|Créer un compte/i }).click();
    await page.fill('input[placeholder="johndoe"]', username);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(username, { exact: true })).toBeVisible({ timeout: 10000 });

    // Add a ticker so it has a watchlist entry to attach the alert to.
    await page.getByRole('button', { name: /Add Ticker/i }).first().click();
    await page.fill('input[placeholder*="Search symbol"]', 'AAPL');
    await page.locator('button:not([disabled]):has-text("AAPL")').first().click();

    // Open its page: alerts must not exist until explicitly enabled.
    await page.goto('/ticker/AAPL');
    const panel = page.getByTestId('price-alerts-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('enable-price-alerts')).toBeVisible({ timeout: 15000 });

    // Enabling seeds the two thresholds from the ATH/ATL snapshot and saves them.
    await page.getByTestId('enable-price-alerts').click();
    await expect(panel).toContainText(/Active|Actives/, { timeout: 20000 });
    await expect(panel).toContainText(/ATH/);

    // The configuration is server-side, so it survives a full reload.
    await page.reload();
    await expect(page.getByTestId('price-alerts-panel')).toContainText(/Active|Actives/, {
      timeout: 15000,
    });

    // Editing exposes both prefilled values.
    await page.getByTestId('edit-price-alerts').click();
    await expect(page.getByTestId('alert-high-input')).not.toHaveValue('');
    await expect(page.getByTestId('alert-low-input')).not.toHaveValue('');
    await page.getByTestId('cancel-price-alerts').click();

    // Disabling clears both sides and brings the enable button back.
    await page.getByTestId('disable-price-alerts').click();
    await expect(page.getByTestId('enable-price-alerts')).toBeVisible({ timeout: 10000 });

    // Clean up the throwaway account (and its alert state) through the API.
    await page.request.delete('/api/auth/delete_my_account');
  });
});
