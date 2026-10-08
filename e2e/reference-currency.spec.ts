import { test, expect, Page } from '@playwright/test';

async function registerUser(page: Page, username: string, email: string) {
  await page.goto('/');
  await page.getByRole('button', { name: /Sign In|Connexion/i }).first().click();
  await page.getByRole('button', { name: /Create Account|Créer un compte/i }).click();

  await page.fill('input[placeholder="johndoe"]', username);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Password123!');
  await page.locator('form button[type="submit"]').click();

  await expect(page.getByText(username, { exact: true })).toBeVisible({ timeout: 10000 });
}

async function setPreferredCurrencyToEur(page: Page, username: string) {
  await page.locator(`button:has-text("${username}")`).first().click();
  await expect(page.getByText(/Account Settings|Paramètres du compte/i)).toBeVisible({ timeout: 5000 });

  // Quick-pick for EUR in the "Reference Currency" section.
  await page.locator('[data-testid="currency-quick-EUR"]').click();
  await expect(page.locator('[data-testid="currency-quick-EUR"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('button[aria-label="Close account modal"]').click();
}

async function addTicker(page: Page, symbol: string) {
  await page.getByRole('button', { name: /Add Ticker/i }).first().click();
  await page.fill('input[placeholder*="Search symbol"]', symbol);
  await page.locator(`button:not([disabled]):has-text("${symbol}")`).first().click();
  await expect(page.locator(`[data-symbol="${symbol}"]`).first()).toBeVisible({ timeout: 10000 });
}

test.describe('Reference value currency E2E', () => {
  test('account offers currency choices and persists the selected one', async ({ page }) => {
    const timestamp = Date.now();
    const username = `currency_${timestamp}`;
    await registerUser(page, username, `${username}@example.com`);

    await page.locator(`button:has-text("${username}")`).first().click();
    await expect(page.getByText(/Account Settings|Paramètres du compte/i)).toBeVisible({ timeout: 5000 });

    // The four English-region flags plus EUR are offered as quick picks.
    for (const code of ['EUR', 'GBP', 'USD', 'CAD', 'AUD']) {
      await expect(page.locator(`[data-testid="currency-quick-${code}"]`)).toBeVisible();
    }

    // Full ISO selector is available as a fallback.
    await expect(page.locator('[data-testid="preferred-currency-select"]')).toBeVisible();

    await page.locator('[data-testid="currency-quick-EUR"]').click();
    await expect(page.locator('[data-testid="currency-quick-EUR"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('reference value defaults to the listing currency (LVMH / MC.PA in EUR)', async ({ page }) => {
    const timestamp = Date.now();
    const username = `listing_${timestamp}`;
    await registerUser(page, username, `${username}@example.com`);

    await addTicker(page, 'MC.PA');

    const row = page.locator('[data-symbol="MC.PA"]').first();
    await row.locator('button[title*="Edit Reference Target" i], button[title*="Modifier" i]').first().click();

    // Listing currency mode is selected by default and shows the EUR option.
    const listingBtn = page.locator('[data-testid="tracking-currency-listing"]');
    await expect(listingBtn).toBeVisible();
    await expect(listingBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(listingBtn).toContainText(/EUR/i);

    // The input symbol reflects EUR.
    await expect(page.locator('[data-testid="tracking-currency-symbol"]')).toHaveText('€');
  });

  test('can enter a reference value in my own currency for a foreign-listed ticker', async ({ page }) => {
    const timestamp = Date.now();
    const username = `fx_${timestamp}`;
    await registerUser(page, username, `${username}@example.com`);

    // Use EUR as the user's own currency.
    await setPreferredCurrencyToEur(page, username);

    // AAPL is listed in USD.
    await addTicker(page, 'AAPL');

    const row = page.locator('[data-symbol="AAPL"]').first();
    await row.locator('button[title*="Edit Reference Target" i], button[title*="Modifier" i]').first().click();

    // Switch to "my currency" mode -> EUR.
    const personalBtn = page.locator('[data-testid="tracking-currency-personal"]');
    await expect(personalBtn).toBeVisible();
    await personalBtn.click();
    await expect(personalBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(personalBtn).toContainText(/EUR/i);

    // The input symbol switches to EUR.
    await expect(page.locator('[data-testid="tracking-currency-symbol"]')).toHaveText('€');

    // Entering a value triggers a conversion preview (rate or unavailability notice).
    await page.fill('input[type="number"]', '100');
    await expect(page.locator('[data-testid="tracking-conversion-preview"]')).toBeVisible({ timeout: 10000 });

    await page.locator('form button[type="submit"]').click();

    // The stored reference value is displayed in EUR (its own currency).
    await expect(page.locator('[data-testid="tracking-value-AAPL"]')).toContainText('€', { timeout: 10000 });
  });
});
