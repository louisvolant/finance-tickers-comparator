import YahooFinance from 'yahoo-finance2';
import { kvGet, kvPut } from './kv';
import { TickerQuote, TickerSearchResult, ChartPoint, TickerDetails } from './types';

// Instantiate YahooFinance client suppressing survey notice
const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});

const QUOTE_CACHE_TTL_SEC = 90; // Cache quotes for 90 seconds in KV
const SEARCH_CACHE_TTL_SEC = 3600; // Cache search queries for 1 hour in KV
const CHART_CACHE_TTL_SEC = 600; // Cache chart data for 10 minutes in KV

/**
 * Normalizes Yahoo quote raw object into our standardized TickerQuote.
 */
function normalizeQuote(raw: any, symbolOverride?: string): TickerQuote {
  const sym = (raw.symbol || symbolOverride || '').toUpperCase();
  const price = raw.regularMarketPrice ?? 0;

  // Safe calculation for Trailing PE if missing
  let trailingPE = raw.trailingPE ?? null;
  if (!trailingPE && raw.epsTrailingTwelveMonths && raw.epsTrailingTwelveMonths > 0 && price > 0) {
    trailingPE = Number((price / raw.epsTrailingTwelveMonths).toFixed(2));
  }

  // Safe calculation for Forward PE if missing
  let forwardPE = raw.forwardPE ?? null;
  if (!forwardPE && raw.epsForward && raw.epsForward > 0 && price > 0) {
    forwardPE = Number((price / raw.epsForward).toFixed(2));
  }

  return {
    symbol: sym,
    name: raw.shortName || raw.longName || sym || 'Unknown',
    price: Number(price.toFixed(4)),
    change: Number((raw.regularMarketChange ?? 0).toFixed(4)),
    changePercent: Number((raw.regularMarketChangePercent ?? 0).toFixed(2)),
    currency: raw.currency || 'USD',
    trailingPE: trailingPE ? Number(trailingPE.toFixed(2)) : null,
    forwardPE: forwardPE ? Number(forwardPE.toFixed(2)) : null,
    marketCap: raw.marketCap ?? null,
    dividendYield: raw.dividendYield ? Number((raw.dividendYield * 100).toFixed(2)) : null,
    fiftyTwoWeekHigh: raw.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: raw.fiftyTwoWeekLow ?? null,
    epsTrailingTwelveMonths: raw.epsTrailingTwelveMonths ?? null,
    beta: raw.beta ?? null,
    volume: raw.regularMarketVolume ?? null,
    avgVolume: raw.averageDailyVolume3Month ?? null,
    exchange: raw.exchange || raw.fullExchangeName || '',
    quoteType: raw.quoteType || 'EQUITY',
    updatedAt: Date.now(),
  };
}

/**
 * Fallback to direct public Chart API if Yahoo Finance crumb/cookie is throttled
 */
async function fetchChartDirect(symbol: string): Promise<any | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result || !result.meta) return null;

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
    const change = currentPrice - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    return {
      symbol: meta.symbol || symbol,
      shortName: meta.shortName || meta.symbol || symbol,
      regularMarketPrice: currentPrice,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || '',
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      regularMarketVolume: meta.regularMarketVolume,
    };
  } catch (err) {
    console.debug(`Chart direct fallback failed for ${symbol}:`, err);
    return null;
  }
}

/**
 * Fetch a single ticker quote with multi-tiered resilience and KV caching.
 */
