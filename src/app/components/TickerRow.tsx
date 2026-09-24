'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ChevronUp, ChevronDown, BarChart2, Edit2, Trash2 } from 'lucide-react';
import { UserTicker } from '@/lib/types';
import { formatCurrency, formatPercent, formatMultiple } from '@/lib/utils';

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
  const quote = ticker.quote;
  const currentPrice = quote?.price ?? 0;
  const trackingVal = ticker.trackingValue;
  const diffPercent = trackingVal > 0 ? ((currentPrice - trackingVal) / trackingVal) * 100 : 0;
  const isPositiveDiff = diffPercent >= 0;
  const isPositiveToday = (quote?.changePercent ?? 0) >= 0;

  return (
    <tr
      data-symbol={ticker.symbol}
      onClick={() => onClick(ticker)}
      className="group border-b border-slate-800/60 hover:bg-slate-900/60 transition cursor-pointer"
    >
      {/* Reorder handles */}
      <td className="py-3 px-3 w-14" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center justify-center gap-0.5">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>

      {/* Symbol & Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-white tracking-wide group-hover:text-emerald-400 transition">
            {ticker.symbol}
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/50">
            {quote?.exchange || 'Stock'}
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">{quote?.name || ticker.name}</p>
      </td>

      {/* Live Market Price & Day Change */}
      <td className="py-3 px-4 text-right">
        <div className="text-sm font-bold text-white">
          {formatCurrency(currentPrice, quote?.currency)}
        </div>
        <div
          className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold ${
            isPositiveToday ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isPositiveToday ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          <span>{formatPercent(quote?.changePercent)}</span>
        </div>
      </td>

      {/* Tracking Value (Baseline) */}
      <td className="py-3 px-4 text-right">
        <div className="text-sm font-semibold text-slate-300">
          {formatCurrency(trackingVal, quote?.currency)}
        </div>
        <span className="text-[10px] text-slate-500 block">Baseline target</span>
      </td>

      {/* % Diff vs Tracking Value */}
      <td className="py-3 px-4 text-center">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black tracking-wide border ${
            isPositiveDiff
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
          }`}
        >
          {formatPercent(diffPercent)}
        </span>
      </td>

      {/* Current P/E (Trailing) */}
      <td className="py-3 px-4 text-center">
        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-emerald-400 border border-slate-700/60 font-mono">
          {formatMultiple(quote?.trailingPE)}
        </span>
      </td>

      {/* Forward P/E */}
      <td className="py-3 px-4 text-center">
        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-cyan-400 border border-slate-700/60 font-mono">
          {formatMultiple(quote?.forwardPE)}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onClick(ticker)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="View chart & statistics"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(ticker)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Edit tracking target"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(ticker)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="Remove ticker"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
