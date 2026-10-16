'use client';

import React, { useEffect, useState } from 'react';
import { TickerQuote } from '@/lib/types';
import { useI18n } from '@/context/I18nContext';
import { describeOpeningDay, formatExchangeTime, getMarketStatus } from '@/lib/marketStatus';

const REFRESH_MS = 30_000;

const TONE = {
  open: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  opens_soon: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  muted: 'text-slate-400 bg-slate-800/60 border-slate-700/50',
} as const;

/**
 * Open / just closed / opening soon / closed badge for a venue. Derived from
 * the sessions shipped with the quote, so the clock is the only thing that
 * changes between refreshes: no extra network call is made.
 */
export function MarketStatusBadge({
  quote,
  className = '',
}: {
  quote: TickerQuote | null | undefined;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const timezone = quote?.exchangeTimezone;
  if (now === null || !timezone || !quote?.marketSessions || quote.quoteType === 'FUTURE') {
    return null;
  }

  const status = getMarketStatus(quote.marketSessions, now);
  if (!status) return null;

  let text: string;
  let tone: string;

  if (status.kind === 'open') {
    text = t('marketStatus.open', { time: formatExchangeTime(status.at, timezone, locale) });
    tone = TONE.open;
  } else if (status.kind === 'just_closed') {
    text = t('marketStatus.justClosed', { min: status.minutes });
    tone = TONE.muted;
  } else if (status.kind === 'opens_soon') {
    text = t('marketStatus.opensSoon', { min: status.minutes });
    tone = TONE.opens_soon;
  } else {
    const time = formatExchangeTime(status.at, timezone, locale);
    const day = describeOpeningDay(status.at, timezone, now, locale);
    if (day.kind === 'today') text = t('marketStatus.opensToday', { time });
    else if (day.kind === 'tomorrow') text = t('marketStatus.opensTomorrow', { time });
    else text = t('marketStatus.opensOn', { day: day.name, time });
    tone = TONE.muted;
  }

  return (
    <span
      data-testid="market-status"
      data-state={status.kind}
      title={t('marketStatus.tooltip', { zone: timezone })}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${tone} ${className}`}
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{text}</span>
    </span>
  );
}