export async function getQuote(symbol: string): Promise<TickerQuote | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!cleanSymbol) return null;

  const cacheKey = `quote:${cleanSymbol}`;
  const cached = await kvGet<TickerQuote>(cacheKey);
  if (cached && Date.now() - cached.updatedAt < QUOTE_CACHE_TTL_SEC * 1000) {
    return cached;
  }

  // Tier 1: Try yf.quote
  try {
    const raw = await yf.quote(cleanSymbol);
    if (raw && raw.symbol) {
      const quote = normalizeQuote(raw, cleanSymbol);
      await kvPut(cacheKey, quote, { expirationTtl: QUOTE_CACHE_TTL_SEC * 4 });
      return quote;
    }
  } catch (err: any) {
    console.warn(`yf.quote tier 1 warning for ${cleanSymbol}:`, err?.message || err);
  }

  // Tier 2: Try yf.quoteSummary
  try {
    const qs = await yf.quoteSummary(cleanSymbol, {
      modules: ['price', 'summaryDetail', 'defaultKeyStatistics'],
    });
    if (qs && qs.price && qs.price.regularMarketPrice !== undefined) {
      const merged = {
        symbol: cleanSymbol,
        shortName: qs.price.shortName || cleanSymbol,
        longName: qs.price.longName,
        regularMarketPrice: qs.price.regularMarketPrice,
        regularMarketChange: qs.price.regularMarketChange,
        regularMarketChangePercent: qs.price.regularMarketChangePercent,
        currency: qs.price.currency,
        exchange: qs.price.exchangeName,
        marketCap: qs.price.marketCap || qs.summaryDetail?.marketCap,
        trailingPE: qs.summaryDetail?.trailingPE,
        forwardPE: qs.summaryDetail?.forwardPE || qs.defaultKeyStatistics?.forwardPE,
        dividendYield: qs.summaryDetail?.dividendYield,
        fiftyTwoWeekHigh: qs.summaryDetail?.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: qs.summaryDetail?.fiftyTwoWeekLow,
        epsTrailingTwelveMonths: qs.defaultKeyStatistics?.trailingEps,
        beta: qs.defaultKeyStatistics?.beta,
        regularMarketVolume: qs.price.regularMarketVolume,
        averageDailyVolume3Month: qs.price.averageDailyVolume3Month,
      };
      const quote = normalizeQuote(merged, cleanSymbol);
      await kvPut(cacheKey, quote, { expirationTtl: QUOTE_CACHE_TTL_SEC * 4 });
      return quote;
    }
  } catch (err: any) {
    console.warn(`yf.quoteSummary tier 2 warning for ${cleanSymbol}:`, err?.message || err);
  }

  // Tier 3: Direct chart fallback
  const directData = await fetchChartDirect(cleanSymbol);
  if (directData) {
    const quote = normalizeQuote(directData, cleanSymbol);
    // Keep cached PE if we previously had it
    if (cached) {
      quote.trailingPE = cached.trailingPE;
      quote.forwardPE = cached.forwardPE;
      quote.marketCap = cached.marketCap;
      quote.dividendYield = cached.dividendYield;
    }
    await kvPut(cacheKey, quote, { expirationTtl: QUOTE_CACHE_TTL_SEC * 4 });
    return quote;
  }

  // Tier 4: Return stale cache if available
  if (cached) {
    return cached;
  }

  return null;
}

/**
 * Batch fetch multiple ticker quotes.
 */
export async function getBatchQuotes(symbols: string[]): Promise<Record<string, TickerQuote>> {
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()))).filter(Boolean);
  if (uniqueSymbols.length === 0) return {};

  const results: Record<string, TickerQuote> = {};
  const toFetch: string[] = [];

  // Check KV cache first
  for (const sym of uniqueSymbols) {
    const cached = await kvGet<TickerQuote>(`quote:${sym}`);
    if (cached && Date.now() - cached.updatedAt < QUOTE_CACHE_TTL_SEC * 1000) {
      results[sym] = cached;
    } else {
      toFetch.push(sym);
      if (cached) {
        results[sym] = cached;
      }
    }
  }

  if (toFetch.length === 0) {
    return results;
  }

  // Fetch missing concurrently
  const fetchPromises = toFetch.map(async (sym) => {
    try {
      const quote = await getQuote(sym);
      if (quote) {
        results[sym] = quote;
      }
    } catch (err) {
      console.error(`Batch fetch error for ${sym}:`, err);
    }
  });

  await Promise.allSettled(fetchPromises);
  return results;
}

import { searchCatalog } from './stockCatalog';

/**
 * Autocomplete / Search tickers via Curated Catalog & Yahoo Finance.
 * Supports search by ticker symbol, company label / name, or ISIN code.
 */
