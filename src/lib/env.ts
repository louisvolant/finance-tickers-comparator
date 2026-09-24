import { NextRequest } from 'next/server';

/**
 * Universal environment variable resolver supporting:
 * 1. OpenNext Cloudflare context (ctx.env)
 * 2. Node.js process.env
 * 3. Cloudflare Workers globalThis bindings
 */
export function getEnvVar(name: string): string | undefined {
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
