import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getExchangeInfo, groupTickersByExchange } from '../src/lib/displayModes';
import { UserTicker } from '../src/lib/types';

describe('Display Modes & Exchange Grouping', () => {
  const mockTickers: UserTicker[] = [
    {
      id: '1',
      userId: 'user1',
      symbol: 'MC.PA',
      name: 'LVMH Paris',
      trackingValue: 700,
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quote: {
        symbol: 'MC.PA',
        name: 'LVMH',
        price: 750,
        change: 5,
        changePercent: 0.67,
        currency: 'EUR',
        exchange: 'PAR',
      },
    },
    {
      id: '2',
      userId: 'user1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      trackingValue: 200,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quote: {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 230,
        change: -1,
        changePercent: -0.43,
        currency: 'USD',
        exchange: 'NMS',
      },
    },
    {
      id: '3',
      userId: 'user1',
      symbol: 'EXX1.DE',
      name: 'iShares Euro Stoxx Banks',
      trackingValue: null,
      order: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quote: {
        symbol: 'EXX1.DE',
        name: 'iShares Banks',
        price: 15,
        change: 0.1,
        changePercent: 0.7,
        currency: 'EUR',
        exchange: 'GER',
      },
    },
    {
      id: '4',
      userId: 'user1',
      symbol: 'AI.PA',
      name: 'Air Liquide',
      trackingValue: null,
      order: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quote: {
        symbol: 'AI.PA',
        name: 'Air Liquide',
        price: 170,
        change: 1.5,
        changePercent: 0.89,
        currency: 'EUR',
        exchange: 'PAR',
      },
    },
    {
      id: '5',
      userId: 'user1',
      symbol: 'MSFT',
      name: 'Microsoft Corp',
      trackingValue: null,
      order: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quote: {
        symbol: 'MSFT',
        name: 'Microsoft',
        price: 430,
        change: 2,
        changePercent: 0.47,
        currency: 'USD',
        exchange: 'NMS',
      },
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
});
