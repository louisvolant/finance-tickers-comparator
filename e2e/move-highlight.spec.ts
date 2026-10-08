import { test, expect, Page } from '@playwright/test';

/**
 * Number of running highlight animations on a row. CSS transitions coming from
 * the hover styles are ignored: only the Web Animations flash counts.
 */
function flashCount(page: Page, symbol: string) {
  return page.locator(`[data-symbol="${symbol}"]`).first().evaluate(
    (el) => el.getAnimations().filter((a) => !(a instanceof CSSTransition)).length
  );
}

test.describe('Moved ticker highlight', () => {
  test('flashes only the row moved with the arrows, then fades out', async ({ page }) => {
    await page.goto('/');

    // Guests start with the seeded AAPL, MC.PA, CW8.PA and NVDA tickers.
    const aaplRow = page.locator('[data-symbol="AAPL"]').first();
    await expect(aaplRow).toBeVisible({ timeout: 10000 });
    await aaplRow.locator('button[title*="down" i]').first().click();

    await expect.poll(() => flashCount(page, 'AAPL')).toBeGreaterThan(0);
    expect(await flashCount(page, 'MC.PA')).toBe(0);

    // The highlight is short-lived: it must be gone within a few seconds.
    await expect.poll(() => flashCount(page, 'AAPL'), { timeout: 4000 }).toBe(0);
  });

  test('a ticker moved from its own page is highlighted once back on the dashboard', async ({ page }) => {
    await page.goto('/ticker/AAPL');
    await expect(page.locator('h1', { hasText: 'AAPL' })).toBeVisible({ timeout: 10000 });

    await page.locator('button[aria-label*="down" i]').first().click();
    await expect(page).toHaveURL(/\/$/);

    await expect.poll(() => flashCount(page, 'AAPL'), { timeout: 3000 }).toBeGreaterThan(0);
  });
});
