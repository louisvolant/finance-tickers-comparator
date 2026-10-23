import { UserTicker } from './types';
import { resolveTracking } from './tracking';

export type SortColumn = 'ticker' | 'price' | 'tracking' | 'diff' | 'currentPE' | 'forwardPE';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: SortColumn | null;
  direction: SortDirection | null;
}

/**
 * Computes the next sort state on column header click.
 * Cycle:
 *  1. Click inactive column -> sort desc (arrow down)
 *  2. Click active column (desc) -> sort asc (arrow up)
 *  3. Click active column (asc) -> remove sort (null)
 *  4. Click a different column -> sort desc on that new column
 */
export function getNextSort(
  currentColumn: SortColumn | null,
  currentDirection: SortDirection | null,
  clickedColumn: SortColumn
): SortState {
  if (currentColumn !== clickedColumn) {
    return { column: clickedColumn, direction: 'desc' };
  }
  if (currentDirection === 'desc') {
    return { column: clickedColumn, direction: 'asc' };
  }
  return { column: null, direction: null };
}

/**
 * Sorts tickers according to the selected column and direction.
 * Missing / null values are placed at the end regardless of direction.
 * Ties are broken stably using the ticker symbol.
 */
export function sortTickers(
  tickers: UserTicker[],
  column: SortColumn | null,
  direction: SortDirection | null,
  rates?: Record<string, number> | null
): UserTicker[] {
  if (!column || !direction) {
    return tickers;
  }

  const sorted = [...tickers];

  sorted.sort((a, b) => {
    let result = 0;

    switch (column) {
      case 'ticker': {
        const symA = a.symbol.toUpperCase();
        const symB = b.symbol.toUpperCase();
        result = symA.localeCompare(symB);
        return direction === 'asc' ? result : -result;
      }

      case 'price': {
        const valA = typeof a.quote?.price === 'number' ? a.quote.price : null;
        const valB = typeof b.quote?.price === 'number' ? b.quote.price : null;
        if (valA === null && valB === null) break;
        if (valA === null) return 1;
        if (valB === null) return -1;
        result = direction === 'asc' ? valA - valB : valB - valA;
        break;
      }

      case 'tracking': {
        const trA = resolveTracking(a, a.quote, rates);
        const trB = resolveTracking(b, b.quote, rates);
        const valA = trA.hasTracking ? (trA.comparisonValue ?? trA.originalValue) : null;
        const valB = trB.hasTracking ? (trB.comparisonValue ?? trB.originalValue) : null;
        if (valA === null && valB === null) break;
        if (valA === null) return 1;
        if (valB === null) return -1;
        result = direction === 'asc' ? valA - valB : valB - valA;
        break;
      }

      case 'diff': {
        const trA = resolveTracking(a, a.quote, rates);
        const trB = resolveTracking(b, b.quote, rates);
        const hasDiffA = trA.hasTracking && trA.conversionAvailable && trA.diffPercent !== null;
        const hasDiffB = trB.hasTracking && trB.conversionAvailable && trB.diffPercent !== null;
        const valA = hasDiffA ? trA.diffPercent : null;
        const valB = hasDiffB ? trB.diffPercent : null;
        if (valA === null && valB === null) break;
        if (valA === null) return 1;
        if (valB === null) return -1;
        result = direction === 'asc' ? valA - valB : valB - valA;
        break;
      }

      case 'currentPE': {
        const valA = a.quote?.trailingPE && a.quote.trailingPE > 0 ? a.quote.trailingPE : null;
        const valB = b.quote?.trailingPE && b.quote.trailingPE > 0 ? b.quote.trailingPE : null;
        if (valA === null && valB === null) break;
        if (valA === null) return 1;
        if (valB === null) return -1;
        result = direction === 'asc' ? valA - valB : valB - valA;
        break;
      }

      case 'forwardPE': {
        const valA = a.quote?.forwardPE && a.quote.forwardPE > 0 ? a.quote.forwardPE : null;
        const valB = b.quote?.forwardPE && b.quote.forwardPE > 0 ? b.quote.forwardPE : null;
        if (valA === null && valB === null) break;
        if (valA === null) return 1;
        if (valB === null) return -1;
        result = direction === 'asc' ? valA - valB : valB - valA;
        break;
      }
    }

    if (result !== 0) return result;
    return a.symbol.localeCompare(b.symbol);
  });

  return sorted;
}
