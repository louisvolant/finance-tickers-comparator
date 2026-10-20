import { test, expect } from '@playwright/test';

const FOCUS_SHORTCUT = process.platform === 'darwin' ? 'Meta+k' : 'Control+k';

test.describe('Watchlist Live Search', () => {
  test('filters by symbol and company name, clears and resets', async ({ page }) => {
    await page.goto('/');

    const input = page.getByTestId('watchlist-search-input');
    await expect(input).toBeVisible({ timeout: 10000 });

    // Symbol match
    await input.fill('MC');
    await expect(page.locator('tr[data-symbol="MC.PA"]')).toBeVisible();
    await expect(page.locator('tr[data-symbol="AAPL"]')).toHaveCount(0);

    // Company name match
    await input.fill('apple');
    await expect(page.locator('tr[data-symbol="AAPL"]')).toBeVisible();
    await expect(page.locator('tr[data-symbol="MC.PA"]')).toHaveCount(0);

    // Inline clear button restores the full list
    await page.getByTestId('watchlist-search-clear').click();
    await expect(input).toHaveValue('');
    await expect(page.locator('tr[data-symbol="MC.PA"]')).toBeVisible();

    // A query with no match shows the reset state
    await input.fill('does-not-exist');
    await expect(page.getByTestId('watchlist-no-results')).toBeVisible();
    await page.getByTestId('watchlist-reset-filters').click();
    await expect(input).toHaveValue('');
    await expect(page.locator('tr[data-symbol="AAPL"]')).toBeVisible();
  });

  test('combines with the market filter chips', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('market-filter-NASDAQ').click();
    await page.getByTestId('watchlist-search-input').fill('LVMH');

    // LVMH is a Paris ticker, so the combination yields no result
    await expect(page.getByTestId('watchlist-no-results')).toBeVisible();

    await page.getByTestId('watchlist-reset-filters').click();
    await expect(page.getByTestId('market-filter-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('tr[data-symbol="MC.PA"]')).toBeVisible();
    await expect(page.locator('tr[data-symbol="AAPL"]')).toBeVisible();
  });

  test('focuses with the keyboard shortcut while Add Ticker still opens the modal', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByTestId('watchlist-search-input')).toBeVisible({ timeout: 10000 });
    // Wait for hydration so the global shortcut listener is attached.
    await page.waitForLoadState('networkidle');
    await page.keyboard.press(FOCUS_SHORTCUT);
    await expect(page.getByTestId('watchlist-search-input')).toBeFocused();

    // The add flow remains a separate action
    await page.getByRole('button', { name: /Add Ticker/i }).first().click();
    await expect(page.locator('input[placeholder*="Search symbol"]')).toBeVisible();
  });

  test('remains usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const input = page.getByTestId('watchlist-search-input');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('lvmh');

    await expect(page.locator('div[data-symbol="MC.PA"]')).toBeVisible();
    await expect(page.locator('div[data-symbol="AAPL"]')).toHaveCount(0);
  });
});