export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery || cleanQuery.length < 1) return [];

  const cacheKey = `search:${cleanQuery}`;
  const cached = await kvGet<TickerSearchResult[]>(cacheKey);
  if (cached) return cached;

  // 1. Check curated catalog for ticker, label, or ISIN match
  const catalogMatches = searchCatalog(query);
  const seenSymbols = new Set(catalogMatches.map((m) => m.symbol.toUpperCase()));

  try {
    const res = await yf.search(cleanQuery, {
      newsCount: 0,
      quotesCount: 8,
    });

    const yahooItems = (res.quotes || [])
      .filter((q: any) => q.isYahooFinance && q.symbol)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
        quoteType: q.quoteType || q.typeDisp || 'EQUITY',
        sector: q.sector || '',
        industry: q.industry || '',
      }))
      .filter((item: TickerSearchResult) => !seenSymbols.has(item.symbol.toUpperCase()));

    const combined = [...catalogMatches, ...yahooItems];
    await kvPut(cacheKey, combined, { expirationTtl: SEARCH_CACHE_TTL_SEC });
    return combined;
  } catch (err) {
    console.error(`Search error for "${cleanQuery}":`, err);
    return catalogMatches;
  }
}

/**
 * Fetch detailed stats and historical chart for a ticker.
 */
export async function getTickerDetails(
  symbol: string,
  range: '1d' | '5d' | '1mo' | '6mo' | '1y' | '5y' = '1mo'
): Promise<TickerDetails | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!cleanSymbol) return null;

  const cacheKey = `details:${cleanSymbol}:${range}`;
  const cached = await kvGet<TickerDetails>(cacheKey);
  if (cached) return cached;

  try {
    const quote = await getQuote(cleanSymbol);
    if (!quote) return null;

    let interval: '2m' | '15m' | '1d' | '1wk' | '1mo' = '1d';
    let startDate = new Date();

    if (range === '1d') {
      startDate.setDate(startDate.getDate() - 1);
      interval = '15m';
    } else if (range === '5d') {
      startDate.setDate(startDate.getDate() - 5);
      interval = '15m';
    } else if (range === '1mo') {
      startDate.setMonth(startDate.getMonth() - 1);
      interval = '1d';
    } else if (range === '6mo') {
      startDate.setMonth(startDate.getMonth() - 6);
      interval = '1d';
    } else if (range === '1y') {
      startDate.setFullYear(startDate.getFullYear() - 1);
      interval = '1wk';
    } else if (range === '5y') {
      startDate.setFullYear(startDate.getFullYear() - 5);
      interval = '1mo';
    }

    let chartPoints: ChartPoint[] = [];

    // Attempt chart fetch via yf
    try {
      const chartRes = await yf.chart(cleanSymbol, {
        period1: startDate.toISOString().split('T')[0],
        interval: interval as any,
      });

      if (chartRes && chartRes.quotes && chartRes.quotes.length > 0) {
        chartPoints = chartRes.quotes
          .filter((pt: any) => pt.close !== null && pt.close !== undefined)
          .map((pt: any) => {
            const d = new Date(pt.date);
            return {
              date: range === '1d' || range === '5d'
                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: range === '5y' ? '2-digit' : undefined }),
              timestamp: d.getTime(),
              close: Number(pt.close.toFixed(2)),
              open: pt.open ? Number(pt.open.toFixed(2)) : undefined,
              high: pt.high ? Number(pt.high.toFixed(2)) : undefined,
              low: pt.low ? Number(pt.low.toFixed(2)) : undefined,
              volume: pt.volume ?? undefined,
            };
          });
      }
    } catch (chartErr) {
      console.warn(`Chart fetch warning for ${cleanSymbol}:`, chartErr);
    }

    // Direct fallback for chart if yf.chart was empty
    if (chartPoints.length === 0) {
      try {
        const directRes = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?range=${range}&interval=${interval}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          }
        );
        if (directRes.ok) {
          const directJson = await directRes.json();
          const r = directJson.chart?.result?.[0];
          const timestamps = r?.timestamp || [];
          const closes = r?.indicators?.quote?.[0]?.close || [];
          chartPoints = timestamps
            .map((t: number, i: number) => {
              const d = new Date(t * 1000);
              return {
                date: range === '1d' || range === '5d'
                  ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                timestamp: t * 1000,
                close: closes[i] ? Number(closes[i].toFixed(2)) : null,
              };
            })
            .filter((p: any) => p.close !== null);
        }
      } catch (directErr) {
        console.warn(`Direct chart fallback warning for ${cleanSymbol}:`, directErr);
      }
    }

    const details: TickerDetails = {
      quote,
      chart: chartPoints,
    };

    await kvPut(cacheKey, details, { expirationTtl: CHART_CACHE_TTL_SEC });
    return details;
  } catch (err) {
    console.error(`Details fetch error for ${cleanSymbol}:`, err);
    return null;
  }
}
