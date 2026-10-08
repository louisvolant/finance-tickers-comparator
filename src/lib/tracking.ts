import { UserTicker, TickerQuote } from './types';
import { convertCurrency, normalizeCurrency } from './currencies';

export interface TrackingResolution {
  /** Whether a positive reference value is stored. */
  hasTracking: boolean;
  /** Value as entered by the user. */
  originalValue: number | null;
  /** Currency the user entered the value in (major ISO code). */
  originalCurrency: string;
  /** Value expressed in the quote currency, used for the % diff. */
  comparisonValue: number | null;
  /** Listing (quote) currency, major ISO code. */
  comparisonCurrency: string;
  /** True when a currency conversion was applied. */
  converted: boolean;
  /** False when conversion was required but no rate was available. */
  conversionAvailable: boolean;
  /** (current price - comparison value) / comparison value * 100. */
  diffPercent: number | null;
}

/**
 * Resolve a ticker's reference value into the listing currency so the % diff
 * can be computed. When the stored reference currency differs from the listing
 * currency, the value is converted using the current EUR-based rates.
 */
export function resolveTracking(
  ticker: Pick<UserTicker, 'trackingValue' | 'trackingCurrency'>,
  quote: TickerQuote | null | undefined,
  rates: Record<string, number> | null | undefined
): TrackingResolution {
  const comparisonCurrency = normalizeCurrency(quote?.currency || 'USD').code;
  const originalValue = ticker.trackingValue ?? null;
  const hasTracking = originalValue !== null && originalValue > 0;

  const originalCurrency = ticker.trackingCurrency
    ? normalizeCurrency(ticker.trackingCurrency).code
    : comparisonCurrency;

  const base: TrackingResolution = {
    hasTracking,
    originalValue,
    originalCurrency,
    comparisonValue: null,
    comparisonCurrency,
    converted: false,
    conversionAvailable: true,
    diffPercent: null,
  };

  if (!hasTracking || !quote) return base;

  let comparisonValue: number = originalValue as number;
  let converted = false;

  if (originalCurrency !== comparisonCurrency) {
    const convertedValue = convertCurrency(originalValue as number, originalCurrency, comparisonCurrency, rates);
    if (convertedValue === null || !isFinite(convertedValue)) {
      return { ...base, conversionAvailable: false };
    }
    comparisonValue = convertedValue;
    converted = true;
  }

  const price = quote.price;
  const diffPercent =
    comparisonValue !== 0 ? ((price - comparisonValue) / comparisonValue) * 100 : null;

  return { ...base, comparisonValue, converted, diffPercent };
}
