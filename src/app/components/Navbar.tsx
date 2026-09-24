'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Plus, RefreshCw, LogIn, LogOut, TrendingUp, Sparkles } from 'lucide-react';

interface NavbarProps {
  onAddTickerClick: () => void;
  onRefreshClick: () => void;
  refreshing: boolean;
}

export function Navbar({ onAddTickerClick, onRefreshClick, refreshing }: NavbarProps) {
  const { user, loading, openAuthModal, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-[1.5px] shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Ticker-Tracker
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                Live PE
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh Quotes */}
          <button
            onClick={onRefreshClick}
            disabled={refreshing}
            title="Refresh Quotes"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 hover:border-slate-700 transition flex items-center gap-2 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Add Ticker Button */}
          <button
            onClick={onAddTickerClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Ticker</span>
          </button>

          {/* Auth State */}
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-800">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-medium text-slate-200 leading-none">
                      {user.username}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate max-w-[120px]">
                      {user.email}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    title="Log Out"
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-850 hover:border-slate-700 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-medium text-xs sm:text-sm transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Sign In</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
