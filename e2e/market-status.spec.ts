import { test, expect, APIRequestContext } from '@playwright/test';

type Session = { opensAt: number; closesAt: number };

/**
 * First regular session the server computed for a symbol. The browser clock is
 * then frozen relative to that session, so the badge state is deterministic
 * whatever the real date is.
 */
async function firstSession(request: APIRequestContext, symbol: string): Promise<Session> {
  const res = await request.get(`/api/tickers/details?symbol=${encodeURIComponent(symbol)}&range=1mo`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const sessions: Session[] | undefined = body.quote?.marketSessions;
  expect(sessions?.length ?? 0).toBeGreaterThan(0);
  return sessions![0];
}

const MIN = 60_000;

test.describe('Market status badge', () => {
  test('ticker page says the venue opens soon, with the countdown', async ({ page, request }) => {
    const session = await firstSession(request, 'MC.PA');
    await page.clock.setFixedTime(new Date(session.opensAt - 20 * MIN));

    await page.goto('/ticker/MC.PA');

    const badge = page.getByTestId('market-status');
    await expect(badge).toHaveAttribute('data-state', 'opens_soon', { timeout: 15000 });
    await expect(badge).toContainText('Opens in 20 min');
  });

  test('ticker page says the venue has just closed', async ({ page, request }) => {
    const session = await firstSession(request, 'MC.PA');
    await page.clock.setFixedTime(new Date(session.closesAt + 5 * MIN));

    await page.goto('/ticker/MC.PA');

    const badge = page.getByTestId('market-status');
    await expect(badge).toHaveAttribute('data-state', 'just_closed', { timeout: 15000 });
    await expect(badge).toContainText('Closed 5 min ago');
  });

  test('mobile cards show the badge while desktop rows stay clean', async ({ page, request }) => {
    const session = await firstSession(request, 'MC.PA');
    await page.clock.setFixedTime(new Date(session.opensAt - 20 * MIN));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('div[data-symbol="MC.PA"] [data-testid="market-status"]')).toBeVisible({
      timeout: 15000,
    });
  });

  test('desktop rows do not carry the market status', async ({ page, request }) => {
    const session = await firstSession(request, 'MC.PA');
    await page.clock.setFixedTime(new Date(session.opensAt - 20 * MIN));

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    // Wait for live data so that the absence of the badge is not a loading artefact.
    await expect(page.locator('tr[data-symbol="MC.PA"]')).toContainText('€', { timeout: 15000 });
    await expect(page.locator('tr[data-symbol="MC.PA"] [data-testid="market-status"]')).toHaveCount(0);
  });
});

test.describe('Market status times', () => {
  // The badge must use the viewer's clock, not the exchange clock.
  test.use({ timezoneId: 'Europe/Paris' });

  test('a US opening is shown in the viewer timezone', async ({ page, request }) => {
    const session = await firstSession(request, 'NVDA');
    await page.clock.setFixedTime(new Date(session.opensAt - 2 * 60 * MIN));

    await page.goto('/ticker/NVDA');

    const parisTime = new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Europe/Paris',
    }).format(session.opensAt);

    const badge = page.getByTestId('market-status');
    await expect(badge).toHaveAttribute('data-state', 'closed', { timeout: 15000 });
    await expect(badge).toContainText(`Opens today at ${parisTime}`);
    await expect(badge).toHaveAttribute('title', /America\/New_York/);
  });
});
