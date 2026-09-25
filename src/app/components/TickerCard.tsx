'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Sunrise, Moon } from 'lucide-react';
import { UserTicker } from '@/lib/types';
import { formatCurrency, formatPercent, formatMultiple, getExtendedSessionBadgeClass, getForwardPeBadgeClass } from '@/lib/utils';
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
  const isPositiveToday = (quote?.changePercent ?? 0) >= 0;

  // Extended session (Pre-market 🌅 / After-hours 🌙 / Futures)
  const hasExtended =
    quote?.extendedChangePercent !== null &&
    quote?.extendedChangePercent !== undefined;
  const isPreMarket = quote?.extendedType === 'pre';
  const extendedPercent = quote?.extendedChangePercent ?? 0;
  const extendedLabel = isPreMarket ? t('watchlist.preMarket') : t('watchlist.afterHours');

  return (
    <div
      data-symbol={ticker.symbol}
      onClick={() => onClick(ticker)}
      className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 active:scale-[0.99] transition cursor-pointer select-none flex items-center justify-between gap-3 shadow-sm"
    >
      {/* Left side: Label in bold on top, Current P/E pill, Forward P/E pill, and Ticker underneath (non-bold) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-bold text-sm sm:text-base text-white tracking-tight truncate max-w-[160px] sm:max-w-[260px]">
            {quote?.name || ticker.name}
          </span>

          {/* Current PE on the same line */}
          {quote?.trailingPE ? (
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              PE {formatMultiple(quote.trailingPE)}
            </span>
          ) : null}

          {/* Forward PE pill with customized valuation color tiers */}
          {quote?.forwardPE ? (
            <span
              title={`Forward P/E: ${formatMultiple(quote.forwardPE)}`}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono ${getForwardPeBadgeClass(
                quote.forwardPE
              )}`}
            >
              Fwd {formatMultiple(quote.forwardPE)}
            </span>
          ) : null}
        </div>

        {/* Ticker Symbol & Exchange underneath, non-bold */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate mt-0.5">
          <span className="text-xs text-slate-300 font-normal tracking-wide">{ticker.symbol}</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
            {quote?.exchange || 'Stock'}
          </span>
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

          {/* Extended session indicator with intensified red when below -0.20% */}
          {hasExtended && (
            <span
              title={`${extendedLabel}: ${formatPercent(extendedPercent)}`}
              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.2 rounded border ${getExtendedSessionBadgeClass(
                extendedPercent
              )}`}
            >
              {isPreMarket ? (
                <Sunrise className="w-2.5 h-2.5 shrink-0" />
              ) : (
                <Moon className="w-2.5 h-2.5 shrink-0" />
              )}
              <span>{formatPercent(extendedPercent)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
