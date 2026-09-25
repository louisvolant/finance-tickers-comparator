import { test, expect } from '@playwright/test';

test.describe('Display Modes Selector', () => {
  test('should toggle between custom order, alphabetical, and by trading exchange views', async ({ page }) => {
    await page.goto('/');

    // Verify display mode dropdown button is present on the action bar
    const displayBtn = page.locator('button[title*="Affichage" i], button[title*="Display View" i], button[title*="View" i]').first();
    await expect(displayBtn).toBeVisible({ timeout: 10000 });

    // Open display mode dropdown
    await displayBtn.click();
    const alphaOption = page.getByText(/Ordre alphabétique|Alphabetical/i).first();
    await expect(alphaOption).toBeVisible();

    // Switch to Alphabetical
    await alphaOption.click();
    await page.waitForTimeout(400);

    // Switch to By Exchange
    await displayBtn.click();
    const exchangeOption = page.getByText(/Par place de cotation|By Trading Market/i).first();
    await expect(exchangeOption).toBeVisible();
    await exchangeOption.click();
    await page.waitForTimeout(400);

    // Verify exchange headers appear (e.g. Euronext Paris or NASDAQ)
    await expect(
      page.getByText('Euronext Paris').or(page.getByText('PARIS')).or(page.getByText('NASDAQ')).first()
    ).toBeVisible({ timeout: 5000 });

    // Switch back to Custom Order
    await displayBtn.click();
    const customOption = page.getByText(/Liste ordonnée|Custom Order/i).first();
    await expect(customOption).toBeVisible();
    await customOption.click();
    await page.waitForTimeout(400);
  });
});
