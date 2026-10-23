'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  RotateCcw,
  Terminal,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  FileText,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { getForwardPeBadgeClass } from '@/lib/utils';

export interface MagicDemoPlaygroundProps {
  onRegisterClick?: () => void;
  onBatchAddClick?: () => void;
}

interface EnrichedCard {
  symbol: string;
  name: string;
  exchange: string;
  price: string;
  currency: string;
  change: string;
  isPositive: boolean;
  pe: string;
  fwdPe: number;
  fwdPeLabel: string;
  refValue?: string;
  diff?: string;
  isDiffPositive?: boolean;
  tag?: string;
}

interface Preset {
  id: string;
  titleKey: string;
  badge: string;
  rawText: string;
  cards: EnrichedCard[];
}

const PRESETS: Preset[] = [
  {
    id: 'notes',
    titleKey: 'notes',
    badge: 'AAPL, MSFT, NVDA, GOOGL',
    rawText: `# Tech portfolio watchlist\nAAPL - Apple (cost basis ~185$)\nMSFT, NVDA - 45 shares\nGOOGL Alphabet Inc.`,
    cards: [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        price: '232.40',
        currency: '$',
        change: '+1.25%',
        isPositive: true,
        pe: '33.8x',
        fwdPe: 28.5,
        fwdPeLabel: '28.5x',
        refValue: '$185.00',
        diff: '+25.6%',
        isDiffPositive: true,
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        exchange: 'NASDAQ',
        price: '428.15',
        currency: '$',
        change: '+0.84%',
        isPositive: true,
        pe: '35.2x',
        fwdPe: 31.0,
        fwdPeLabel: '31.0x',
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        exchange: 'NASDAQ',
        price: '138.20',
        currency: '$',
        change: '+3.42%',
        isPositive: true,
        pe: '58.4x',
        fwdPe: 42.1,
        fwdPeLabel: '42.1x',
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        exchange: 'NASDAQ',
        price: '179.60',
        currency: '$',
        change: '+0.45%',
        isPositive: true,
        pe: '23.9x',
        fwdPe: 20.4,
        fwdPeLabel: '20.4x',
      },
    ],
  },
  {
    id: 'pea_us',
    titleKey: 'pea_us',
    badge: 'MC.PA, AIR.PA, TSLA, WPEA',
    rawText: `Portefeuille mixte PEA + US:\nMC.PA; AIR.PA; PUST.PA\nTSLA (Nasdaq auto)\nWPEA.PA iShares MSCI World`,
    cards: [
      {
        symbol: 'MC.PA',
        name: 'LVMH Moët Hennessy',
        exchange: 'Euronext Paris',
        price: '624.50',
        currency: '€',
        change: '-0.65%',
        isPositive: false,
        pe: '22.1x',
        fwdPe: 21.0,
        fwdPeLabel: '21.0x',
        tag: 'PEA',
      },
      {
        symbol: 'AIR.PA',
        name: 'Airbus SE',
        exchange: 'Euronext Paris',
        price: '142.30',
        currency: '€',
        change: '+1.10%',
        isPositive: true,
        pe: '28.3x',
        fwdPe: 24.5,
        fwdPeLabel: '24.5x',
        tag: 'PEA',
      },
      {
        symbol: 'PUST.PA',
        name: 'Amundi PEA Nasdaq 100',
        exchange: 'Euronext Paris',
        price: '48.92',
        currency: '€',
        change: '+1.35%',
        isPositive: true,
        pe: '—',
        fwdPe: 0,
        fwdPeLabel: 'ETF',
        tag: 'PEA',
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        exchange: 'NASDAQ',
        price: '218.40',
        currency: '$',
        change: '-1.80%',
        isPositive: false,
        pe: '68.2x',
        fwdPe: 55.0,
        fwdPeLabel: '55.0x',
      },
      {
        symbol: 'WPEA.PA',
        name: 'iShares World PEA',
        exchange: 'Euronext Paris',
        price: '5.84',
        currency: '€',
        change: '+0.42%',
        isPositive: true,
        pe: '—',
        fwdPe: 0,
        fwdPeLabel: 'ETF World',
        tag: 'PEA',
      },
    ],
  },
  {
    id: 'forum',
    titleKey: 'forum',
    badge: 'ASML, SAP, META, NOVO',
    rawText: `Idées d'investissement forum:\n- regarder ASML.AS et SAP.DE en Europe\n- renforcer META si consolidation\n- surveiller NOVO-B.CO également`,
    cards: [
      {
        symbol: 'ASML.AS',
        name: 'ASML Holding NV',
        exchange: 'Euronext Amsterdam',
        price: '842.00',
        currency: '€',
        change: '+2.15%',
        isPositive: true,
        pe: '41.2x',
        fwdPe: 32.8,
        fwdPeLabel: '32.8x',
      },
      {
        symbol: 'SAP.DE',
        name: 'SAP SE',
        exchange: 'Deutsche Börse XETRA',
        price: '194.80',
        currency: '€',
        change: '+0.75%',
        isPositive: true,
        pe: '34.6x',
        fwdPe: 29.1,
        fwdPeLabel: '29.1x',
      },
      {
        symbol: 'META',
        name: 'Meta Platforms Inc.',
        exchange: 'NASDAQ',
        price: '586.30',
        currency: '$',
        change: '+1.90%',
        isPositive: true,
        pe: '27.4x',
        fwdPe: 22.8,
        fwdPeLabel: '22.8x',
      },
      {
        symbol: 'NOVO-B.CO',
        name: 'Novo Nordisk A/S',
        exchange: 'Nasdaq Copenhagen',
        price: '812.00',
        currency: 'DKK',
        change: '+0.30%',
        isPositive: true,
        pe: '36.8x',
        fwdPe: 30.5,
        fwdPeLabel: '30.5x',
      },
    ],
  },
];

