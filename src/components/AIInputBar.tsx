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

    const handleOriginUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ city?: string; iata?: string }>;
      if (customEvent.detail?.city) {
        const defaultPrompt = `Из ${customEvent.detail.city} в `;
        setQuery(defaultPrompt);
        if (inputRef.current) {
          inputRef.current.value = defaultPrompt;
          inputRef.current.focus();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('focus-ai-input', handleFocusCustom);
    window.addEventListener('flightsaver_origin_updated', handleOriginUpdated);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('focus-ai-input', handleFocusCustom);
      window.removeEventListener('flightsaver_origin_updated', handleOriginUpdated);
    };
  }, []);

  // Fetch suggestions with debounce (only for single word queries)
  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    const words = trimmed.split(/\s+/);

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
      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
        setIsDropdownOpen(data.suggestions.length > 0);
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setIsDropdownOpen(false);
      }
    } catch {
      setSuggestions([]);
      setIsDropdownOpen(false);
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

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 250);
  };

  const handleSelectPlace = (place: PlaceSuggestion) => {
    const cityName = place.cityName || place.name;
    const iataCode = place.iataCode;
    const replacement = iataCode ? `${cityName} (${iataCode})` : cityName;

    const trimmed = query.trim();
    const words = trimmed.split(/\s+/);
    let newQuery = '';

    if (words.length <= 1) {
      newQuery = `Из ${replacement} в `;
    } else {
      words[words.length - 1] = replacement;
      newQuery = words.join(' ');
    }

    setQuery(newQuery);
    setIsDropdownOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);

    if (inputRef.current) {
      inputRef.current.value = newQuery;
      inputRef.current.focus();
      const len = newQuery.length;
      inputRef.current.setSelectionRange(len, len);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectPlace(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery || isLoading) return;

    setIsDropdownOpen(false);
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
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 opacity-20 group-hover:opacity-40 group-focus-within:opacity-70 blur-xl transition duration-500 pointer-events-none" />

        {/* Stitch Liquid Capsule Bar Container */}
        <div
          className={`relative min-h-[60px] sm:min-h-[64px] h-auto w-full liquid-capsule specular-rim shadow-pill-capsule rounded-full transition-all duration-300 flex items-center px-3.5 sm:px-5 py-2 gap-2.5 border ${
            isListening
              ? 'border-sky-500 ring-4 ring-sky-300/40 shadow-liquid-active'
              : isDropdownOpen
              ? 'border-sky-400 ring-4 ring-sky-400/20'
              : 'border-white/90 hover:border-sky-300 group-focus-within:border-sky-500 group-focus-within:ring-4 group-focus-within:ring-sky-400/25'
          }`}
        >
          {/* AI Sparkle Icon */}
          <div className="pl-0.5 text-sky-500 shrink-0">
            {isLoading || isLoadingSuggestions ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-sky-500" />
            ) : (
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 animate-pulse" />
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
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-xs sm:text-base focus:outline-none focus:ring-0 min-w-0"
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

          {/* Submit Arrow Button with Vibrant Stitch Blue */}
          <button
            type="submit"
            aria-label={t.searchBtn}
            title={t.searchBtn}
            className="h-10 w-10 sm:h-10.5 sm:w-10.5 rounded-full bg-sky-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-sky-300 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown List */}
      {isDropdownOpen && suggestions.length > 0 && (
        <div
          className="absolute z-50 top-full mt-2 w-full liquid-glass-card shadow-glass-elevated rounded-3xl border border-white/95 overflow-hidden animate-fadeIn backdrop-blur-2xl"
          role="listbox"
          aria-label={t.searchingAirports}
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/40 border-b border-white/80 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5 text-sky-700 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              {language === 'ru' ? 'Выберите город или аэропорт' : 'Select city or airport'}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline font-normal">
              {language === 'ru' ? '↑↓ навигация • Enter выбор' : '↑↓ navigate • Enter select'}
            </span>
          </div>

          {/* List items */}
          <div className="max-h-[320px] sm:max-h-[380px] overflow-y-auto divide-y divide-white/60 no-scrollbar">
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
                      ? 'bg-sky-100/70 text-sky-950'
                      : 'hover:bg-white/50 text-slate-800'
                  }`}
                >
                  {/* Left: Icon, City & Airport Name, Country */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
                        isAirport
                          ? 'bg-sky-50 text-sky-600 border-sky-200/80'
                          : 'bg-amber-50 text-amber-600 border-amber-200/80'
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
