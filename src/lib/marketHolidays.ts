// Shape and freshness rules for the generated market-holiday table.
//
// The table is produced at authoring time by `scripts/generate-market-holidays.ts`
// (which is the only remaining consumer of `date-holidays`) and committed as
// `marketHolidays.json`. Runtime only reads the dates: no library, no network,
// no KV, no cron.

export interface MarketHolidaysFile {
  /** ISO date (YYYY-MM-DD) of the last generation. */
  generatedAt: string;
  /** Inclusive year window covered by `holidays`. */
  coverage: { from: number; to: number };
  /** Closed dates per venue timezone, sorted and de-duplicated. */
  holidays: Record<string, string[]>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Age of the table in days, or Infinity when `generatedAt` is unparseable. */
export function holidayTableAgeDays(generatedAt: string, now: number = Date.now()): number {
  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp)) return Infinity;
  return (now - timestamp) / MS_PER_DAY;
}

/**
 * Whether the table must be regenerated.
 *
 * Two independent reasons:
 * - the coverage window no longer reaches next year, so a future holiday would
 *   be treated as a trading day;
 * - the table is older than `maxAgeDays`, which catches upstream corrections in
 *   the holiday rules (the content itself is deterministic, so a refresh that
 *   changes nothing is not committed — see the build check).
 */
export function holidayTableNeedsRefresh(
  data: MarketHolidaysFile | null | undefined,
  now: number = Date.now(),
  maxAgeDays: number = 30
): boolean {
  if (!data || !data.coverage || !data.holidays) return true;

  const currentYear = new Date(now).getUTCFullYear();
  if (data.coverage.to < currentYear + 1) return true;

  return holidayTableAgeDays(data.generatedAt, now) > maxAgeDays;
}
