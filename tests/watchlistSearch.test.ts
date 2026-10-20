import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTickersByQuery,
  matchesTickerQuery,
  normalizeSearchText,
} from '../src/lib/watchlistSearch';
import { TickerQuote, UserTicker } from '../src/lib/types';

const quote = (symbol: string, name: string): TickerQuote => ({
  symbol,
  name,
  price: 0,
  change: 0,
  changePercent: 0,
  currency: 'EUR',
  trailingPE: null,
  forwardPE: null,
  marketCap: null,
  dividendYield: null,
  fiftyTwoWeekHigh: null,
  fiftyTwoWeekLow: null,
  epsTrailingTwelveMonths: null,
  beta: null,
  volume: null,
  avgVolume: null,
  exchange: 'PAR',
  quoteType: 'EQUITY',
  updatedAt: 0,
});

const ticker = (symbol: string, name: string, quoteName?: string): UserTicker => ({
  id: symbol,
  symbol,
  name,
  trackingValue: null,
  order: 0,
  createdAt: 0,
  ...(quoteName ? { quote: quote(symbol, quoteName) } : {}),
});

describe('Watchlist live search', () => {
  const tickers: UserTicker[] = [
    ticker('MC.PA', 'LVMH'),
    ticker('AAPL', 'Apple Inc.'),
    ticker('GLE.PA', 'Société Générale', 'Societe Generale SA'),
    ticker('BNP.PA', 'BNP Paribas'),
  ];

  test('normalizes case, surrounding spaces and accents', () => {
    assert.equal(normalizeSearchText('  Société Générale  '), 'societe generale');
  });

  test('matches ticker symbols and labels, accent-insensitively', () => {
    assert.equal(matchesTickerQuery(tickers[0], 'mc.pa'), true);
    assert.equal(matchesTickerQuery(tickers[2], 'societe'), true);
    assert.equal(matchesTickerQuery(tickers[2], 'SOCIÉTÉ'), true);
    assert.equal(matchesTickerQuery(tickers[2], 'generale sa'), true);
    assert.equal(matchesTickerQuery(tickers[0], 'apple'), false);
  });

  test('falls back to the Yahoo-provided company name', () => {
    assert.equal(matchesTickerQuery(tickers[2], 'societe generale sa'), true);
  });

  test('keeps the full list for an empty query and filters otherwise', () => {
    assert.equal(filterTickersByQuery(tickers, '   '), tickers);

    assert.deepEqual(
      filterTickersByQuery(tickers, 'a').map((item) => item.symbol),
      ['MC.PA', 'AAPL', 'GLE.PA', 'BNP.PA']
    );
    assert.deepEqual(
      filterTickersByQuery(tickers, 'bnp').map((item) => item.symbol),
      ['BNP.PA']
    );
    assert.equal(filterTickersByQuery(tickers, 'does-not-exist').length, 0);
  });
});
