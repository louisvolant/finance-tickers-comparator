'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ChevronUp, ChevronDown, BarChart2, Edit2, Trash2, Sunrise, Moon } from 'lucide-react';
import { UserTicker } from '@/lib/types';
import { formatCurrency, formatPercent, formatMultiple, getExtendedSessionBadgeClass, getForwardPeBadgeClass, getCurrentPeBadgeClass } from '@/lib/utils';
import { useI18n } from '@/context/I18nContext';

interface TickerRowProps {
  ticker: UserTicker;
  index: number;
  totalCount: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onClick: (ticker: UserTicker) => void;
  onEdit: (ticker: UserTicker) => void;
  onDelete: (ticker: UserTicker) => void;
}

export function TickerRow({
  ticker,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onClick,
  onEdit,
  onDelete,
}: TickerRowProps) {
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
    <tr
      data-symbol={ticker.symbol}
      onClick={() => onClick(ticker)}
      className="group border-b border-slate-800/60 hover:bg-slate-900/60 transition cursor-pointer"
    >
      {/* Reorder handles */}
      <td className="py-1.5 px-2.5 w-12" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center justify-center gap-0">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
            title={t('details.moveUp')}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
            title={t('details.moveDown')}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>

      {/* Label (bold) followed by Ticker Symbol (regular, non-bold) & Exchange underneath */}
      <td className="py-1.5 px-3">
        <div className="flex items-center gap-1.5 truncate max-w-[220px]">
          <span className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition">
            {quote?.name || ticker.name}
          </span>
          <span className="text-xs text-slate-400 font-normal shrink-0">
            {ticker.symbol}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
            {quote?.exchange || 'Stock'}
          </span>
        </div>
      </td>

      {/* Live Market Price & Day Change */}
      <td className="py-1.5 px-3 text-right">
        <div className="text-sm font-bold text-white">
          {formatCurrency(currentPrice, quote?.currency)}
        </div>
        <div
          className={`flex items-center justify-end gap-1 text-[11px] font-semibold ${
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
      </td>

      {/* Tracking Value (Baseline / Cost Basis) */}
      <td className="py-1.5 px-3 text-right">
        {hasTracking ? (
          <>
            <div className="text-sm font-semibold text-slate-300">
              {formatCurrency(trackingVal!, quote?.currency)}
            </div>
            <span className="text-[10px] text-slate-500 block">{t('watchlist.baseline')}</span>
          </>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        )}
      </td>

      {/* % Diff vs Tracking Value */}
      <td className="py-1.5 px-3 text-center">
        {hasTracking ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black tracking-wide border ${
              isPositiveDiff
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {formatPercent(diffPercent)}
          </span>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        )}
      </td>

      {/* Current P/E (Trailing) — only shown when available */}
      <td className="py-1.5 px-3 text-center">
        {quote?.trailingPE ? (
          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold border font-mono transition ${getCurrentPeBadgeClass(quote.trailingPE)}`}>
            {formatMultiple(quote.trailingPE)}
          </span>
        ) : (
          <span className="text-xs text-slate-500 font-mono">—</span>
        )}
      </td>

      {/* Forward P/E with custom valuation color tiers */}
      <td className="py-1.5 px-3 text-center">
        {quote?.forwardPE ? (
          <span
            title={`Forward P/E: ${formatMultiple(quote.forwardPE)}`}
            className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold border font-mono transition ${getForwardPeBadgeClass(
              quote.forwardPE
            )}`}
          >
            {formatMultiple(quote.forwardPE)}
          </span>
        ) : (
          <span className="text-xs text-slate-500 font-mono">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-1.5 px-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onClick(ticker)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="View chart & statistics"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(ticker)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={t('details.editTracking')}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(ticker)}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title={t('details.deleteTicker')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
