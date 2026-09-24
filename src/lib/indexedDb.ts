'use client';

import { UserTicker, TickerQuote } from './types';

const DB_NAME = 'ticker_tracker_pwa_db';
const DB_VERSION = 1;
const STORE_TICKERS = 'tickers';
const STORE_QUOTES = 'quotes';

export const DEFAULT_TICKERS: UserTicker[] = [
  {
    id: 'demo_aapl',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    trackingValue: 220.0,
    order: 0,
    createdAt: 1700000000000,
    quote: {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 335.92,
      change: 1.85,
      changePercent: 0.55,
      currency: 'USD',
      trailingPE: 38.48,
      forwardPE: 35.03,
      marketCap: 3400000000000,
      dividendYield: 0.45,
      fiftyTwoWeekHigh: 340.5,
      fiftyTwoWeekLow: 210.0,
      epsTrailingTwelveMonths: 8.73,
      beta: 1.08,
      volume: 45000000,
      avgVolume: 50000000,
      exchange: 'NASDAQ',
      quoteType: 'EQUITY',
      updatedAt: Date.now(),
    },
  },
  {
    id: 'demo_mc',
    symbol: 'MC.PA',
    name: 'LVMH Moët Hennessy',
    trackingValue: 420.0,
    order: 1,
    createdAt: 1700000000000,
    quote: {
      symbol: 'MC.PA',
      name: 'LVMH Moët Hennessy',
      price: 397.1,
      change: -3.4,
      changePercent: -0.85,
      currency: 'EUR',
      trailingPE: 18.09,
      forwardPE: 15.97,
      marketCap: 200000000000,
      dividendYield: 3.25,
      fiftyTwoWeekHigh: 880.0,
      fiftyTwoWeekLow: 385.0,
      epsTrailingTwelveMonths: 21.95,
      beta: 0.95,
      volume: 400000,
      avgVolume: 500000,
      exchange: 'Paris',
      quoteType: 'EQUITY',
      updatedAt: Date.now(),
    },
  },
  {
    id: 'demo_cw8',
    symbol: 'CW8.PA',
    name: 'Amundi MSCI World ETF',
    trackingValue: 650.0,
    order: 2,
    createdAt: 1700000000000,
    quote: {
      symbol: 'CW8.PA',
      name: 'Amundi MSCI World Swap UCITS ETF',
      price: 698.18,
      change: 2.15,
      changePercent: 0.31,
      currency: 'EUR',
      trailingPE: 22.4,
      forwardPE: 20.1,
      marketCap: null,
      dividendYield: null,
      fiftyTwoWeekHigh: 710.0,
      fiftyTwoWeekLow: 520.0,
      epsTrailingTwelveMonths: null,
      beta: 1.0,
      volume: 25000,
      avgVolume: 30000,
      exchange: 'Paris',
      quoteType: 'ETF',
      updatedAt: Date.now(),
    },
  },
  {
    id: 'demo_nvda',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    trackingValue: 120.0,
    order: 3,
    createdAt: 1700000000000,
    quote: {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      price: 182.4,
      change: 4.12,
      changePercent: 2.31,
      currency: 'USD',
      trailingPE: 48.2,
      forwardPE: 32.5,
      marketCap: 3100000000000,
      dividendYield: 0.03,
      fiftyTwoWeekHigh: 185.0,
      fiftyTwoWeekLow: 85.0,
      epsTrailingTwelveMonths: 3.78,
      beta: 1.68,
      volume: 65000000,
      avgVolume: 70000000,
      exchange: 'NASDAQ',
      quoteType: 'EQUITY',
      updatedAt: Date.now(),
    },
  },
];

/**
 * Safely initialize or retrieve IndexedDB instance
 */
function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_TICKERS)) {
          db.createObjectStore(STORE_TICKERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_QUOTES)) {
          db.createObjectStore(STORE_QUOTES, { keyPath: 'symbol' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => {
        console.debug('IndexedDB open error:', e);
        resolve(null);
      };
      request.onblocked = () => {
        console.debug('IndexedDB open blocked');
        resolve(null);
      };
    } catch (err) {
      console.debug('IndexedDB unsupported:', err);
      resolve(null);
    }
  });
}

/**
 * Retrieve cached tickers synchronously from IndexedDB
 */
export async function getLocalTickers(): Promise<UserTicker[]> {
  const db = await openDB();
  if (!db) {
    // Fallback to localStorage if IndexedDB is unavailable
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('tt_cached_tickers');
        if (local) return JSON.parse(local);
      } catch {}
    }
    return DEFAULT_TICKERS;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TICKERS, 'readonly');
      const store = tx.objectStore(STORE_TICKERS);
      const req = store.getAll();

      req.onsuccess = () => {
        const result = req.result as UserTicker[];
        if (result && result.length > 0) {
          result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          resolve(result);
        } else {
          // If empty, prime with DEFAULT_TICKERS
          saveLocalTickers(DEFAULT_TICKERS).catch(() => {});
          resolve(DEFAULT_TICKERS);
        }
      };

      req.onerror = () => resolve(DEFAULT_TICKERS);
    } catch {
      resolve(DEFAULT_TICKERS);
    }
  });
}

/**
 * Save user tickers to IndexedDB
 */
export async function saveLocalTickers(tickers: UserTicker[]): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('tt_cached_tickers', JSON.stringify(tickers));
    } catch {}
  }

  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TICKERS, 'readwrite');
      const store = tx.objectStore(STORE_TICKERS);
      store.clear();

      tickers.forEach((t, idx) => {
        store.put({
          ...t,
          order: idx,
        });
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Retrieve cached quotes from IndexedDB
 */
export async function getLocalQuotes(): Promise<Record<string, TickerQuote>> {
  const db = await openDB();
  if (!db) return {};

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUOTES, 'readonly');
      const store = tx.objectStore(STORE_QUOTES);
      const req = store.getAll();

      req.onsuccess = () => {
        const quotes = req.result as TickerQuote[];
        const map: Record<string, TickerQuote> = {};
        quotes.forEach((q) => {
          map[q.symbol.toUpperCase()] = q;
        });
        resolve(map);
      };

      req.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

/**
 * Save quotes map to IndexedDB
 */
export async function saveLocalQuotes(quotes: Record<string, TickerQuote>): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_QUOTES, 'readwrite');
      const store = tx.objectStore(STORE_QUOTES);

      Object.values(quotes).forEach((quote) => {
        store.put(quote);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Reorder local tickers and persist
 */
export async function reorderLocalTickers(orderedIds: string[]): Promise<UserTicker[]> {
  const current = await getLocalTickers();
  const map = new Map(current.map((t) => [t.id, t]));
  const reordered: UserTicker[] = [];

  orderedIds.forEach((id, idx) => {
    const item = map.get(id);
    if (item) {
      item.order = idx;
      reordered.push(item);
      map.delete(id);
    }
  });

  for (const remaining of map.values()) {
    remaining.order = reordered.length;
    reordered.push(remaining);
  }

  await saveLocalTickers(reordered);
  return reordered;
}
