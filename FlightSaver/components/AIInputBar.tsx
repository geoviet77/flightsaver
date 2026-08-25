'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, X, Loader2, Sparkles, AlertCircle, Plane, MapPin } from 'lucide-react';
import { VoiceButton } from './VoiceButton';
import { useSpeechRecognition, SpeechLanguage } from '../hooks/useSpeechRecognition';
import { TRANSLATIONS } from '../lib/i18n';
import { PlaceSuggestion } from '../lib/types';

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
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Sync speech recognition transcript
  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  // Sync initial query
  useEffect(() => {
    setQuery(initialQuery || '');
    if (inputRef.current) {
      inputRef.current.value = initialQuery || '';
    }
  }, [initialQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
      }
    };

    const handleFocusCustom = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      if (inputRef.current) {
        if (customEvent.detail?.prompt) {
          inputRef.current.placeholder = customEvent.detail.prompt;
        }
        inputRef.current.focus();
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('focus-ai-input', handleFocusCustom);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('focus-ai-input', handleFocusCustom);
    };
  }, []);

  // Fetch suggestions with debounce (only for single word queries)
  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    const words = trimmed.split(/\s+/);

    // Disable suggestions popup if multiple words are entered (complex phrase for AI, not a single city lookup)
    if (!trimmed || trimmed.length < 2 || words.length > 1) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setIsDropdownOpen(false);
      return;
    }

    try {
      setIsLoadingSuggestions(true);
      const res = await fetch(`/api/airports?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const places: PlaceSuggestion[] = Array.isArray(data?.places) ? data.places : [];
      setSuggestions(places);
      setIsDropdownOpen(places.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('[AIInputBar] Failed to fetch suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    const words = trimmed.split(/\s+/);

    // Only fetch suggestions if it's a single word (e.g. "Moscow", "Пхукет", "UUS")
    if (trimmed.length >= 2 && words.length === 1) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 300);
    } else {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelectPlace = (place: PlaceSuggestion) => {
    const displayName = place.cityName || place.name;
    const formatted = place.iataCode ? `${displayName} [${place.iataCode}]` : displayName;
    
    setQuery(formatted);
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isDropdownOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectPlace(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        return;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery || isLoading) return;
    if (isListening) {
      toggleListening();
    }
    setIsDropdownOpen(false);
    setQuery('');
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onSearch(cleanQuery);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    resetTranscript();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto relative">
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
              : isDropdownOpen
              ? 'border-sky-500 ring-4 ring-sky-400/20'
              : 'border-sky-100 hover:border-sky-300 group-focus-within:border-sky-500 group-focus-within:ring-4 group-focus-within:ring-sky-400/20'
          }`}
        >
          {/* AI Sparkle Icon */}
          <div className="pl-0.5 text-sky-500 shrink-0">
            {isLoading || isLoadingSuggestions ? (
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
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0 && query.trim().length >= 2) {
                setIsDropdownOpen(true);
              }
            }}
            placeholder={isListening ? t.searchListening : t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            autoComplete="off"
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

      {/* Autocomplete Dropdown List */}
      {isDropdownOpen && suggestions.length > 0 && (
        <div
          className="absolute z-50 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn"
          role="listbox"
          aria-label={t.searchingAirports}
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-gray-100 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              {language === 'ru' ? 'Выберите город или аэропорт' : 'Select city or airport'}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline font-normal">
              {language === 'ru' ? '↑↓ навигация • Enter выбор' : '↑↓ navigate • Enter select'}
            </span>
          </div>

          {/* List items */}
          <div className="max-h-[320px] sm:max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {suggestions.map((place, idx) => {
              const isSelected = selectedIndex === idx;
              const isAirport = place.type === 'airport';

              return (
                <div
                  key={`${place.id}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelectPlace(place)}
                  className={`w-full px-4 py-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50/80 text-sky-950'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  {/* Left: Icon, City & Airport Name, Country */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isAirport
                          ? 'bg-sky-50 text-sky-600 border-sky-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      {isAirport ? (
                        <Plane className="w-4 h-4" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {place.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                        {place.cityName && place.cityName !== place.name && (
                          <span>{place.cityName}</span>
                        )}
                        {place.cityName && place.cityName !== place.name && place.countryCode && (
                          <span>•</span>
                        )}
                        {place.countryCode && (
                          <span className="uppercase font-semibold text-slate-400">
                            {place.countryCode}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({isAirport ? (t.airportBadge || 'Аэропорт') : (t.cityBadge || 'Город')})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: IATA Badge (e.g. [UUS], [MOW], [DXB]) */}
                  {place.iataCode && (
                    <div className="shrink-0 flex items-center">
                      <span className="font-mono font-bold text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-sky-600 text-white shadow-sm shadow-sky-500/20 tracking-wider">
                        [{place.iataCode}]
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
