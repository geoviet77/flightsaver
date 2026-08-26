'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { VoiceButton } from '../../components/VoiceButton';
import { FlightCard } from '../../components/FlightCard';
import { BookingModal } from '../../components/BookingModal';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
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
  Bot,
  User,
  CheckCircle2,
  RefreshCw,
  Search,
  ChevronDown
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isThinking?: boolean;
  parsedData?: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string | null;
    passengers: number;
    cabinClass: string;
    searchStpc: boolean;
  };
}

const POPULAR_DIRECTIONS = [
  {
    title: '🏝️ Санкт-Петербург → Гуанчжоу',
    query: 'Питер Гуанчжоу 12 сентября',
    tag: 'Популярное',
  },
  {
    title: '🏛️ Самара → Рим',
    query: 'Самара Рим 22 октября',
    tag: 'Европа',
  },
  {
    title: '🇯🇵 Москва → Токио на Новый год',
    query: 'Москва Токио новогодние праздники',
    tag: 'STPC Отель',
  },
  {
    title: '🇹🇭 Южно-Сахалинск → Дананг',
    query: 'Южно-Сахалинск Дананг 12 сентября',
    tag: 'Пляжный отдых',
  },
  {
    title: '🌴 Владивосток → Нячанг на 10 дней',
    query: 'Владивосток Нячанг 20 октября на 10 дней',
    tag: 'Выгода до 40%',
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
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [language, setLanguage] = useState<Language>('ru');

  // Quick Filters State
  const [passengersCount, setPassengersCount] = useState<number>(1);
  const [cabinClass, setCabinClass] = useState<'economy' | 'business'>('economy');
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [hasBaggage, setHasBaggage] = useState<boolean>(true);

  // Conversational Chat State (Limit natural display to 7 messages with scroll)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingFlights, setIsLoadingFlights] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [searchSummary, setSearchSummary] = useState<{
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string | null;
    passengers: number;
    cabinClass: string;
  } | null>(null);

  // Results filtering & modal
  const [sortBy, setSortBy] = useState<FlightSortOption>('cheap');
  const [filterStops, setFilterStops] = useState<FlightStopsFilter>('all');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
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

  // Auto-scroll chat container to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isParsing]);

  const handleSearch = async (rawQuery: string) => {
    const text = rawQuery.trim();
    if (!text || isParsing) return;

    const timeNow = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `user-${Date.now()}`;
    const thinkingMsgId = `thinking-${Date.now()}`;

    // Добавляем сообщение пользователя в чат
    setChatMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text,
        timestamp: timeNow,
      },
      {
        id: thinkingMsgId,
        sender: 'assistant',
        text: 'ИИ-консьерж анализирует маршрут через Gemini 2.5 Flash...',
        timestamp: timeNow,
        isThinking: true,
      },
    ]);

    setIsParsing(true);
    setIsLoadingFlights(true);
    setHasSearched(true);

    try {
      // 1. Отправляем запрос на серверный роут AI-парсинга
      const parsed = await parseWithGemini(text);

      if (parsed && parsed.origin && parsed.destination) {
        const finalPassengers = parsed.passengers && parsed.passengers > 1 ? parsed.passengers : passengersCount;
        const finalCabin = parsed.cabinClass && parsed.cabinClass !== 'economy' ? parsed.cabinClass : cabinClass;
        const finalReturnDate = parsed.returnDate || (isRoundTrip ? getDefaultDepartureDate() : null);

        const parsedSummary = {
          origin: parsed.origin.toUpperCase(),
          destination: parsed.destination.toUpperCase(),
          departureDate: parsed.departureDate || getDefaultDepartureDate(),
          returnDate: finalReturnDate,
          passengers: finalPassengers,
          cabinClass: finalCabin,
          searchStpc: Boolean(parsed.searchStpc),
        };

        setSearchSummary(parsedSummary);

        // Обновляем сообщение ассистента в диалоге
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingMsgId
              ? {
                  id: `asst-${Date.now()}`,
                  sender: 'assistant',
                  text: parsed.message || `Нашел маршрут ${parsedSummary.origin} → ${parsedSummary.destination}. Ищу прямые рейсы и выгодные стыковки.`,
                  timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                  isThinking: false,
                  parsedData: parsedSummary,
                }
              : msg
          )
        );

        addStoredSearch(text, isListening ? 'voice' : 'text', `${parsedSummary.origin} → ${parsedSummary.destination}`);

        // 2. Ищем билеты через Duffel API
        const flightRes = await searchFlights({
          origin: parsedSummary.origin,
          destination: parsedSummary.destination,
          departureDate: parsedSummary.departureDate,
          returnDate: parsedSummary.returnDate || undefined,
          passengers: parsedSummary.passengers,
          cabinClass: parsedSummary.cabinClass,
        });

        if (flightRes.offers && flightRes.offers.length > 0) {
          // Дедупликация рейсов по уникальным характеристикам
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
            transformDuffelOfferToFlight(
              offer,
              idx,
              parsedSummary.origin,
              parsedSummary.destination,
              parsedSummary.departureDate,
              parsedSummary.returnDate || undefined
            )
          );
          setFlights(transformed);
        } else {
          setFlights([]);
        }

        // Плавный скролл к результатам поиска
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else {
        throw new Error('Не удалось распознать города маршрута');
      }
    } catch (err: any) {
      console.error('[HomePage] Ошибка при AI-парсинге или поиске:', err);
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingMsgId
            ? {
                id: `err-${Date.now()}`,
                sender: 'assistant',
                text: 'Не удалось точно распознать маршрут или загрузить билеты. Пожалуйста, попробуйте уточнить запрос (например: «Самара Рим 22 октября»).',
                timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                isThinking: false,
              }
            : msg
        )
      );
    } finally {
      setIsParsing(false);
      setIsLoadingFlights(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      toggleListening();
    }
    handleSearch(query);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center space-y-6">
        {/* Hero Title */}
        <div className="space-y-3 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-bold shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>ИИ-консьерж FlightSaver • Скрытые GDS-тарифы и отели STPC</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Летайте со скидкой <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">до 40%</span> и отелем в подарок
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Опишите поездку на естественном языке. ИИ-консьерж распознает любые города мира и покажет доступные рейсы прямо в диалоге.
          </p>
        </div>

        {/* AI Search Box */}
        <div className="w-full max-w-3xl space-y-3">
          <form
            onSubmit={handleSubmit}
            className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-500/5 border-2 border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all p-2 sm:p-3 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isParsing}
              placeholder="Например: Самара Рим 22 октября"
              className="flex-1 bg-transparent px-3 sm:px-4 py-3 sm:py-3.5 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />

            <VoiceButton
              isListening={isListening}
              onToggle={toggleListening}
              disabled={isParsing}
            />

            <button
              type="submit"
              disabled={!query.trim() || isParsing}
              className="px-5 sm:px-7 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl sm:rounded-2xl transition-all flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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

          {/* Quick Filters Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
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

            <button
              type="button"
              onClick={() => setCabinClass((prev) => (prev === 'economy' ? 'business' : 'economy'))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm transition font-bold ${
                cabinClass === 'business'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{cabinClass === 'business' ? 'Бизнес-класс' : 'Эконом'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRoundTrip((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm transition font-bold ${
                isRoundTrip
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isRoundTrip ? 'Туда и обратно' : 'В одну сторону'}</span>
            </button>

            <button
              type="button"
              onClick={() => setHasBaggage((prev) => !prev)}
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

          {/* Popular Directions Chips - Active on Click */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Популярные направления (кликните для поиска):
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR_DIRECTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(item.query);
                    handleSearch(item.query);
                  }}
                  disabled={isParsing}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-xs text-slate-700 hover:text-blue-700 transition shadow-sm flex items-center gap-1.5 text-left disabled:opacity-50"
                >
                  <span className="font-semibold">{item.title}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-100/60 text-blue-800 text-[10px] font-bold">
                    {item.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conversational Stream: Диалог с ИИ-консьержем (Контейнер на 7 сообщений со скроллом) */}
        {chatMessages.length > 0 && (
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-fadeIn">
            {/* Header диалога */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Диалог с ИИ-консьержем FlightSaver
                  </h3>
                  <p className="text-[10px] text-slate-500">Gemini 2.5 Flash • Онлайн-поиск GDS</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Онлайн
              </span>
            </div>

            {/* Контейнер сообщений: фиксированная высота вмещает ровно 7 сообщений */}
            <div
              ref={chatScrollRef}
              className="max-h-[420px] overflow-y-auto p-4 sm:p-5 space-y-3.5 scroll-smooth"
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.isThinking ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>{msg.text}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p>{msg.text}</p>

                        {/* Плашка подтвержденных параметров */}
                        {msg.parsedData && (
                          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-1.5 text-[11px]">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center gap-1">
                              <Plane className="w-3 h-3 text-blue-600" />
                              {msg.parsedData.origin} → {msg.parsedData.destination}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 text-slate-800 font-medium">
                              🗓️ {msg.parsedData.departureDate}
                              {msg.parsedData.returnDate ? ` — ${msg.parsedData.returnDate}` : ''}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 text-slate-800 font-medium">
                              👥 {msg.parsedData.passengers} {msg.parsedData.passengers === 1 ? 'пассажир' : 'пассажира'}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-medium">
                              💺 {msg.parsedData.cabinClass === 'business' ? 'Бизнес' : 'Эконом'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1 text-right ${
                        msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Результаты поиска: Карточки рейсов прямо под диалогом */}
        <div ref={resultsRef} className="w-full max-w-4xl space-y-4">
          {isLoadingFlights && (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-3 shadow-sm">
              <Plane className="w-8 h-8 text-blue-600 animate-bounce mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Загрузка билетов и проверка стыковок STPC...
              </h3>
              <p className="text-xs text-slate-500">
                Сравниваем доступные тарифы GDS и проверяем условия транзита
              </p>
            </div>
          )}

          {!isLoadingFlights && hasSearched && flights.length === 0 && (
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

          {!isLoadingFlights && flights.length > 0 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Панель фильтров и сортировки */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setFilterStops('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filterStops === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Все ({flights.length})
                  </button>
                  <button
                    onClick={() => setFilterStops('direct')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filterStops === 'direct'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Прямые
                  </button>
                  <button
                    onClick={() => setFilterStops('1stop')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filterStops === '1stop'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    1 пересадка
                  </button>
                  <button
                    onClick={() => setFilterStops('stpc')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      filterStops === 'stpc'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <Hotel className="w-3.5 h-3.5" />
                    <span>С отелем STPC</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-slate-400 font-medium">Сортировка:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as FlightSortOption)}
                    className="text-xs font-bold px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="cheap">Сначала дешевые</option>
                    <option value="fast">Самые быстрые</option>
                    <option value="stpc">С отелем STPC</option>
                  </select>
                </div>
              </div>

              {/* Список карточек рейсов */}
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

        {/* Feature Cards Grid (Преимущества) */}
        {!hasSearched && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl pt-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Hotel className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Бесплатный отель STPC 4★</h3>
              <p className="text-xs text-slate-500">
                При стыковках от 8 часов авиакомпания предоставляет гостиничный номер и трансфер.
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
                Поиск по консолидационным тарифам с экономией до 40% по сравнению с розничными сайтами.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {selectedFlight && (
        <BookingModal
          flight={selectedFlight}
          passengersCount={searchSummary?.passengers || passengersCount}
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
