'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  Plane,
  Hotel,
  ShieldCheck,
  Zap,
  TrendingDown,
  Globe2,
  Calendar,
  Users,
  Compass,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Header } from '../../components/Header';
import { VoiceButton } from '../../components/VoiceButton';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { parseWithGemini } from '../../lib/api';
import { Currency, Language } from '../../lib/types';

const QUICK_PROMPTS = [
  { label: '🏖️ В Бангкок из Москвы 15 сентября на 2 недели', query: 'В Бангкок из Москвы 15 сентября на 2 недели' },
  { label: '🗼 В Париж из Тбилиси на двоих в ноябре', query: 'В Париж из Тбилиси на двоих в ноябре' },
  { label: '🌴 Москва → Бали с отелем STPC при стыковке', query: 'Москва в Бали на 14 дней с бесплатным отелем при пересадке' },
  { label: '🏙️ Санкт-Петербург → Дубай 10 октября бизнес-класс', query: 'Из Санкт-Петербурга в Дубай 10 октября бизнес-класс' },
  { label: '🏛️ Рим из Сочи 20 октября в экономе', query: 'Рим из Сочи 20 октября 1 пассажир эконом' },
];

function getDefaultDepartureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [language, setLanguage] = useState<Language>('ru');

  const inputRef = useRef<HTMLInputElement>(null);

  // Web Speech API Voice Recognition
  const {
    isListening,
    transcript,
    error: speechError,
    toggleListening,
    resetTranscript,
  } = useSpeechRecognition('ru-RU');

  // Sync speech recognition text into search query
  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  // When speech recognition ends with transcript, automatically trigger search
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 3) {
      handleSearch(transcript.trim());
      resetTranscript();
    }
  }, [isListening, transcript]);

  const handleSearch = async (rawQuery: string) => {
    const text = rawQuery.trim();
    if (!text || isParsing) return;

    setIsParsing(true);
    setError(null);

    try {
      // 1. Отправляем запрос на серверный роут AI-парсинга /api/ai/parse (Gemini 2.5 Flash)
      const parsed = await parseWithGemini(text);

      if (parsed && parsed.origin && parsed.destination) {
        const params = new URLSearchParams({
          origin: parsed.origin.toUpperCase(),
          destination: parsed.destination.toUpperCase(),
          departure_date: parsed.departureDate || getDefaultDepartureDate(),
          passengers: String(parsed.passengers || 1),
          cabin_class: parsed.cabinClass || 'economy',
        });

        if (parsed.returnDate) {
          params.set('return_date', parsed.returnDate);
        }
        if (parsed.searchStpc) {
          params.set('stpc', 'true');
        }

        router.push(`/results?${params.toString()}`);
      } else {
        throw new Error('Не удалось извлечь города перелета');
      }
    } catch (err: any) {
      console.error('[HomePage] Ошибка при AI-парсинге:', err);
      setError(
        'Не удалось распознать маршрут. Пожалуйста, попробуйте еще раз или используйте один из примеров ниже.'
      );
      setIsParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      toggleListening();
    }
    handleSearch(query);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center justify-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>FlightSaver 2.0 • ИИ Консьерж & Стыковки STPC</span>
        </div>

        {/* Title */}
        <div className="text-center max-w-3xl mb-8 sm:mb-10 space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Умный поиск перелётов <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
              одной фразой
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Напишите текстом или скажите голосом куда, когда и как вы хотите полететь. ИИ автоматически выделит города, даты, пассажиров и найдет билеты со скидкой до 40%.
          </p>
        </div>

        {/* AI Search Box */}
        <div className="w-full max-w-3xl">
          <form
            onSubmit={handleSubmit}
            className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-500/5 border-2 border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all p-2 sm:p-3 flex items-center gap-2"
          >
            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isParsing}
              placeholder="Например: В Бангкок из Москвы 15 сентября на 2 недели на двоих"
              className="flex-1 bg-transparent px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />

            {/* Voice Button */}
            <VoiceButton
              isListening={isListening}
              onToggle={toggleListening}
              disabled={isParsing}
            />

            {/* Search Submit Button */}
            <button
              type="submit"
              disabled={!query.trim() || isParsing}
              className="px-5 sm:px-7 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl sm:rounded-2xl transition-all flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">Анализ...</span>
                </>
              ) : (
                <>
                  <span>Найти</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Parsing Loading State Card */}
          {isParsing && (
            <div className="mt-4 p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 flex items-center gap-3 animate-pulse shadow-sm">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="text-sm">
                <p className="font-semibold">ИИ-консьерж анализирует маршрут...</p>
                <p className="text-xs text-blue-700 opacity-90">
                  Извлекаем города, даты и проверяем наличие отелей STPC при стыковках
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !isParsing && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-xs font-semibold text-rose-600 hover:underline shrink-0"
              >
                Закрыть
              </button>
            </div>
          )}

          {/* Speech error if any */}
          {speechError && (
            <div className="mt-2 text-xs text-amber-700 px-3 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Quick Prompts Suggestions */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Популярные примеры запросов:
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(item.query);
                    handleSearch(item.query);
                  }}
                  disabled={isParsing}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs sm:text-sm text-slate-700 hover:text-blue-700 transition shadow-sm flex items-center gap-1.5 text-left disabled:opacity-50"
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mt-16 pt-12 border-t border-slate-200/80">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Gemini NLP 2.0</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Понимает сложные запросы в свободной форме на русском языке и автоматически выделяет точные IATA-коды и даты.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Hotel className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Отели STPC 4★</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Автоматический поиск пересадок от 8 часов с бесплатным отелем от авиакомпании (Дубай, Доха, Стамбул).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Duffel Split-Fares</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Прямой доступ к тарифам глобальной дистрибьюции Duffel со сравнением и экономией до 40%.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
