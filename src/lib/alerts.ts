// Pure price-alert evaluation.
//
// Two thresholds per ticker ("above X", "below Y"). Evaluation is intentionally
// side-effect free so it can be unit-tested without KV, cron or Yahoo Finance:
// the caller supplies the quote, the FX rates and the previous arming state, and
// receives the trigger events plus the next state.
//
// Two decisions matter here:
//
// 1. Triggers read the *session* high/low, not just the last price. A five-minute
//    scan would otherwise miss a spike that already reverted.
// 2. Re-arming is edge-triggered: after a notification, the same threshold stays
//    silent until the price pulls back past a hysteresis band. Without it a price
//    oscillating around the threshold would notify on every scan.

import { AlertStateEntry, TickerQuote, UserTicker } from './types';
import { convertCurrency, normalizeCurrency } from './currencies';

/** Pullback required before an upper alert can fire again (1%). */
export const ALERT_REARM_PULLBACK = 0.01;

type AlertTicker = Pick<UserTicker, 'id' | 'symbol' | 'alertHigh' | 'alertLow' | 'alertCurrency'>;

export interface AlertFireEvent {
  tickerId: string;
  symbol: string;
  side: 'high' | 'low';
  /** Threshold converted into the listing currency. */
  threshold: number;
  /** Session high (upper) or session low (lower) that crossed the threshold. */
  observed: number;
  /** Last traded price at evaluation time. */
  price: number;
  /** Threshold as entered by the user, in `currency`. */
  thresholdOriginal: number;
  /** Currency the user entered the threshold in. */
  currency: string;
}

export interface AlertEvaluation {
  events: AlertFireEvent[];
  state: AlertStateEntry;
  /** True when the arming state changed, i.e. when it must be persisted. */
  changed: boolean;
}

/** Whether the ticker has at least one usable threshold. */
export function alertsEnabled(ticker: Partial<AlertTicker>): boolean {
  const high = ticker.alertHigh;
  const low = ticker.alertLow;
  return (typeof high === 'number' && high > 0) || (typeof low === 'number' && low > 0);
}

/** State used the first time a ticker is evaluated. */
export function createAlertState(
  highAlreadyCrossed: boolean,
  lowAlreadyCrossed: boolean
): AlertStateEntry {
  return {
    highArmed: !highAlreadyCrossed,
    lowArmed: !lowAlreadyCrossed,
    highTriggeredAt: null,
    lowTriggeredAt: null,
  };
}

/**
 * Evaluate both thresholds for one ticker.
 *
 * The first evaluation (no previous state) never fires: when a user enables an
 * alert on a ticker that is already beyond the threshold, the intent is to be
 * told about the *next* crossing, not to receive a notification immediately. The
 * corresponding side is stored disarmed and re-arms once the price comes back
 * inside the band.
 */
export function evaluateAlerts(
  ticker: AlertTicker,
  quote: TickerQuote,
  rates: Record<string, number> | null | undefined,
  previous: AlertStateEntry | undefined,
  now: number = Date.now()
): AlertEvaluation {
  const price = quote.price;
  const listingCurrency = normalizeCurrency(quote.currency).code;
  const alertCurrency = ticker.alertCurrency
    ? normalizeCurrency(ticker.alertCurrency).code
    : listingCurrency;

  const highOriginal = typeof ticker.alertHigh === 'number' && ticker.alertHigh > 0 ? ticker.alertHigh : null;
  const lowOriginal = typeof ticker.alertLow === 'number' && ticker.alertLow > 0 ? ticker.alertLow : null;

  const toListing = (value: number | null): number | null => {
    if (value === null) return null;
    if (alertCurrency === listingCurrency) return value;
    const converted = convertCurrency(value, alertCurrency, listingCurrency, rates);
    if (converted === null || !isFinite(converted) || converted <= 0) return null;
    // Trim FX noise so the event carries a display-ready value.
    return Number(converted.toFixed(6));
  };

  const highThreshold = toListing(highOriginal);
  const lowThreshold = toListing(lowOriginal);

  // Session extremes; fall back to the last price when the quote does not carry
  // them (crypto, some indices, or an upstream degraded payload).
  const observedHigh = Math.max(price, quote.dayHigh ?? price);
  const observedLow = Math.min(price, quote.dayLow ?? price);

  const isFirstEvaluation = previous === undefined;
  const state: AlertStateEntry = previous
    ? { ...previous }
    : createAlertState(
        highThreshold !== null && observedHigh >= highThreshold,
        lowThreshold !== null && observedLow <= lowThreshold
      );

  const events: AlertFireEvent[] = [];

  if (highThreshold !== null) {
    // Re-arm on a pullback from the *last price*, not from the session high:
    // the session high still contains the spike that fired.
    if (!state.highArmed && price <= highThreshold * (1 - ALERT_REARM_PULLBACK)) {
      state.highArmed = true;
    }

    if (!isFirstEvaluation && state.highArmed && observedHigh >= highThreshold) {
      events.push({
        tickerId: ticker.id,
        symbol: ticker.symbol.toUpperCase(),
        side: 'high',
        threshold: highThreshold,
        observed: observedHigh,
        price,
        thresholdOriginal: highOriginal as number,
        currency: alertCurrency,
      });
      state.highArmed = false;
      state.highTriggeredAt = now;
    }
  }

  if (lowThreshold !== null) {
    if (!state.lowArmed && price >= lowThreshold * (1 + ALERT_REARM_PULLBACK)) {
      state.lowArmed = true;
    }

    if (!isFirstEvaluation && state.lowArmed && observedLow <= lowThreshold) {
      events.push({
        tickerId: ticker.id,
        symbol: ticker.symbol.toUpperCase(),
        side: 'low',
        threshold: lowThreshold,
        observed: observedLow,
        price,
        thresholdOriginal: lowOriginal as number,
        currency: alertCurrency,
      });
      state.lowArmed = false;
      state.lowTriggeredAt = now;
    }
  }

  const changed =
    previous === undefined ||
    previous.highArmed !== state.highArmed ||
    previous.lowArmed !== state.lowArmed ||
    previous.highTriggeredAt !== state.highTriggeredAt ||
    previous.lowTriggeredAt !== state.lowTriggeredAt;

  return { events, state, changed };
}
