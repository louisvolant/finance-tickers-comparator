'use client';

import React, { useMemo, useState } from 'react';
import { Bell, BellRing, Check, Loader2, X } from 'lucide-react';
import { UserTicker } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { normalizeCurrency } from '@/lib/currencies';
import { useI18n } from '@/context/I18nContext';

interface PriceAlertsSectionProps {
  /** Watchlist entry backing the page; null when the symbol is not tracked. */
  entry: UserTicker | null;
  isAuthenticated: boolean;
  symbol: string;
  /** Called with the server response after a successful save. */
  onSaved: (updated: UserTicker) => void;
}

type AthlSnapshotResponse = {
  ath: number;
  atl: number;
  currency: string;
  asOf: number;
  source: 'max' | '52w';
};

/**
 * Price alerts for the ticker page.
 *
 * Alerts are opt-in per ticker: nothing is enabled by the add-to-watchlist flow,
 * so each user has to open this page and press the button for that ticker.
 *
 * The first activation seeds both thresholds from a frozen ATH/ATL snapshot and
 * saves immediately, so doing nothing keeps exactly those values. They can then
 * be edited (which marks them as custom) or cleared one side at a time.
 */
export function PriceAlertsSection({
  entry,
  isAuthenticated,
  symbol,
  onSaved,
}: PriceAlertsSectionProps) {
  const { t, locale } = useI18n();

  const [high, setHigh] = useState('');
  const [low, setLow] = useState('');
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const listingCurrency = useMemo(
    () => normalizeCurrency(entry?.quote?.currency).code,
    [entry?.quote?.currency]
  );

  const hasAlerts =
    (typeof entry?.alertHigh === 'number' && entry.alertHigh > 0) ||
    (typeof entry?.alertLow === 'number' && entry.alertLow > 0);

  // Keep the inputs in sync with the stored values until the user starts typing.
  const [editing, setEditing] = useState(false);

  const snapshotDate = entry?.alertSetAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(entry.alertSetAt))
    : null;

  const highLabel =
    entry?.alertHighSource === 'ath' && snapshotDate
      ? t('alerts.athLabel', { date: snapshotDate })
      : t('alerts.highLabel');
  const lowLabel =
    entry?.alertLowSource === 'atl' && snapshotDate
      ? t('alerts.atlLabel', { date: snapshotDate })
      : t('alerts.lowLabel');

  const startEditing = () => {
    setHigh(
      entry?.alertHigh !== null && entry?.alertHigh !== undefined ? String(entry.alertHigh) : ''
    );
    setLow(entry?.alertLow !== null && entry?.alertLow !== undefined ? String(entry.alertLow) : '');
    setEditing(true);
    setError(null);
    setNotice(null);
  };

  const parseField = (raw: string): number | null => {
    if (!raw.trim()) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
  };

  const persist = async (
    nextHigh: number | null,
    nextLow: number | null,
    highSource: 'ath' | 'custom',
    lowSource: 'atl' | 'custom'
  ) => {
    if (!entry) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/tickers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: entry.id,
          alertHigh: nextHigh,
          alertLow: nextLow,
          // Pin the listing currency explicitly: the thresholds must not silently
          // follow the user's personal reference currency.
          alertCurrency: listingCurrency,
          alertHighSource: nextHigh === null ? undefined : highSource,
          alertLowSource: nextLow === null ? undefined : lowSource,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t('alerts.errorSave'));
      }

      onSaved(data.ticker as UserTicker);
      setEditing(false);
      setNotice(t('alerts.saved'));
    } catch (err: any) {
      setError(err?.message || t('alerts.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * First activation: capture the ATH/ATL snapshot, prefill both sides and save
   * it right away. The user does not have to touch anything to keep those
   * values; the fields stay editable afterwards.
   */
  const handleEnable = async () => {
    if (!entry) return;
    setLoadingSnapshot(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/tickers/athl?symbol=${encodeURIComponent(symbol)}`, {
        cache: 'no-store',
      });
      const snapshot = (await res.json().catch(() => null)) as AthlSnapshotResponse | null;

      if (!res.ok || !snapshot || typeof snapshot.ath !== 'number' || typeof snapshot.atl !== 'number') {
        throw new Error(t('alerts.errorSnapshot'));
      }

      setHigh(String(snapshot.ath));
      setLow(String(snapshot.atl));
      await persist(
        snapshot.ath,
        snapshot.atl,
        snapshot.source === 'max' ? 'ath' : 'custom',
        snapshot.source === 'max' ? 'atl' : 'custom'
      );
    } catch (err: any) {
      setError(err?.message || t('alerts.errorSnapshot'));
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;

    const parsedHigh = parseField(high);
    const parsedLow = parseField(low);

    if (Number.isNaN(parsedHigh) || Number.isNaN(parsedLow)) {
      setError(t('alerts.errorPositive'));
      return;
    }
    if (parsedHigh !== null && parsedLow !== null && parsedLow >= parsedHigh) {
      setError(t('alerts.errorOrder'));
      return;
    }

    if (parsedHigh === null && parsedLow === null) {
      await persist(null, null, 'custom', 'custom');
      return;
    }

    // Preserve the ATH/ATL provenance only when the value was left untouched.
    const highChanged = parsedHigh !== (entry.alertHigh ?? null);
    const lowChanged = parsedLow !== (entry.alertLow ?? null);
    await persist(
      parsedHigh,
      parsedLow,
      highChanged || !entry.alertHighSource ? 'custom' : entry.alertHighSource,
      lowChanged || !entry.alertLowSource ? 'custom' : entry.alertLowSource
    );
  };

  const handleDisable = async () => {
    await persist(null, null, 'custom', 'custom');
  };

  const disabledReason = !isAuthenticated
    ? t('alerts.signIn')
    : !entry
      ? t('alerts.addToWatchlist')
      : null;

  return (
    <section
      data-testid="price-alerts-panel"
      className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-4"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {hasAlerts ? (
            <BellRing className="w-4 h-4 text-emerald-400" />
          ) : (
            <Bell className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs font-semibold text-slate-200">{t('alerts.title')}</span>
          {hasAlerts && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {t('alerts.active')}
            </span>
          )}
        </div>

        {hasAlerts && !editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="edit-price-alerts"
              onClick={startEditing}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            >
              {t('alerts.edit')}
            </button>
            <button
              type="button"
              data-testid="disable-price-alerts"
              onClick={handleDisable}
              disabled={saving}
              className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 transition cursor-pointer disabled:opacity-50"
            >
              {t('alerts.disable')}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p data-testid="price-alerts-error" className="mt-2 text-[11px] text-rose-400">
          {error}
        </p>
      )}
      {notice && !error && (
        <p data-testid="price-alerts-notice" className="mt-2 text-[11px] text-emerald-400">
          {notice}
        </p>
      )}

      {disabledReason ? (
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-slate-400">{disabledReason}</p>
          {!isAuthenticated && (
            <a
              href="/"
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
            >
              {t('alerts.signInCta')}
            </a>
          )}
        </div>
      ) : !hasAlerts && !editing ? (
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-slate-400">{t('alerts.intro')}</p>
          <button
            type="button"
            data-testid="enable-price-alerts"
            onClick={handleEnable}
            disabled={loadingSnapshot || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold transition disabled:opacity-50 cursor-pointer"
          >
            {loadingSnapshot || saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span>{t('alerts.enable')}</span>
          </button>
        </div>
      ) : editing ? (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">{highLabel}</span>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-500 pointer-events-none">
                  {listingCurrency}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  data-testid="alert-high-input"
                  value={high}
                  onChange={(e) => setHigh(e.target.value)}
                  placeholder="—"
                  className="w-full pl-12 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">{lowLabel}</span>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-500 pointer-events-none">
                  {listingCurrency}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  data-testid="alert-low-input"
                  value={low}
                  onChange={(e) => setLow(e.target.value)}
                  placeholder="—"
                  className="w-full pl-12 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </label>
          </div>

          <p className="text-[10px] text-slate-500">{t('alerts.hint')}</p>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              data-testid="save-price-alerts"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{t('alerts.save')}</span>
            </button>
            <button
              type="button"
              data-testid="cancel-price-alerts"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('alerts.cancel')}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block">{highLabel}</span>
            <span className="font-semibold text-emerald-400 font-mono">
              {entry?.alertHigh !== null && entry?.alertHigh !== undefined
                ? formatCurrency(entry.alertHigh, listingCurrency)
                : '—'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">{lowLabel}</span>
            <span className="font-semibold text-rose-400 font-mono">
              {entry?.alertLow !== null && entry?.alertLow !== undefined
                ? formatCurrency(entry.alertLow, listingCurrency)
                : '—'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
