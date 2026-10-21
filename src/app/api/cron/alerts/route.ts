import { NextRequest, NextResponse } from 'next/server';
import { getEnvVar } from '@/lib/env';
import { runAlertScan } from '@/lib/alertScan';
import { buildAlertNotification, UserAlertEvent } from '@/lib/alertNotification';
import { getVapidKeys, sendPushToUser } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  try {
    // The scan owns its own lock, written only once it knows there is at least
    // one open venue to evaluate. See runAlertScan().
    const result = await runAlertScan();

    if (result.skipped) {
      return NextResponse.json({ skipped: 'scan-already-running' });
    }

    // One notification per user per scan, grouping every ticker that fired.
    const byUser = new Map<string, UserAlertEvent[]>();
    for (const event of result.triggered) {
      const list = byUser.get(event.userId);
      if (list) list.push(event);
      else byUser.set(event.userId, [event]);
    }

    let pushed = 0;
    let prunedSubscriptions = 0;

    // VAPID is checked once here rather than inside every send, so a deployment
    // without keys logs a single warning instead of one per user.
    if (getVapidKeys() && byUser.size > 0) {
      const deliveries = await Promise.allSettled(
        Array.from(byUser, ([userId, events]) =>
          sendPushToUser(userId, buildAlertNotification(events))
        )
      );

      for (const delivery of deliveries) {
        if (delivery.status === 'fulfilled') {
          pushed += delivery.value.sent;
          prunedSubscriptions += delivery.value.pruned;
        }
      }
    }

    // Counts only: the endpoint is secret-gated, but symbol lists and user ids
    // do not belong in a response or in the logs.
    return NextResponse.json(
      {
        scannedTickers: result.scannedTickers,
        fetchedQuotes: result.fetchedQuotes,
        triggered: result.triggered.length,
        pushed,
        prunedSubscriptions,
        stateWrites: result.stateWrites,
        quoteWrites: result.quoteWrites,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Alert scan failed:', err);
    return NextResponse.json({ error: 'Alert scan failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
