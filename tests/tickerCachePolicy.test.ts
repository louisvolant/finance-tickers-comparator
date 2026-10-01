import { test, describe } from 'node:test';
import assert from 'node:assert';
import nextConfig from '../next.config.mjs';

/**
 * /ticker/[symbol] renders per-user data (reference target, personal notes),
 * so its cache policy is asserted here at the config level. Next.js manages the
 * `Vary` header itself and overwrites it, which makes `Cache-Control` the only
 * lever that reliably survives the build - hence a unit test rather than only
 * an end-to-end assertion.
 */
describe('Ticker page cache policy', () => {
  // next.config headers() is async, so the suite resolves them once up front.
  let rules: any[] = [];

  const tickerRule = () => rules.find((r: any) => r.source === '/ticker/:path*');

  test('declares a header rule for the ticker route', async () => {
    rules = await nextConfig.headers();
    assert.ok(tickerRule(), 'next.config.mjs must declare headers for /ticker/:path*');
  });

  test('forbids storage in every cache (private + no-store)', async () => {
    const cacheControl = tickerRule().headers.find(
      (h: any) => h.key.toLowerCase() === 'cache-control'
    );
    assert.ok(cacheControl, 'a Cache-Control header is required');

    const value = cacheControl.value;
    assert.ok(value.includes('no-store'), `expected no-store, got "${value}"`);
    assert.ok(value.includes('private'), `expected private, got "${value}"`);
    assert.ok(
      value.includes('must-revalidate'),
      `expected must-revalidate, got "${value}"`
    );
  });

  test('does not advertise a max-age that would allow reuse', async () => {
    const cacheControl = tickerRule().headers.find(
      (h: any) => h.key.toLowerCase() === 'cache-control'
    );
    assert.ok(cacheControl.value.includes('max-age=0'));
    assert.strictEqual(
      cacheControl.value.match(/s-maxage=(\d+)/),
      null,
      's-maxage must not be set: it would let a shared CDN serve one user\'s page to another'
    );
  });

  test('keeps static PWA assets cacheable so the app stays installable', async () => {
    const manifest = rules.find((r: any) => r.source === '/manifest.json');
    assert.ok(manifest, 'manifest.json header rule must remain');
    const cacheControl = manifest.headers.find(
      (h: any) => h.key.toLowerCase() === 'cache-control'
    );
    assert.ok(cacheControl.value.includes('public'));
  });
});