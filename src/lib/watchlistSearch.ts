import { UserTicker } from './types';

/**
 * Normalize text for case- and accent-insensitive matching, so "Société
 * Générale" can be found by typing "societe".
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

/**
 * Whether a watchlist ticker matches a free-text query. Symbol, label and
 * Yahoo-provided company name are all searched, which keeps the filter useful
 * when a ticker was added under a shortened label.
 */
export function matchesTickerQuery(ticker: UserTicker, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  return [ticker.symbol, ticker.name, ticker.quote?.name ?? ''].some((value) =>
    normalizeSearchText(value).includes(normalizedQuery)
  );
}

/** Filter the watchlist by a free-text query. An empty query keeps every ticker. */
export function filterTickersByQuery(tickers: UserTicker[], query: string): UserTicker[] {
  if (!normalizeSearchText(query)) return tickers;
  return tickers.filter((ticker) => matchesTickerQuery(ticker, query));
}
