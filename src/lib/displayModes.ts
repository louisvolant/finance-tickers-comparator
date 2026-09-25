import { UserTicker } from './types';

export type DisplayMode = 'custom' | 'alphabetical' | 'by_exchange';

export interface ExchangeInfo {
  id: string;
  name: string;
  shortName: string;
  badgeClass: string;
}

export interface ExchangeGroup {
  id: string;
  name: string;
  shortName: string;
  badgeClass: string;
  tickers: UserTicker[];
}

/**
 * Determine the trading system / exchange category for any equity or ETF ticker
 */
export function getExchangeInfo(ticker: UserTicker): ExchangeInfo {
  const sym = ticker.symbol.toUpperCase();
  const rawEx = (ticker.quote?.exchange || '').toUpperCase();

  // Paris (Euronext Paris)
  if (sym.endsWith('.PA') || rawEx === 'PAR' || rawEx === 'EPA' || rawEx.includes('PARIS')) {
    return {
      id: 'PARIS',
      name: 'Euronext Paris',
      shortName: 'PARIS',
      badgeClass: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    };
  }

  // Frankfurt / XETRA
  if (
    sym.endsWith('.DE') ||
    rawEx === 'GER' ||
    rawEx === 'ETR' ||
    rawEx.includes('XETRA') ||
    rawEx.includes('FRANKFURT')
  ) {
    return {
      id: 'XETRA',
      name: 'Deutsche Börse (XETRA)',
      shortName: 'XETRA',
      badgeClass: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    };
  }

  // London Stock Exchange
  if (sym.endsWith('.L') || rawEx === 'LSE' || rawEx === 'LON' || rawEx.includes('LONDON')) {
    return {
      id: 'LSE',
      name: 'London Stock Exchange (LSE)',
      shortName: 'LSE',
      badgeClass: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
    };
  }

  // Euronext Amsterdam
  if (sym.endsWith('.AS') || rawEx === 'AMS' || rawEx.includes('AMSTERDAM')) {
    return {
      id: 'AMS',
      name: 'Euronext Amsterdam',
      shortName: 'AMSTERDAM',
      badgeClass: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
    };
  }

  // Euronext Brussels
  if (sym.endsWith('.BR') || rawEx === 'BRU' || rawEx.includes('BRUSSELS')) {
    return {
      id: 'BRU',
      name: 'Euronext Brussels',
      shortName: 'BRUSSELS',
      badgeClass: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    };
  }

  // SIX Swiss Exchange
  if (sym.endsWith('.SW') || rawEx === 'SWX' || rawEx === 'VTX' || rawEx.includes('SWISS')) {
    return {
      id: 'SWISS',
      name: 'SIX Swiss Exchange',
      shortName: 'SWISS',
      badgeClass: 'border-red-500/30 text-red-400 bg-red-500/10',
    };
  }

  // US Markets: NASDAQ vs NYSE
  if (rawEx.includes('NAS') || rawEx === 'NMS' || rawEx === 'NGS' || rawEx === 'NCM') {
    return {
      id: 'NASDAQ',
      name: 'NASDAQ Stock Market',
      shortName: 'NASDAQ',
      badgeClass: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    };
  }

  if (rawEx.includes('NYQ') || rawEx.includes('NYSE') || rawEx === 'ASE') {
    return {
      id: 'NYSE',
      name: 'New York Stock Exchange (NYSE)',
      shortName: 'NYSE',
      badgeClass: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
    };
  }

  // Tickers without dot extension are standard US equities/ETFs
  if (!sym.includes('.')) {
    const knownNas = [
      'AAPL',
      'MSFT',
      'NVDA',
      'GOOGL',
      'GOOG',
      'AMZN',
      'META',
      'TSLA',
      'TEAM',
      'DDOG',
      'NFLX',
      'INTC',
      'AMD',
    ];
    if (knownNas.includes(sym)) {
      return {
        id: 'NASDAQ',
        name: 'NASDAQ Stock Market',
        shortName: 'NASDAQ',
        badgeClass: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
      };
    }
    return {
      id: 'NYSE',
      name: 'New York Stock Exchange (NYSE)',
      shortName: 'NYSE',
      badgeClass: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
    };
  }

  return {
    id: rawEx || 'OTHER',
    name: rawEx ? `${rawEx} Market` : 'Other Exchanges',
    shortName: rawEx || 'OTHER',
    badgeClass: 'border-slate-600 text-slate-300 bg-slate-800/60',
  };
}

/**
 * Group tickers by trading system and sort tickers alphabetically inside each exchange
 */
export function groupTickersByExchange(tickers: UserTicker[]): ExchangeGroup[] {
  const groupsMap = new Map<string, ExchangeGroup>();

  for (const ticker of tickers) {
    const info = getExchangeInfo(ticker);
    if (!groupsMap.has(info.id)) {
      groupsMap.set(info.id, {
        id: info.id,
        name: info.name,
        shortName: info.shortName,
        badgeClass: info.badgeClass,
        tickers: [],
      });
    }
    groupsMap.get(info.id)!.tickers.push(ticker);
  }

  // Sort tickers alphabetically inside each trading exchange
  for (const group of groupsMap.values()) {
    group.tickers.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  // Hub priority ordering: Paris, NASDAQ, NYSE, XETRA, Amsterdam, London, Swiss, Other
  const priority = ['PARIS', 'NASDAQ', 'NYSE', 'XETRA', 'AMS', 'BRU', 'LSE', 'SWISS'];

  return Array.from(groupsMap.values()).sort((a, b) => {
    const idxA = priority.indexOf(a.id);
    const idxB = priority.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}
