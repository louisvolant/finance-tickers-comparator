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

/**
 * Return tailored color classes for extended session (pre-market / after-hours / futures).
 * When below -0.20%, reddens more intensely as requested.
 */
export function getExtendedSessionBadgeClass(percent: number | null | undefined): string {
  if (percent === null || percent === undefined || isNaN(percent)) {
    return 'text-slate-400 bg-slate-800/60 border-slate-700/60';
  }
  if (percent >= 0) {
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }
  // Moderate dip between 0% and -0.20%: amber warning
  if (percent >= -0.20) {
    return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
  }
  // Reddened noticeably when below -0.20%
  if (percent >= -0.75) {
    return 'text-rose-400 bg-rose-500/20 border-rose-500/35 font-bold shadow-sm shadow-rose-950/40';
  }
  // Deep red for heavy drop
  return 'text-red-300 bg-red-600/25 border-red-500/50 font-black shadow-sm shadow-red-950/60';
}

/**
 * Return color classes for Forward P/E badge.
 * Sweet spot is between 20 and 30.
 * Above 30, it gets progressively redder (amber -> orange -> deep rose/red).
 */
export function getForwardPeBadgeClass(pe: number | null | undefined): string {
  if (pe === null || pe === undefined || isNaN(pe) || pe <= 0) {
    return 'text-slate-400 bg-slate-800/60 border-slate-700/60';
  }
  // Under 15x: deep value / cheap
  if (pe < 15) {
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
  }
  // 15x to 20x: healthy moderate value
  if (pe < 20) {
    return 'text-teal-300 bg-teal-500/10 border-teal-500/25';
  }
  // 20x to 30x: the sweet spot! (balanced valuation & growth)
  if (pe <= 30) {
    return 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40 font-extrabold ring-1 ring-cyan-400/20';
  }
  // 30x to 40x: elevated multiple (warm amber)
  if (pe <= 40) {
    return 'text-amber-300 bg-amber-500/15 border-amber-500/30';
  }
  // 40x to 60x: high multiple / getting redder (orange)
  if (pe <= 60) {
    return 'text-orange-400 bg-orange-500/20 border-orange-500/40 font-bold';
  }
  // > 60x: stretched / deep red
  return 'text-rose-400 bg-rose-500/25 border-rose-500/50 font-black shadow-sm shadow-rose-950/50';
}

/**
 * Return container classes for Forward P/E highlight card in details modal
 */
export function getForwardPeCardClass(pe: number | null | undefined): string {
  if (pe === null || pe === undefined || isNaN(pe) || pe <= 0) {
    return 'bg-slate-950/60 border-slate-800/80 text-slate-400';
  }
  if (pe < 15) {
    return 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400';
  }
  if (pe < 20) {
    return 'bg-teal-950/20 border-teal-800/30 text-teal-300';
  }
  if (pe <= 30) {
    return 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300 ring-1 ring-cyan-500/20';
  }
  if (pe <= 40) {
    return 'bg-amber-950/20 border-amber-800/35 text-amber-300';
  }
  if (pe <= 60) {
    return 'bg-orange-950/25 border-orange-800/40 text-orange-400';
  }
  return 'bg-rose-950/30 border-rose-800/50 text-rose-400';
}

/**
 * Return color classes for the Current P/E (trailing) badge.
 * Tiers: none → slate, ≤20x → emerald, 20–40x → blue, 40–60x → orange, >60x → deep rose.
 */
export function getCurrentPeBadgeClass(pe: number | null | undefined): string {
  if (pe === null || pe === undefined || isNaN(pe) || pe <= 0) {
    return 'text-slate-400 bg-slate-800/60 border-slate-700/60';
  }
  // ≤ 20x: healthy / value territory (emerald)
  if (pe <= 20) {
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }
  // 20–40x: elevated but common for growth stocks (blue)
  if (pe <= 40) {
    return 'text-blue-400 bg-blue-500/10 border-blue-500/25';
  }
  // 40–60x: high multiple (orange)
  if (pe <= 60) {
    return 'text-orange-400 bg-orange-500/15 border-orange-500/35 font-bold';
  }
  // > 60x: very stretched (deep rose/red)
  return 'text-rose-400 bg-rose-500/20 border-rose-500/45 font-black shadow-sm shadow-rose-950/50';
}

/**
 * Return container classes for Current P/E highlight card in details modal.
 * Mirrors getCurrentPeBadgeClass() but as card-level background/border/text.
 */
export function getCurrentPeCardClass(pe: number | null | undefined): string {
  if (pe === null || pe === undefined || isNaN(pe) || pe <= 0) {
    return 'bg-slate-950/60 border-slate-800/80 text-slate-400';
  }
  if (pe <= 20) {
    return 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400';
  }
  if (pe <= 40) {
    return 'bg-blue-950/20 border-blue-800/30 text-blue-400';
  }
  if (pe <= 60) {
    return 'bg-orange-950/25 border-orange-800/40 text-orange-400';
  }
  return 'bg-rose-950/30 border-rose-800/50 text-rose-400';
}