export function MagicDemoPlayground({
  onRegisterClick,
  onBatchAddClick,
}: MagicDemoPlaygroundProps) {
  const { locale } = useI18n();
  const isFr = locale === 'fr';

  const [activePresetId, setActivePresetId] = useState<string>('notes');
  const [typedText, setTypedText] = useState<string>('');
  const [visibleCardCount, setVisibleCardCount] = useState<number>(0);
  const [isTyping, setIsTyping] = useState<boolean>(true);
  const [mobileTab, setMobileTab] = useState<'raw' | 'parsed'>('raw');
  const [replayKey, setReplayKey] = useState<number>(0);

  const activePreset = useMemo(
    () => PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0],
    [activePresetId]
  );

  const fullText = activePreset.rawText;
  const cards = activePreset.cards;

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardStaggerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const morphTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (cardStaggerTimeoutRef.current) {
      clearTimeout(cardStaggerTimeoutRef.current);
      cardStaggerTimeoutRef.current = null;
    }
    if (morphTimeoutRef.current) {
      clearTimeout(morphTimeoutRef.current);
      morphTimeoutRef.current = null;
    }
  }, []);

  // Main typewriter animation
  useEffect(() => {
    clearAllTimers();

    let currentIndex = 0;
    const textLength = fullText.length;
    const typingIntervalMs = 26; // ~26ms per character creates an engaging rhythm

    const typeNextChar = () => {
      currentIndex += 1;
      setTypedText(fullText.slice(0, currentIndex));

      // Reveal cards progressively as lines are typed
      const progress = currentIndex / textLength;
      const targetCardCount = Math.min(
        cards.length,
        Math.floor(progress * (cards.length + 1))
      );
      setVisibleCardCount((prev) => Math.max(prev, targetCardCount));

      if (currentIndex < textLength) {
        typingTimeoutRef.current = setTimeout(typeNextChar, typingIntervalMs);
      } else {
        // Typing is finished
        setIsTyping(false);
        setVisibleCardCount(cards.length);

        // On mobile, auto-morph to parsed view after 450ms
        morphTimeoutRef.current = setTimeout(() => {
          setMobileTab('parsed');
        }, 450);
      }
    };

    // Small startup pause before typing starts
    typingTimeoutRef.current = setTimeout(() => {
      typeNextChar();
    }, 120);

    return clearAllTimers;
  }, [fullText, cards.length, replayKey, clearAllTimers]);

  const handleSelectPreset = (id: string) => {
    clearAllTimers();
    setActivePresetId(id);
    setTypedText('');
    setVisibleCardCount(0);
    setIsTyping(true);
    setMobileTab('raw');
    setReplayKey((k) => k + 1);
  };

  const handleReplay = () => {
    clearAllTimers();
    setTypedText('');
    setVisibleCardCount(0);
    setIsTyping(true);
    setMobileTab('raw');
    setReplayKey((k) => k + 1);
  };

  // Derive terminal line numbers
  const lines = useMemo(() => {
    const rawLines = typedText.split('\n');
    return rawLines.length > 0 ? rawLines : [''];
  }, [typedText]);

  const presetLabels: Record<string, { fr: string; en: string }> = {
    notes: { fr: 'Notes de broker', en: 'Broker notes' },
    pea_us: { fr: 'Mix PEA & US en vrac', en: 'PEA & US mix' },
    forum: { fr: 'Texte brut de forum', en: 'Messy forum text' },
  };

  return (
    <section
      aria-label="Interactive demo playground"
      className="mb-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/80 p-4 sm:p-6 lg:p-7 shadow-2xl relative overflow-hidden"
    >
      {/* Decorative background glow */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Header with Title & Action */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isFr ? 'Démo magique interactive' : 'Magic interactive demo'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {isFr
              ? 'Collez vos tickers en vrac. Votre dashboard s’anime instantanément.'
              : 'Paste raw tickers. Watch your dashboard come alive instantly.'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            {isFr
              ? 'Fini la saisie un par un : copiez vos notes, vos listes séparées par des virgules ou vos exports broker. L’application extrait les tickers et enrichit vos cours et ratios en temps réel.'
              : 'Zero tedious manual entry: copy notes, messy comma-separated lists or broker exports. The app extracts symbols, matches markets and generates rich valuation cards in seconds.'}
          </p>
        </div>

        {/* Replay Button */}
        <button
          type="button"
          onClick={handleReplay}
          title={isFr ? 'Relancer l’animation' : 'Replay animation'}
          aria-label={isFr ? 'Relancer l’animation' : 'Replay animation'}
          className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm cursor-pointer shrink-0"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isTyping ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{isFr ? 'Rejouer' : 'Replay'}</span>
        </button>
      </div>

      {/* 3 Clickable Presets Pills */}
      <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
        {PRESETS.map((preset) => {
          const isSelected = preset.id === activePresetId;
          const label = isFr
            ? presetLabels[preset.id]?.fr ?? preset.id
            : presetLabels[preset.id]?.en ?? preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border cursor-pointer flex items-center gap-2 shrink-0 ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/70'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-emerald-950/20 text-slate-950'
                    : 'bg-slate-900/80 text-slate-400'
                }`}
              >
                {preset.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Morphing Tabs Switcher (< md) */}
      <div className="md:hidden relative z-10 flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 mb-4">
        <button
          type="button"
          onClick={() => setMobileTab('raw')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'raw'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>1. {isFr ? 'Texte brut collé' : 'Raw input'}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('parsed')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'parsed'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>2. {isFr ? 'Résultat enrichi' : 'Enriched cards'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </button>
      </div>

      {/* Main Demo Container: Split-Screen on Desktop, Morphing on Mobile */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        {/* Left Column: Terminal / Raw Textarea */}
        <div
          className={`${
            mobileTab === 'raw' ? 'block' : 'hidden md:block'
          } flex flex-col rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-xl overflow-hidden min-h-[310px]`}
        >
          {/* macOS traffic lights bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/90 border-b border-slate-800/90 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-[11px] font-mono text-slate-500 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-slate-500" />
                <span>raw_watchlist.txt</span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {isTyping
                ? isFr
                  ? '⚡ Saisie en cours...'
                  : '⚡ Parsing...'
                : isFr
                ? '✓ Parsé avec succès'
                : '✓ Parsed'}
            </span>
          </div>

          {/* Textarea terminal body */}
          <div className="flex-1 p-3.5 sm:p-4 font-mono text-xs sm:text-[13px] text-slate-200 leading-relaxed overflow-x-hidden">
            <div className="space-y-1">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="select-none text-slate-600 text-right w-5 shrink-0 text-[11px] pt-0.5">
                    {idx + 1}
                  </span>
                  <span className="flex-1 break-words whitespace-pre-wrap text-slate-300">
                    {line}
                    {idx === lines.length - 1 && isTyping && (
                      <span className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 align-middle animate-pulse shadow-sm shadow-emerald-400/50" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom status line */}
          <div className="px-3.5 py-2 bg-slate-950/60 border-t border-slate-800/70 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>
              {lines.length} {isFr ? 'lignes détectées' : 'lines detected'}
            </span>
            <span className="text-emerald-400 font-semibold">
              {visibleCardCount} {isFr ? 'tickers extraits' : 'tickers parsed'}
            </span>
          </div>
        </div>

        {/* Right Column: Enriched Live Cards */}
        <div
          className={`${
            mobileTab === 'parsed' ? 'block' : 'hidden md:block'
          } flex flex-col rounded-2xl bg-slate-950/70 border border-slate-800 shadow-xl overflow-hidden min-h-[310px] p-3 sm:p-3.5`}
        >
          {/* Header of Cards Column */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/70">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {isFr ? 'Watchlist enrichie en temps réel' : 'Enriched Live Watchlist'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {cards.length} {isFr ? 'actifs' : 'assets'}
            </span>
          </div>

          {/* Staggered cards list */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[320px] pr-1">
            {cards.map((card, idx) => {
              const isVisible = idx < visibleCardCount;

              return (
                <div
                  key={card.symbol}
                  className={`rounded-xl border transition-all duration-300 p-2.5 sm:p-3 bg-slate-900/90 border-slate-800 hover:border-slate-700 ${
                    isVisible
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-3 pointer-events-none'
                  }`}
                  style={{
                    transitionDelay: `${idx * 40}ms`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left side: Symbol + Company Name + Venue */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-extrabold text-sm text-white tracking-tight truncate">
                          {card.symbol}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {card.name}
                        </span>
                        {card.tag && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {card.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          {card.exchange}
                        </span>
                        {card.pe !== '—' && (
                          <span className="text-[11px] font-mono text-slate-400">
                            PE <strong className="text-slate-200">{card.pe}</strong>
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border ${getForwardPeBadgeClass(
                            card.fwdPe
                          )}`}
                        >
                          Fwd {card.fwdPeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Price & Daily Change */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-white">
                        {card.currency === '€'
                          ? `${card.price} €`
                          : `${card.currency}${card.price}`}
                      </div>
                      <div
                        className={`text-[11px] font-bold flex items-center justify-end gap-0.5 mt-0.5 ${
                          card.isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {card.isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{card.change}</span>
                      </div>
                      {card.refValue && (
                        <div className="text-[10px] text-cyan-400 font-medium mt-0.5">
                          {card.diff} ({card.refValue})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Conversion Call-To-Action Banner */}
      <div className="relative z-10 mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {isFr ? (
              <>
                <strong className="text-white">Zéro friction :</strong> collez vos données sans
                trier. Aucune synchronisation bancaire requise.
              </>
            ) : (
              <>
                <strong className="text-white">Zero friction:</strong> paste your raw tickers. No
                banking sync required.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {onBatchAddClick && (
            <button
              type="button"
              onClick={onBatchAddClick}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>{isFr ? 'Essayer en batch' : 'Try batch add'}</span>
            </button>
          )}

          {onRegisterClick && (
            <button
              type="button"
              onClick={onRegisterClick}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <span>{isFr ? 'Créer ma watchlist' : 'Start free'}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
