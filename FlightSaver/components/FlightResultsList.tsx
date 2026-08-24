'use client';

import React from 'react';
import { Flight, ParsedSearchParams, Currency, Language } from '../lib/types';
import { FlightCard } from './FlightCard';
import { TRANSLATIONS } from '../lib/i18n';
import { Sparkles, Bot, Loader2 } from 'lucide-react';

interface FlightResultsListProps {
  parsedParams: ParsedSearchParams | null;
  flights: Flight[];
  isLoading: boolean;
  onSelectFlight: (flight: Flight) => void;
  currency?: Currency;
  language?: Language;
}

export function FlightResultsList({
  parsedParams,
  flights,
  isLoading,
  onSelectFlight,
  currency = 'RUB',
  language = 'ru',
}: FlightResultsListProps) {
  const t = TRANSLATIONS[language];

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-6 space-y-4">
        {/* AI Searching Bubble */}
        <div className="flex items-start gap-3 animate-fadeIn">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1 liquid-glass-card p-4 rounded-2xl rounded-tl-sm flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <p className="text-sm font-semibold text-slate-800">
              {t.aiSearchingStatus}
            </p>
          </div>
        </div>

        {/* Skeleton Card */}
        <div className="h-44 rounded-3xl bg-white/50 animate-pulse border border-white/80" />
      </div>
    );
  }

  if (!parsedParams && flights.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 space-y-4 animate-fadeIn">
      {/* AI Results Introductory Bubble */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1 liquid-glass-card p-3.5 sm:p-4 rounded-2xl rounded-tl-sm border border-white/90">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {t.aiChatBadge}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
            {t.aiResultsFound(flights.length)}
          </p>
        </div>
      </div>

      {/* Recommended Flight Cards List */}
      <div className="space-y-4 pl-0 sm:pl-13">
        {flights.map((flight) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            onSelect={onSelectFlight}
            currency={currency}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}
