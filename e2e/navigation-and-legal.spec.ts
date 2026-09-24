import { test, expect } from '@playwright/test';

test.describe('Navigation, Footer Links, Legal & Internationalization', () => {
  test('privacy and terms pages render properly with back links', async ({ page }) => {
    // 1. Visit Privacy Page
    await page.goto('/privacy');
    await expect(page).toHaveTitle(/Privacy Policy/);
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByText('GDPR & Data Protection')).toBeVisible();

    // 2. Visit Terms of Service
    await page.goto('/terms');
    await expect(page).toHaveTitle(/Terms of Service/);
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByText(/Important Financial Disclaimer/i)).toBeVisible();
  });

  test('footer displays Personal Page and Portfolio external links', async ({ page }) => {
    await page.goto('/');

    // Check Personal Page link
    const personalLink = page.locator('a[href="https://www.louisvolant.com"]');
    await expect(personalLink.first()).toBeVisible();

    // Check Portfolio link
    const portfolioLink = page.locator('a[href="https://www.louisvolant.com/portfolio"]');
    await expect(portfolioLink.first()).toBeVisible();

    // Check Privacy & Terms links
    await expect(page.locator('a[href="/privacy"]').first()).toBeVisible();
    await expect(page.locator('a[href="/terms"]').first()).toBeVisible();
  });

  test('language switcher changes UI locale dynamically', async ({ page }) => {
    await page.goto('/');

    // Open language switcher
    await page.locator('button[aria-label="Change language"]').click();
    // Select Français
    await page.locator('button:has-text("Français")').click();

    // Verify UI translated to French
    await expect(
      page.getByText(/Ma Watchlist|Ajouter un ticker|Connexion|Suivez vos actions/i).first()
    ).toBeVisible();
  });
});
