'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { TickerSearchModal } from './components/TickerSearchModal';
import { TickerDetailsModal } from './components/TickerDetailsModal';
import { EditTrackingModal } from './components/EditTrackingModal';
import { TickerRow } from './components/TickerRow';
import { TickerCard } from './components/TickerCard';
import {
  getLocalTickers,
  saveLocalTickers,
  getLocalQuotes,
  saveLocalQuotes,
  reorderLocalTickers,
  DEFAULT_TICKERS,
} from '@/lib/indexedDb';
import { UserTicker, TickerQuote } from '@/lib/types';
import {
  TrendingUp,
  Search,
  Plus,
  WifiOff,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowUpDown,
  Smartphone,
} from 'lucide-react';

function Dashboard() {
  const { user, openAuthModal } = useAuth();
  const [tickers, setTickers] = useState<UserTicker[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<UserTicker | null>(null);
  const [editingTicker, setEditingTicker] = useState<UserTicker | null>(null);

  // Online / offline detector
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Keyboard shortcut (⌘K or Ctrl+K to open search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * 1. Instant Startup: Load cached tickers & quotes from IndexedDB first
   */
  useEffect(() => {
    let isMounted = true;

    async function loadInstantCache() {
      try {
        const [cachedTickers, cachedQuotes] = await Promise.all([
          getLocalTickers(),
          getLocalQuotes(),
        ]);

        if (isMounted && cachedTickers && cachedTickers.length > 0) {
          const merged = cachedTickers.map((t) => ({
            ...t,
            quote: cachedQuotes[t.symbol.toUpperCase()] || t.quote || null,
          }));
          setTickers(merged);
        }
      } catch (err) {
        console.debug('Cache prime skipped:', err);
      }
    }

    loadInstantCache();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * 2. Background Revalidation: Fetch fresh quotes or server tickers
   */
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user) {
        // Authenticated: fetch user tickers from server KV
        const res = await fetch('/api/tickers', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tickers)) {
            setTickers(data.tickers);
            await saveLocalTickers(data.tickers);

            // Cache quotes map in IndexedDB
            const quotesMap: Record<string, TickerQuote> = {};
            data.tickers.forEach((t: UserTicker) => {
              if (t.quote) quotesMap[t.symbol.toUpperCase()] = t.quote;
            });
            await saveLocalQuotes(quotesMap);
          }
        }
      } else {
        // Guest mode: fetch quotes for current local tickers
        const currentTickers = await getLocalTickers();
        const symbols = currentTickers.map((t) => t.symbol).join(',');
        if (symbols) {
          const res = await fetch(`/api/tickers/quote?symbols=${encodeURIComponent(symbols)}`);
          if (res.ok) {
            const data = await res.json();
            const quotes: Record<string, TickerQuote> = data.quotes || {};
            await saveLocalQuotes(quotes);

            const updated = currentTickers.map((t) => ({
              ...t,
              quote: quotes[t.symbol.toUpperCase()] || t.quote || null,
            }));
            setTickers(updated);
            await saveLocalTickers(updated);
          }
        }
      }
    } catch (err) {
      console.debug('Background refresh skipped or offline:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  /**
   * Reorder Handlers
   */
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tickers.length) return;

    const newOrder = [...tickers];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setTickers(newOrder);

    // Update IndexedDB
    const orderedIds = newOrder.map((t) => t.id);
    await reorderLocalTickers(orderedIds);

    // If logged in, persist to server KV
    if (user) {
      try {
        await fetch('/api/tickers/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds }),
        });
      } catch (err) {
        console.error('Failed to sync reorder to server:', err);
      }
    }
  };

  /**
   * Add Ticker Handler
   */
  const handleAddTicker = async (payload: {
    symbol: string;
    name: string;
    trackingValue: number;
    notes?: string;
  }) => {
    if (user) {
      const res = await fetch('/api/tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add ticker');
      }

      const updated = [...tickers, data.ticker];
      setTickers(updated);
      await saveLocalTickers(updated);
      if (data.ticker.quote) {
        await saveLocalQuotes({ [data.ticker.symbol.toUpperCase()]: data.ticker.quote });
      }
    } else {
      // Guest mode: fetch quote and save locally in IndexedDB
      let quote: TickerQuote | null = null;
      try {
        const qRes = await fetch(`/api/tickers/quote?symbol=${encodeURIComponent(payload.symbol)}`);
        if (qRes.ok) {
          const qData = await qRes.json();
          quote = qData.quotes?.[payload.symbol.toUpperCase()] || null;
        }
      } catch {}

      const newTicker: UserTicker = {
        id: 'local_' + crypto.randomUUID().replace(/-/g, ''),
        symbol: payload.symbol.toUpperCase(),
        name: payload.name,
        trackingValue: payload.trackingValue,
        notes: payload.notes,
        order: tickers.length,
        createdAt: Date.now(),
        quote,
      };

      const updated = [...tickers, newTicker];
      setTickers(updated);
      await saveLocalTickers(updated);
      if (quote) {
        await saveLocalQuotes({ [payload.symbol.toUpperCase()]: quote });
      }
    }
  };

  /**
   * Edit Tracking Value Handler
   */
  const handleSaveTracking = async (id: string, trackingValue: number, notes?: string) => {
    const updated = tickers.map((t) => (t.id === id ? { ...t, trackingValue, notes } : t));
    setTickers(updated);
    await saveLocalTickers(updated);

    if (user) {
      await fetch('/api/tickers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, trackingValue, notes }),
      });
    }
  };

  /**
   * Delete Ticker Handler
   */
  const handleDeleteTicker = async (ticker: UserTicker) => {
    const confirmDelete = window.confirm(`Remove ${ticker.symbol} from your watchlist?`);
    if (!confirmDelete) return;

    const updated = tickers.filter((t) => t.id !== ticker.id);
    setTickers(updated);
    await saveLocalTickers(updated);

    if (selectedTicker?.id === ticker.id) {
      setSelectedTicker(null);
    }

    if (user) {
      await fetch(`/api/tickers?id=${encodeURIComponent(ticker.id)}`, {
        method: 'DELETE',
      });
    }
  };

  const existingSymbols = tickers.map((t) => t.symbol.toUpperCase());

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar
        onAddTickerClick={() => setSearchModalOpen(true)}
        onRefreshClick={refreshData}
        refreshing={refreshing}
      />

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-400 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. Showing cached tickers and quotes from local IndexedDB.</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Guest Banner if not logged in */}
        {!user && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                <Sparkles className="w-3 h-3" />
                <span>Instant Valuation & Multiples Tracking</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Track Stocks, Multiples & Purchase Variance
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                Compare current market prices against your personal tracking target. Monitor{' '}
                <strong className="text-emerald-400 font-semibold">Current P/E</strong> and{' '}
                <strong className="text-cyan-400 font-semibold">Forward P/E</strong> with zero-latency
                offline mobile access.
              </p>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Create Free Account
                </button>
                <a
                  href="/api/auth/google"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-medium text-xs sm:text-sm border border-slate-700 transition flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google Login</span>
                </a>
                <span className="text-[11px] text-slate-400">
                  Or test right away in Guest Mode below!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Title & Quick Search Bar */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>My Watchlist</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                {tickers.length} tickers
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Drag or use arrows to reorder. Tap any ticker to view charts and statistics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search stocks (⌘K)</span>
            </button>
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Ticker</span>
            </button>
          </div>
        </div>

        {/* Main Content: Desktop Table & Mobile Cards */}
        {tickers.length > 0 ? (
          <div>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 w-14 text-center">
                      <ArrowUpDown className="w-3.5 h-3.5 mx-auto text-slate-500" />
                    </th>
                    <th className="py-3 px-4">Ticker & Name</th>
                    <th className="py-3 px-4 text-right">Current Price</th>
                    <th className="py-3 px-4 text-right">Tracking Value</th>
                    <th className="py-3 px-4 text-center">% Diff</th>
                    <th className="py-3 px-4 text-center">Current P/E</th>
                    <th className="py-3 px-4 text-center">Forward P/E</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {tickers.map((ticker, idx) => (
                    <TickerRow
                      key={ticker.id}
                      ticker={ticker}
                      index={idx}
                      totalCount={tickers.length}
                      onMoveUp={() => handleMove(idx, 'up')}
                      onMoveDown={() => handleMove(idx, 'down')}
                      onClick={(t) => setSelectedTicker(t)}
                      onEdit={(t) => setEditingTicker(t)}
                      onDelete={(t) => handleDeleteTicker(t)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="md:hidden space-y-3">
              {tickers.map((ticker, idx) => (
                <TickerCard
                  key={ticker.id}
                  ticker={ticker}
                  index={idx}
                  totalCount={tickers.length}
                  onMoveUp={() => handleMove(idx, 'up')}
                  onMoveDown={() => handleMove(idx, 'down')}
                  onClick={(t) => setSelectedTicker(t)}
                  onEdit={(t) => setEditingTicker(t)}
                  onDelete={(t) => handleDeleteTicker(t)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">No Tickers in Your Watchlist</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Add your first stock or ETF to start tracking current prices, valuation multiples, and target
              percentage variances.
            </p>
            <button
              onClick={() => setSearchModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock Ticker</span>
            </button>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <section className="mt-12 pt-8 border-t border-slate-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Yahoo Finance Engine</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Broad coverage across US equities, European markets (MC.PA, AIR.PA), and UCITS ETFs (CW8.PA).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">P/E & Forward P/E</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Easily evaluate valuation multiples to spot value opportunities and growth expansions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Instant IndexedDB Cache</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Launch the app on your phone and immediately see your tickers without waiting for network calls.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Cloudflare Workers KV</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Global edge architecture with serverless KV storage, secure sessions, and rate-limit shields.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950/60 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Ticker-Tracker</span>
            <span>—</span>
            <span>Real-time stock valuation & multiple tracking</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Market data provided via Yahoo Finance. Quotes may be delayed up to 15 min.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal />
      <TickerSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onAddTicker={handleAddTicker}
        existingSymbols={existingSymbols}
      />
      <TickerDetailsModal
        ticker={selectedTicker}
        isOpen={!!selectedTicker}
        onClose={() => setSelectedTicker(null)}
        onEditTracking={(t) => {
          setSelectedTicker(null);
          setEditingTicker(t);
        }}
        onDeleteTicker={(t) => {
          setSelectedTicker(null);
          handleDeleteTicker(t);
        }}
      />
      <EditTrackingModal
        ticker={editingTicker}
        isOpen={!!editingTicker}
        onClose={() => setEditingTicker(null)}
        onSave={handleSaveTracking}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
