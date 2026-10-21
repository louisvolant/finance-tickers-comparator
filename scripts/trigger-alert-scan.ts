// Manually trigger the price-alert scan with a signed request.
//
// Usage:
//   CRON_SECRET=... APP_URL=http://127.0.0.1:3000 npx tsx scripts/trigger-alert-scan.ts
//
// The signature covers `${timestamp}.POST./api/cron/alerts` and expires after
// five minutes, so this cannot be replaced by a plain curl with a Bearer token.

import {
  CRON_SIGNATURE_HEADER,
  CRON_TIMESTAMP_HEADER,
  signCronRequest,
} from '../src/lib/cronAuth.ts';

const CRON_PATH = '/api/cron/alerts';

async function main() {
  const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000')
    .replace(/\/+$/, '');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('CRON_SECRET is required (same value as the Worker secret).');
    process.exit(1);
  }

  const { timestamp, signature } = await signCronRequest(secret, 'POST', CRON_PATH);

  const res = await fetch(`${baseUrl}${CRON_PATH}`, {
    method: 'POST',
    headers: {
      [CRON_TIMESTAMP_HEADER]: timestamp,
      [CRON_SIGNATURE_HEADER]: signature,
    },
  });

  console.log(`HTTP ${res.status}`);
  console.log(await res.text());

  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error('Trigger failed:', err);
  process.exit(1);
});
