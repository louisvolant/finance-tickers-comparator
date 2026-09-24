import { TickerSearchResult } from './types';

export interface CatalogItem {
  isin: string;
  ticker: string;
  label: string;
  yahooSymbol: string;
  exchange: string;
  quoteType: string;
}

export const STOCK_CATALOG: CatalogItem[] = [
  {
    isin: 'FR0011871110',
    ticker: 'PUST',
    label: 'AMUNDI PEA NASDAQ-100 UCITS ETF ACC',
    yahooSymbol: 'PUST.PA',
    exchange: 'Paris',
    quoteType: 'ETF',
  },
  {
    isin: 'IE0002XZSHO1',
    ticker: 'WPEA',
    label: 'ISHARES MSCI WORLD SWAP PEA UCITS ETF EUR (ACC)',
    yahooSymbol: 'WPEA.PA',
    exchange: 'Paris',
    quoteType: 'ETF',
  },
  {
    isin: 'FR0011550185',
    ticker: 'ESE',
    label: 'BNP PARIBAS EASY S&P 500 UCITS ETF EUR CAPITALISATION',
    yahooSymbol: 'ESE.PA',
    exchange: 'Paris',
    quoteType: 'ETF',
  },
  {
    isin: 'DE000A2QP372',
    ticker: 'EXX1',
    label: 'ISHARES EURO STOXX BANKS 30-15 UCITS ETF (DE) EUR (ACC)',
    yahooSymbol: 'EXX1.DE',
    exchange: 'XETRA',
    quoteType: 'ETF',
  },
  {
    isin: 'FR0000121014',
    ticker: 'MC',
    label: 'LVMH',
    yahooSymbol: 'MC.PA',
    exchange: 'Paris',
    quoteType: 'EQUITY',
  },
  {
    isin: 'FR0000120073',
    ticker: 'AI',
    label: 'AIR LIQUIDE',
    yahooSymbol: 'AI.PA',
    exchange: 'Paris',
    quoteType: 'EQUITY',
  },
  {
    isin: 'FR0011869312',
    ticker: 'PAASI',
    label: 'AMUNDI PEA ASIE PACIFIQUE (MSCI AC ASIA PACIFIC EX JAPAN) UCITS ETF ACC',
    yahooSymbol: 'PAASI.PA',
    exchange: 'Paris',
    quoteType: 'ETF',
  },
  {
    isin: 'NL0000235190',
    ticker: 'AIR',
    label: 'AIRBUS',
    yahooSymbol: 'AIR.PA',
    exchange: 'Paris',
    quoteType: 'EQUITY',
  },
  {
    isin: 'FR0000121972',
    ticker: 'SU',
    label: 'SCHNEIDER ELECTRIC',
    yahooSymbol: 'SU.PA',
    exchange: 'Paris',
    quoteType: 'EQUITY',
  },
  {
    isin: 'FR0010307819',
    ticker: 'LR',
    label: 'LEGRAND',
    yahooSymbol: 'LR.PA',
    exchange: 'Paris',
    quoteType: 'EQUITY',
  },
  {
    isin: 'FR001400Q9V2',
    ticker: 'EXENS',
    label: 'EXOSENS',
    yahooSymbol: 'EXENS.PA',
    exchange: 'Paris',
    quoteType: 'EQUITY',
  },
  {
    isin: 'US0231351067',
    ticker: 'AMZN',
    label: 'AMAZON.COM',
    yahooSymbol: 'AMZN',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY',
  },
  {
    isin: 'US5949181045',
    ticker: 'MSFT',
    label: 'MICROSOFT',
    yahooSymbol: 'MSFT',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY',
  },
  {
    isin: 'US67066G1040',
    ticker: 'NVDA',
    label: 'NVIDIA',
    yahooSymbol: 'NVDA',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY',
  },
  {
    isin: 'US30303M1027',
    ticker: 'META',
    label: 'META PLATFORMS',
    yahooSymbol: 'META',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY',
  },
  {
    isin: 'US02079K3059',
    ticker: 'GOOGL',
    label: 'ALPHABET-A',
    yahooSymbol: 'GOOGL',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY',
  },
  {
    isin: 'IE00B6R52036',
    ticker: 'IAUP',
    label: 'ISHARES GOLD PRODUCERS UCITS ETF USD (ACC)',
    yahooSymbol: 'IAUP.L',
    exchange: 'London',
    quoteType: 'ETF',
  },
  {
    isin: 'US0494681010',
    ticker: 'TEAM',
    label: 'ATLASSIAN RG-A',
    yahooSymbol: 'TEAM',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY',
  },
  {
    isin: 'US0378331005',
    ticker: 'AAPL',
    label: 'APPLE',
    yahooSymbol: 'AAPL',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY',
  },
  {
    isin: 'IE00B3ZW0K18',
    ticker: 'IUSE',
    label: 'ISHARES S&P 500 EUR HEDGED UCITS ETF (ACC)',
    yahooSymbol: 'IUSE.AS',
    exchange: 'Amsterdam',
    quoteType: 'ETF',
  },
  {
    isin: 'IE000U9ODG19',
    ticker: 'DFND',
    label: 'ISHARES GLOBAL AEROSPACE & DEFENCE UCITS ETF USD ACCU',
    yahooSymbol: 'DFND.L',
    exchange: 'London',
    quoteType: 'ETF',
  },
  {
    isin: 'LU1681044480',
    ticker: 'AASI',
    label: 'AMUNDI MSCI EM ASIA UCITS ETF - EUR',
    yahooSymbol: 'AASI.PA',
    exchange: 'Paris',
    quoteType: 'ETF',
  },
  {
    isin: 'DE000A0H0728',
    ticker: 'EXXY',
    label: 'ISHARES DIVERSIFIED COMMODITY SWAP UCITS ETF (DE)',
    yahooSymbol: 'EXXY.DE',
    exchange: 'XETRA',
    quoteType: 'ETF',
  },
  {
    isin: 'DE000A2QP380',
    ticker: 'EXX5',
    label: 'ISHARES EURO STOXX SELECT DIVIDEND 30 UCITS ETF (DE) EUR (ACC)',
    yahooSymbol: 'EXX5.DE',
    exchange: 'XETRA',
    quoteType: 'ETF',
  },
  {
    isin: 'LU1834987973',
    ticker: 'INSU',
    label: 'AMUNDI STOXX EUROPE 600 INSURANCE UCITS ETF ACC',
    yahooSymbol: 'LIRU.DE',
    exchange: 'XETRA',
    quoteType: 'ETF',
  },
  {
    isin: 'US23804L1035',
    ticker: 'DDOG',
    label: 'DATADOG RG-A',
    yahooSymbol: 'DDOG',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY',
  },
];

/**
 * Searches the curated catalog by ticker, label, or ISIN code.
 */
export function searchCatalog(query: string): TickerSearchResult[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const matched: TickerSearchResult[] = [];

  for (const item of STOCK_CATALOG) {
    const isTickerExact = item.ticker.toUpperCase() === q;
    const isTickerPrefix = item.ticker.toUpperCase().startsWith(q);
    const isYahooPrefix = item.yahooSymbol.toUpperCase().startsWith(q);
    const isIsinMatch = item.isin.toUpperCase().includes(q);
    const isLabelMatch = item.label.toUpperCase().includes(q);

    if (isTickerExact || isTickerPrefix || isYahooPrefix || isIsinMatch || isLabelMatch) {
      matched.push({
        symbol: item.yahooSymbol,
        name: item.label,
        exchange: item.exchange,
        quoteType: item.quoteType,
      });
    }
  }

  return matched;
}
