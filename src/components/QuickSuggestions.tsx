'use client';

import React from 'react';
import { Sparkles, Bot, User, ArrowUpRight } from 'lucide-react';
import { Language } from '../lib/types';
import { TRANSLATIONS } from '../lib/i18n';

interface QuickSuggestionsProps {
  onSelectSuggestion: (text: string) => void;
  language?: Language;
}

export function QuickSuggestions({ onSelectSuggestion, language = 'ru' }: QuickSuggestionsProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.ru;

  const renderBadgeWithGreenPercent = (badgeText: string) => {
    if (badgeText.includes('•')) {
      const parts = badgeText.split('•');
      const prefix = parts[0].trim();
      const percent = parts.slice(1).join('•').trim();
      return (
        <span className="inline-flex items-center gap-1 text-xs">
          <span className="text-sky-600 font-medium">{prefix}</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-600 font-bold">{percent}</span>
        </span>
      );
    }
    return <span className="text-xs text-sky-600 font-medium">{badgeText}</span>;
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 sm:mt-7 space-y-3">
      {/* 1. AI Assistant Chat Message Bubble with Overlapping Robot Badge */}
      <div className="relative glass-specular specular-rim p-4 sm:p-5 pt-5 sm:pt-5.5 rounded-2xl border border-white/90 shadow-card-glass animate-fadeIn">
        {/* Overlapping Robot Icon Badge */}
        <div className="absolute -top-3 left-4 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 z-10">
          <Bot className="w-5 h-5" />
        </div>

        {/* AI Message Bubble Header */}
        <div className="flex items-center justify-between mb-2 pl-12 sm:pl-13">
          <span className="text-xs font-black uppercase tracking-wider text-sky-600 flex items-center gap-1.5 font-heading">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {t.aiChatBadge}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50/90 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
            <span>ONLINE</span>
          </span>
        </div>

        {/* Message Text */}
        <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed break-words">
          {t.aiChatMessage}
        </p>
      </div>

      {/* 2. Traveler Interactive Prompt Cards (Full-Width Aligned with Card 1) */}
      <div className="space-y-2.5">
        {/* Prompt 1 */}
        <button
          type="button"
          onClick={() => onSelectSuggestion(t.chatPrompt1Query)}
          className="w-full min-h-[58px] h-auto text-left glass-specular specular-rim group p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border border-white/90 hover:border-sky-300 hover:bg-white/80 flex items-center justify-between gap-3 cursor-pointer shadow-card-glass transition-all focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-sky-100/70 group-hover:bg-sky-600 group-hover:text-white text-sky-600 flex items-center justify-center shrink-0 transition-colors shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-sky-700 transition-colors leading-snug break-words">
                «{t.chatPrompt1Query}»
              </p>
              <div className="mt-0.5">
                {renderBadgeWithGreenPercent(t.chatPrompt1Badge)}
              </div>
            </div>
          </div>
          <div className="text-slate-300 group-hover:text-sky-600 transition-all shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </button>

        {/* Prompt 2 */}
        <button
          type="button"
          onClick={() => onSelectSuggestion(t.chatPrompt2Query)}
          className="w-full min-h-[58px] h-auto text-left glass-specular specular-rim group p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border border-white/90 hover:border-sky-300 hover:bg-white/80 flex items-center justify-between gap-3 cursor-pointer shadow-card-glass transition-all focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-sky-100/70 group-hover:bg-sky-600 group-hover:text-white text-sky-600 flex items-center justify-center shrink-0 transition-colors shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-sky-700 transition-colors leading-snug break-words">
                «{t.chatPrompt2Query}»
              </p>
              <div className="mt-0.5">
                {renderBadgeWithGreenPercent(t.chatPrompt2Badge)}
              </div>
            </div>
          </div>
          <div className="text-slate-300 group-hover:text-sky-600 transition-all shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
