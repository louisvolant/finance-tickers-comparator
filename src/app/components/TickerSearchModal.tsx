'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { TickerSearchResult } from '@/lib/types';
import { useI18n } from '@/context/I18nContext';

interface TickerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTicker: (payload: { symbol: string; name: string; trackingValue: number | null; notes?: string }) => Promise<void>;
  existingSymbols: string[];
}

export function TickerSearchModal({ isOpen, onClose, onAddTicker, existingSymbols }: TickerSearchModalProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tickers/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        setError('Failed to search tickers');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // 1-Click Direct Addition: adds ticker immediately with no forced tracking value
  const handleDirectAdd = async (ticker: TickerSearchResult) => {
    if (addingSymbol) return;
    setAddingSymbol(ticker.symbol);
    setError(null);

    try {
      await onAddTicker({
        symbol: ticker.symbol,
        name: ticker.name,
        trackingValue: null,
        notes: '',
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add ticker');
      setAddingSymbol(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setAddingSymbol(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{t('search.title')}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                1-Click Add
              </span>
            </h2>
            <p className="text-xs text-slate-400">{t('search.sub')}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
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

        {/* Search input */}
        <div className="flex flex-col flex-1 overflow-hidden mt-4">
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {loading && <Loader2 className="absolute right-3.5 top-3 w-4 h-4 text-emerald-400 animate-spin" />}
          </div>

          {/* Quick Suggestions */}
          {!query && (
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                {t('search.popular')}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { symbol: 'AAPL', name: 'Apple Inc.' },
                  { symbol: 'MSFT', name: 'Microsoft' },
                  { symbol: 'MC.PA', name: 'LVMH Paris' },
                  { symbol: 'AIR.PA', name: 'Airbus Paris' },
                  { symbol: 'CW8.PA', name: 'MSCI World ETF' },
                  { symbol: 'PUST.PA', name: 'PEA Nasdaq-100' },
                  { symbol: 'NVDA', name: 'NVIDIA' },
                ].map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => setQuery(item.symbol)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
                  >
                    <span className="font-semibold text-emerald-400 mr-1">{item.symbol}</span>
                    <span className="text-slate-400">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[360px]">
            {results.map((item) => {
              const isAlreadyAdded = existingSymbols.includes(item.symbol.toUpperCase());
              const isAddingThis = addingSymbol === item.symbol;
              return (
                <button
                  key={item.symbol}
                  disabled={isAlreadyAdded || !!addingSymbol}
                  onClick={() => handleDirectAdd(item)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                    isAlreadyAdded
                      ? 'opacity-50 border-slate-800/40 bg-slate-950 cursor-not-allowed'
                      : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 hover:border-emerald-500/50 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white tracking-wide">{item.symbol}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/50">
                        {item.exchange || item.quoteType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.name}</p>
                  </div>
                  {isAlreadyAdded ? (
                    <span className="text-[11px] text-slate-500 font-medium shrink-0">{t('search.alreadyTracked')}</span>
                  ) : isAddingThis ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs shrink-0">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('search.adding') || 'Adding...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold shrink-0 transition">
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('search.addDirect') || 'Ajouter'}</span>
                    </div>
                  )}
                </button>
              );
            })}

            {query && !loading && results.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                No matching tickers found for &quot;{query}&quot;.
              </div>
            )}
          </div>

          {/* Discreet hint at the bottom */}
          <div className="mt-3 pt-3 border-t border-slate-800/60 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{t('search.instantAddHint')}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
