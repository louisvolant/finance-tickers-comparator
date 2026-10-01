import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Architecture guard for the Yahoo Finance client lifecycle.
 *
 * yahoo-finance2 memoises the Yahoo crumb promise inside the per-client cookie
 * jar (`lib/getCrumb`: `crumbStates` is a WeakMap keyed by the jar, and
 * `state.promise` is reused by every caller sharing it). A module-scope client
 * therefore shares that promise across every concurrent request in a Workers
 * isolate: one request resolves, the others await a promise from a context that
 * has already been torn down, their continuations are cancelled and the handler
 * never responds, so Cloudflare kills the request with HTTP 500
 * ("code had hung and would never generate a response").
 *
 * This cannot be reproduced under Node, which is why the invariant is asserted
 * at the source level rather than through a functional test.
 */
describe('Yahoo Finance client lifecycle', () => {
  const sourcePath = path.join(process.cwd(), 'src/lib/yahooFinance.ts');
  const source = readFileSync(sourcePath, 'utf-8');
  const lines = source.split('\n');

  test('never instantiates a client at module scope', () => {
    // Top-level statements: no leading whitespace, ignoring comments.
    const topLevelStatements = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^\s/.test(line)) return false; // indented => nested in a block
      if (/^(\/\/|\*|\/\*)/.test(trimmed)) return false; // comment
      return true;
    });

    const offenders = topLevelStatements.filter((line) => line.includes('new YahooFinance('));

    assert.deepStrictEqual(
      offenders,
      [],
      'A YahooFinance client must not be created at module scope: it would be ' +
        'shared by every concurrent request in a Workers isolate, and the shared ' +
        'crumb promise causes HTTP 500s under concurrency. Create one per request ' +
        'via createYahooFinanceClient().'
    );
  });

  test('creates clients through a single documented factory', () => {
    const constructions = source.match(/new YahooFinance\(/g) ?? [];
    assert.strictEqual(
      constructions.length,
      1,
      'All instantiations must go through createYahooFinanceClient() so the ' +
        'request-scoped lifetime stays enforceable'
    );

    assert.ok(
      /function createYahooFinanceClient\(\).*\{[\s\S]*?new YahooFinance\(/.test(source),
      'createYahooFinanceClient() must be the function performing the instantiation'
    );
  });

  test('reuses one client across a whole batch instead of one per symbol', () => {
    // getBatchQuotes must build a single client and hand it to every symbol, so
    // a 30-symbol request performs one crumb fetch rather than thirty.
    const batchBody = source.slice(source.indexOf('export async function getBatchQuotes'));
    const body = batchBody.slice(0, batchBody.indexOf('\n}'));

    const created = body.match(/createYahooFinanceClient\(\)/g) ?? [];
    assert.strictEqual(created.length, 1, 'getBatchQuotes must create exactly one client');

    assert.ok(
      /fetchQuoteWithClient\(\s*yf\s*,/.test(body),
      'getBatchQuotes must pass its shared client down to fetchQuoteWithClient()'
    );
  });

  test('the single-quote entry point opens its own client per call', () => {
    assert.ok(
      /export async function getQuote\([\s\S]*?createYahooFinanceClient\(\)[\s\S]*?\}/.test(source),
      'getQuote() must create a fresh client per invocation'
    );
  });
});