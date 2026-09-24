'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { UserTicker } from '@/lib/types';
import { formatCurrency, formatPercent, formatMultiple } from '@/lib/utils';

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
  const quote = ticker.quote;
  const currentPrice = quote?.price ?? 0;
  const trackingVal = ticker.trackingValue;
  const diffPercent = trackingVal > 0 ? ((currentPrice - trackingVal) / trackingVal) * 100 : 0;
  const isPositiveDiff = diffPercent >= 0;
  const isPositiveToday = (quote?.changePercent ?? 0) >= 0;

  return (
    <div
      data-symbol={ticker.symbol}
      onClick={() => onClick(ticker)}
      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md hover:border-slate-700 active:scale-[0.99] transition cursor-pointer select-none"
    >
      {/* Top Header: Symbol, Name, Reorder buttons */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-white tracking-wide">{ticker.symbol}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
              {quote?.exchange || 'Stock'}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">{quote?.name || ticker.name}</p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(ticker)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
            title="Edit tracking target"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(ticker)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition"
            title="Remove ticker"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle Section: Price, % Diff vs Tracking Value */}
      <div className="flex items-center justify-between mt-3">
        <div>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
            Current Price
          </span>
          <div className="text-xl font-black text-white">
            {formatCurrency(currentPrice, quote?.currency)}
          </div>
          <div
            className={`flex items-center gap-0.5 text-[11px] font-semibold mt-0.5 ${
              isPositiveToday ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositiveToday ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{formatPercent(quote?.changePercent)} today</span>
          </div>
        </div>

        {/* % Diff vs Tracking Value badge */}
        <div className="text-right">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-0.5">
            Target Diff
          </span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide border shadow-sm ${
              isPositiveDiff
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {formatPercent(diffPercent)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Target: <strong className="text-slate-300">{formatCurrency(trackingVal, quote?.currency)}</strong>
          </span>
        </div>
      </div>

      {/* Bottom Section: Current P/E and Forward P/E Highlight Boxes */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/60">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block">Current P/E</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              {formatMultiple(quote?.trailingPE)}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 font-medium">Trailing</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block">Forward P/E</span>
            <span className="text-sm font-black text-cyan-400 font-mono">
              {formatMultiple(quote?.forwardPE)}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 font-medium">Next FY</span>
        </div>
      </div>
    </div>
  );
}
