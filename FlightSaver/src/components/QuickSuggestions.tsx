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
  const t = TRANSLATIONS[language];

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 sm:mt-7 space-y-3">
      {/* 1. AI Assistant Chat Message Bubble (Elastic Sizing) */}
      <div className="flex items-start gap-3 animate-fadeIn">
        {/* Robot Icon Container (shrink-0) */}
        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
          <Bot className="w-5 h-5" />
        </div>

        {/* AI Message Bubble */}
        <div className="flex-1 min-w-0 liquid-glass-card p-3.5 sm:p-4 rounded-2xl rounded-tl-sm border border-white/90 shadow-[0_6px_20px_rgba(37,99,235,0.05)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {t.aiChatBadge}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed break-words">
            {t.aiChatMessage}
          </p>
        </div>
      </div>

      {/* 2. Traveler Interactive Chat Responses (Elastic min-h-[60px] h-auto) */}
      <div className="pl-6 sm:pl-10 space-y-2.5">
        {/* Prompt 1 */}
        <button
          type="button"
          onClick={() => onSelectSuggestion(t.chatPrompt1Query)}
          className="w-full min-h-[60px] h-auto text-left liquid-glass-card group p-3 sm:px-4 sm:py-3 rounded-2xl rounded-tr-sm border border-sky-100/80 hover:border-blue-400 hover:bg-white flex items-center justify-between gap-3 cursor-pointer shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-sky-100 group-hover:bg-blue-600 group-hover:text-white text-sky-600 flex items-center justify-center shrink-0 transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug break-words">
                «{t.chatPrompt1Query}»
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-blue-600">
                <span>{t.chatPrompt1Badge}</span>
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition-all">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Prompt 2 */}
        <button
          type="button"
          onClick={() => onSelectSuggestion(t.chatPrompt2Query)}
          className="w-full min-h-[60px] h-auto text-left liquid-glass-card group p-3 sm:px-4 sm:py-3 rounded-2xl rounded-tr-sm border border-sky-100/80 hover:border-blue-400 hover:bg-white flex items-center justify-between gap-3 cursor-pointer shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 group-hover:bg-blue-600 group-hover:text-white text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug break-words">
                «{t.chatPrompt2Query}»
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-indigo-600">
                <span>{t.chatPrompt2Badge}</span>
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition-all">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </div>
  );
}
