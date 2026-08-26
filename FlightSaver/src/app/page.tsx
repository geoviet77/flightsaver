'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import { FlightCard } from '../../components/FlightCard';
import { BookingModal } from '../../components/BookingModal';
import { parseWithGemini, searchFlights, DuffelOffer, DuffelOfferSlice, DuffelSliceSegment } from '../lib/api';
import { addStoredSearch } from '../../lib/mockStorage';
import { Flight, Currency, Language, BookingOrder } from '../../lib/types';
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
  RotateCcw,
  Search
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  isThinking?: boolean;
  meta?: {
    origin?: string;
    destination?: string;
    date?: string;
    returnDate?: string | null;
    passengers?: number;
    cabinClass?: string;
  };
}

const POPULAR_PROMPTS = [
  {
    title: '🏝️ Питер → Гуанчжоу',
    query: 'Питер Гуанчжоу 12 сентября',
  },
  {
    title: '🏛️ Самара → Рим',
    query: 'Самара Рим 22 октября',
  },
  {
    title: '🇯🇵 Москва → Токио на НГ',
    query: 'Москва Токио новогодние праздники',
  },
  {
    title: '🇹🇭 Южно-Сахалинск → Дананг',
    query: 'Южно-Сахалинск Дананг 12 сентября',
  },
];

const RATES_TO_RUB: Record<string, number> = {
  RUB: 1,
  USD: 92,
  EUR: 100,
  GBP: 118,
  AED: 25,
  CNY: 12.8,
  THB: 2.65,
};

const STPC_WHITELIST_AIRLINES = ['TK', 'EK', 'QR', 'GF', 'EY', 'CA', 'CZ', 'MU', 'ET'];

type FlightSortOption = 'cheap' | 'fast' | 'stpc';
type FlightStopsFilter = 'all' | 'direct' | '1stop' | 'stpc';

function getDefaultDepartureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function parseDurationString(dur?: string): { formatted: string; minutes: number } {
  if (!dur) return { formatted: '8ч 30м', minutes: 510 };
  const matches = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!matches) return { formatted: dur.replace('PT', ''), minutes: 510 };
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  return {
    formatted: `${hours}ч ${minutes}м`,
    minutes: hours * 60 + minutes,
  };
}

function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      const match = isoString.match(/T(\d{2}:\d{2})/);
      return match ? match[1] : '--:--';
    }
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function calculateLayoverMinutes(arrIso?: string, depIso?: string): number {
  if (!arrIso || !depIso) return 0;
  try {
    const arr = new Date(arrIso).getTime();
    const dep = new Date(depIso).getTime();
    return Math.max(0, Math.round((dep - arr) / 60000));
  } catch {
    return 0;
  }
}

