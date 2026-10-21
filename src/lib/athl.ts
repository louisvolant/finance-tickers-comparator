// All-time high / all-time low snapshot used to seed price alerts.
//
// The values are captured once, when the user enables alerts on a ticker, and
// never refreshed on a schedule: the alert then means "break the ATH/ATL as it
// stood on that day". This is deliberately a freeze-frame, so the whole feature
// costs one Yahoo chart call per activation (cached for a day) and nothing at
// scan time.

import { kvGet, kvPut } from './kv';
import { normalizeCurrency } from './currencies';
import { createYahooFinanceClient, getQuote } from './yahooFinance';

export interface AthlSnapshot {
  /** Highest traded price over the recorded history, in `currency`. */
  ath: number;
  /** Lowest traded price over the recorded history, in `currency`. */
  atl: number;
  /** Major ISO currency the values are expressed in (e.g. GBP, never GBp). */
  currency: string;
  /** Epoch ms of the capture. */
  asOf: number;
  /** `max` = full history, `52w` = 52-week fallback when history is unavailable. */
  source: 'max' | '52w';
}

export interface AthlPoint {
  date?: number | Date | string | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
}

export interface AthlRange {
  ath: number | null;
  atl: number | null;
}

/** Cache the snapshot for a day: this only absorbs repeated clicks, not freshness. */
const ATHL_CACHE_TTL_SEC = 24 * 60 * 60;

function toEpochMs(value: number | Date | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // Yahoo chart timestamps are seconds; the library usually converts them to
    // Date, but accept both so a raw payload still works.
    return value < 1e12 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Highest and lowest traded prices in a chart series, ignoring the candle that
 * covers the current month.
 *
 * A `range: 'max'` series always ends with the in-progress monthly candle, whose
 * high already contains today's price. Persisting that value would make the
 * "ATH" equal to the current price, so the alert would fire the instant it is
 * created and again on every new intraday tick. Dropping the current month
 * keeps the reference strictly historical.
 */
export function pickAthlFromChart(points: AthlPoint[], now: number = Date.now()): AthlRange {
  if (!points || points.length === 0) return { ath: null, atl: null };

  const nowDate = new Date(now);
  const startOfCurrentMonth = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1);

  let ath: number | null = null;
  let atl: number | null = null;

  for (const point of points) {
    const date = toEpochMs(point.date);
    if (date !== null && date >= startOfCurrentMonth) continue;

    // Monthly highs/lows are exact session extremes; close is a fallback for
    // series that only carry closes.
    const high = toNumber(point.high) ?? toNumber(point.close);
    const low = toNumber(point.low) ?? toNumber(point.close);

    if (high !== null && (ath === null || high > ath)) ath = high;
    if (low !== null && (atl === null || low < atl)) atl = low;
  }

  return {
    ath: ath !== null ? Number(ath.toFixed(4)) : null,
    atl: atl !== null ? Number(atl.toFixed(4)) : null,
  };
}

/**
 * Capture the ATH/ATL of a symbol, with a KV cache and a 52-week fallback.
 *
 * Returns null when neither the full history nor the 52-week range is available,
 * so the caller can show an explicit "unavailable" state instead of guessing.
 */
export async function getAthlSnapshot(symbol: string): Promise<AthlSnapshot | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!cleanSymbol) return null;

  const cacheKey = `athl:${cleanSymbol}`;
  const cached = await kvGet<AthlSnapshot>(cacheKey);
  if (cached && Date.now() - cached.asOf < ATHL_CACHE_TTL_SEC * 1000) {
    return cached;
  }

  try {
    const yf = createYahooFinanceClient();
    const chart = await yf.chart(cleanSymbol, { period1: '1970-01-01', interval: '1mo' });
    const { ath, atl } = pickAthlFromChart(chart?.quotes ?? []);

    if (ath !== null && atl !== null) {
      // Yahoo reports some venues in minor units (GBp, ZAc, ILA); store the
      // snapshot in the major currency so it compares directly with quotes.
      const { code, factor } = normalizeCurrency(chart?.meta?.currency);
      const snapshot: AthlSnapshot = {
        ath: Number((ath / factor).toFixed(4)),
        atl: Number((atl / factor).toFixed(4)),
        currency: code,
        asOf: Date.now(),
        source: 'max',
      };

      await kvPut(cacheKey, snapshot, { expirationTtl: ATHL_CACHE_TTL_SEC * 2 });
      return snapshot;
    }
  } catch (err) {
    console.warn(`ATH/ATL history fetch failed for ${cleanSymbol}:`, err);
  }

  // Fallback: the 52-week extremes shipped with the live quote. In the common
  // case the quote is already cached, so this adds no upstream request.
  try {
    const quote = await getQuote(cleanSymbol);
    if (
      quote &&
      quote.fiftyTwoWeekHigh !== null &&
      quote.fiftyTwoWeekHigh !== undefined &&
      quote.fiftyTwoWeekLow !== null &&
      quote.fiftyTwoWeekLow !== undefined
    ) {
      return {
        ath: quote.fiftyTwoWeekHigh,
        atl: quote.fiftyTwoWeekLow,
        currency: quote.currency,
        asOf: Date.now(),
        source: '52w',
      };
    }
  } catch (err) {
    console.warn(`ATH/ATL quote fallback failed for ${cleanSymbol}:`, err);
  }

  return null;
}
