'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { VoiceButton } from '../../components/VoiceButton';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { parseWithGemini } from '../lib/api';
import { addStoredSearch } from '../../lib/mockStorage';
import { Currency, Language } from '../../lib/types';
import {
  Sparkles,
  Plane,
  ArrowRight,
  ShieldCheck,
  Hotel,
  Clock,
  Compass,
  AlertCircle,
  Loader2,
  Users,
  Briefcase,
  Luggage,
  Repeat,
  Calendar
} from 'lucide-react';

const QUICK_PROMPTS = [
  {
    title: '🏝️ Санкт-Петербург → Гуанчжоу',
    query: 'Питер Гуанчжоу 12 сентября',
    tag: 'Популярное',
  },
  {
    title: '🇯🇵 Москва → Токио на Новый год',
    query: 'Москва Токио новогодние праздники',
    tag: 'STPC Отель',
  },
  {
    title: '🇹🇭 Южно-Сахалинск → Дананг',
    query: 'Из Южно-Сахалинска в Дананг 12 сентября',
    tag: 'Пляжный отдых',
  },
  {
    title: '🌴 Владивосток → Нячанг на 10 дней',
    query: 'Владивосток Нячанг 20 октября на 10 дней',
    tag: 'Выгода до 40%',
  },
];

function getDefaultDepartureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [language, setLanguage] = useState<Language>('ru');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Filters State
  const [passengersCount, setPassengersCount] = useState<number>(1);
  const [cabinClass, setCabinClass] = useState<'economy' | 'business'>('economy');
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [returnDate, setReturnDate] = useState<string>('');
  const [hasBaggage, setHasBaggage] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  } = useSpeechRecognition();

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setError(null);
      startListening();
    }
  };

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

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
        const finalPassengers = parsed.passengers && parsed.passengers > 1 ? parsed.passengers : passengersCount;
        const finalCabin = parsed.cabinClass && parsed.cabinClass !== 'economy' ? parsed.cabinClass : cabinClass;
        const finalReturnDate = parsed.returnDate || (isRoundTrip ? returnDate : '');

        const params = new URLSearchParams({
          origin: parsed.origin.toUpperCase(),
          destination: parsed.destination.toUpperCase(),
          departure_date: parsed.departureDate || getDefaultDepartureDate(),
          passengers: String(finalPassengers),
          cabin_class: finalCabin,
        });

        if (finalReturnDate) {
          params.set('return_date', finalReturnDate);
        }
        if (parsed.searchStpc) {
          params.set('stpc', 'true');
        }

        // Сохраняем в локальную историю
        addStoredSearch(text, isListening ? 'voice' : 'text', `${parsed.origin} → ${parsed.destination}`);

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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center justify-center text-center space-y-8">
        {/* Hero Title */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-bold shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>AI-поиск перелётов со скрытыми тарифами и бесплатными отелями STPC</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            Летайте со скидкой <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">до 40%</span> и отелем в подарок
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Опишите поездку своими словами или голосом. ИИ-консьерж найдёт выгодные стыковки и оформит бесплатный 4★ отель от авиакомпании.
          </p>
        </div>

        {/* AI Search Box */}
        <div className="w-full max-w-3xl space-y-4">
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
              placeholder="Например: Питер Гуанчжоу 12 сентября"
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

          {/* Quick Filters Bar (Чипы параметров) */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            {/* Passengers Chip */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-700">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={passengersCount}
                onChange={(e) => setPassengersCount(Number(e.target.value))}
                className="bg-transparent font-bold focus:outline-none cursor-pointer"
              >
                <option value={1}>1 взрослый</option>
                <option value={2}>2 пассажира</option>
                <option value={3}>3 пассажира</option>
                <option value={4}>Семья (4)</option>
              </select>
            </div>

            {/* Cabin Class Chip */}
            <button
              type="button"
              onClick={() => setCabinClass(prev => prev === 'economy' ? 'business' : 'economy')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm transition font-bold ${
                cabinClass === 'business'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{cabinClass === 'business' ? 'Бизнес-класс' : 'Эконом'}</span>
            </button>

            {/* Round Trip Chip */}
            <button
              type="button"
              onClick={() => setIsRoundTrip(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm transition font-bold ${
                isRoundTrip
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isRoundTrip ? 'Туда и обратно' : 'В одну сторону'}</span>
            </button>

            {/* Baggage Chip */}
            <button
              type="button"
              onClick={() => setHasBaggage(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm transition font-bold ${
                hasBaggage
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              <Luggage className="w-3.5 h-3.5 text-emerald-600" />
              <span>{hasBaggage ? 'Багаж 23 кг' : 'Только ручная кладь'}</span>
            </button>
          </div>

          {/* Parsing Loading State Card */}
          {isParsing && (
            <div className="mt-4 p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 flex items-center gap-3 animate-pulse shadow-sm text-left">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="text-sm">
                <p className="font-semibold">ИИ-консьерж анализирует маршрут через Gemini 2.5 Flash...</p>
                <p className="text-xs text-blue-700 opacity-90">
                  Определяем точные IATA-коды городов, даты и программы транзитных отелей STPC
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !isParsing && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3 shadow-sm text-left">
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

          {/* Quick Prompts Suggestions */}
          <div className="mt-6 text-left">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Популярные направления:
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
                  <span>{item.title}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-100/60 text-blue-800 text-[10px] font-bold">
                    {item.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl pt-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Hotel className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Бесплатный отель STPC 4★</h3>
            <p className="text-xs text-slate-500">
              При длительных пересадках от 8 часов авиакомпания предоставляет гостиничный номер и трансфер.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Гарантия стыковок</h3>
            <p className="text-xs text-slate-500">
              Автоматическая проверка безвизового транзита (TWOV) и единый билет на весь маршрут.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Прямой GDS-доступ</h3>
            <p className="text-xs text-slate-500">
              Поиск по консолидационным тарифам с экономией до 40% по сравнению с розничными агрегаторами.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
