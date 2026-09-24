'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/70 py-8 mt-16 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Link href="/" className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-400 p-[1px]">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <span className="font-bold text-sm text-white tracking-tight">Ticker-Tracker</span>
            </Link>
            <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
              {t('app.disclaimer')}
            </p>
          </div>

          {/* Links & Language Switcher */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <nav className="flex flex-wrap items-center justify-center gap-4 text-xs" aria-label="Footer Navigation">
              <Link href="/" className="hover:text-white transition">
                {t('footer.home')}
              </Link>
              <Link href="/privacy" className="hover:text-white transition">
                {t('footer.privacy')}
              </Link>
              <Link href="/terms" className="hover:text-white transition">
                {t('footer.terms')}
              </Link>
              <a
                href="https://www.louisvolant.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400"
              >
                <span>{t('footer.personalPage')}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
              <a
                href="https://www.louisvolant.com/portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400"
              >
                <span>{t('footer.portfolio')}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </nav>

            <LanguageSwitcher />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>© {new Date().getFullYear()} Ticker-Tracker. Built with Next.js, Cloudflare Workers & Yahoo Finance.</span>
          <span>Fast, private & offline-first PWA.</span>
        </div>
      </div>
    </footer>
  );
}
