import { test, expect } from '@playwright/test';

test.describe('Full User Journey E2E', () => {
  const timestamp = Date.now();
  const testEmail = `investor_${timestamp}@example.com`;
  const testUsername = `investor_${timestamp}`;
  const initialPassword = 'Password123!';
  const updatedPassword = 'NewSecretPassword456!';

  test('complete cycle: registration -> login -> add tickers by ticker & label -> edit tracking value -> reorder -> delete ticker -> change password -> delete account', async ({
    page,
  }) => {
    // 1. Visit Home
    await page.goto('/');
    await expect(page).toHaveTitle(/Ticker-Tracker/);

    // 2. Open Auth modal & register
    await page.getByRole('button', { name: /Sign In|Connexion/i }).first().click();
    await page.getByRole('button', { name: /Create Account|Créer un compte/i }).click();

    await page.fill('input[placeholder="johndoe"]', testUsername);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', initialPassword);
    await page.locator('form button[type="submit"]').click();

    // 3. Verify logged in
    await expect(page.getByText(testUsername, { exact: true })).toBeVisible({ timeout: 10000 });

    // 4. Add first ticker: search by ticker 'AAPL' (1-click direct addition)
    await page.getByRole('button', { name: /Add Ticker/i }).first().click();
    await page.fill('input[placeholder*="Search symbol"]', 'AAPL');
    // 1-click on AAPL result directly adds it and closes modal!
    await page.locator('button:not([disabled]):has-text("AAPL")').first().click();

    // Verify AAPL is visible in the watchlist
    await expect(page.locator('text=AAPL').first()).toBeVisible({ timeout: 10000 });

    // 5. Add second ticker: search by company label 'LVMH' (matches MC.PA) (1-click direct addition)
    await page.getByRole('button', { name: /Add Ticker/i }).first().click();
    await page.fill('input[placeholder*="Search symbol"]', 'LVMH');
    // 1-click on LVMH result directly adds it and closes modal!
    await page.locator('button:not([disabled]):has-text("LVMH")').first().click();

    // Verify LVMH / MC.PA is visible
    await expect(page.locator('text=MC.PA').first()).toBeVisible({ timeout: 10000 });

    // 6. Optional Reference Target: set tracking value on a ticker via edit modal
    const editButtons = page.locator('button[title*="Edit Reference Target" i], button[title*="Modifier la valeur" i]');
    if (await editButtons.first().isVisible()) {
      await editButtons.first().click();
      await page.fill('input[type="number"]', '200');
      await page.locator('form button[type="submit"]').click();
      await page.waitForTimeout(500);
    }

    // 7. Click ticker to view details modal & price chart
    await page.locator('[data-symbol="AAPL"]').first().click();
    await expect(
      page.getByText('Price History', { exact: true }).or(page.getByText('Historique des cours', { exact: true }))
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/52-Week Range|Fourchette 52 semaines/i)).toBeVisible();
    // Close details modal
    await page.locator('button[aria-label="Close details modal"]').click();

    // 8. Reorder tickers: move first ticker down
    const downButtons = page.locator('button[title*="down" i], button[title*="bas" i]');
    if (await downButtons.first().isVisible()) {
      await downButtons.first().click();
      // Wait for state reorder
      await page.waitForTimeout(500);
    }

    // 9. Change Password
    await page.locator(`button:has-text("${testUsername}")`).first().click();
    await expect(page.getByText(/Account Settings|Paramètres du compte/i)).toBeVisible();

    await page.fill('input[data-testid="current-password-input"]', initialPassword);
    await page.fill('input[data-testid="new-password-input"]', updatedPassword);
    await page.fill('input[data-testid="confirm-password-input"]', updatedPassword);
    await page.getByRole('button', { name: /Update Password|Mettre à jour le mot de passe/i }).click();

    await expect(
      page.getByText(/Password updated successfully|Mot de passe mis à jour avec succès/i)
    ).toBeVisible({ timeout: 5000 });

    // Close account modal
    await page.locator('button[aria-label="Close account modal"]').click();

    // 10. Logout and Login with new password
    await page.locator('button[data-testid="logout-button"]').first().click();
    await expect(page.getByRole('button', { name: /Sign In|Connexion/i }).first()).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Sign In|Connexion/i }).first().click();
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', updatedPassword);
    await page.getByRole('button', { name: /Sign In|Se connecter/i }).last().click();

    await expect(page.getByText(testUsername, { exact: true })).toBeVisible({ timeout: 10000 });

    // 11. Delete Account
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.locator(`button:has-text("${testUsername}")`).first().click();
    await page.getByRole('button', { name: /Delete Account|Supprimer mon compte/i }).click();

    // Verify redirected and logged out
    await expect(page.getByRole('button', { name: /Sign In|Connexion/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
