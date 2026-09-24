'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  Percent,
  Activity,
  Edit2,
  Trash2,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { UserTicker, TickerDetails } from '@/lib/types';
import { formatCurrency, formatPercent, formatMultiple, formatCompactNumber } from '@/lib/utils';

interface TickerDetailsModalProps {
  ticker: UserTicker | null;
  isOpen: boolean;
  onClose: () => void;
  onEditTracking: (ticker: UserTicker) => void;
  onDeleteTicker: (ticker: UserTicker) => void;
}

type TimeRange = '1d' | '5d' | '1mo' | '6mo' | '1y' | '5y';

export function TickerDetailsModal({
  ticker,
  isOpen,
  onClose,
  onEditTracking,
  onDeleteTicker,
}: TickerDetailsModalProps) {
  const [range, setRange] = useState<TimeRange>('1mo');
  const [details, setDetails] = useState<TickerDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker || !isOpen) return;

    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tickers/details?symbol=${encodeURIComponent(ticker.symbol)}&range=${range}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setDetails(data);
          }
        }
      } catch (err) {
        console.error('Failed to load ticker details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [ticker, range, isOpen]);

  if (!isOpen || !ticker) return null;

  const quote = details?.quote || ticker.quote;
  const currentPrice = quote?.price ?? 0;
  const trackingVal = ticker.trackingValue;
  const diffPercent = trackingVal > 0 ? ((currentPrice - trackingVal) / trackingVal) * 100 : 0;
  const isPositiveDiff = diffPercent >= 0;

  // 52-week position calculation
  let rangePercent = 50;
  if (quote?.fiftyTwoWeekHigh && quote?.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh > quote.fiftyTwoWeekLow) {
    rangePercent = Math.min(
      100,
      Math.max(0, ((currentPrice - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100)
    );
  }

  const chartData = details?.chart || [];
  const minClose = chartData.length > 0 ? Math.min(...chartData.map((d) => d.close)) * 0.98 : 0;
  const maxClose = chartData.length > 0 ? Math.max(...chartData.map((d) => d.close)) * 1.02 : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">{ticker.symbol}</h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                {quote?.exchange || 'Stock'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {quote?.currency || 'USD'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{quote?.name || ticker.name}</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEditTracking(ticker)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Edit tracking value"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteTicker(ticker)}
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
              title="Delete ticker"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Close details modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Banner: Price & Tracking % Diff */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          {/* Live Price */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Current Price</span>
            <div className="text-lg sm:text-xl font-bold text-white">
              {formatCurrency(currentPrice, quote?.currency)}
            </div>
            <div
              className={`flex items-center gap-1 text-[11px] font-semibold mt-0.5 ${
                (quote?.changePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(quote?.changePercent ?? 0) >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{formatPercent(quote?.changePercent)} today</span>
            </div>
          </div>

          {/* Tracking Target & % Diff */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Tracking Value</span>
            <div className="text-lg sm:text-xl font-bold text-slate-200">
              {formatCurrency(trackingVal, quote?.currency)}
            </div>
            <div
              className={`flex items-center gap-1 text-[11px] font-bold mt-0.5 ${
                isPositiveDiff ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span>{formatPercent(diffPercent)} vs target</span>
            </div>
          </div>

          {/* Current P/E */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl">
            <span className="text-[11px] font-medium text-emerald-300 block mb-1">Current P/E (Trailing)</span>
            <div className="text-lg sm:text-xl font-black text-emerald-400">
              {formatMultiple(quote?.trailingPE)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">TTM earnings multiple</span>
          </div>

          {/* Forward P/E */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-xl">
            <span className="text-[11px] font-medium text-cyan-300 block mb-1">Forward P/E</span>
            <div className="text-lg sm:text-xl font-black text-cyan-400">
              {formatMultiple(quote?.forwardPE)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Estimated next FY</span>
          </div>
        </div>

        {/* Historical Price Chart */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Price History
            </span>

            {/* Range Toggle */}
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-semibold">
              {(['1d', '5d', '1mo', '6mo', '1y', '5y'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer uppercase ${
                    range === r
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
              Loading chart...
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stop-color="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stop-color="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[minClose, maxClose]}
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `${val.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [`${formatCurrency(val, quote?.currency)}`, 'Close']}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-slate-500">
              No historical chart points available for this period.
            </div>
          )}
        </div>

        {/* 52-Week Range Bar */}
        {quote?.fiftyTwoWeekLow && quote?.fiftyTwoWeekHigh && (
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">52-Week Range</span>
              <span className="text-slate-300 font-semibold">
                {formatCurrency(quote.fiftyTwoWeekLow, quote.currency)} — {formatCurrency(quote.fiftyTwoWeekHigh, quote.currency)}
              </span>
            </div>
            <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                style={{ width: `${rangePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>52W Low</span>
              <span className="text-emerald-400 font-medium">{rangePercent.toFixed(0)}% of range</span>
              <span>52W High</span>
            </div>
          </div>
        )}

        {/* Key Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">Market Cap</span>
            <span className="font-semibold text-slate-200">
              {quote?.marketCap ? formatCompactNumber(quote.marketCap) : '—'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">Dividend Yield</span>
            <span className="font-semibold text-slate-200">
              {quote?.dividendYield ? `${quote.dividendYield}%` : '0.00%'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">Trailing EPS</span>
            <span className="font-semibold text-slate-200">
              {quote?.epsTrailingTwelveMonths ? formatCurrency(quote.epsTrailingTwelveMonths, quote.currency) : '—'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">Beta (Volatility)</span>
            <span className="font-semibold text-slate-200">{quote?.beta ? quote.beta.toFixed(2) : '—'}</span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">Volume</span>
            <span className="font-semibold text-slate-200">
              {quote?.volume ? formatCompactNumber(quote.volume) : '—'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">Average Volume</span>
            <span className="font-semibold text-slate-200">
              {quote?.avgVolume ? formatCompactNumber(quote.avgVolume) : '—'}
            </span>
          </div>
        </div>

        {ticker.notes && (
          <div className="mt-4 p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              Personal Notes
            </span>
            <p className="text-slate-300">{ticker.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
