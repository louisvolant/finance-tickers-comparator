import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertCurrency,
  normalizeCurrency,
  currencyForLocale,
  regionFromLocale,
  getCurrencySymbol,
} from '../src/lib/currencies';
import { buildRatesFromFawazahmed } from '../src/lib/exchangeRates';

// Reference rates: units per 1 EUR.
const RATES = {
  EUR: 1,
  USD: 1.1,
  SEK: 11.5,
  GBP: 0.85,
};

describe('Currency conversion engine', () => {
  describe('normalizeCurrency (minor units)', () => {
    test('keeps regular currencies unchanged', () => {
      assert.deepEqual(normalizeCurrency('EUR'), { code: 'EUR', factor: 1 });
      assert.deepEqual(normalizeCurrency('usd'), { code: 'USD', factor: 1 });
    });

    test('normalizes LSE pence (GBp / GBX) to GBP with factor 100', () => {
      assert.deepEqual(normalizeCurrency('GBp'), { code: 'GBP', factor: 100 });
      assert.deepEqual(normalizeCurrency('GBX'), { code: 'GBP', factor: 100 });
    });

    test('normalizes South-African cents and Israeli agorot', () => {
      assert.deepEqual(normalizeCurrency('ZAc'), { code: 'ZAR', factor: 100 });
      assert.deepEqual(normalizeCurrency('ILA'), { code: 'ILS', factor: 100 });
    });

    test('defaults to USD for empty input', () => {
      assert.deepEqual(normalizeCurrency(null), { code: 'USD', factor: 1 });
    });
  });

  describe('convertCurrency', () => {
    test('returns the same amount when currencies match', () => {
      assert.equal(convertCurrency(100, 'EUR', 'EUR', RATES), 100);
      assert.equal(convertCurrency(100, 'USD', 'USD', null), 100);
    });

    const approx = (actual: number | null, expected: number) => {
      assert.ok(actual !== null, 'expected a number, got null');
      assert.ok(Math.abs((actual as number) - expected) < 1e-9, `${actual} != ${expected}`);
    };

    test('converts from EUR to a foreign currency', () => {
      approx(convertCurrency(100, 'EUR', 'USD', RATES), 110);
    });

    test('converts from a foreign currency to EUR', () => {
      approx(convertCurrency(110, 'USD', 'EUR', RATES), 100);
    });

    test('converts across two non-EUR currencies via EUR', () => {
      // 110 USD -> 100 EUR -> 1150 SEK
      approx(convertCurrency(110, 'USD', 'SEK', RATES), 1150);
    });

    test('returns null when a required rate is missing', () => {
      assert.equal(convertCurrency(100, 'EUR', 'SEK', {}), null);
      assert.equal(convertCurrency(100, 'EUR', 'USD', null), null);
    });
  });

  describe('locale -> currency mapping', () => {
    test('derives the region subtag from a BCP-47 locale', () => {
      assert.equal(regionFromLocale('en-GB'), 'GB');
      assert.equal(regionFromLocale('en_US'), 'US');
      assert.equal(regionFromLocale('fr'), null);
    });

    test('defaults European languages to EUR', () => {
      assert.equal(currencyForLocale('fr-FR'), 'EUR');
      assert.equal(currencyForLocale('de'), 'EUR');
      assert.equal(currencyForLocale('es-ES'), 'EUR');
      assert.equal(currencyForLocale('it'), 'EUR');
      assert.equal(currencyForLocale('pt-PT'), 'EUR');
    });

    test('maps English regions to GBP / USD / CAD / AUD', () => {
      assert.equal(currencyForLocale('en-GB'), 'GBP');
      assert.equal(currencyForLocale('en-CA'), 'CAD');
      assert.equal(currencyForLocale('en-AU'), 'AUD');
      assert.equal(currencyForLocale('en-US'), 'USD');
      assert.equal(currencyForLocale('en'), 'USD');
    });
  });

  describe('getCurrencySymbol', () => {
    test('returns known symbols and falls back to the code', () => {
      assert.equal(getCurrencySymbol('EUR'), '€');
      assert.equal(getCurrencySymbol('SEK'), 'kr');
      assert.equal(getCurrencySymbol('XOF'), 'XOF');
      assert.equal(getCurrencySymbol(null), '');
    });
  });
});

describe('Exchange rates payload parsing', () => {
  test('keeps only ISO fiat currencies and forces EUR = 1', () => {
    const rates = buildRatesFromFawazahmed({
      date: '2026-01-01',
      eur: {
        usd: 1.1,
        sek: 11.5,
        btc: 0.00001, // not ISO fiat -> dropped
        eur: 1,
        gbp: 0.85,
      },
    });

    assert.equal(rates.EUR, 1);
    assert.equal(rates.USD, 1.1);
    assert.equal(rates.SEK, 11.5);
    assert.equal(rates.GBP, 0.85);
    assert.equal(rates.BTC, undefined);
  });

  test('ignores invalid or non-positive rates', () => {
    const rates = buildRatesFromFawazahmed({
      eur: { usd: 0, sek: -3, gbp: 'nope' as unknown as number },
    });
    assert.equal(rates.USD, undefined);
    assert.equal(rates.SEK, undefined);
    assert.equal(rates.GBP, undefined);
  });
});
