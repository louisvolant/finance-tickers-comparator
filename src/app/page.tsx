'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { I18nProvider, useI18n } from '@/context/I18nContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { TickerSearchModal } from './components/TickerSearchModal';
import { TickerDetailsModal } from './components/TickerDetailsModal';
import { EditTrackingModal } from './components/EditTrackingModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { Footer } from './components/Footer';
import { TickerRow } from './components/TickerRow';
import { TickerCard } from './components/TickerCard';
import { SortableTickerCard } from './components/SortableTickerCard';
import { DisplayModeSelector } from './components/DisplayModeSelector';
import { DisplayMode, groupTickersByExchange } from '@/lib/displayModes';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { triggerHapticFeedback } from '@/lib/haptic';
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
  RefreshCw,
  WifiOff,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowUpDown,
  Smartphone,
} from 'lucide-react';

function Dashboard() {
  const { user, openAuthModal } = useAuth();
  const { t } = useI18n();
  const [tickers, setTickers] = useState<UserTicker[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<UserTicker | null>(null);
  const [editingTicker, setEditingTicker] = useState<UserTicker | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('custom');

  // Load user's preferred display mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ticker_tracker_display_mode') as DisplayMode;
      if (saved === 'custom' || saved === 'alphabetical' || saved === 'by_exchange') {
        setDisplayMode(saved);
      }
    } catch {}
  }, []);

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('ticker_tracker_display_mode', mode);
    } catch {}
  };

  const displayedTickers = useMemo(() => {
    if (displayMode === 'alphabetical') {
      return [...tickers].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    return tickers;
  }, [tickers, displayMode]);

  const exchangeGroups = useMemo(() => {
    if (displayMode === 'by_exchange') {
      return groupTickersByExchange(tickers);
    }
    return [];
  }, [tickers, displayMode]);

  // Setup sensors with activation constraints:
  // - Desktop: pointer distance 8px before initiating drag
  // - Mobile: 250ms long press, 5px tolerance (keeps native vertical scrolling intact)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    triggerHapticFeedback();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = tickers.findIndex((t) => t.id === active.id);
      const newIndex = tickers.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(tickers, oldIndex, newIndex);
        setTickers(newOrder);

        const orderedIds = newOrder.map((t) => t.id);
        await reorderLocalTickers(orderedIds);

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
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeTicker = activeId ? tickers.find((t) => t.id === activeId) : null;

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

  const requestVersionRef = useRef(0);

  /**
   * 2. Background Revalidation: Fetch fresh quotes or server tickers
   */
  const refreshData = useCallback(async () => {
    const currentVersion = ++requestVersionRef.current;
    setRefreshing(true);
    try {
      if (user) {
        // Authenticated: fetch user tickers from server KV
        const res = await fetch('/api/tickers', { cache: 'no-store' });
        if (res.ok && currentVersion === requestVersionRef.current) {
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
          if (res.ok && currentVersion === requestVersionRef.current) {
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
      if (currentVersion === requestVersionRef.current) {
        setRefreshing(false);
      }
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
    trackingValue: number | null;
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
  const handleSaveTracking = async (id: string, trackingValue: number | null, notes?: string) => {
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
        onOpenSettings={() => setAccountModalOpen(true)}
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
                <span>{t('hero.badge')}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t('hero.title')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                {t('hero.sub')}
              </p>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {t('hero.cta')}
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
                  <span>{t('hero.googleCta')}</span>
                </a>
                <span className="text-[11px] text-slate-400">
                  {t('hero.guestHint')}
                </span>
              </div>

              {/* Zero-tracking reassurance inside guest banner */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-400">{t('hero.privacyBadge')} : </span>
                  <span className="text-slate-300">{t('hero.privacyText')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Title & Quick Search Bar */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{t('watchlist.title')}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                {t('watchlist.count', { count: tickers.length })}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {t('watchlist.hint')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('nav.searchPrompt')}</span>
            </button>
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">{t('nav.addTicker')}</span>
            </button>
            <DisplayModeSelector
              currentMode={displayMode}
              onModeChange={handleDisplayModeChange}
            />
            {/* Refresh Quotes: moved right next to the display mode selector */}
            <button
              onClick={refreshData}
              disabled={refreshing}
              title={t('nav.refreshTitle')}
              aria-label={t('nav.refreshTitle')}
              data-testid="refresh-quotes-button"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 hover:border-slate-700 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">{t('nav.refresh')}</span>
            </button>
          </div>
        </div>

        {/* Main Content: Desktop Table & Mobile Cards */}
        {tickers.length > 0 ? (
          <div>
            {displayMode === 'by_exchange' ? (
              /* Grouped by Trading Exchange (PARIS, NASDAQ, NYSE, etc.) */
              <div className="space-y-6">
                {exchangeGroups.map((group) => (
                  <div key={group.id} className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3.5 sm:p-4 shadow-lg">
                    {/* Exchange Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/70">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${group.badgeClass}`}>
                          {group.shortName}
                        </span>
                        <h3 className="text-sm font-bold text-white tracking-wide">{group.name}</h3>
                      </div>
                      <span className="text-xs text-slate-400 font-medium bg-slate-800/60 px-2.5 py-0.5 rounded-md border border-slate-700/40">
                        {t('display.exchangeCount', { count: group.tickers.length })}
                      </span>
                    </div>

                    {/* Desktop Table for this exchange */}
                    <div className="hidden md:block rounded-xl bg-slate-900/80 border border-slate-800/70 overflow-hidden shadow">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-14 text-center">
                              <ArrowUpDown className="w-3.5 h-3.5 mx-auto text-slate-500" />
                            </th>
                            <th className="py-2.5 px-4">{t('watchlist.colTicker')}</th>
                            <th className="py-2.5 px-4 text-right">{t('watchlist.colPrice')}</th>
                            <th className="py-2.5 px-4 text-right">{t('watchlist.colTracking')}</th>
                            <th className="py-2.5 px-4 text-center">{t('watchlist.colDiff')}</th>
                            <th className="py-2.5 px-4 text-center">{t('watchlist.colCurrentPE')}</th>
                            <th className="py-2.5 px-4 text-center">{t('watchlist.colForwardPE')}</th>
                            <th className="py-2.5 px-3 text-right">{t('watchlist.colActions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-sm">
                          {group.tickers.map((ticker, idx) => (
                            <TickerRow
                              key={ticker.id}
                              ticker={ticker}
                              index={idx}
                              totalCount={group.tickers.length}
                              onMoveUp={() => {}}
                              onMoveDown={() => {}}
                              onClick={(t) => setSelectedTicker(t)}
                              onEdit={(t) => setEditingTicker(t)}
                              onDelete={(t) => handleDeleteTicker(t)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards for this exchange */}
                    <div className="md:hidden space-y-2.5">
                      {group.tickers.map((ticker, idx) => (
                        <TickerCard
                          key={ticker.id}
                          ticker={ticker}
                          index={idx}
                          totalCount={group.tickers.length}
                          onMoveUp={() => {}}
                          onMoveDown={() => {}}
                          onClick={(t) => setSelectedTicker(t)}
                          onEdit={(t) => setEditingTicker(t)}
                          onDelete={(t) => handleDeleteTicker(t)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : displayMode === 'alphabetical' ? (
              /* Alphabetical A → Z View */
              <div>
                {/* Desktop Table View (>= 768px) */}
                <div className="hidden md:block rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3 w-14 text-center">
                          <ArrowUpDown className="w-3.5 h-3.5 mx-auto text-slate-500" />
                        </th>
                        <th className="py-3 px-4">{t('watchlist.colTicker')}</th>
                        <th className="py-3 px-4 text-right">{t('watchlist.colPrice')}</th>
                        <th className="py-3 px-4 text-right">{t('watchlist.colTracking')}</th>
                        <th className="py-3 px-4 text-center">{t('watchlist.colDiff')}</th>
                        <th className="py-3 px-4 text-center">{t('watchlist.colCurrentPE')}</th>
                        <th className="py-3 px-4 text-center">{t('watchlist.colForwardPE')}</th>
                        <th className="py-3 px-3 text-right">{t('watchlist.colActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-sm">
                      {displayedTickers.map((ticker, idx) => (
                        <TickerRow
                          key={ticker.id}
                          ticker={ticker}
                          index={idx}
                          totalCount={displayedTickers.length}
                          onMoveUp={() => {}}
                          onMoveDown={() => {}}
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
                  {displayedTickers.map((ticker, idx) => (
                    <TickerCard
                      key={ticker.id}
                      ticker={ticker}
                      index={idx}
                      totalCount={displayedTickers.length}
                      onMoveUp={() => {}}
                      onMoveDown={() => {}}
                      onClick={(t) => setSelectedTicker(t)}
                      onEdit={(t) => setEditingTicker(t)}
                      onDelete={(t) => handleDeleteTicker(t)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Custom / Manual Ordered View with Long-Press Drag & Drop */
              <div>
                {/* Desktop Table View (>= 768px) */}
                <div className="hidden md:block rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3 w-14 text-center">
                          <ArrowUpDown className="w-3.5 h-3.5 mx-auto text-slate-500" />
                        </th>
                        <th className="py-3 px-4">{t('watchlist.colTicker')}</th>
                        <th className="py-3 px-4 text-right">{t('watchlist.colPrice')}</th>
                        <th className="py-3 px-4 text-right">{t('watchlist.colTracking')}</th>
                        <th className="py-3 px-4 text-center">{t('watchlist.colDiff')}</th>
                        <th className="py-3 px-4 text-center">{t('watchlist.colCurrentPE')}</th>
                        <th className="py-3 px-4 text-center">{t('watchlist.colForwardPE')}</th>
                        <th className="py-3 px-3 text-right">{t('watchlist.colActions')}</th>
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

                {/* Mobile Cards View (< 768px) with Long-Press Drag & Drop */}
                <div className="md:hidden">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={tickers.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {tickers.map((ticker, idx) => (
                          <SortableTickerCard
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
                    </SortableContext>

                    {/* Elevated Drag Overlay on Long-Press Surimpression */}
                    <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                      {activeTicker ? (
                        <div className="scale-[1.03] shadow-2xl ring-2 ring-emerald-400 bg-slate-900 rounded-xl opacity-95 cursor-grabbing pointer-events-none transition-transform">
                          <TickerCard
                            ticker={activeTicker}
                            index={tickers.findIndex((t) => t.id === activeTicker.id)}
                            totalCount={tickers.length}
                            onMoveUp={() => {}}
                            onMoveDown={() => {}}
                            onClick={() => {}}
                            onEdit={() => {}}
                            onDelete={() => {}}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              </div>
            )}

            {/* Discreet Zero User Tracking Footnote at the bottom of the tickers list */}
            <div className="mt-4 rounded-xl bg-slate-900/40 border border-slate-800/80 p-3 flex items-center gap-2.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="leading-relaxed">
                <span className="font-semibold text-slate-300">{t('hero.privacyBadge')} : </span>
                {t('hero.privacyText')}
              </p>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">{t('watchlist.emptyTitle')}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              {t('watchlist.emptyBody')}
            </p>
            <button
              onClick={() => setSearchModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('watchlist.emptyAddBtn')}</span>
            </button>

            {/* Zero User Tracking Reassurance before adding first tickers */}
            <div className="mt-6 max-w-lg mx-auto rounded-xl bg-slate-900/80 border border-emerald-500/20 p-3.5 text-left flex items-start gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-400 block mb-0.5">{t('hero.privacyBadge')}</span>
                <p className="text-slate-400 leading-relaxed">{t('hero.privacyText')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <section className="mt-12 pt-8 border-t border-slate-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">{t('features.yahooTitle')}</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                {t('features.yahooDesc')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">{t('features.peTitle')}</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                {t('features.peDesc')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">{t('features.cacheTitle')}</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                {t('features.cacheDesc')}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">{t('features.kvTitle')}</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                {t('features.kvDesc')}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <AuthModal />
      <AccountSettingsModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
      />
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
        onMoveUp={
          selectedTicker
            ? () => {
                const idx = tickers.findIndex((t) => t.id === selectedTicker.id);
                if (idx > 0) handleMove(idx, 'up');
              }
            : undefined
        }
        onMoveDown={
          selectedTicker
            ? () => {
                const idx = tickers.findIndex((t) => t.id === selectedTicker.id);
                if (idx !== -1 && idx < tickers.length - 1) handleMove(idx, 'down');
              }
            : undefined
        }
        isFirst={selectedTicker ? tickers.findIndex((t) => t.id === selectedTicker.id) === 0 : true}
        isLast={
          selectedTicker
            ? tickers.findIndex((t) => t.id === selectedTicker.id) === tickers.length - 1
            : true
        }
      />
      <EditTrackingModal
        ticker={editingTicker}
        isOpen={!!editingTicker}
        onClose={() => setEditingTicker(null)}
        onSave={handleSaveTracking}
      />

      {/* Hidden iOS Safari Switch element for haptic Taptic Engine click */}
      <input
        id="ios-haptic-trigger"
        type="checkbox"
        // @ts-expect-error iOS Safari switch attribute
        switch=""
        style={{ position: 'fixed', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
        readOnly
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

