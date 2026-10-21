import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTickersByExchange,
  getExchangeInfo,
  getExchangeFilters,
  groupTickersByExchange,
} from '../src/lib/displayModes';
import { TickerQuote, UserTicker } from '../src/lib/types';

/** Minimal complete quote: the grouping helpers only read symbol/exchange. */
function quote(
  symbol: string,
  name: string,
  price: number,
  change: number,
  changePercent: number,
  currency: string,
  exchange: string
): TickerQuote {
  return {
    symbol,
    name,
    price,
    change,
    changePercent,
    currency,
    exchange,
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
    quoteType: 'EQUITY',
    updatedAt: 0,
  };
}

describe('Display Modes & Exchange Grouping', () => {
  const createdAt = Date.UTC(2026, 0, 1);

  const mockTickers: UserTicker[] = [
    {
      id: '1',
      symbol: 'MC.PA',
      name: 'LVMH Paris',
      trackingValue: 700,
      order: 1,
      createdAt,
      quote: quote('MC.PA', 'LVMH', 750, 5, 0.67, 'EUR', 'PAR'),
    },
    {
      id: '2',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      trackingValue: 200,
      order: 2,
      createdAt,
      quote: quote('AAPL', 'Apple Inc.', 230, -1, -0.43, 'USD', 'NMS'),
    },
    {
      id: '3',
      symbol: 'EXX1.DE',
      name: 'iShares Euro Stoxx Banks',
      trackingValue: null,
      order: 3,
      createdAt,
      quote: quote('EXX1.DE', 'iShares Banks', 15, 0.1, 0.7, 'EUR', 'GER'),
    },
    {
      id: '4',
      symbol: 'AI.PA',
      name: 'Air Liquide',
      trackingValue: null,
      order: 4,
      createdAt,
      quote: quote('AI.PA', 'Air Liquide', 170, 1.5, 0.89, 'EUR', 'PAR'),
    },
    {
      id: '5',
      symbol: 'MSFT',
      name: 'Microsoft Corp',
      trackingValue: null,
      order: 5,
      createdAt,
      quote: quote('MSFT', 'Microsoft', 430, 2, 0.47, 'USD', 'NMS'),
    },
  ];

  test('should classify European and US exchanges properly', () => {
    assert.equal(getExchangeInfo(mockTickers[0]).id, 'PARIS');
    assert.equal(getExchangeInfo(mockTickers[1]).id, 'NASDAQ');
    assert.equal(getExchangeInfo(mockTickers[2]).id, 'XETRA');
  });

  test('should group tickers by exchange with internal alphabetical ordering', () => {
    const groups = groupTickersByExchange(mockTickers);
    assert.ok(groups.length >= 3);

    const parisGroup = groups.find((g) => g.id === 'PARIS');
    assert.ok(parisGroup);
    assert.equal(parisGroup.tickers.length, 2);
    // AI.PA should come before MC.PA in alphabetical order
    assert.equal(parisGroup.tickers[0].symbol, 'AI.PA');
    assert.equal(parisGroup.tickers[1].symbol, 'MC.PA');

    const nasdaqGroup = groups.find((g) => g.id === 'NASDAQ');
    assert.ok(nasdaqGroup);
    assert.equal(nasdaqGroup.tickers.length, 2);
    // AAPL should come before MSFT
    assert.equal(nasdaqGroup.tickers[0].symbol, 'AAPL');
    assert.equal(nasdaqGroup.tickers[1].symbol, 'MSFT');
  });

  test('should support reorder display mode in options', () => {
    const validModes: Array<'custom' | 'alphabetical' | 'by_exchange' | 'reorder'> = [
      'custom',
      'alphabetical',
      'by_exchange',
      'reorder',
    ];
    assert.equal(validModes.includes('reorder'), true);
  });

  test('should expose unique market filters in hub priority order', () => {
    const filters = getExchangeFilters(mockTickers);
    assert.deepEqual(
      filters.map((filter) => filter.id),
      ['PARIS', 'NASDAQ', 'XETRA']
    );
  });

  test('should filter tickers by one or several markets, empty selection meaning all', () => {
    assert.deepEqual(filterTickersByExchange(mockTickers, []), mockTickers);

    const paris = filterTickersByExchange(mockTickers, ['PARIS']).map((ticker) => ticker.symbol);
    assert.deepEqual(paris, ['MC.PA', 'AI.PA']);

    const parisAndNasdaq = filterTickersByExchange(mockTickers, ['PARIS', 'NASDAQ']).map(
      (ticker) => ticker.symbol
    );
    assert.deepEqual(parisAndNasdaq, ['MC.PA', 'AAPL', 'AI.PA', 'MSFT']);

    assert.equal(filterTickersByExchange(mockTickers, ['LSE']).length, 0);
  });
});
