'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  convertCurrency,
  defaultPreferredCurrency,
  FALLBACK_CURRENCY,
  getCurrencySymbol,
  normalizeCurrency,
} from '@/lib/currencies';
import { getLocalRates, saveLocalRates } from '@/lib/indexedDb';

const PREFERRED_CURRENCY_KEY = 'tt_preferred_currency';
const RATES_TTL_MS = 24 * 60 * 60 * 1000;

interface CurrencyContextType {
  /** EUR-based rates: rates[CODE] = units per 1 EUR. Empty while loading. */
  rates: Record<string, number>;
  ratesReady: boolean;
  preferredCurrency: string;
  setPreferredCurrency: (code: string) => Promise<void>;
  convert: (
    amount: number,
    from?: string | null,
    to?: string | null
  ) => number | null;
  normalize: typeof normalizeCurrency;
  symbolFor: (code?: string | null) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();

  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesReady, setRatesReady] = useState(false);
  const [preferredCurrency, setPreferredCurrencyState] = useState<string>(() => {
    if (typeof window === 'undefined') return FALLBACK_CURRENCY;
    try {
      const saved = localStorage.getItem(PREFERRED_CURRENCY_KEY);
      if (saved) return saved;
    } catch {}
    return defaultPreferredCurrency();
  });

  // The persisted server preference wins as soon as the session user is known.
  useEffect(() => {
    if (user?.preferredCurrency) {
      setPreferredCurrencyState(user.preferredCurrency);
      try {
        localStorage.setItem(PREFERRED_CURRENCY_KEY, user.preferredCurrency);
      } catch {}
    }
  }, [user?.preferredCurrency]);

  // Persist a sensible default to the server once, for accounts created before
  // the currency preference existed.
  useEffect(() => {
    if (!user || user.preferredCurrency) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredCurrency }),
        });
        if (res.ok && !cancelled) await refreshUser();
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.preferredCurrency]);

  // Load EUR-based rates: IndexedDB cache first, then refresh from /api/rates.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const cached = await getLocalRates();
        if (mounted && cached?.rates && Object.keys(cached.rates).length > 0) {
          setRates(cached.rates);
          if (Date.now() - cached.fetchedAt < RATES_TTL_MS) {
            setRatesReady(true);
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch('/api/rates', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.rates && Object.keys(data.rates).length > 0) {
            if (mounted) setRates(data.rates);
            await saveLocalRates({
              base: 'EUR',
              rates: data.rates,
              fetchedAt: typeof data.fetchedAt === 'number' ? data.fetchedAt : Date.now(),
            });
          }
        }
      } catch {}

      if (mounted) setRatesReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setPreferredCurrency = useCallback(
    async (code: string) => {
      const normalized = normalizeCurrency(code).code;
      setPreferredCurrencyState(normalized);
      try {
        localStorage.setItem(PREFERRED_CURRENCY_KEY, normalized);
      } catch {}

      if (user) {
        try {
          const res = await fetch('/api/auth/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferredCurrency: normalized }),
          });
          if (res.ok) await refreshUser();
        } catch {}
      }
    },
    [user, refreshUser]
  );

  const convert = useCallback(
    (amount: number, from?: string | null, to?: string | null) =>
      convertCurrency(amount, from, to, rates),
    [rates]
  );

  const symbolFor = useCallback((code?: string | null) => getCurrencySymbol(code), []);

  return (
    <CurrencyContext.Provider
      value={{
        rates,
        ratesReady,
        preferredCurrency,
        setPreferredCurrency,
        convert,
        normalize: normalizeCurrency,
        symbolFor,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyRates(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencyRates must be used within a CurrencyProvider');
  }
  return context;
}
