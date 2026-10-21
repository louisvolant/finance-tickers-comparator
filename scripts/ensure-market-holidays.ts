// Build-time guard for `src/lib/marketHolidays.json`.
//
// Runs before the Next/OpenNext build:
// - if the table still covers next year and is younger than
//   MARKET_HOLIDAYS_MAX_AGE_DAYS (default 30), it does nothing;
// - otherwise it recomputes the table and compares the *content*.
//   - content unchanged (only the timestamp would move): the timestamp is
//     refreshed, the build continues, no commit is required;
//   - content changed (new rules, extended coverage): the file is written and a
//     CI build fails so the regenerated table is committed before deploying.
//
// The default 30-day window catches upstream corrections in the holiday rules
// without forcing a monthly commit: identical content is never a failure.

import fs from 'node:fs';
import path from 'node:path';
import { holidayTableNeedsRefresh } from '../src/lib/marketHolidays.ts';
import type { MarketHolidaysFile } from '../src/lib/marketHolidays.ts';
import { generateMarketHolidays, writeMarketHolidays } from './generate-market-holidays.ts';

const OUTPUT_FILE = path.join(process.cwd(), 'src/lib/marketHolidays.json');
const MAX_AGE_DAYS = Number(process.env.MARKET_HOLIDAYS_MAX_AGE_DAYS || 30);
const COVERAGE_YEARS = 15;

async function main() {
  const current = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8')) as MarketHolidaysFile;

  if (!holidayTableNeedsRefresh(current, Date.now(), MAX_AGE_DAYS)) return;

  const currentYear = new Date().getUTCFullYear();

  // Keep the existing start year (so past dates stay stable) and extend the end
  // when needed. The file grows by roughly one year of dates per year, which is
  // negligible and avoids unnecessary churn in the committed diff.
  const next = await generateMarketHolidays({
    fromYear: current.coverage?.from ?? currentYear,
    toYear: Math.max(current.coverage?.to ?? 0, currentYear + COVERAGE_YEARS - 1),
  });

  const contentChanged =
    JSON.stringify(next.holidays) !== JSON.stringify(current.holidays) ||
    next.coverage.from !== current.coverage?.from ||
    next.coverage.to !== current.coverage?.to;

  writeMarketHolidays(next, OUTPUT_FILE);

  if (!contentChanged) {
    console.warn(
      `marketHolidays.json was older than ${MAX_AGE_DAYS} days; timestamp refreshed, content unchanged.`
    );
    return;
  }

  const message =
    'marketHolidays.json was regenerated with new content and must be committed before deploying.';
  if (process.env.CI) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
}

main().catch((err) => {
  console.error('Holiday table check failed:', err);
  process.exit(1);
});
