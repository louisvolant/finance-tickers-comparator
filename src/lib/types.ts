export interface TickerQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  trailingPE: number | null;
  forwardPE: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  epsTrailingTwelveMonths: number | null;
  beta: number | null;
  volume: number | null;
  avgVolume: number | null;
  exchange: string;
  quoteType: string;
  updatedAt: number;
  marketState?: string | null;
  preMarketPrice?: number | null;
  preMarketChange?: number | null;
  preMarketChangePercent?: number | null;
  postMarketPrice?: number | null;
  postMarketChange?: number | null;
  postMarketChangePercent?: number | null;
  extendedType?: 'pre' | 'post' | null;
  extendedPrice?: number | null;
  extendedChangePercent?: number | null;
}

export interface UserTicker {
  id: string;
  symbol: string;
  name: string;
  trackingValue: number | null; // Optional personal reference or purchase price to compute % diff
  notes?: string;
  order: number;
  createdAt: number;
  quote?: TickerQuote | null;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quoteType: string;
  sector?: string;
  industry?: string;
}

export interface ChartPoint {
  date: string;
  timestamp: number;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface EarningsEstimatePeriod {
  period: string; // e.g. "0y", "+1y", "0q", "+1q"
  periodLabel: string; // e.g. "Fiscal Year 2026 (FY0)", "Fiscal Year 2027 (FY+1)"
  endDate?: string;
  year?: number;
  avgEps: number | null;
  lowEps: number | null;
  highEps: number | null;
  numberOfAnalysts: number | null;
  growth: number | null;
  currency?: string;
  impliedForwardPE: number | null;
  upRevisions30d?: number | null;
  downRevisions30d?: number | null;
}

export interface ForwardConsensusData {
  forwardEps: number | null;
  forwardPE: number | null;
  primaryHorizon: string;
  sourceDescription: string;
  estimates: EarningsEstimatePeriod[];
}

export interface TickerDetails {
  quote: TickerQuote;
  chart: ChartPoint[];
  summary?: {
    description?: string;
    sector?: string;
    industry?: string;
    website?: string;
  };
  forwardConsensus?: ForwardConsensusData;
}

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  hashedPassword?: string;
  googleId?: string;
  createdAt: number;
}

export interface SessionUser {
  id: string;
  email: string;
  username: string;
}
