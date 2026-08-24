'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { VoiceButton } from './VoiceButton';
import { useSpeechRecognition, SpeechLanguage } from '../hooks/useSpeechRecognition';
import { TRANSLATIONS } from '../lib/i18n';

interface AIInputBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  language?: 'ru' | 'en';
}

export function AIInputBar({
  initialQuery = '',
  onSearch,
  isLoading = false,
  language = 'ru',
}: AIInputBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.ru;

  const speechLang: SpeechLanguage = language === 'ru' ? 'ru-RU' : 'en-US';
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    toggleListening,
    resetTranscript,
  } = useSpeechRecognition(speechLang);

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    if (isListening) {
      toggleListening();
    }
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    resetTranscript();
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="relative group"
        role="search"
        aria-label={t.searchBtn}
      >
        {/* Glow halo behind input on hover/focus */}
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 opacity-25 group-hover:opacity-50 group-focus-within:opacity-75 blur-xl transition duration-500 pointer-events-none" />

        {/* Elastic Solid Pill Bar Container (min-h-[64px], never overflows) */}
        <div
          className={`relative min-h-[60px] sm:min-h-[64px] h-auto w-full rounded-full bg-white border-2 transition-all duration-300 shadow-[0_12px_35px_-8px_rgba(14,165,233,0.15)] flex items-center px-3 sm:px-5 py-2 gap-2 ${
            isListening
              ? 'border-sky-500 ring-4 ring-sky-300/40'
              : 'border-sky-100 hover:border-sky-300 group-focus-within:border-sky-500 group-focus-within:ring-4 group-focus-within:ring-sky-400/20'
          }`}
        >
          {/* AI Sparkle Icon */}
          <div className="pl-0.5 text-sky-500 shrink-0">
            {isLoading ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-sky-500" />
            ) : (
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 sparkle-icon" />
            )}
          </div>

          {/* Main Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isListening ? t.searchListening : t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 font-semibold text-xs sm:text-base focus:outline-none min-w-0"
          />

          {/* Clear button */}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={t.modalClose}
              className="p-1 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Microphone Voice Button */}
          <VoiceButton
            isListening={isListening}
            onToggle={toggleListening}
            disabled={isLoading}
          />

          {/* Submit Arrow Button */}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            aria-label={t.searchBtn}
            title={t.searchBtn}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-md shadow-sky-500/25 transition-all hover:scale-105 active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>

      {/* Voice interim speech indicator or speech error */}
      {isListening && interimTranscript && (
        <div className="mt-3 px-4 py-2 rounded-2xl bg-sky-50/90 border border-sky-200 text-sky-950 text-xs sm:text-sm font-bold animate-pulse flex items-center gap-2 shadow-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span>{language === 'ru' ? 'Распознаётся:' : 'Recognized:'} «{interimTranscript}»</span>
        </div>
      )}

      {speechError && (
        <div className="mt-3 px-4 py-2 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{speechError}</span>
        </div>
      )}
    </div>
  );
}
