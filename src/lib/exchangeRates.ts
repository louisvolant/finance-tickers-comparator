// Server-side exchange-rate engine.
// Fetches EUR-based rates from the same public source as ../currency-converter
// and caches them in Cloudflare KV (with a stale fallback for resilience).

import { kvGet, kvPut } from './kv';
import { ISO_FIAT_CURRENCIES } from './currencies';

export interface ExchangeRatesPayload {
  base: 'EUR';
  /** rates[CODE] = units of CODE per 1 EUR (EUR = 1). */
  rates: Record<string, number>;
  fetchedAt: number;
}

const RATES_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json';
const RATES_CACHE_KEY = 'rates:eur';
const RATES_TTL_SEC = 24 * 60 * 60; // 24h freshness

interface FawazahmedRatesResponse {
  date?: string;
  eur?: Record<string, number>;
}

/**
 * Pure parser: turns the raw Fawazahmed0 payload into our normalized
 * EUR-based rates, keeping only ISO fiat currencies.
 */
export function buildRatesFromFawazahmed(json: FawazahmedRatesResponse): Record<string, number> {
  const raw = json?.eur || {};
  const rates: Record<string, number> = { EUR: 1 };

  for (const [codeLower, rate] of Object.entries(raw)) {
    const code = codeLower.toUpperCase();
    if (!ISO_FIAT_CURRENCIES.has(code)) continue;
    if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) continue;
    rates[code] = rate;
  }

  return rates;
}

/**
 * Return fresh EUR-based rates, using the KV cache when available and
 * falling back to a stale cache if the upstream request fails.
 */
export async function getExchangeRates(): Promise<ExchangeRatesPayload> {
  const cached = await kvGet<ExchangeRatesPayload>(RATES_CACHE_KEY);

  if (cached && Date.now() - cached.fetchedAt < RATES_TTL_SEC * 1000) {
    return cached;
  }

  try {
    const res = await fetch(RATES_URL, {
      headers: { Accept: 'application/json' },
      // Never let a slow upstream block the request forever.
      signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(8000) : undefined,
    });

    if (!res.ok) {
      throw new Error(`Exchange rates API returned ${res.status}`);
    }

    const json = (await res.json()) as FawazahmedRatesResponse;
    const payload: ExchangeRatesPayload = {
      base: 'EUR',
      rates: buildRatesFromFawazahmed(json),
      fetchedAt: Date.now(),
    };

    await kvPut(RATES_CACHE_KEY, payload, { expirationTtl: RATES_TTL_SEC * 2 });
    return payload;
  } catch (err) {
    if (cached && Object.keys(cached.rates || {}).length > 0) {
      console.warn('Exchange rates fetch failed, serving stale cache:', err);
      return cached;
    }
    throw err;
  }
}
