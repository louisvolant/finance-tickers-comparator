import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, currency: string = 'USD'): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CHF: 'CHF ',
    JPY: '¥',
  };

  const symbol = currencySymbols[currency] || `${currency} `;
  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  if (currency === 'EUR') {
    return `${formattedNum} €`;
  }
  return `${symbol}${formattedNum}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatMultiple(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value) || value <= 0) return '—';
  return `${value.toFixed(1)}x`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}
