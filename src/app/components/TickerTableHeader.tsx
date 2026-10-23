'use client';

import React from 'react';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { SortColumn, SortDirection } from '@/lib/tickerSorting';

interface TickerTableHeaderProps {
  sortColumn: SortColumn | null;
  sortDirection: SortDirection | null;
  onSort: (col: SortColumn) => void;
  compact?: boolean;
}

interface SortableHeaderCellProps {
  column: SortColumn;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortColumn: SortColumn | null;
  sortDirection: SortDirection | null;
  onSort: (col: SortColumn) => void;
  compact?: boolean;
}

function SortableHeaderCell({
  column,
  label,
  align = 'left',
  sortColumn,
  sortDirection,
  onSort,
  compact = false,
}: SortableHeaderCellProps) {
  const isActive = sortColumn === column;
  const paddingClass = compact ? 'py-2.5 px-4' : 'py-3 px-4';
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const flexAlignClass =
    align === 'right'
      ? 'justify-end'
      : align === 'center'
      ? 'justify-center'
      : 'justify-start';

  return (
    <th
      scope="col"
      onClick={() => onSort(column)}
      aria-sort={
        isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      data-testid={`th-sort-${column}`}
      className={`${paddingClass} ${alignClass} cursor-pointer select-none transition-colors group ${
        isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
      }`}
    >
      <div className={`inline-flex items-center gap-1.5 ${flexAlignClass}`}>
        <span>{label}</span>
        {isActive &&
          (sortDirection === 'desc' ? (
            <ArrowDown
              className="w-3.5 h-3.5 text-emerald-400 shrink-0"
              data-testid={`sort-arrow-desc-${column}`}
            />
          ) : (
            <ArrowUp
              className="w-3.5 h-3.5 text-emerald-400 shrink-0"
              data-testid={`sort-arrow-asc-${column}`}
            />
          ))}
      </div>
    </th>
  );
}

export function TickerTableHeader({
  sortColumn,
  sortDirection,
  onSort,
  compact = false,
}: TickerTableHeaderProps) {
  const { t } = useI18n();
  const iconPadding = compact ? 'py-2.5 px-3' : 'py-3 px-3';
  const actionPadding = compact ? 'py-2.5 px-3' : 'py-3 px-3';

  return (
    <thead>
      <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold uppercase tracking-wider">
        <th className={`${iconPadding} w-14 text-center`}>
          <ArrowUpDown className="w-3.5 h-3.5 mx-auto text-slate-500" />
        </th>
        <SortableHeaderCell
          column="ticker"
          label={t('watchlist.colTicker')}
          align="left"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          compact={compact}
        />
        <SortableHeaderCell
          column="price"
          label={t('watchlist.colPrice')}
          align="right"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          compact={compact}
        />
        <SortableHeaderCell
          column="tracking"
          label={t('watchlist.colTracking')}
          align="right"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          compact={compact}
        />
        <SortableHeaderCell
          column="diff"
          label={t('watchlist.colDiff')}
          align="center"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          compact={compact}
        />
        <SortableHeaderCell
          column="currentPE"
          label={t('watchlist.colCurrentPE')}
          align="center"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          compact={compact}
        />
        <SortableHeaderCell
          column="forwardPE"
          label={t('watchlist.colForwardPE')}
          align="center"
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          compact={compact}
        />
        <th className={`${actionPadding} text-right text-slate-400`}>
          {t('watchlist.colActions')}
        </th>
      </tr>
    </thead>
  );
}
