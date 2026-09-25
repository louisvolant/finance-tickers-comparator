'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Sunrise, Moon } from 'lucide-react';
import { UserTicker } from '@/lib/types';
import { formatCurrency, formatPercent, formatMultiple } from '@/lib/utils';
import { useI18n } from '@/context/I18nContext';

interface TickerCardProps {
  ticker: UserTicker;
  index: number;
  totalCount: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onClick: (ticker: UserTicker) => void;
  onEdit: (ticker: UserTicker) => void;
  onDelete: (ticker: UserTicker) => void;
}

export function TickerCard({
  ticker,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onClick,
  onEdit,
  onDelete,
}: TickerCardProps) {
  const { t } = useI18n();
  const quote = ticker.quote;
  const currentPrice = quote?.price ?? 0;
  const trackingVal = ticker.trackingValue;
  const hasTracking = trackingVal !== null && trackingVal !== undefined && trackingVal > 0;
  const diffPercent = hasTracking ? ((currentPrice - trackingVal!) / trackingVal!) * 100 : 0;
  const isPositiveDiff = diffPercent >= 0;
  const isPositiveToday = (quote?.changePercent ?? 0) >= 0;

  // Extended session (Pre-market 🌅 / After-hours 🌙 / Futures)
  const hasExtended =
    quote?.extendedChangePercent !== null &&
    quote?.extendedChangePercent !== undefined;
  const isPreMarket = quote?.extendedType === 'pre';
  const extendedPercent = quote?.extendedChangePercent ?? 0;
  const isPositiveExtended = extendedPercent >= 0;
  const extendedLabel = isPreMarket ? t('watchlist.preMarket') : t('watchlist.afterHours');

  return (
    <div
      data-symbol={ticker.symbol}
      onClick={() => onClick(ticker)}
      className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 active:scale-[0.99] transition cursor-pointer select-none flex items-center justify-between gap-3 shadow-sm"
    >
      {/* Left side: Symbol, Current P/E pill, Name & optional Target Diff */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-base text-white tracking-wide">{ticker.symbol}</span>

          {/* Current PE on the same line */}
          {quote?.trailingPE ? (
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PE {formatMultiple(quote.trailingPE)}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/50">
              {quote?.exchange || 'Stock'}
            </span>
          )}

          {/* Target % diff badge if set */}
          {hasTracking && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                isPositiveDiff
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {formatPercent(diffPercent)}
            </span>
          )}
        </div>

        {/* Company Name & optional ref target */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate mt-0.5">
          <span className="truncate max-w-[180px] sm:max-w-[280px]">{quote?.name || ticker.name}</span>
          {hasTracking && (
            <span className="text-[10px] text-slate-500 shrink-0">
              ({t('watchlist.baseline')}: {formatCurrency(trackingVal!, quote?.currency)})
            </span>
          )}
        </div>
      </div>

      {/* Right side: Current price at the top and evolution (green/red) just beneath */}
      <div className="text-right shrink-0">
        <div className="text-base font-black text-white leading-tight">
          {formatCurrency(currentPrice, quote?.currency)}
        </div>
        <div
          className={`flex items-center justify-end gap-1 text-xs font-semibold leading-tight mt-0.5 ${
            isPositiveToday ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          <span className="flex items-center gap-0.5">
            {isPositiveToday ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{formatPercent(quote?.changePercent)}</span>
          </span>

          {/* Extended session indicator: (🌅 +0.03%) or (🌙 -0.12%) */}
          {hasExtended && (
            <span
              title={`${extendedLabel}: ${formatPercent(extendedPercent)}`}
              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.2 rounded border ${
                isPositiveExtended
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              }`}
            >
              {isPreMarket ? (
                <Sunrise className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-2.5 h-2.5 text-indigo-300 shrink-0" />
              )}
              <span>{formatPercent(extendedPercent)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
