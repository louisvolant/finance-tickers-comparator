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

export interface TickerDetails {
  quote: TickerQuote;
  chart: ChartPoint[];
  summary?: {
    description?: string;
    sector?: string;
    industry?: string;
    website?: string;
  };
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
