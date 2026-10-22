import { NextRequest, NextResponse } from 'next/server';
import { getEnvVar } from '@/lib/env';
import { kvGet, kvListAll } from '@/lib/kv';
import { getD1Binding } from '@/lib/users';
import { D1UserRepository } from '@/lib/users.d1';
import type { UserRecord } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/migrate-users?dryRun=1
 *
 * One-off, idempotent backfill of the KV account records into D1. This route is
 * temporary: remove it (and MIGRATION_SECRET) once the migration is verified.
 *
 * Reads KV through `kvListAll()` so it is not limited to the first 1,000 keys.
 * Never logs emails, ids or password hashes; returns counters only.
 */
export async function POST(request: NextRequest) {
  const secret = getEnvVar('MIGRATION_SECRET');
  if (!secret) {
    return NextResponse.json({ error: 'MIGRATION_SECRET is not configured' }, { status: 503 });
  }

  const provided = (request.headers.get('authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim();

  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';
    // Always target D1 directly: the dual repository imports KV users lazily on
    // read, which would make a dry-run mutate the database.
    const db = getD1Binding();
    if (!db) {
      return NextResponse.json(
        { error: 'The D1 binding is not available; the backfill has nothing to write to' },
        { status: 503 }
      );
    }
    const repo = new D1UserRepository(db);
    const keys = await kvListAll('user:by-email:');

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        const user = await kvGet<UserRecord>(key);
        if (!user?.id || !user.email) {
          failed++;
          continue;
        }

        if (dryRun) {
          const existing = await repo.findByEmail(user.email);
          if (existing) skipped++;
          else imported++;
          continue;
        }

        const inserted = await repo.importUser(user);
        if (inserted) imported++;
        else skipped++;
      } catch (err) {
        failed++;
        // Deliberately no key in the log: the key contains the email address.
        console.error('User backfill failed for one account:', err);
      }
    }

    return NextResponse.json(
      { dryRun, scanned: keys.length, imported, skipped, failed },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('User backfill failed:', err);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
