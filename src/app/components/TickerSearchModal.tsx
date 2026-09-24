'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, ArrowRight, Check, AlertCircle, DollarSign } from 'lucide-react';
import { TickerSearchResult, TickerQuote } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface TickerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTicker: (payload: { symbol: string; name: string; trackingValue: number; notes?: string }) => Promise<void>;
  existingSymbols: string[];
}

export function TickerSearchModal({ isOpen, onClose, onAddTicker, existingSymbols }: TickerSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<TickerSearchResult | null>(null);
  const [previewQuote, setPreviewQuote] = useState<TickerQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [trackingValue, setTrackingValue] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  // When a ticker is selected, fetch its current quote to prefill tracking value
  const handleSelectTicker = async (ticker: TickerSearchResult) => {
    setSelectedTicker(ticker);
    setLoadingQuote(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickers/quote?symbol=${encodeURIComponent(ticker.symbol)}`);
      if (res.ok) {
        const data = await res.json();
        const quote = data.quotes?.[ticker.symbol.toUpperCase()];
        if (quote) {
          setPreviewQuote(quote);
          setTrackingValue(quote.price.toString());
        }
      }
    } catch {
      // Non-blocking preview fetch failure
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleConfirmAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicker) return;

    const val = parseFloat(trackingValue);
    if (isNaN(val) || val <= 0) {
      setError('Please provide a valid tracking value greater than 0');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAddTicker({
        symbol: selectedTicker.symbol,
        name: selectedTicker.name,
        trackingValue: val,
        notes: notes.trim(),
      });
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add ticker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSelectedTicker(null);
    setPreviewQuote(null);
    setTrackingValue('');
    setNotes('');
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
            <h2 className="text-lg font-bold text-white">Add Stock Ticker</h2>
            <p className="text-xs text-slate-400">Search US stocks, European equities, and ETFs</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
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

        {!selectedTicker ? (
          /* Step 1: Search and select */
          <div className="flex flex-col flex-1 overflow-hidden mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search symbol or name (e.g. AAPL, MC.PA, CW8)..."
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
                  Popular Suggestions
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { symbol: 'AAPL', name: 'Apple Inc.' },
                    { symbol: 'MSFT', name: 'Microsoft' },
                    { symbol: 'MC.PA', name: 'LVMH Paris' },
                    { symbol: 'AIR.PA', name: 'Airbus Paris' },
                    { symbol: 'CW8.PA', name: 'MSCI World ETF' },
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
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[340px]">
              {results.map((item) => {
                const isAlreadyAdded = existingSymbols.includes(item.symbol.toUpperCase());
                return (
                  <button
                    key={item.symbol}
                    disabled={isAlreadyAdded}
                    onClick={() => handleSelectTicker(item)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      isAlreadyAdded
                        ? 'opacity-50 border-slate-800/40 bg-slate-950 cursor-not-allowed'
                        : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 cursor-pointer'
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
                      <span className="text-[11px] text-slate-500 font-medium shrink-0">Already tracked</span>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
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
          </div>
        ) : (
          /* Step 2: Configure tracking value */
          <form onSubmit={handleConfirmAdd} className="mt-4 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white">{selectedTicker.symbol}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedTicker.exchange}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{selectedTicker.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTicker(null);
                  setPreviewQuote(null);
                }}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Current market price preview */}
            {loadingQuote ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Fetching live market price...</span>
              </div>
            ) : previewQuote ? (
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Price</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(previewQuote.price, previewQuote.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Current P/E</span>
                  <span className="font-semibold text-emerald-400">
                    {previewQuote.trailingPE ? `${previewQuote.trailingPE}x` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Forward P/E</span>
                  <span className="font-semibold text-cyan-400">
                    {previewQuote.forwardPE ? `${previewQuote.forwardPE}x` : '—'}
                  </span>
                </div>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tracking Value (Baseline / Cost Basis / Target Buy Price)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 150.00"
                  value={trackingValue}
                  onChange={(e) => setTrackingValue(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                The % difference shown on your dashboard will be computed against this baseline value.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Bought on dip, long term DCA"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTicker(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs sm:text-sm transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Add to Watchlist</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
