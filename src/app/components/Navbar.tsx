'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { LogIn, LogOut, TrendingUp, Sparkles } from 'lucide-react';

interface NavbarProps {
  onAddTickerClick?: () => void;
  onRefreshClick?: () => void;
  refreshing?: boolean;
  onOpenSettings?: () => void;
}

export function Navbar({ onOpenSettings }: NavbarProps) {
  const { user, loading, openAuthModal, logout } = useAuth();
  const { t } = useI18n();

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
                {t('nav.livePE')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Auth State */}
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-800">
                  <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition cursor-pointer"
                    title={t('nav.settings')}
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:flex flex-col">
                      <span className="text-xs font-semibold text-slate-200 leading-none">
                        {user.username}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate max-w-[100px]">
                        {user.email}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={logout}
                    title={t('nav.signOut')}
                    aria-label="Sign Out"
                    data-testid="logout-button"
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
                  <span>{t('nav.signIn')}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
