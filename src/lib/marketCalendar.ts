// Server-only: reads the generated market-holiday table. Client code reads the
// resulting sessions from the quote payload and never imports this module.
//
// `MARKET_CALENDARS` still carries the holiday rules (country, ignored holidays,
// Good Friday, ...), but they are consumed at authoring time by
// `scripts/generate-market-holidays.ts`. Runtime only does a date lookup, so
// date-holidays and its moment/astronomia tree are not part of the bundle.
import marketHolidaysData from './marketHolidays.json';
import type { MarketHolidaysFile } from './marketHolidays';
import { MarketSession } from './types';

interface MarketCalendar {
  /** date-holidays country code, used only by the holiday generator. */
  country: string;
  /** Regular cash session, local exchange time (HH:MM). */
  open: string;
  close: string;
  /** Public holidays (English names) on which the venue keeps trading. Generator input. */
  ignoredHolidays?: string[];
  /** Extra venue closures that are not in the country list, as MM-DD. Generator input. */
  closedOn?: string[];
  goodFriday: boolean;
  easterMonday: boolean;
}

/**
 * Keyed by the IANA timezone Yahoo reports as `exchangeTimezoneName`, which is
 * more reliable than the venue code (PAR, NMS, ...). Early closes are not
 * modelled: on half-days the regular closing time is shown.
 */
export const MARKET_CALENDARS: Record<string, MarketCalendar> = {
  'Europe/Paris': {
    country: 'FR',
    open: '09:00',
    close: '17:30',
    ignoredHolidays: [
      'Victory Day',
      'Ascension Day',
      'Whit Monday',
      'Bastille Day',
      'Assumption',
      "All Saints' Day",
      'Armistice Day',
    ],
    closedOn: ['12-26'],
    goodFriday: true,
    easterMonday: true,
  },
  'Europe/Amsterdam': {
    country: 'NL',
    open: '09:00',
    close: '17:30',
    ignoredHolidays: ["King's Day", 'Ascension Day', 'Pentecost', 'Whit Monday'],
    closedOn: ['05-01'],
    goodFriday: true,
    easterMonday: true,
  },
  'Europe/Brussels': {
    country: 'BE',
    open: '09:00',
    close: '17:30',
    ignoredHolidays: [
      'Ascension Day',
      'Whit Monday',
      'National Holiday',
      'Assumption',
      "All Saints' Day",
      'Armistice Day',
    ],
    closedOn: ['12-26'],
    goodFriday: true,
    easterMonday: true,
  },
  'Europe/Madrid': {
    country: 'ES',
    open: '09:00',
    close: '17:30',
    ignoredHolidays: [
      'Epiphany',
      'Assumption',
      'Fiesta Nacional de España',
      "All Saints' Day",
      'Día de la Constitución Española',
      'Immaculate Conception',
    ],
    goodFriday: true,
    easterMonday: false,
  },
  'Europe/Rome': {
    country: 'IT',
    open: '09:00',
    close: '17:30',
    ignoredHolidays: [
      'Epiphany',
      'Easter Sunday',
      'Liberation from Nazi-Fascism (1945)',
      'Republic Day',
      'Assumption',
      'National Day of Saint Francis of Assisi',
      "All Saints' Day",
      'Immaculate Conception',
    ],
    goodFriday: true,
    easterMonday: true,
  },
  'Europe/Berlin': {
    country: 'DE',
    open: '09:00',
    close: '17:30',
    ignoredHolidays: ['Ascension Day', 'Whit Monday', 'National Holiday'],
    closedOn: ['12-24', '12-31'],
    goodFriday: true,
    easterMonday: true,
  },
  'Europe/Zurich': {
    country: 'CH',
    open: '09:00',
    close: '17:30',
    ignoredHolidays: [
      'Ascension Day',
      'Pentecost',
      'Whit Monday',
      'Bundesfeiertag',
      'Federal Day of Thanksgiving, Repentance and Prayer',
    ],
    goodFriday: true,
    easterMonday: true,
  },
  'Europe/London': {
    country: 'GB',
    open: '08:00',
    close: '16:30',
    goodFriday: true,
    easterMonday: true,
  },
  'America/New_York': {
    country: 'US',
    open: '09:30',
    close: '16:00',
    ignoredHolidays: ['Columbus Day', 'Veterans Day'],
    goodFriday: true,
    easterMonday: false,
  },
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Gregorian Easter Sunday (anonymous algorithm), as a UTC date. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const holidayData = marketHolidaysData as MarketHolidaysFile;
const closedDaysCache = new Map<string, Set<string>>();
let coverageWarningYear: number | null = null;

/**
 * Calendar dates (YYYY-MM-DD) on which the venue is closed.
 *
 * A pure lookup over the generated table: no computation, no allocation per
 * call beyond the first set for each venue.
 */
function closedDays(timezone: string): Set<string> {
  const cached = closedDaysCache.get(timezone);
  if (cached) return cached;

  const closed = new Set<string>(holidayData.holidays[timezone] ?? []);
  closedDaysCache.set(timezone, closed);
  return closed;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsAt(epochMs: number, timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timezone, formatter);
  }
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(epochMs))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

/** Offset (local minus UTC) of a timezone at a given instant, in milliseconds. */
function offsetMs(epochMs: number, timezone: string): number {
  const p = partsAt(epochMs, timezone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - Math.floor(epochMs / 1000) * 1000;
}

/** Convert a wall-clock time in a timezone to an epoch, DST-aware. */
export function zonedWallClockToEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): number {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = naive - offsetMs(naive, timezone);
  return naive - offsetMs(firstGuess, timezone);
}

/**
 * Regular sessions of a venue from the day containing `nowMs` onwards, skipping
 * weekends and closures. Returns null when the timezone has no calendar, in
 * which case no market status should be shown.
 */
export function buildMarketSessions(
  timezone: string | null | undefined,
  nowMs: number,
  tradingDays = 10
): MarketSession[] | null {
  if (!timezone) return null;
  const calendar = MARKET_CALENDARS[timezone];
  if (!calendar) return null;

  const [openHour, openMinute] = calendar.open.split(':').map(Number);
  const [closeHour, closeMinute] = calendar.close.split(':').map(Number);
  const today = partsAt(nowMs, timezone);

  // The build gate regenerates the table before it can expire; this warning is
  // the last line of defence if a deployment ships a stale table anyway.
  if (today.year > holidayData.coverage.to && coverageWarningYear !== today.year) {
    coverageWarningYear = today.year;
    console.warn(
      `Market holiday table covers up to ${holidayData.coverage.to}; ` +
        'run `npm run generate:market-holidays` and commit the result.'
    );
  }

  const sessions: MarketSession[] = [];
  // Upper bound on calendar days scanned, so that long closures cannot loop forever.
  for (let offset = 0; sessions.length < tradingDays && offset < 60; offset++) {
    const day = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const date = day.getUTCDate();
    if (closedDays(timezone).has(`${year}-${pad(month)}-${pad(date)}`)) continue;

    sessions.push({
      opensAt: zonedWallClockToEpoch(year, month, date, openHour, openMinute, timezone),
      closesAt: zonedWallClockToEpoch(year, month, date, closeHour, closeMinute, timezone),
    });
  }

  return sessions;
}
