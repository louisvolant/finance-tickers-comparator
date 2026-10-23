// Client-safe: pure functions over the sessions shipped with each quote.
import { MarketSession } from './types';

export const JUST_CLOSED_WINDOW_MS = 30 * 60_000;
export const OPENS_SOON_WINDOW_MS = 60 * 60_000;

export type MarketStatusKind = 'open' | 'just_closed' | 'opens_soon' | 'closed';

export interface MarketStatus {
  kind: MarketStatusKind;
  /** Closing time when open, otherwise the next opening time (epoch ms). */
  at: number;
  /** Minutes since the close (just_closed), until the open (opens_soon or closed). */
  minutes: number;
}

/**
 * Derive the venue status at `now` from its upcoming sessions (sorted ascending).
 * Returns null when no session is known, so that no badge is shown.
 */
export function getMarketStatus(
  sessions: MarketSession[] | null | undefined,
  now: number
): MarketStatus | null {
  if (!sessions || sessions.length === 0) return null;

  const current = sessions.find((s) => s.opensAt <= now && now < s.closesAt);
  if (current) {
    return { kind: 'open', at: current.closesAt, minutes: 0 };
  }

  const closed = sessions.filter((s) => s.closesAt <= now);
  const lastClosed = closed.length > 0 ? closed[closed.length - 1] : undefined;
  if (lastClosed && now - lastClosed.closesAt < JUST_CLOSED_WINDOW_MS) {
    return {
      kind: 'just_closed',
      at: lastClosed.closesAt,
      minutes: Math.max(1, Math.floor((now - lastClosed.closesAt) / 60_000)),
    };
  }

  const next = sessions.find((s) => s.opensAt > now);
  if (!next) return null;

  const untilOpen = next.opensAt - now;
  if (untilOpen <= OPENS_SOON_WINDOW_MS) {
    return {
      kind: 'opens_soon',
      at: next.opensAt,
      minutes: Math.max(1, Math.ceil(untilOpen / 60_000)),
    };
  }

  return { kind: 'closed', at: next.opensAt, minutes: Math.floor(untilOpen / 60_000) };
}

/**
 * Wall-clock time of an instant in `timezone`, or in the viewer's timezone when
 * omitted, e.g. "17:30".
 */
export function formatClockTime(epochMs: number, locale: string, timezone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(timezone ? { timeZone: timezone } : {}),
  }).format(epochMs);
}

/** IANA timezone of the viewer, or undefined when the runtime cannot resolve it. */
export function getViewerTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** Calendar day of an instant in `timezone`, as a day index. */
function venueDayIndex(epochMs: number, timezone: string): number {
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(epochMs);
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export type OpeningDay =
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'weekday'; name: string };

/** Whether an opening instant falls today, tomorrow, or on a later weekday in `timezone`. */
export function describeOpeningDay(
  opensAt: number,
  timezone: string,
  now: number,
  locale: string
): OpeningDay {
  const diff = venueDayIndex(opensAt, timezone) - venueDayIndex(now, timezone);
  if (diff <= 0) return { kind: 'today' };
  if (diff === 1) return { kind: 'tomorrow' };
  return {
    kind: 'weekday',
    name: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: timezone }).format(opensAt),
  };
}
