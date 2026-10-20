'use client';

import React, { useMemo } from 'react';
import { Filter } from 'lucide-react';
import { getExchangeFilters, getExchangeInfo } from '@/lib/displayModes';
import { UserTicker } from '@/lib/types';
import { useI18n } from '@/context/I18nContext';

interface MarketFilterBarProps {
  tickers: UserTicker[];
  /** Selected exchange ids. An empty array means every market is shown. */
  selectedExchanges: string[];
  onChange: (exchangeIds: string[]) => void;
}

/**
 * Scrollable market filter chips displayed right below the search bar.
 * Chips are derived from the watchlist itself, so only markets the user
 * actually follows are offered, each with its ticker count.
 */
export function MarketFilterBar({
  tickers,
  selectedExchanges,
  onChange,
}: MarketFilterBarProps) {
  const { t } = useI18n();

  const { filters, counts } = useMemo(() => {
    const tickerCounts = new Map<string, number>();
    for (const ticker of tickers) {
      const { id } = getExchangeInfo(ticker);
      tickerCounts.set(id, (tickerCounts.get(id) ?? 0) + 1);
    }

    return {
      filters: getExchangeFilters(tickers),
      counts: tickerCounts,
    };
  }, [tickers]);

  // Nothing to filter when the watchlist is empty.
  if (tickers.length === 0) return null;

  const allSelected = selectedExchanges.length === 0;

  const toggleExchange = (exchangeId: string) => {
    if (selectedExchanges.includes(exchangeId)) {
      onChange(selectedExchanges.filter((id) => id !== exchangeId));
    } else {
      onChange([...selectedExchanges, exchangeId]);
    }
  };

  const baseChipClass =
    'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer active:scale-[0.98]';

  return (
    <div
      role="group"
      aria-label={t('watchlist.filterLabel')}
      data-testid="market-filter-bar"
      className="flex items-center gap-2 mb-4 overflow-x-auto pb-0.5"
    >
      <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Filter className="w-3 h-3" />
        <span>{t('watchlist.filterLabel')}</span>
      </span>

      {/* "All markets" resets the selection. */}
      <button
        type="button"
        onClick={() => onChange([])}
        aria-pressed={allSelected}
        data-testid="market-filter-all"
        className={`${baseChipClass} ${
          allSelected
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-700'
        }`}
      >
        <span>{t('watchlist.filterAll')}</span>
        <span className="font-mono text-[10px] opacity-70">{tickers.length}</span>
      </button>

      {filters.map((exchange) => {
        const isSelected = selectedExchanges.includes(exchange.id);
        return (
          <button
            key={exchange.id}
            type="button"
            onClick={() => toggleExchange(exchange.id)}
            aria-pressed={isSelected}
            title={exchange.name}
            data-testid={`market-filter-${exchange.id}`}
            className={`${baseChipClass} ${
              isSelected
                ? exchange.badgeClass
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>{exchange.shortName}</span>
            <span className="font-mono text-[10px] opacity-70">{counts.get(exchange.id) ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
