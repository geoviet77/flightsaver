'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plane,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Clock,
  ShieldCheck,
  Hotel,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Users,
  Calendar,
  Briefcase
} from 'lucide-react';
import { searchFlights, DuffelOffer, DuffelOfferSlice, DuffelSliceSegment } from '../../lib/api';
import { Flight, Currency, Language, FlightSortOption, FlightStopsFilter, BookingOrder } from '../../../lib/types';
import { Header } from '../../../components/Header';
import { FlightCard } from '../../../components/FlightCard';
import { BookingModal } from '../../../components/BookingModal';

function parseDurationString(isoDuration?: string): { formatted: string; minutes: number } {
  if (!isoDuration) return { formatted: '4ч 30м', minutes: 270 };
  const hMatch = isoDuration.match(/(\d+)H/);
  const mMatch = isoDuration.match(/(\d+)M/);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  const totalMinutes = hours * 60 + mins;
  return {
    formatted: `${hours}ч ${mins < 10 ? '0' : ''}${mins}м`,
    minutes: totalMinutes || 240,
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
  const rawPrice = parseFloat(offer.total_amount) || 45000;
  const currency: Currency = (offer.total_currency?.toUpperCase() as Currency) || 'RUB';

  const hasTransit = segments.length > 1;
  let transitCity = '';
  let transitAirport = '';
  let transitMinutes = 0;

  if (hasTransit && segments[0] && segments[1]) {
    transitCity = segments[0].destination?.city_name || segments[0].destination?.name || '';
    transitAirport = segments[0].destination?.iata_code || '';
    transitMinutes = calculateLayoverMinutes(segments[0].arriving_at, segments[1].departing_at);
  }

  const isStpcEligible = hasTransit && (transitMinutes >= 480 || ['DXB', 'DOH', 'IST', 'AUH', 'ADD'].includes(transitAirport));

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

  const netSupplierFare = Math.round(rawPrice * 0.95);
  const serviceFee = Math.round(rawPrice * 0.05);
  const marketPrice = Math.round(rawPrice * 1.18);
  const savedAmount = marketPrice - rawPrice;

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
      stpcDetails: isStpcEligible ? 'Бесплатный отель 4★ STPC при стыковке' : undefined,
      visaFreeTransit: true,
      baggageRecheckRequired: false,
    },
    pricing: {
      currency,
      totalPrice: Math.round(rawPrice),
      marketPrice,
      savedAmount,
      savedPercentage: 18,
      netSupplierFare,
      serviceFee,
      segmentBreakdowns: flightSegments.map((s) => ({
        segmentTitle: `${s.fromIata} → ${s.toIata} (${s.airline})`,
        providerName: offer.owner?.name || 'Duffel API',
        price: Math.round(rawPrice / (flightSegments.length || 1)),
        currency,
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
        const transformed = res.offers.map((offer: DuffelOffer, idx: number) =>
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

  // Apply local sorting and filtering
  const filteredFlights = flights.filter((f) => {
    if (filterStops === 'direct') return f.stopsCount === 0;
    if (filterStops === '1stop') return f.stopsCount === 1;
    if (filterStops === 'stpc') return f.isStpcEligible;
    return true;
  });

  filteredFlights.sort((a, b) => {
    if (sortBy === 'cheap') return a.pricing.totalPrice - b.pricing.totalPrice;
    if (sortBy === 'fast') return (a.totalDurationMinutes || 0) - (b.totalDurationMinutes || 0);
    if (sortBy === 'stpc') return (b.isStpcEligible ? 1 : 0) - (a.isStpcEligible ? 1 : 0);
    return a.pricing.totalPrice - b.pricing.totalPrice;
  });

  const handleSelectFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    setIsBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      {/* Hero / Search Summary Bar */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition flex items-center gap-1.5 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Поиск</span>
            </Link>

            <div>
              <div className="flex items-center gap-2 text-lg sm:text-xl font-extrabold text-slate-900">
                <span>{origin || '—'}</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <span>{destination || '—'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {departureDate} {returnDate ? `— ${returnDate}` : '(в одну сторону)'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {passengers} {passengers === 1 ? 'пассажир' : 'пассажира'}
                </span>
                <span>•</span>
                <span className="capitalize">{cabinClass}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => fetchFlightOffers()}
              disabled={loading}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Plane className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Ищем лучшие билеты через Duffel API...</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Сравниваем предложения сотен авиакомпаний и проверяем наличие стыковок с отелями STPC
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-white border border-slate-200 rounded-2xl animate-pulse p-6">
                  <div className="h-6 bg-slate-100 rounded w-1/4 mb-4"></div>
                  <div className="h-12 bg-slate-100 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-slate-100 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-8">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-900">Не удалось загрузить билеты</h3>
              <p className="text-sm text-rose-700 mt-1 max-w-md mx-auto">{error}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={() => fetchFlightOffers()}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Попробовать снова</span>
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
                  onClick={() => setFilterStops('stpc')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
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
