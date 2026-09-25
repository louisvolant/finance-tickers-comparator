'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ListOrdered, ArrowDownAZ, Globe, ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import { DisplayMode } from '@/lib/displayModes';
import { useI18n } from '@/context/I18nContext';

interface DisplayModeSelectorProps {
  currentMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

export function DisplayModeSelector({ currentMode, onModeChange }: DisplayModeSelectorProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const options: Array<{
    id: DisplayMode;
    labelKey: string;
    descKey: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'custom',
      labelKey: 'display.custom',
      descKey: 'display.customDesc',
      icon: <ListOrdered className="w-4 h-4 text-emerald-400 shrink-0" />,
    },
    {
      id: 'reorder',
      labelKey: 'display.reorder',
      descKey: 'display.reorderDesc',
      icon: <ArrowUpDown className="w-4 h-4 text-purple-400 shrink-0" />,
    },
    {
      id: 'alphabetical',
      labelKey: 'display.alphabetical',
      descKey: 'display.alphabeticalDesc',
      icon: <ArrowDownAZ className="w-4 h-4 text-cyan-400 shrink-0" />,
    },
    {
      id: 'by_exchange',
      labelKey: 'display.byExchange',
      descKey: 'display.byExchangeDesc',
      icon: <Globe className="w-4 h-4 text-amber-400 shrink-0" />,
    },
  ];

  const currentOption = options.find((o) => o.id === currentMode) || options[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer shadow-sm active:scale-[0.98]"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={t('display.label')}
      >
        {currentOption.icon}
        <span className="hidden sm:inline">{t(currentOption.labelKey)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 sm:w-80 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('display.label')}
            </span>
          </div>

          <div className="space-y-1">
            {options.map((opt) => {
              const isSelected = opt.id === currentMode;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onModeChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-start justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                      : 'hover:bg-slate-800/70 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <div className="mt-0.5">{opt.icon}</div>
                    <div>
                      <div className="font-semibold text-xs text-white leading-tight">
                        {t(opt.labelKey)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {t(opt.descKey)}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
