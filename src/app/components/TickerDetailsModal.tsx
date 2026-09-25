'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Activity,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Info,
  TrendingUp,
  Calculator,
  AlertTriangle,
  Users,
  Layers,
  Sunrise,
  Moon,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { UserTicker, TickerDetails } from '@/lib/types';
import { formatCurrency, formatPercent, formatMultiple, formatCompactNumber } from '@/lib/utils';
import { useI18n } from '@/context/I18nContext';

interface TickerDetailsModalProps {
  ticker: UserTicker | null;
  isOpen: boolean;
  onClose: () => void;
  onEditTracking: (ticker: UserTicker) => void;
  onDeleteTicker: (ticker: UserTicker) => void;
  onMoveUp?: (ticker: UserTicker) => void;
  onMoveDown?: (ticker: UserTicker) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

type TimeRange = '1d' | '5d' | '1mo' | '6mo' | '1y' | '5y';

export function TickerDetailsModal({
  ticker,
  isOpen,
  onClose,
  onEditTracking,
  onDeleteTicker,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: TickerDetailsModalProps) {
  const { t } = useI18n();
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
  const hasTracking = trackingVal !== null && trackingVal !== undefined && trackingVal > 0;
  const diffPercent = hasTracking ? ((currentPrice - trackingVal!) / trackingVal!) * 100 : 0;
  const isPositiveDiff = diffPercent >= 0;

  // Extended session (Pre-market 🌅 / After-hours 🌙 / Futures)
  const hasExtended =
    quote?.extendedChangePercent !== null &&
    quote?.extendedChangePercent !== undefined;
  const isPreMarket = quote?.extendedType === 'pre';
  const extendedPercent = quote?.extendedChangePercent ?? 0;
  const isPositiveExtended = extendedPercent >= 0;
  const extendedLabel = isPreMarket ? t('watchlist.preMarket') : t('watchlist.afterHours');

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
              {quote?.quoteType && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/60 text-slate-400">
                  {quote.quoteType}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">{quote?.name || ticker.name}</p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1">
            {onMoveUp && (
              <button
                onClick={() => onMoveUp(ticker)}
                disabled={isFirst}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer"
                title={t('details.moveUp')}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
            {onMoveDown && (
              <button
                onClick={() => onMoveDown(ticker)}
                disabled={isLast}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer"
                title={t('details.moveDown')}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onEditTracking(ticker)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title={t('details.editTracking')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteTicker(ticker)}
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title={t('details.deleteTicker')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close details modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Banner: Price, Target Diff, Current P/E, Forward P/E */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          {/* Live Price */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">{t('details.currentPrice')}</span>
            <div className="text-lg sm:text-xl font-bold text-white">
              {formatCurrency(currentPrice, quote?.currency)}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span
                className={`text-[11px] font-semibold ${
                  (quote?.changePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPercent(quote?.changePercent)} {t('watchlist.today')}
              </span>

              {/* Extended session indicator: (🌅 +0.03%) or (🌙 -0.12%) */}
              {hasExtended && (
                <span
                  title={`${extendedLabel}: ${formatPercent(extendedPercent)}`}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isPositiveExtended
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  }`}
                >
                  {isPreMarket ? (
                    <Sunrise className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : (
                    <Moon className="w-3 h-3 text-indigo-300 shrink-0" />
                  )}
                  <span>
                    {extendedLabel} {formatPercent(extendedPercent)}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Reference Target & Diff (Clickable to edit/add anytime) */}
          <div
            onClick={() => onEditTracking(ticker)}
            className="p-3 bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 rounded-xl cursor-pointer transition group"
            title={t('details.editTracking')}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-400">{t('details.trackingTarget')}</span>
              <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-200">
              {hasTracking ? formatCurrency(trackingVal!, quote?.currency) : '—'}
            </div>
            {hasTracking ? (
              <span
                className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold mt-1 ${
                  isPositiveDiff ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {formatPercent(diffPercent)} {t('details.vsTarget')}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400/90 group-hover:text-emerald-300 block mt-1 underline">
                + {t('details.setTarget')}
              </span>
            )}
          </div>

          {/* Current P/E */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl">
            <span className="text-[11px] font-medium text-emerald-300 block mb-1">{t('details.currentPe')}</span>
            <div className="text-lg sm:text-xl font-black text-emerald-400">
              {formatMultiple(quote?.trailingPE)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">{t('details.currentPeDesc')}</span>
          </div>

          {/* Forward P/E */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-xl">
            <span className="text-[11px] font-medium text-cyan-300 block mb-1">{t('details.forwardPe')}</span>
            <div className="text-lg sm:text-xl font-black text-cyan-400">
              {formatMultiple(quote?.forwardPE)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">{t('details.forwardPeDesc')}</span>
          </div>
        </div>

        {/* Historical Price Chart */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              {t('details.priceHistory')}
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
              {t('details.loadingChart')}
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    domain={[minClose, maxClose]}
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) => val.toFixed(0)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl text-xs">
                            <p className="text-slate-400">{pt.date}</p>
                            <p className="text-emerald-400 font-bold">
                              {formatCurrency(pt.close, quote?.currency)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
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
              {t('details.noChartPoints')}
            </div>
          )}
        </div>

        {/* 52-Week Range Bar */}
        {quote?.fiftyTwoWeekLow && quote?.fiftyTwoWeekHigh && (
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">{t('details.range52w')}</span>
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
              <span>{t('details.low52w')}</span>
              <span className="text-emerald-400 font-medium">{rangePercent.toFixed(0)}%</span>
              <span>{t('details.high52w')}</span>
            </div>
          </div>
        )}

        {/* Key Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs mb-4">
          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">{t('details.marketCap')}</span>
            <span className="font-semibold text-slate-200">
              {quote?.marketCap ? formatCompactNumber(quote.marketCap) : '—'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">{t('details.dividendYield')}</span>
            <span className="font-semibold text-slate-200">
              {quote?.dividendYield ? `${quote.dividendYield}%` : '0.00%'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">{t('details.trailingEps')}</span>
            <span className="font-semibold text-slate-200">
              {quote?.epsTrailingTwelveMonths ? formatCurrency(quote.epsTrailingTwelveMonths, quote.currency) : '—'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">{t('details.beta')}</span>
            <span className="font-semibold text-slate-200">{quote?.beta ? quote.beta.toFixed(2) : '—'}</span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">{t('details.volume')}</span>
            <span className="font-semibold text-slate-200">
              {quote?.volume ? formatCompactNumber(quote.volume) : '—'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <span className="text-slate-400 block text-[10px]">{t('details.avgVolume')}</span>
            <span className="font-semibold text-slate-200">
              {quote?.avgVolume ? formatCompactNumber(quote.avgVolume) : '—'}
            </span>
          </div>
        </div>

        {ticker.notes && (
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs mb-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              {t('details.personalNotes')}
            </span>
            <p className="text-slate-300">{ticker.notes}</p>
          </div>
        )}

        {/* FORWARD EARNINGS CONSENSUS & EDUCATIONAL SECTION */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-cyan-950/20 border border-cyan-800/30 space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Info className="w-4 h-4 shrink-0" />
                <span>{t('details.consensusTableTitle')}</span>
              </div>
              {details?.forwardConsensus?.forwardEps && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Consensus Forward EPS: {formatCurrency(details.forwardConsensus.forwardEps, quote?.currency || 'USD')}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-[11px] -mt-2">
              {t('details.consensusTableSubtitle')}
            </p>

            {/* Live Consensus Projections Table if available */}
            {details?.forwardConsensus?.estimates && details.forwardConsensus.estimates.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">{t('details.horizonCol')}</th>
                      <th className="py-2.5 px-3 text-right">{t('details.epsConsensusCol')}</th>
                      <th className="py-2.5 px-3 text-center">{t('details.rangeCol')}</th>
                      <th className="py-2.5 px-3 text-center">{t('details.analystsCol')}</th>
                      <th className="py-2.5 px-3 text-right">{t('details.impliedPeCol')}</th>
                      <th className="py-2.5 px-3 text-right">{t('details.growthCol')}</th>
                      <th className="py-2.5 px-3 text-center">{t('details.revisionsCol')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {details.forwardConsensus.estimates.map((est, i) => (
                      <tr key={est.period || i} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                          {est.periodLabel}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold whitespace-nowrap">
                          {est.avgEps !== null ? formatCurrency(est.avgEps, est.currency || quote?.currency || 'USD') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {est.lowEps !== null && est.highEps !== null
                            ? `${formatCurrency(est.lowEps, est.currency || quote?.currency || 'USD')} – ${formatCurrency(est.highEps, est.currency || quote?.currency || 'USD')}`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-300 whitespace-nowrap">
                          {est.numberOfAnalysts ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                              <Users className="w-3 h-3 text-cyan-400" />
                              {t('details.analystsCount', { count: est.numberOfAnalysts })}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                          {est.impliedForwardPE ? `${est.impliedForwardPE.toFixed(1)}x` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          {est.growth !== null ? (
                            <span className={est.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {est.growth > 0 ? `+${est.growth}%` : `${est.growth}%`}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] font-mono whitespace-nowrap">
                          {est.upRevisions30d !== null || est.downRevisions30d !== null ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              <span className="text-emerald-400">+{est.upRevisions30d ?? 0}</span>
                              <span className="text-slate-500"> / </span>
                              <span className="text-red-400">-{est.downRevisions30d ?? 0}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                {t('details.etfConsensusNote')}
              </div>
            )}

            {/* Deep Educational Breakdown */}
            <div className="space-y-3 pt-2">
              <div>
                <h4 className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('details.eduWhat')}</span>
                </h4>
                <p className="text-slate-400">{t('details.eduWhatDesc')}</p>
                <div className="mt-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 font-semibold">
                  {t('details.eduFormula')}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('details.whoAreAnalysts')}</span>
                </h4>
                <p className="text-slate-400">{t('details.whoAreAnalystsDesc')}</p>
              </div>

              <div>
                <h4 className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('details.multipleHorizons')}</span>
                </h4>
                <p className="text-slate-400">{t('details.multipleHorizonsDesc')}</p>
              </div>

              <div>
                <h4 className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('details.dispersionTitle')}</span>
                </h4>
                <p className="text-slate-400">{t('details.dispersionDesc')}</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1">{t('details.eduComparison')}</h4>
                <p className="text-slate-400">{t('details.eduComparisonDesc')}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-300/90 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300">{t('details.eduCaveat')}: </strong>
                    <span>{t('details.eduCaveatDesc')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
