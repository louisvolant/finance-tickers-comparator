// Currency metadata & pure conversion helpers.
// Client-safe: MUST NOT import any server-only module (fs, kv, ...).

// ISO 4217 fiat currencies accepted by the app (mirrors ../currency-converter).
export const ISO_FIAT_CURRENCIES = new Set([
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
  'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'FOK', 'GBP', 'GEL', 'GGP', 'GHS',
  'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF',
  'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD',
  'JPY', 'KES', 'KGS', 'KHR', 'KID', 'KMF', 'KRW', 'KWD', 'KYD', 'KZT',
  'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD',
  'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN',
  'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK',
  'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR',
  'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SLL', 'SOS', 'SRD',
  'SSP', 'STN', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY',
  'TTD', 'TVD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES',
  'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL',
]);

/** Fallback reference currency when nothing can be inferred (app is euro-centric). */
export const FALLBACK_CURRENCY = 'EUR';

/** Currency symbols used for compact display in inputs / badges. */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  CAD: 'CA$',
  AUD: 'A$',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  INR: '₹',
  BRL: 'R$',
  CNY: '¥',
  HKD: 'HK$',
  SGD: 'S$',
  ZAR: 'R',
  ILS: '₪',
  MXN: 'MX$',
  NZD: 'NZ$',
  TRY: '₺',
  KRW: '₩',
};

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

/**
 * English-speaking regions offered as explicit currency choices on the
 * account screen (GBP / USD / CAD / AUD). Other locales default to EUR.
 */
export const ENGLISH_CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
];

/**
 * Safe currency symbol lookup with a graceful ISO-code fallback.
 */
export function getCurrencySymbol(currency: string | null | undefined): string {
  if (!currency) return '';
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency.toUpperCase();
}

/**
 * Yahoo Finance sometimes quotes in minor units (pence, cents, agorot).
 * Returns the canonical major ISO code and the divisor to apply to prices.
 */
const MINOR_UNITS: Record<string, NormalizedCurrency> = {
  // London Stock Exchange quotes in pence ("GBX" uppercase form).
  GBX: { code: 'GBP', factor: 100 },
  ZAC: { code: 'ZAR', factor: 100 },
  ILA: { code: 'ILS', factor: 100 },
};

export interface NormalizedCurrency {
  code: string;
  factor: number;
}

/**
 * Normalize a Yahoo currency code into its major ISO code plus a divisor
 * factor (1 for regular currencies, 100 for minor units like pence).
 */
export function normalizeCurrency(currency: string | null | undefined): NormalizedCurrency {
  if (!currency) return { code: 'USD', factor: 1 };
  const raw = currency.trim();
  // Minor units are case-sensitive in Yahoo (GBp, ZAc, ILA).
  const lower = raw.toLowerCase();
  if (lower === 'gbp' && raw !== 'GBP') return { code: 'GBP', factor: 100 }; // "GBp"
  const upper = raw.toUpperCase();
  const minor = MINOR_UNITS[upper];
  if (minor) return minor;
  return { code: upper, factor: 1 };
}

/**
 * Convert an amount from one currency to another using EUR-based rates
 * (rates[CODE] = units of CODE per 1 EUR, with EUR = 1).
 *
 * Returns null when a required rate is missing.
 */
export function convertCurrency(
  amount: number,
  from: string | null | undefined,
  to: string | null | undefined,
  rates: Record<string, number> | null | undefined
): number | null {
  if (amount === null || amount === undefined || isNaN(amount)) return null;

  const fromCode = normalizeCurrency(from).code;
  const toCode = normalizeCurrency(to).code;

  if (fromCode === toCode) return amount;
  if (!rates) return null;

  const fromRate = fromCode === 'EUR' ? 1 : rates[fromCode];
  const toRate = toCode === 'EUR' ? 1 : rates[toCode];

  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) return null;

  return (amount / fromRate) * toRate;
}

/**
 * Extract the region subtag from a BCP-47 locale (e.g. "en-GB" -> "GB").
 */
export function regionFromLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  const parts = locale.split(/[-_]/);
  if (parts.length < 2) return null;
  const region = parts.find((p, i) => i > 0 && /^[A-Za-z]{2}$/.test(p));
  return region ? region.toUpperCase() : null;
}

/**
 * Map an app locale / browser language to a sensible default reference currency.
 * French, German, Italian, Spanish and Portuguese default to EUR; English maps
 * to GBP / USD / CAD / AUD depending on the region subtag.
 */
export function currencyForLocale(locale: string | null | undefined): string {
  const lang = (locale || '').slice(0, 2).toLowerCase();
  if (lang === 'en') {
    const region = regionFromLocale(locale);
    if (region === 'GB') return 'GBP';
    if (region === 'CA') return 'CAD';
    if (region === 'AU') return 'AUD';
    return 'USD';
  }
  return FALLBACK_CURRENCY;
}

/**
 * Best-effort default currency for a guest, from the browser locale.
 */
export function defaultPreferredCurrency(): string {
  if (typeof navigator === 'undefined') return FALLBACK_CURRENCY;
  try {
    return currencyForLocale(navigator.language);
  } catch {
    return FALLBACK_CURRENCY;
  }
}
