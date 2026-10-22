// Batch ticker input helpers.
//
// Symbols can be pasted with commas, semicolons, spaces or new lines. Parsing is
// shared by the modal (live preview) and the API route (defensive re-parse), so
// the two cannot diverge.

import type { UserTicker } from './types';

/** Upper bound for one batch, matching one Yahoo quote request chunk. */
export const MAX_BATCH_TICKERS = 25;

export interface BatchAddResult {
  added: UserTicker[];
  /** Symbols that were already in the watchlist. */
  skipped: string[];
  /** Symbols for which Yahoo returned no quote. */
  failed: string[];
}

/** Split, trim, uppercase and de-duplicate a pasted symbol list. */
export function parseTickerSymbols(input: string | null | undefined): string[] {
  if (!input) return [];

  const symbols = input
    .split(/[,;\s]+/)
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  return Array.from(new Set(symbols));
}
