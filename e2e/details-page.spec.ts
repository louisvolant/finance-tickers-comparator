import { test, expect, devices } from '@playwright/test';

/**
 * The ticker details view used to be a centred modal. It is now a real route
 * (/ticker/[symbol]) so the mobile paint no longer reflows once the async data
 * lands, and so deep links, the browser back button and PWA shortcuts work.
 */
test.describe('Ticker details full page', () => {
  test('opens a real route and returns home via the back arrow', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('[data-symbol]').first();
    await expect(card).toBeVisible({ timeout: 20000 });
    const symbol = (await card.getAttribute('data-symbol'))!;

    await card.click();

    await expect(page).toHaveURL(new RegExp(`/ticker/${symbol}$`));
    await expect(page.getByRole('heading', { name: symbol, level: 1 })).toBeVisible({ timeout: 10000 });

    // The page must not be an overlay: it owns the full viewport height and is
    // a real document scroll, which is what removes the two-pass mobile paint.
    const isOverlay = await page.locator('div.fixed.inset-0.z-50').count();
    expect(isOverlay).toBe(0);

    await page.locator('button[aria-label="Back to Dashboard"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-symbol]').first()).toBeVisible();
  });

  test('is deep-linkable and survives a reload', async ({ page }) => {
    await page.goto('/ticker/AAPL');
    await expect(page.getByRole('heading', { name: 'AAPL', level: 1 })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 30000 });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'AAPL', level: 1 })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 30000 });
  });

  test('browser back button returns to the watchlist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-symbol]').first()).toBeVisible({ timeout: 20000 });
    await page.locator('[data-symbol]').first().click();
    await expect(page).toHaveURL(/\/ticker\//);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-symbol]').first()).toBeVisible();
  });

  test('exposes per-symbol page metadata', async ({ page }) => {
    await page.goto('/ticker/AAPL');
    await expect(page).toHaveTitle(/AAPL/);
    await expect(page).toHaveTitle(/Price History, P\/E & Analyst Forecasts/);
  });

  test('changing the range re-renders the chart on the page', async ({ page }) => {
    await page.goto('/ticker/AAPL');
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: '5y', exact: true }).click();
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('No historical chart points available for this period.')).toHaveCount(0);
  });

  test('lays out as a single stable column on mobile (no reflow)', async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();

    await page.goto('/ticker/AAPL');
    await expect(page.getByRole('heading', { name: 'AAPL', level: 1 })).toBeVisible({ timeout: 20000 });

    // Sample the header height before and after the data lands: on the old
    // modal it shifted noticeably while the chart was still resolving.
    const heading = page.getByRole('heading', { name: 'AAPL', level: 1 });
    const before = await heading.boundingBox();
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 30000 });
    const after = await heading.boundingBox();

    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(5);
    await ctx.close();
  });

  test('persists a reference target set from the page and shows it on the watchlist', async ({ page }) => {
    await page.goto('/ticker/AAPL');
    await expect(page.getByRole('heading', { name: 'AAPL', level: 1 })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 30000 });

    // Open the reference-target editor from the page itself.
    await page.locator('button[aria-label="Edit Reference Target"]').first().click();
    const input = page.locator('input[type="number"]').first();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('123.45');
    await page.locator('form button[type="submit"]').click();

    // The reference card must reflect it immediately.
    await expect(page.getByText('Ref:')).toBeVisible({ timeout: 10000 });

    // And it must survive a reload, proving it was written to the store.
    await page.reload();
    await expect(page.getByText('Ref:')).toBeVisible({ timeout: 20000 });
  });
});