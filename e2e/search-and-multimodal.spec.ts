import { test, expect } from '@playwright/test';

test.describe('Search by Ticker, Label and ISIN', () => {
  test('search modal finds items by ticker symbol, company label, and ISIN code', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Open search modal
    await page.getByRole('button', { name: /Add Ticker/i }).first().click();
    const searchInput = page.locator('input[placeholder*="Search symbol"]');

    // 2. Search by French ticker: PUST (Amundi PEA Nasdaq)
    await searchInput.fill('PUST');
    await expect(page.locator('button:has-text("PUST.PA"), button:has-text("AMUNDI PEA NASDAQ")').first()).toBeVisible({ timeout: 5000 });

    // 3. Search by Company Label: LVMH
    await searchInput.fill('LVMH');
    await expect(page.locator('button:has-text("MC.PA"), button:has-text("LVMH")').first()).toBeVisible({ timeout: 5000 });

    // 4. Search by Company Label: AIRBUS
    await searchInput.fill('AIRBUS');
    await expect(page.locator('button:has-text("AIR.PA"), button:has-text("AIRBUS")').first()).toBeVisible({ timeout: 5000 });

    // 5. Search by ISIN: FR001400Q9V2 (EXOSENS)
    await searchInput.fill('FR001400Q9V2');
    await expect(page.locator('button:has-text("EXENS.PA"), button:has-text("EXOSENS")').first()).toBeVisible({ timeout: 5000 });

    // 6. Search by Ticker: WPEA (iShares MSCI World PEA)
    await searchInput.fill('WPEA');
    await expect(page.locator('button:has-text("WPEA.PA"), button:has-text("ISHARES MSCI WORLD")').first()).toBeVisible({ timeout: 5000 });
  });
});
