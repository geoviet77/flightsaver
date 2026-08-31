'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plane,
  ArrowRight,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Search,
  AlertCircle,
  Clock,
  Sparkles,
  Luggage,
  Hotel
} from 'lucide-react';
import { Header } from '../../../components/Header';
import { FlightCard } from '../../../components/FlightCard';
import { BookingModal } from '../../../components/BookingModal';
import { searchFlights, DuffelOffer, DuffelOfferSlice, DuffelSliceSegment } from '../../lib/api';
import { Flight, Currency, Language, BookingOrder } from '../../../lib/types';
import { checkStpcEligibility } from '../../../lib/stpcService';

type FlightSortOption = 'cheap' | 'fast' | 'stpc';
type FlightStopsFilter = 'all' | 'direct' | '1stop' | 'stpc';

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

function parseDurationString(dur?: string): { formatted: string; minutes: number } {
  if (!dur) return { formatted: '8ч 30м', minutes: 510 };
  const matches = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!matches) return { formatted: dur.replace('PT', ''), minutes: 510 };
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const totalMinutes = hours * 60 + minutes;
  return {
    formatted: `${hours}ч ${minutes}м`,
    minutes: totalMinutes,
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

  // Безопасный расчет конвертации валют (USD -> RUB)
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

  // Строгая проверка STPC программы через сервис stpcService
  const stpcInfo = checkStpcEligibility(
    {
      airlineCode: firstSeg?.operating_carrier?.iata_code || offer.owner?.iata_code || '',
      airlineName: firstSeg?.operating_carrier?.name || offer.owner?.name || '',
      hubAirport: transitAirport,
      hubCity: transitCity,
    },
    transitMinutes
  );

  const isStpcEligible = Boolean(stpcInfo.eligible);

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
      stpcDetails: isStpcEligible ? `${stpcInfo.programName}: Бесплатный отель ${stpcInfo.hotelStars} (экономия +${stpcInfo.estimatedSavingsRub.toLocaleString('ru-RU')} ₽)` : undefined,
      stpcInfo: isStpcEligible ? stpcInfo : undefined,
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
    stpcInfo: isStpcEligible ? stpcInfo : undefined,
    baggageIncluded: true,
    baggageDescription: 'Багаж 23 кг + Ручная кладь 8 кг',
    tags: isStpcEligible ? [`🎁 ${stpcInfo.programName} (${stpcInfo.hotelStars})`, 'Duffel Verified'] : ['Duffel Verified'],
    stopsCount: Math.max(0, segments.length - 1),
    cabinClass: 'Economy',
  };
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const origin = (searchParams.get('origin') || searchParams.get('from') || '').trim().toUpperCase();
  const destination = (searchParams.get('destination') || searchParams.get('to') || '').trim().toUpperCase();
  const departureDate = (searchParams.get('departure_date') || searchParams.get('departureDate') || searchParams.get('date') || '').trim();
  const returnDate = (searchParams.get('return_date') || searchParams.get('returnDate') || '').trim();
  const passengers = Math.max(1, parseInt(searchParams.get('passengers') || '1', 10));
  const cabinClass = (searchParams.get('cabin_class') || searchParams.get('cabinClass') || 'economy').trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [language, setLanguage] = useState<Language>('ru');

  // Filters & sorting
  const [sortBy, setSortBy] = useState<FlightSortOption>('cheap');
  const [filterStops, setFilterStops] = useState<FlightStopsFilter>('all');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const fetchFlightOffers = async () => {
    if (!origin || !destination || !departureDate) {
      setLoading(false);
      setError('Недостаточно параметров для поиска. Укажите город вылета, назначения и дату.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await searchFlights({
        origin,
        destination,
        departureDate,
        returnDate: returnDate || undefined,
        passengers,
        cabinClass,
      });

      if (!res.offers || res.offers.length === 0) {
        setFlights([]);
      } else {
        // Дедупликация офферов перед отображением
        const seenKeys = new Set<string>();
        const uniqueOffers = res.offers.filter((offer: any) => {
          const seg0 = offer.slices?.[0]?.segments?.[0];
          const lastSeg = offer.slices?.[0]?.segments?.[offer.slices?.[0]?.segments?.length - 1] || seg0;
          const key = `${offer.owner?.iata_code || ''}_${seg0?.departing_at || ''}_${lastSeg?.arriving_at || ''}_${seg0?.operating_carrier_flight_number || ''}_${offer.total_amount}`;
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        });

        const transformed = uniqueOffers.map((offer: DuffelOffer, idx: number) =>
          transformDuffelOfferToFlight(offer, idx, origin, destination, departureDate, returnDate)
        );
        setFlights(transformed);
      }
    } catch (err: any) {
      console.error('Search flights error:', err);
      setError(err?.message || 'Не удалось загрузить билеты. Проверьте соединение или параметры поиска.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlightOffers();
  }, [origin, destination, departureDate, returnDate, passengers, cabinClass]);

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

  const handleSelectFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    setIsBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      {/* Top Search Summary Bar */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition text-slate-600"
              title="Изменить поиск"
            >
              <Search className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-900">
                <span>{origin || 'MOW'}</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <span>{destination || 'BKK'}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {departureDate || 'Вылет не указан'}
                {returnDate ? ` • Обратно: ${returnDate}` : ' • В одну сторону'} • {passengers}{' '}
                {passengers === 1 ? 'пассажир' : 'пассажира'} •{' '}
                {cabinClass === 'business' ? 'Бизнес-класс' : 'Эконом'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchFlightOffers()}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Loading State */}
        {loading && (
          <div className="space-y-4 py-8">
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
              <Plane className="w-10 h-10 text-blue-600 animate-bounce mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Поиск перелетов через глобальную сеть авиакомпаний...
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Сравниваем тарифы GDS, проверяем условия стыковок и бесплатного отеля STPC
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-8 shadow-sm">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-900">Не удалось загрузить билеты</h3>
              <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">{error}</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => fetchFlightOffers()}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition"
              >
                Попробовать снова
              </button>
              <Link
                href="/"
                className="px-5 py-2.5 bg-white border border-rose-300 text-rose-800 rounded-xl text-sm font-semibold hover:bg-rose-100/50 transition"
              >
                Вернуться к поиску
              </Link>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && flights.length === 0 && (
          <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-4 my-8 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Прямых и стыковочных рейсов не найдено</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                По направлению {origin} → {destination} на дату {departureDate} нет доступных предложений. Попробуйте выбрать соседние даты или изменить города.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => fetchFlightOffers()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Попробовать снова</span>
              </button>
              <Link
                href="/"
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition"
              >
                Изменить маршрут
              </Link>
            </div>
          </div>
        )}

        {/* Results List */}
        {!loading && !error && flights.length > 0 && (
          <div className="space-y-6">
            {/* Filter and Sorting Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFilterStops('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    filterStops === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Все рейсы ({flights.length})
                </button>
                <button
                  onClick={() => setFilterStops('direct')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    filterStops === 'direct'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Прямые
                </button>
                <button
                  onClick={() => setFilterStops('1stop')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    filterStops === '1stop'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  1 пересадка
                </button>
                <button
                  onClick={() => setFilterStops('stpc')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    filterStops === 'stpc'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Hotel className="w-3.5 h-3.5" />
                  <span>С отелем STPC</span>
                </button>
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-slate-400 font-medium">Сортировка:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as FlightSortOption)}
                  className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="cheap">Сначала дешевые</option>
                  <option value="fast">Самые быстрые</option>
                  <option value="stpc">С отелем STPC</option>
                </select>
              </div>
            </div>

            {/* Flight Cards */}
            <div className="grid gap-4">
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
      </main>

      {/* Booking Modal */}
      {selectedFlight && (
        <BookingModal
          flight={selectedFlight}
          passengersCount={passengers}
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

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <Plane className="w-8 h-8 text-blue-600 animate-bounce" />
            <p className="text-sm font-medium text-slate-500">Загрузка результатов поиска...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
