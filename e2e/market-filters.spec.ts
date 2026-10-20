import { test, expect } from '@playwright/test';

test.describe('Watchlist Market Filters', () => {
  test('filters the watchlist by one or several markets on desktop', async ({ page }) => {
    await page.goto('/');

    // Chips are derived from the markets present in the default watchlist
    await expect(page.getByTestId('market-filter-bar')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('market-filter-PARIS')).toBeVisible();
    await expect(page.getByTestId('market-filter-NASDAQ')).toBeVisible();

    // Filtering on NASDAQ hides Paris tickers
    await page.getByTestId('market-filter-NASDAQ').click();
    await expect(page.locator('tr[data-symbol="AAPL"]')).toBeVisible();
    await expect(page.locator('tr[data-symbol="NVDA"]')).toBeVisible();
    await expect(page.locator('tr[data-symbol="MC.PA"]')).toHaveCount(0);

    // Combining markets keeps both visible (OR semantics)
    await page.getByTestId('market-filter-PARIS').click();
    await expect(page.locator('tr[data-symbol="MC.PA"]')).toBeVisible();
    await expect(page.locator('tr[data-symbol="AAPL"]')).toBeVisible();

    // "All markets" restores the full watchlist
    await page.getByTestId('market-filter-all').click();
    await expect(page.getByTestId('market-filter-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('tr[data-symbol="AAPL"]')).toBeVisible();
    await expect(page.locator('tr[data-symbol="MC.PA"]')).toBeVisible();
  });

  test('remains usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByTestId('market-filter-bar')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('market-filter-PARIS').click();
    await expect(page.locator('div[data-symbol="MC.PA"]')).toBeVisible();
    await expect(page.locator('div[data-symbol="AAPL"]')).toHaveCount(0);
  });
});
