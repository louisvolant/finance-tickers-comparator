'use client';

import React, { useMemo, useState } from 'react';
import { X, Loader2, ListPlus, Check, AlertCircle, Search, Plus } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import {
  BatchAddResult,
  MAX_BATCH_TICKERS,
  parseTickerSymbols,
} from '@/lib/batchTickers';

interface BatchAddTickersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTickers: (symbols: string[]) => Promise<BatchAddResult>;
  onOpenSearch: () => void;
  existingSymbols: string[];
}

/**
 * Paste-a-list counterpart to TickerSearchModal.
 *
 * Symbols are parsed live (commas, semicolons, spaces, new lines), already
 * tracked ones are shown as such and filtered out before submission, and the
 * per-symbol outcome is kept on screen so a bad symbol does not hide the rest.
 */
export function BatchAddTickersModal({
  isOpen,
  onClose,
  onAddTickers,
  onOpenSearch,
  existingSymbols,
}: BatchAddTickersModalProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BatchAddResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const symbols = useMemo(() => parseTickerSymbols(input), [input]);
  const existing = useMemo(
    () => new Set(existingSymbols.map((symbol) => symbol.toUpperCase())),
    [existingSymbols]
  );
  const newSymbols = useMemo(
    () => symbols.filter((symbol) => !existing.has(symbol)),
    [symbols, existing]
  );
  const tooMany = symbols.length > MAX_BATCH_TICKERS;

  if (!isOpen) return null;

  const reset = () => {
    setInput('');
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleOpenSearch = () => {
    reset();
    onOpenSearch();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || tooMany || newSymbols.length === 0) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await onAddTickers(newSymbols);
      setResult(response);
      setInput('');
    } catch (err: any) {
      setError(err?.message || t('batch.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-emerald-400" />
              <span>{t('batch.title')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('batch.sub')}</p>
          </div>
          <button
            onClick={handleClose}
            data-testid="batch-add-close"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label={t('batch.cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 overflow-y-auto pr-1">
          <textarea
            autoFocus
            rows={3}
            data-testid="batch-add-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setResult(null);
            }}
            placeholder={t('batch.placeholder')}
            className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono resize-none"
          />

          {symbols.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {symbols.map((symbol) => {
                const tracked = existing.has(symbol);
                return (
                  <span
                    key={symbol}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      tracked
                        ? 'bg-slate-800/60 text-slate-500 border-slate-700/60 line-through'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {symbol}
                  </span>
                );
              })}
            </div>
          )}

          {tooMany && (
            <p className="text-[11px] text-rose-400">
              {t('batch.tooMany', { count: MAX_BATCH_TICKERS })}
            </p>
          )}

          {!tooMany && symbols.length > 0 && newSymbols.length === 0 && (
            <p className="text-[11px] text-amber-400">{t('batch.noneNew')}</p>
          )}

          {!tooMany && symbols.length === 0 && input.trim().length > 0 && (
            <p className="text-[11px] text-amber-400">{t('batch.empty')}</p>
          )}

          <p className="text-[10px] text-slate-500">
            {t('batch.hint', { count: MAX_BATCH_TICKERS })}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="submit"
              data-testid="batch-add-submit"
              disabled={submitting || tooMany || newSymbols.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>
                {newSymbols.length === 1
                  ? t('batch.addOne')
                  : t('batch.add', { count: newSymbols.length })}
              </span>
            </button>

            <button
              type="button"
              data-testid="batch-open-search"
              onClick={handleOpenSearch}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t('batch.searchSingle')}</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer sm:ml-auto"
            >
              {t('batch.cancel')}
            </button>
          </div>

          {result && (
            <div
              data-testid="batch-add-results"
              className="mt-2 p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2"
            >
              <p className="text-[11px] font-semibold text-slate-300">
                {t('batch.summary', {
                  added: result.added.length,
                  skipped: result.skipped.length,
                  failed: result.failed.length,
                })}
              </p>

              {result.added.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                    {t('batch.added')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.added.map((ticker) => (
                      <span
                        key={ticker.symbol}
                        data-testid={`batch-added-${ticker.symbol}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      >
                        <Check className="w-3 h-3" />
                        {ticker.symbol}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.skipped.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    {t('batch.skipped')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.skipped.map((symbol) => (
                      <span
                        key={symbol}
                        data-testid={`batch-skipped-${symbol}`}
                        className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-rose-400 font-bold block mb-1">
                    {t('batch.failed')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.failed.map((symbol) => (
                      <span
                        key={symbol}
                        data-testid={`batch-failed-${symbol}`}
                        className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
