// Account repository selection.
//
// `AUTH_BACKEND` controls the rollout:
//   - `kv`   : pre-migration behaviour (also the automatic fallback when no D1
//              binding exists, e.g. unit tests or a deployment without D1);
//   - `dual` : writes D1 + KV, reads D1 with a KV fallback (default once D1 is
//              bound) — used during the backfill;
//   - `d1`   : D1 only — set this after the backfill has been verified.
//
// Auth routes call getUserRepository() and never touch a binding directly.

import { getEnvVar, getRuntimeEnv } from './env';
import { D1UserRepository, type D1DatabaseLike } from './users.d1';
import { DualWriteUserRepository } from './users.dual';
import { KvUserRepository } from './users.kv';
import type { UserRepository } from './users.types';

export type AuthBackend = 'kv' | 'd1' | 'dual';

/**
 * Resolve the D1 binding for the current invocation.
 *
 * Request handlers get it from the OpenNext context; scheduled/queue handlers
 * inject it through setRuntimeEnv(); Node tests can leave it absent, in which
 * case the repository falls back to KV.
 */
export function getD1Binding(): D1DatabaseLike | null {
  const runtime = getRuntimeEnv();
  if (runtime?.DB) return runtime.DB as D1DatabaseLike;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext?.();
    if (ctx?.env?.DB) return ctx.env.DB as D1DatabaseLike;
  } catch {
    // Fall through to globals
  }

  const g = globalThis as any;
  return (g?.DB || g?.__env__?.DB || g?.env?.DB || null) as D1DatabaseLike | null;
}

export function getAuthBackend(db: D1DatabaseLike | null = getD1Binding()): AuthBackend {
  const configured = getEnvVar('AUTH_BACKEND');
  if (configured === 'kv' || configured === 'd1' || configured === 'dual') {
    return configured;
  }

  // Once the binding is deployed, dual-write is the safe default: new accounts
  // land in D1, existing KV accounts are still readable, and nothing is lost if
  // the migration is rolled back before the contract phase.
  return db ? 'dual' : 'kv';
}

export function getUserRepository(): UserRepository {
  const db = getD1Binding();
  const backend = getAuthBackend(db);
  const legacy = new KvUserRepository();

  if (backend === 'kv') return legacy;

  if (!db) {
    throw new Error('AUTH_BACKEND=d1 requires a D1 binding named DB');
  }

  const d1 = new D1UserRepository(db);
  return backend === 'd1' ? d1 : new DualWriteUserRepository(d1, legacy);
}
