'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, FileText, Check, Loader2, Trash2 } from 'lucide-react';
import { UserTicker } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useI18n } from '@/context/I18nContext';

interface EditTrackingModalProps {
  ticker: UserTicker | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, trackingValue: number | null, notes?: string) => Promise<void>;
}

export function EditTrackingModal({ ticker, isOpen, onClose, onSave }: EditTrackingModalProps) {
  const { t } = useI18n();
  const [trackingValue, setTrackingValue] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticker) {
      setTrackingValue(ticker.trackingValue !== null && ticker.trackingValue !== undefined ? ticker.trackingValue.toString() : '');
      setNotes(ticker.notes || '');
      setError(null);
    }
  }, [ticker, isOpen]);

  if (!isOpen || !ticker) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let val: number | null = null;
    if (trackingValue.trim()) {
      const parsed = parseFloat(trackingValue);
      if (!isNaN(parsed) && parsed > 0) {
        val = parsed;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(ticker.id, val, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update tracking value');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearTracking = async () => {
    setTrackingValue('');
    setSubmitting(true);
    setError(null);
    try {
      await onSave(ticker.id, null, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update tracking value');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{t('editTracking.title')}</span>
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {ticker.symbol}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{ticker.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-semibold text-slate-300">
                {t('editTracking.label')}
              </label>
              {ticker.quote && (
                <button
                  type="button"
                  onClick={() => setTrackingValue(ticker.quote!.price.toString())}
                  className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                >
                  {formatCurrency(ticker.quote.price, ticker.quote.currency)}
                </button>
              )}
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="number"
                step="any"
                value={trackingValue}
                onChange={(e) => setTrackingValue(e.target.value)}
                placeholder={t('editTracking.placeholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {t('editTracking.hint')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t('editTracking.notesLabel')}</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('editTracking.notesPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {ticker.trackingValue !== null && ticker.trackingValue !== undefined && (
              <button
                type="button"
                onClick={handleClearTracking}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('editTracking.removeTarget')}</span>
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs sm:text-sm transition cursor-pointer"
            >
              {t('editTracking.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{t('editTracking.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
