import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextSort, sortTickers, SortColumn, SortDirection } from '../src/lib/tickerSorting';
import { UserTicker } from '../src/lib/types';

test('getNextSort: cycle behavior', () => {
  // 1st click on 'ticker': activates desc
  let state = getNextSort(null, null, 'ticker');
  assert.deepEqual(state, { column: 'ticker', direction: 'desc' });

  // 2nd click on 'ticker': switches to asc
  state = getNextSort(state.column, state.direction, 'ticker');
  assert.deepEqual(state, { column: 'ticker', direction: 'asc' });

  // 3rd click on 'ticker': removes sort
  state = getNextSort(state.column, state.direction, 'ticker');
  assert.deepEqual(state, { column: null, direction: null });

  // Clicking another column resets previous sort and starts with desc
  state = getNextSort('ticker', 'asc', 'price');
  assert.deepEqual(state, { column: 'price', direction: 'desc' });

  state = getNextSort('price', 'desc', 'currentPE');
  assert.deepEqual(state, { column: 'currentPE', direction: 'desc' });
});

test('sortTickers: sorting by ticker symbol', () => {
  const tickers: UserTicker[] = [
    { id: '1', symbol: 'MSFT', name: 'Microsoft', order: 0, createdAt: 0, trackingValue: null },
    { id: '2', symbol: 'AAPL', name: 'Apple', order: 1, createdAt: 0, trackingValue: null },
    { id: '3', symbol: 'TSLA', name: 'Tesla', order: 2, createdAt: 0, trackingValue: null },
  ];

  // Descending (Z -> A)
  const desc = sortTickers(tickers, 'ticker', 'desc');
  assert.deepEqual(desc.map((t) => t.symbol), ['TSLA', 'MSFT', 'AAPL']);

  // Ascending (A -> Z)
  const asc = sortTickers(tickers, 'ticker', 'asc');
  assert.deepEqual(asc.map((t) => t.symbol), ['AAPL', 'MSFT', 'TSLA']);

  // Without sort, order is unchanged
  const unchanged = sortTickers(tickers, null, null);
  assert.deepEqual(unchanged.map((t) => t.symbol), ['MSFT', 'AAPL', 'TSLA']);
});

test('sortTickers: sorting by price', () => {
  const tickers: UserTicker[] = [
    { id: '1', symbol: 'AAPL', name: 'Apple', order: 0, createdAt: 0, trackingValue: null, quote: { price: 150 } as any },
    { id: '2', symbol: 'MSFT', name: 'Microsoft', order: 1, createdAt: 0, trackingValue: null, quote: { price: 400 } as any },
    { id: '3', symbol: 'NOQUOTE', name: 'NoQuote', order: 2, createdAt: 0, trackingValue: null, quote: null },
    { id: '4', symbol: 'GOOGL', name: 'Google', order: 3, createdAt: 0, trackingValue: null, quote: { price: 180 } as any },
  ];

  const desc = sortTickers(tickers, 'price', 'desc');
  assert.deepEqual(desc.map((t) => t.symbol), ['MSFT', 'GOOGL', 'AAPL', 'NOQUOTE']);

  const asc = sortTickers(tickers, 'price', 'asc');
  assert.deepEqual(asc.map((t) => t.symbol), ['AAPL', 'GOOGL', 'MSFT', 'NOQUOTE']);
});

test('sortTickers: sorting by tracking and diff', () => {
  const tickers: UserTicker[] = [
    { id: '1', symbol: 'AAPL', name: 'Apple', order: 0, createdAt: 0, trackingValue: 100, quote: { price: 150, currency: 'USD' } as any }, // diff +50%
    { id: '2', symbol: 'MSFT', name: 'Microsoft', order: 1, createdAt: 0, trackingValue: 500, quote: { price: 400, currency: 'USD' } as any }, // diff -20%
    { id: '3', symbol: 'NOTRACK', name: 'NoTrack', order: 2, createdAt: 0, trackingValue: null, quote: { price: 200, currency: 'USD' } as any },
  ];

  // Tracking value desc: MSFT (500) > AAPL (100) > NOTRACK (null)
  const trackingDesc = sortTickers(tickers, 'tracking', 'desc');
  assert.deepEqual(trackingDesc.map((t) => t.symbol), ['MSFT', 'AAPL', 'NOTRACK']);

  // Tracking value asc: AAPL (100) < MSFT (500) < NOTRACK (null)
  const trackingAsc = sortTickers(tickers, 'tracking', 'asc');
  assert.deepEqual(trackingAsc.map((t) => t.symbol), ['AAPL', 'MSFT', 'NOTRACK']);

  // Diff % desc: AAPL (+50%) > MSFT (-20%) > NOTRACK (null)
  const diffDesc = sortTickers(tickers, 'diff', 'desc');
  assert.deepEqual(diffDesc.map((t) => t.symbol), ['AAPL', 'MSFT', 'NOTRACK']);

  // Diff % asc: MSFT (-20%) < AAPL (+50%) < NOTRACK (null)
  const diffAsc = sortTickers(tickers, 'diff', 'asc');
  assert.deepEqual(diffAsc.map((t) => t.symbol), ['MSFT', 'AAPL', 'NOTRACK']);
});

test('sortTickers: sorting by current and forward PE', () => {
  const tickers: UserTicker[] = [
    { id: '1', symbol: 'AAPL', name: 'Apple', order: 0, createdAt: 0, trackingValue: null, quote: { trailingPE: 30, forwardPE: 28 } as any },
    { id: '2', symbol: 'NVDA', name: 'Nvidia', order: 1, createdAt: 0, trackingValue: null, quote: { trailingPE: 65, forwardPE: 45 } as any },
    { id: '3', symbol: 'INTC', name: 'Intel', order: 2, createdAt: 0, trackingValue: null, quote: { trailingPE: 15, forwardPE: 18 } as any },
    { id: '4', symbol: 'UNPROFITABLE', name: 'Unprofitable', order: 3, createdAt: 0, trackingValue: null, quote: { trailingPE: 0, forwardPE: null } as any },
  ];

  // Current PE desc: NVDA (65) > AAPL (30) > INTC (15) > UNPROFITABLE
  const currDesc = sortTickers(tickers, 'currentPE', 'desc');
  assert.deepEqual(currDesc.map((t) => t.symbol), ['NVDA', 'AAPL', 'INTC', 'UNPROFITABLE']);

  // Current PE asc: INTC (15) < AAPL (30) < NVDA (65) < UNPROFITABLE
  const currAsc = sortTickers(tickers, 'currentPE', 'asc');
  assert.deepEqual(currAsc.map((t) => t.symbol), ['INTC', 'AAPL', 'NVDA', 'UNPROFITABLE']);

  // Forward PE desc: NVDA (45) > AAPL (28) > INTC (18) > UNPROFITABLE
  const fwdDesc = sortTickers(tickers, 'forwardPE', 'desc');
  assert.deepEqual(fwdDesc.map((t) => t.symbol), ['NVDA', 'AAPL', 'INTC', 'UNPROFITABLE']);

  // Forward PE asc: INTC (18) < AAPL (28) < NVDA (45) < UNPROFITABLE
  const fwdAsc = sortTickers(tickers, 'forwardPE', 'asc');
  assert.deepEqual(fwdAsc.map((t) => t.symbol), ['INTC', 'AAPL', 'NVDA', 'UNPROFITABLE']);
});
