import type { NextRequest } from 'next/server';

/**
 * Worker bindings for invocations that have no request context.
 *
 * `scheduled` and `queue` handlers receive `env` directly, and unlike a fetch
 * request there is no OpenNext context to read it from. The handler stores the
 * bindings here once, and `getEnvVar()` / `kv.ts` consult them first.
 *
 * The value is per Worker, not per request: every invocation of the same Worker
 * sees the same bindings, so a module-level holder cannot leak data between
 * users or requests.
 */
let runtimeEnv: Record<string, any> | null = null;

export function setRuntimeEnv(env: Record<string, any> | null): void {
  runtimeEnv = env;
}

export function getRuntimeEnv(): Record<string, any> | null {
  return runtimeEnv;
}

function getRuntimeEnvValue(name: string): string | undefined {
  const value = runtimeEnv?.[name];
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * Universal environment variable resolver supporting:
 * 1. Runtime bindings injected by a scheduled/queue handler
 * 2. OpenNext Cloudflare context (ctx.env)
 * 3. Node.js process.env
 * 4. Cloudflare Workers globalThis bindings
 */
export function getEnvVar(name: string): string | undefined {
  const injected = getRuntimeEnvValue(name);
  if (injected) return injected;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext?.();
    if (ctx?.env && typeof ctx.env[name] === 'string' && ctx.env[name]) {
      return ctx.env[name];
    }
  } catch {
    // Fall through to process.env / globalThis
  }

  if (process.env[name]) {
    return process.env[name];
  }

  const g = globalThis as any;
  if (g && typeof g[name] === 'string') {
    return g[name];
  }
  if (g?.__env__ && typeof g.__env__[name] === 'string') {
    return g.__env__[name];
  }
  if (g?.env && typeof g.env[name] === 'string') {
    return g.env[name];
  }

  return undefined;
}

/**
 * Accurately determines the public origin for OAuth redirects,
 * respecting reverse proxies (x-forwarded-host, x-forwarded-proto)
 * and optional explicit APP_URL configuration.
 */
export function getRequestOrigin(request: NextRequest): string {
  const envUrl = getEnvVar('NEXT_PUBLIC_APP_URL') || getEnvVar('APP_URL');
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto =
    request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}
