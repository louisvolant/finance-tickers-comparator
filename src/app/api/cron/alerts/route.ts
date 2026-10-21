import { NextRequest, NextResponse } from 'next/server';
import { getEnvVar } from '@/lib/env';
import { kvDelete, kvGet, kvPut } from '@/lib/kv';
import { runAlertScan } from '@/lib/alertScan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Non-atomic "one scan at a time" marker.
 *
 * Workers KV has no compare-and-set, so two invocations starting in the same
 * instant could both observe an empty lock. Cron triggers do not overlap in
 * practice, and a duplicate scan is harmless: the first one disarms the side it
 * fired, and the second reads the updated state. The lock only exists to stop a
 * slow scan from stacking behind itself.
 */
const LOCK_KEY = 'cron:alerts:lock';
const LOCK_TTL_SEC = 10 * 60;

function readSecret(request: NextRequest): string {
  const bearer = request.headers.get('authorization') || '';
  if (/^Bearer\s+/i.test(bearer)) return bearer.replace(/^Bearer\s+/i, '').trim();
  return (request.headers.get('x-cron-secret') || '').trim();
}

async function handle(request: NextRequest) {
  const secret = getEnvVar('CRON_SECRET');
  if (!secret) {
    // Fail closed: an unauthenticated scan endpoint would let anyone burn the
    // Yahoo rate limit and the KV write quota.
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }

  if (readSecret(request) !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await kvGet(LOCK_KEY)) {
    return NextResponse.json({ skipped: 'scan-already-running' });
  }

  await kvPut(LOCK_KEY, String(Date.now()), { expirationTtl: LOCK_TTL_SEC });

  try {
    const result = await runAlertScan();

    // Counts only: the endpoint is secret-gated, but symbol lists and user ids
    // do not belong in a response or in the logs.
    return NextResponse.json(
      {
        scannedTickers: result.scannedTickers,
        fetchedQuotes: result.fetchedQuotes,
        triggered: result.triggered.length,
        stateWrites: result.stateWrites,
        quoteWrites: result.quoteWrites,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Alert scan failed:', err);
    return NextResponse.json({ error: 'Alert scan failed' }, { status: 500 });
  } finally {
    await kvDelete(LOCK_KEY);
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
