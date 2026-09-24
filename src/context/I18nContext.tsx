'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppLocale, defaultLocale, isLocale } from '@/lib/i18n/config';
import { Messages, t as translate } from '@/lib/i18n/get-messages';

import en from '@/messages/en.json';
import fr from '@/messages/fr.json';
import de from '@/messages/de.json';
import es from '@/messages/es.json';
import it from '@/messages/it.json';
import pt from '@/messages/pt.json';

const dictionaries: Record<AppLocale, Messages> = {
  en,
  fr,
  de,
  es,
  it,
  pt,
};

interface I18nContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(defaultLocale);

  // Initialize from cookie / localStorage / navigator language
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tt_locale');
        if (isLocale(saved)) {
          setLocaleState(saved);
          return;
        }

        // Try cookie
        const match = document.cookie.match(/tt_locale=([a-z]{2})/);
        if (match && isLocale(match[1])) {
          setLocaleState(match[1]);
          return;
        }

        // Try browser language
        const browserLang = navigator.language.slice(0, 2);
        if (isLocale(browserLang)) {
          setLocaleState(browserLang);
        }
      } catch {}
    }
  }, []);

  const setLocale = useCallback((newLocale: AppLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tt_locale', newLocale);
        document.cookie = `tt_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
    }
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const activeDict = dictionaries[locale] || dictionaries[defaultLocale];
      const res = translate(activeDict, path, vars);
      // Fallback to English if translation is missing in chosen language
      if (res === path && locale !== defaultLocale) {
        return translate(dictionaries[defaultLocale], path, vars);
      }
      return res;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
