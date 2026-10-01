import { test, expect, request as playwrightRequest } from '@playwright/test';

/**
 * Concurrency coverage for the quote API.
 *
 * IMPORTANT - what this does and does not cover:
 * the original failure was Workers-specific. A module-scope yahoo-finance2
 * client shared one memoised crumb promise between concurrent requests; under
 * workerd the losing requests awaited a promise from a torn-down context and
 * hung until the runtime killed them with HTTP 500. Node has no per-request
 * context teardown, so this suite CANNOT reproduce that race.
 *
 * What it does cover is that the batch/detail/search endpoints stay healthy
 * when hammered in parallel, and that a shared client per batch does not break
 * symbol fan-out. The request-scoped client invariant itself is enforced by
 * tests/yahooClientLifecycle.test.ts, and the Workers behaviour is verified
 * against `wrangler dev` - see the "Workers concurrency" note in the README.
 */
test.describe('Quote API under concurrency', () => {
  const SYMBOLS = [
    'AAPL', 'MSFT', 'NVDA', 'META', 'AMZN', 'GOOGL',
    'AMD', 'TEAM', 'NET', 'VRT', 'CEG', 'MRVL',
  ];

  test('serves parallel batch quote requests without failures', async ({ baseURL }) => {
    const api = await playwrightRequest.newContext({ baseURL });

    try {
      const responses = await Promise.all(
        Array.from({ length: 6 }, () =>
          api.get(`/api/tickers/quote?symbols=${encodeURIComponent(SYMBOLS.join(','))}`)
        )
      );

      for (const res of responses) {
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Object.keys(body.quotes).length).toBeGreaterThan(0);
      }
    } finally {
      await api.dispose();
    }
  });

  test('serves mixed parallel requests across every Yahoo-backed endpoint', async ({ baseURL }) => {
    const api = await playwrightRequest.newContext({ baseURL });

    try {
      const calls = [
        api.get(`/api/tickers/quote?symbols=${encodeURIComponent(SYMBOLS.join(','))}`),
        api.get(`/api/tickers/quote?symbols=${encodeURIComponent(SYMBOLS.slice(0, 6).join(','))}`),
        api.get('/api/tickers/details?symbol=AAPL&range=1mo'),
        api.get('/api/tickers/details?symbol=MSFT&range=6mo'),
        api.get('/api/tickers/search?q=Apple'),
        api.get('/api/tickers/search?q=LVMH'),
      ];

      const responses = await Promise.all(calls);
      const statuses = responses.map((r) => r.status());
      expect(statuses).toEqual(statuses.map(() => 200));
    } finally {
      await api.dispose();
    }
  });

  test('a batch request fans out to every requested symbol', async ({ baseURL }) => {
    const api = await playwrightRequest.newContext({ baseURL });
    try {
      const res = await api.get(`/api/tickers/quote?symbols=${encodeURIComponent(SYMBOLS.join(','))}`);
      expect(res.status()).toBe(200);

      const { quotes } = await res.json();
      for (const symbol of SYMBOLS) {
        expect(quotes[symbol], `${symbol} must be present`).toBeTruthy();
        expect(quotes[symbol].price).toBeGreaterThan(0);
      }
    } finally {
      await api.dispose();
    }
  });
});