function transformDuffelOfferToFlight(
  offer: DuffelOffer,
  index: number,
  defaultOrigin: string,
  defaultDestination: string,
  departureDateParam: string,
  returnDateParam?: string
): Flight {
  const slice1: DuffelOfferSlice | undefined = offer.slices?.[0];
  const segments: DuffelSliceSegment[] = slice1?.segments || [];
  const firstSeg: DuffelSliceSegment | undefined = segments[0];
  const lastSeg: DuffelSliceSegment | undefined = segments[segments.length - 1] || firstSeg;

  const originIata = firstSeg?.origin?.iata_code || slice1?.origin?.iata_code || defaultOrigin;
  const originCity = firstSeg?.origin?.city_name || firstSeg?.origin?.name || originIata;
  const destinationIata = lastSeg?.destination?.iata_code || slice1?.destination?.iata_code || defaultDestination;
  const destinationCity = lastSeg?.destination?.city_name || lastSeg?.destination?.name || destinationIata;

  const totalDurationInfo = parseDurationString(slice1?.duration);
  const rawAmount = parseFloat(offer.total_amount) || 280;
  const offerCurrency = (offer.total_currency || 'USD').toUpperCase();
  const rate = RATES_TO_RUB[offerCurrency] || 92;

  let totalPriceRub = Math.round(rawAmount * rate * 1.015 + 1500);
  if (totalPriceRub < 5000 && originIata !== destinationIata) {
    totalPriceRub = Math.max(totalPriceRub, 18500);
  }
  const marketPriceRub = Math.round(totalPriceRub * 1.35);
  const savedAmountRub = marketPriceRub - totalPriceRub;
  const netSupplierFare = Math.round(totalPriceRub * 0.95);
  const serviceFee = Math.round(totalPriceRub * 0.05);

  const hasTransit = segments.length > 1;
  let transitCity = '';
  let transitAirport = '';
  let transitMinutes = 0;

  if (hasTransit && segments[0] && segments[1]) {
    transitCity = segments[0].destination?.city_name || segments[0].destination?.name || '';
    transitAirport = segments[0].destination?.iata_code || '';
    transitMinutes = calculateLayoverMinutes(segments[0].arriving_at, segments[1].departing_at);
  }

  const operatingAirlineCode = firstSeg?.operating_carrier?.iata_code || offer.owner?.iata_code || '';
  const isStpcEligible = hasTransit && transitMinutes >= 480 && transitMinutes <= 1440 && STPC_WHITELIST_AIRLINES.includes(operatingAirlineCode);

  const flightSegments = segments.map((seg, sIdx) => {
    const segDurationInfo = parseDurationString(seg.duration);
    const airlineName = seg.operating_carrier?.name || seg.marketing_carrier?.name || offer.owner?.name || 'Авиакомпания';
    const airlineCode = seg.operating_carrier?.iata_code || seg.marketing_carrier?.iata_code || offer.owner?.iata_code || 'FL';
    const flightNum = `${airlineCode} ${seg.operating_carrier_flight_number || seg.marketing_carrier_flight_number || (100 + sIdx * 5)}`;

    return {
      airline: airlineName,
      airlineCode,
      airlineLogoUrl: seg.operating_carrier?.logo_symbol_url || offer.owner?.logo_symbol_url,
      flightNumber: flightNum,
      fromAirport: seg.origin?.name || seg.origin?.iata_code || originIata,
      fromCity: seg.origin?.city_name || seg.origin?.name || originCity,
      fromIata: seg.origin?.iata_code || originIata,
      toAirport: seg.destination?.name || seg.destination?.iata_code || destinationIata,
      toCity: seg.destination?.city_name || seg.destination?.name || destinationCity,
      toIata: seg.destination?.iata_code || destinationIata,
      departureTime: formatTime(seg.departing_at),
      arrivalTime: formatTime(seg.arriving_at),
      duration: segDurationInfo.formatted,
      bookingProvider: offer.owner?.name || 'Duffel Global API',
      cabinClass: (seg.passengers?.[0]?.cabin_class_marketing_name || 'Economy') as any,
      aircraft: seg.aircraft?.name || 'Airbus A320 / Boeing 777',
      baggage: '1 × 23 кг + ручная кладь 8 кг',
    };
  });

  return {
    id: offer.id || `duffel-offer-${index}`,
    originCity,
    destinationCity,
    originIata,
    destinationIata,
    departureDate: departureDateParam,
    returnDate: returnDateParam,
    totalDuration: totalDurationInfo.formatted,
    totalDurationMinutes: totalDurationInfo.minutes,
    segments: flightSegments,
    transit: {
      hasTransit,
      transitCity: transitCity || undefined,
      transitAirport: transitAirport || undefined,
      transitDuration: transitMinutes > 0 ? `${Math.floor(transitMinutes / 60)}ч ${transitMinutes % 60}м` : undefined,
      stpcHotelIncluded: isStpcEligible,
      stpcDetails: isStpcEligible ? 'Бесплатный отель 4★ STPC от авиакомпании при стыковке' : undefined,
      visaFreeTransit: true,
      baggageRecheckRequired: false,
    },
    pricing: {
      currency: 'RUB',
      totalPrice: totalPriceRub,
      marketPrice: marketPriceRub,
      savedAmount: savedAmountRub,
      savedPercentage: 26,
      netSupplierFare,
      serviceFee,
      segmentBreakdowns: flightSegments.map((s) => ({
        segmentTitle: `${s.fromIata} → ${s.toIata} (${s.airline})`,
        providerName: offer.owner?.name || 'Duffel API',
        price: Math.round(totalPriceRub / (flightSegments.length || 1)),
        currency: 'RUB',
      })),
      splitSavingsReason: 'Прямой тариф Duffel GDS со скидкой консолидатора',
    },
    isBestValue: index === 0,
    isFastest: index === 1,
    isStpcEligible,
    baggageIncluded: true,
    baggageDescription: 'Багаж 23 кг + Ручная кладь 8 кг',
    tags: isStpcEligible ? ['🎁 Отель STPC 4★', 'Duffel Verified'] : ['Duffel Verified'],
    stopsCount: Math.max(0, segments.length - 1),
    cabinClass: 'Economy',
  };
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [language, setLanguage] = useState<Language>('ru');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Куда и в какие даты вы планируете отправиться?',
      time: '21:23',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Sorting and selection
  const [sortBy, setSortBy] = useState<FlightSortOption>('cheap');
  const [filterStops, setFilterStops] = useState<FlightStopsFilter>('all');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Автоскролл чата
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Голосовой ввод (Web Speech API)
  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Голосовой ввод не поддерживается в вашем браузере.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSubmitQuery(transcript);
    };

    recognition.start();
  };

  const handleSubmitQuery = async (searchQuery: string) => {
    const text = searchQuery.trim();
    if (!text || isLoading) return;

    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Добавляем сообщение пользователя
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);
    setHasSearched(true);

    try {
      // 1. Вызываем серверный роут AI-парсера Gemini 2.5 Flash
      const parsed = await parseWithGemini(text);

      if (parsed && parsed.origin && parsed.destination) {
        const origin = parsed.origin.toUpperCase();
        const destination = parsed.destination.toUpperCase();
        const departureDate = parsed.departureDate || getDefaultDepartureDate();
        const returnDate = parsed.returnDate || null;
        const passengers = parsed.passengers || 1;
        const cabinClass = parsed.cabinClass || 'economy';

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `Анализирую маршрут: «${text}». Ищу варианты со скрытыми оптовыми тарифами и бесплатными транзитными отелями STPC...`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          meta: {
            origin,
            destination,
            date: departureDate,
            returnDate,
            passengers,
            cabinClass,
          },
        };

        setMessages((prev) => [...prev, aiMsg]);
        addStoredSearch(text, isListening ? 'voice' : 'text', `${origin} → ${destination}`);

        // 2. Ищем билеты через Duffel API
        const flightRes = await searchFlights({
          origin,
          destination,
          departureDate,
          returnDate: returnDate || undefined,
          passengers,
          cabinClass,
        });

        if (flightRes.offers && flightRes.offers.length > 0) {
          // Дедупликация рейсов
          const seenKeys = new Set<string>();
          const uniqueOffers = flightRes.offers.filter((offer: any) => {
            const seg0 = offer.slices?.[0]?.segments?.[0];
            const lastSeg = offer.slices?.[0]?.segments?.[offer.slices?.[0]?.segments?.length - 1] || seg0;
            const key = `${offer.owner?.iata_code || ''}_${seg0?.departing_at || ''}_${lastSeg?.arriving_at || ''}_${seg0?.operating_carrier_flight_number || ''}_${offer.total_amount}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
          });

          const transformed = uniqueOffers.map((offer: DuffelOffer, idx: number) =>
            transformDuffelOfferToFlight(offer, idx, origin, destination, departureDate, returnDate || undefined)
          );
          setFlights(transformed);
        } else {
          setFlights([]);
        }

        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else {
        throw new Error('Не удалось определить маршрут');
      }
    } catch (e: any) {
      console.error('Search error:', e);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Не удалось точно распознать маршрут или загрузить билеты. Пожалуйста, попробуйте уточнить запрос (например: «Питер Гуанчжоу 12 сентября»).',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: 'Куда и в какие даты вы планируете отправиться?',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setFlights([]);
    setHasSearched(false);
  };

  const handleSelectFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    setIsBookingOpen(true);
  };

  // Сортировка и фильтрация
  const filteredFlights = flights.filter((f) => {
    if (filterStops === 'direct') return f.stopsCount === 0;
    if (filterStops === '1stop') return f.stopsCount === 1;
    if (filterStops === 'stpc') return f.isStpcEligible;
    return true;
  });

  filteredFlights.sort((a, b) => {
    if (sortBy === 'cheap') return a.pricing.totalPrice - b.pricing.totalPrice;
    if (sortBy === 'fast') return a.totalDurationMinutes - b.totalDurationMinutes;
    if (sortBy === 'stpc') {
      if (a.isStpcEligible && !b.isStpcEligible) return -1;
      if (!a.isStpcEligible && b.isStpcEligible) return 1;
      return a.pricing.totalPrice - b.pricing.totalPrice;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#f8fbff] flex flex-col font-sans">
      <Header
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-12 pb-16 flex flex-col items-center">
        {/* Заголовок Hero */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 text-center tracking-tight leading-tight mb-4">
          Умный поиск перелётов <br />
          <span className="text-sky-500">одной фразой</span>
        </h1>

        {/* Плашка-подсказка */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs sm:text-sm font-medium mb-8 shadow-sm">
          <span>💡</span>
          <span>Напишите или скажите голосом куда и когда вы хотите полететь</span>
        </div>

        {/* Строка поиска One-Input (64px, Glowing border) */}
        <div className="w-full max-w-2xl relative mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitQuery(query);
            }}
            className="relative flex items-center w-full h-16 bg-white rounded-full border-2 border-sky-300 shadow-[0_0_25px_rgba(14,165,233,0.22)] focus-within:border-sky-500 focus-within:shadow-[0_0_30px_rgba(14,165,233,0.35)] transition-all duration-300 px-4"
          >
            <span className="text-sky-400 pl-2 pr-1 text-lg">✨</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Куда и когда вы хотите полететь? (например: Самара Рим 22 октября)"
              className="flex-1 h-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm sm:text-base px-2"
            />

            {/* Иконка микрофона */}
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-sky-600 transition-colors ${
                isListening ? 'text-red-500 animate-pulse bg-red-50' : ''
              }`}
              title="Голосовой ввод"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>

            {/* Кнопка со стрелкой */}
            <button
              type="submit"
              disabled={!query.trim()}
              className="w-10 h-10 ml-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>

          {/* Популярные подсказки */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {POPULAR_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(p.query);
                  handleSubmitQuery(p.query);
                }}
                className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 text-xs text-slate-600 hover:text-sky-700 transition shadow-sm font-medium"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Блок диалога с ИИ */}
        <div className="w-full max-w-2xl mt-4">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ДИАЛОГ С ИИ КОНСЬЕРЖЕМ</span>
            </div>
            <button
              type="button"
              onClick={handleResetChat}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600 font-medium transition-colors"
            >
              <span>🔄</span>
              <span>Задать новый вопрос</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4 max-h-[420px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
                    🤖
                  </div>
                )}
                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-[11px] font-semibold opacity-75">
                      {msg.sender === 'user' ? 'Вы' : '✨ ИИ Консьерж FlightSaver'}
                    </span>
                    <span className="text-[10px] opacity-60">{msg.time}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Метаданные маршрута при распознавании */}
                  {msg.meta && msg.meta.origin && msg.meta.destination && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 font-bold">
                        ✈️ {msg.meta.origin} → {msg.meta.destination}
                      </span>
                      {msg.meta.date && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 text-slate-700">
                          🗓️ {msg.meta.date}
                        </span>
                      )}
                      {msg.meta.passengers && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 text-slate-700">
                          👥 {msg.meta.passengers} пасс.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start items-center text-slate-400 text-xs pl-11">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="ml-1">ИИ-консьерж анализирует тарифы...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Результаты поиска: Карточки рейсов */}
        <div ref={resultsRef} className="w-full max-w-2xl mt-8 space-y-4">
          {!isLoading && hasSearched && flights.length === 0 && (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-3 shadow-sm">
              <Search className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Билетов не найдено на выбранную дату
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Попробуйте выбрать соседние даты вылета или изменить город отправления/назначения.
              </p>
            </div>
          )}

          {!isLoading && flights.length > 0 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Доступные предложения ({flights.length})
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as FlightSortOption)}
                  className="text-xs font-semibold px-2.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
                >
                  <option value="cheap">Сначала дешевые</option>
                  <option value="fast">Самые быстрые</option>
                  <option value="stpc">С отелем STPC</option>
                </select>
              </div>

              <div className="grid gap-3.5">
                {filteredFlights.map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    onSelect={handleSelectFlight}
                    currency={currency}
                    language={language}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="w-full max-w-2xl mt-12 pt-6 border-t border-slate-200/60 text-center text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center justify-center gap-2 font-medium text-slate-500">
            <span>🎧 ПОДДЕРЖКА 24/7</span>
            <span>•</span>
            <span>Оптовые тарифы NDC/GDS</span>
          </div>
          <div>© 2026 FlightSaver AI Travel. Умный поиск авиабилетов.</div>
        </div>
      </main>

      {/* Booking Modal */}
      {selectedFlight && (
        <BookingModal
          flight={selectedFlight}
          passengersCount={1}
          isOpen={isBookingOpen}
          onClose={() => {
            setIsBookingOpen(false);
            setSelectedFlight(null);
          }}
          onBookingComplete={(order: BookingOrder) => {
            setIsBookingOpen(false);
          }}
        />
      )}
    </div>
  );
}
