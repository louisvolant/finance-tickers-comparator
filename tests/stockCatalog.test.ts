import { test, describe } from 'node:test';
import assert from 'node:assert';
import { searchCatalog, STOCK_CATALOG } from '../src/lib/stockCatalog.ts';
import { searchTickers } from '../src/lib/yahooFinance.ts';

describe('Stock Catalog & Multimodal Search (Ticker, Label, ISIN)', () => {
  test('should verify all 26 catalog items have valid ISIN, ticker, label, and yahooSymbol', () => {
    assert.strictEqual(STOCK_CATALOG.length, 26);
    for (const item of STOCK_CATALOG) {
      assert.ok(item.isin && item.isin.length >= 12, `Invalid ISIN for ${item.ticker}`);
      assert.ok(item.ticker && item.ticker.length > 0, `Invalid ticker`);
      assert.ok(item.label && item.label.length > 0, `Invalid label`);
      assert.ok(item.yahooSymbol && item.yahooSymbol.length > 0, `Invalid yahoo symbol`);
    }
  });

  test('should search catalog by ticker symbol (e.g. PUST, WPEA, MC, AI, AIR, EXENS)', () => {
    const pust = searchCatalog('PUST');
    assert.ok(pust.some((r) => r.symbol === 'PUST.PA'));

    const wpea = searchCatalog('WPEA');
    assert.ok(wpea.some((r) => r.symbol === 'WPEA.PA'));

    const mc = searchCatalog('MC');
    assert.ok(mc.some((r) => r.symbol === 'MC.PA'));

    const ai = searchCatalog('AI');
    assert.ok(ai.some((r) => r.symbol === 'AI.PA'));

    const exens = searchCatalog('EXENS');
    assert.ok(exens.some((r) => r.symbol === 'EXENS.PA'));
  });

  test('should search catalog by company or ETF label (e.g. LVMH, AIR LIQUIDE, SCHNEIDER, DATADOG)', () => {
    const lvmh = searchCatalog('LVMH');
    assert.ok(lvmh.some((r) => r.symbol === 'MC.PA'));

    const airLiquide = searchCatalog('AIR LIQUIDE');
    assert.ok(airLiquide.some((r) => r.symbol === 'AI.PA'));

    const schneider = searchCatalog('SCHNEIDER');
    assert.ok(schneider.some((r) => r.symbol === 'SU.PA'));

    const datadog = searchCatalog('DATADOG');
    assert.ok(datadog.some((r) => r.symbol === 'DDOG'));

    const atlassian = searchCatalog('ATLASSIAN');
    assert.ok(atlassian.some((r) => r.symbol === 'TEAM'));
  });

  test('should search catalog by ISIN code', () => {
    // LVMH ISIN: FR0000121014
    const isinLvmh = searchCatalog('FR0000121014');
    assert.ok(isinLvmh.some((r) => r.symbol === 'MC.PA'));

    // PUST ISIN: FR0011871110
    const isinPust = searchCatalog('FR0011871110');
    assert.ok(isinPust.some((r) => r.symbol === 'PUST.PA'));

    // EXOSENS ISIN: FR001400Q9V2
    const isinExens = searchCatalog('FR001400Q9V2');
    assert.ok(isinExens.some((r) => r.symbol === 'EXENS.PA'));
  });

  test('searchTickers API should return catalog match for query by label', async () => {
    const results = await searchTickers('Air Liquide');
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.symbol === 'AI.PA'));
  });
});
