// Notification payloads for triggered price alerts.
//
// Kept pure and free of KV, network or environment access so the wording and
// grouping rules can be unit-tested. One push is sent per user per scan: several
// tickers crossing at the same time are grouped into a single notification.

import { AlertFireEvent } from './alerts';

export interface UserAlertEvent extends AlertFireEvent {
  userId: string;
}

export interface PushNotification {
  title: string;
  body: string;
  /** Route opened when the notification is clicked. */
  url: string;
  /** Replacement tag: a newer alert for the same subject replaces the older one. */
  tag: string;
}

function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Unknown or non-ISO currency code: fall back to a plain amount.
    return `${value.toFixed(2)} ${currency}`;
  }
}

/**
 * Turn the events of one user into a single notification.
 *
 * A single event names the ticker and the threshold, so the notification is
 * useful on its own without opening the app. Multiple events are grouped, and
 * capped to three lines to stay readable on a lock screen.
 */
export function buildAlertNotification(events: UserAlertEvent[]): PushNotification {
  const first = events[0];

  if (!first) {
    return { title: 'Ticker-Tracker', body: '', url: '/', tag: 'price-alerts' };
  }

  if (events.length === 1) {
    const event = first;
    const direction = event.side === 'high' ? 'above' : 'below';
    const extreme = event.side === 'high' ? 'session high' : 'session low';

    return {
      title: `${event.symbol} crossed ${formatAmount(event.thresholdOriginal, event.currency)}`,
      body: `Last price ${formatAmount(event.price, event.priceCurrency)} (${extreme} ${formatAmount(
        event.observed,
        event.priceCurrency
      )}) — alert set ${direction} the threshold.`,
      url: `/ticker/${encodeURIComponent(event.symbol)}`,
      tag: `alert-${event.symbol}-${event.side}`,
    };
  }

  const lines = events.slice(0, 3).map((event) => {
    const symbol = event.side === 'high' ? '≥' : '≤';
    return `${event.symbol} ${symbol} ${formatAmount(event.thresholdOriginal, event.currency)}`;
  });
  if (events.length > 3) lines.push(`+${events.length - 3} more`);

  return {
    title: `${events.length} price alerts triggered`,
    body: lines.join('\n'),
    url: '/',
    tag: 'price-alerts',
  };
}
