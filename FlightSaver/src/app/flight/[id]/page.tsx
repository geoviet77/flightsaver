'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plane,
  ArrowRight,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Hotel,
  Luggage,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Info,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Share2,
  Tag,
  Building,
  Navigation
} from 'lucide-react';
import { Header } from '../../../../components/Header';
import { BookingModal } from '../../../../components/BookingModal';
import { getFlightById } from '../../../lib/api';
import { Flight, Currency, Language, BookingOrder } from '../../../../lib/types';

function formatCurrency(amount: number, currency: Currency): string {
  const rounded = Math.round(amount);
  if (currency === 'RUB') return `${rounded.toLocaleString('ru-RU')} ₽`;
  if (currency === 'USD') return `$${rounded.toLocaleString('en-US')}`;
  if (currency === 'EUR') return `€${rounded.toLocaleString('de-DE')}`;
  if (currency === 'AED') return `${rounded.toLocaleString('en-US')} AED`;
  if (currency === 'THB') return `${rounded.toLocaleString('en-US')} ฿`;
  return `${rounded.toLocaleString('ru-RU')} ₽`;
}

function FlightDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = (params?.id as string) || 'fl-001';

  const [flight, setFlight] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [language, setLanguage] = useState<Language>('ru');
  const [isStpcGuideOpen, setIsStpcGuideOpen] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    async function loadFlightData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getFlightById(id);
        setFlight(data);
      } catch (err: any) {
        console.error('[FlightDetailPage] Error loading flight:', err);
        setError(err?.message || 'Не удалось загрузить информацию о рейсе');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadFlightData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          currentLanguage={language}
          onLanguageChange={setLanguage}
        />
        <div className="max-w-4xl w-full mx-auto px-4 py-12 flex-1">
          <div className="h-8 bg-slate-200 rounded-xl w-48 animate-pulse mb-6"></div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-xl w-3/4"></div>
            <div className="h-32 bg-slate-50 rounded-2xl"></div>
            <div className="h-28 bg-emerald-50/50 rounded-2xl"></div>
            <div className="h-20 bg-slate-100 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          currentLanguage={language}
          onLanguageChange={setLanguage}
        />
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4 flex-1">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Ошибка загрузки рейса</h2>
          <p className="text-slate-500 text-sm">{error || 'Рейс не найден или срок действия предложения истек'}</p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Вернуться назад
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isStpc = Boolean(flight.transit?.stpcHotelIncluded);
  const stpcInfo = flight.transit?.stpcInfo;
  const twovInfo = flight.transit?.twovInfo;
  const segments = flight.segments || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      {/* Top Breadcrumb & Action Bar */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition p-1.5 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад к результатам</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Duffel Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Route Summary Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900">
                <span>{flight.originCity}</span>
                <span className="text-sm font-semibold text-slate-400">({flight.originIata})</span>
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <span>{flight.destinationCity}</span>
                <span className="text-sm font-semibold text-slate-400">({flight.destinationIata})</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-2">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {flight.departureDateFormatted || flight.departureDate}
                  {flight.returnDateFormatted ? ` — ${flight.returnDateFormatted}` : ''}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Всего в пути: {flight.totalDuration}
                </span>
                <span>•</span>
                <span>{flight.stopsCount === 0 ? 'Прямой рейс' : `${flight.stopsCount} пересадка`}</span>
              </div>
            </div>

            {/* Price Badge */}
            <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl">
              <div className="text-xs text-slate-500 font-medium">Итоговая стоимость:</div>
              <div className="text-3xl font-extrabold text-blue-700">
                {formatCurrency(flight.pricing?.totalPrice || 42800, currency)}
              </div>
              {flight.pricing?.marketPrice && (
                <div className="text-xs text-slate-400 mt-0.5 line-through">
                  Рыночная: {formatCurrency(flight.pricing.marketPrice, currency)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STPC Hotel Highlight Card */}
        {isStpc && (
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/70 to-white rounded-3xl p-6 sm:p-7 border-2 border-emerald-300/80 shadow-md shadow-emerald-500/5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                  <Hotel className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-1">
                    🎁 Включено в билет (STPC)
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-emerald-950">
                    Бесплатный отель 4★ / 5★ при пересадке
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsStpcGuideOpen(!isStpcGuideOpen)}
                className="p-2 rounded-xl text-emerald-800 hover:bg-emerald-100/60 transition text-sm font-semibold flex items-center gap-1 shrink-0"
              >
                <span>{isStpcGuideOpen ? 'Скрыть инструкцию' : 'Инструкция Hotel Desk'}</span>
                {isStpcGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-sm text-emerald-900 leading-relaxed font-medium">
              При стыковке длительностью <strong>{flight.transit?.transitDuration || 'от 8 часов'}</strong> в хабе{' '}
              <strong>{flight.transit?.transitCity || 'Стамбул'} ({flight.transit?.transitAirport || 'IST'})</strong>{' '}
              авиакомпания бесплатно предоставляет комфортабельный отель, трансфер от терминала и талоны на питание.
            </p>

            {/* STPC Guide Accordion */}
            {isStpcGuideOpen && (
              <div className="pt-3 border-t border-emerald-200/80 space-y-3">
                <div className="bg-white/80 rounded-2xl p-4 border border-emerald-200 text-xs sm:text-sm text-slate-800 space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-700" />
                    <span>Пошаговая инструкция на стойке Hotel Desk:</span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed text-slate-700">
                    {stpcInfo?.instructionsRu ||
                      '1. После приземления в аэропорту пересадки пройдите к стойке «Hotel Desk / Transfer Desk» авиакомпании.\n2. Предъявите посадочные талоны на оба рейса.\n3. Получите бесплатный ваучер на проживание, талоны на питание и билет на трансфер до отеля и обратно к вылету.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-emerald-900 font-semibold">
                  <span className="flex items-center gap-1.5 bg-emerald-100/60 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Трансфер аэропорт-отель-аэропорт
                  </span>
                  <span className="flex items-center gap-1.5 bg-emerald-100/60 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Питание включено (завтрак / ужин)
                  </span>
                  <span className="flex items-center gap-1.5 bg-emerald-100/60 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Экономия ~$120 на гостинице
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TWOV Visa-Free Transit Guarantee Card */}
        {flight.transit?.hasTransit && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  {twovInfo?.visaRuleTitle || 'Виза на пересадке не требуется (TWOV)'}
                </h3>
                <p className="text-xs text-slate-500">
                  Правила безвизового транзита для хаба {flight.transit?.transitCity} ({flight.transit?.transitAirport})
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed bg-sky-50/50 p-3.5 rounded-2xl border border-sky-100">
              {twovInfo?.visaRuleDescription ||
                'Для граждан РФ и большинства стран СНГ действует безвизовый режим или право на безвизовый транзит TWOV в чистой зоне до 24 часов.'}
            </p>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {twovInfo?.terminalInfo ||
                  'Багаж регистрируется до конечного пункта. Повторное прохождение регистрации в хабе пересадки не требуется.'}
              </span>
            </div>
          </div>
        )}

        {/* Flight Segments Timeline */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-600" />
            <span>Сегменты перелёта</span>
          </h2>

          <div className="space-y-6">
            {segments.map((seg: any, idx: number) => (
              <React.Fragment key={idx}>
                {/* Segment Card */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  {/* Airline & Aircraft Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      {seg.airlineLogoUrl ? (
                        <img
                          src={seg.airlineLogoUrl}
                          alt={seg.airline}
                          className="w-7 h-7 object-contain rounded-md bg-white p-0.5 border border-slate-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {seg.airlineCode}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{seg.airline}</span>
                        <span className="text-xs text-slate-500 ml-2 font-semibold">Рейс {seg.flightNumber}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      {seg.aircraft} • {seg.cabinClass || 'Economy'}
                    </div>
                  </div>

                  {/* Departure / Arrival Timeline */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                    {/* Departure */}
                    <div>
                      <div className="text-2xl font-black text-slate-900">{seg.departureTime}</div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        {seg.fromCity} ({seg.fromIata})
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {seg.fromAirport} {seg.fromTerminal ? `• Терминал ${seg.fromTerminal}` : ''}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{seg.departureDate}</div>
                    </div>

                    {/* Duration Graphic */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 mb-1">{seg.duration}</span>
                      <div className="w-full flex items-center gap-2">
                        <div className="h-[2px] bg-slate-300 flex-1"></div>
                        <Plane className="w-4 h-4 text-blue-600 rotate-90" />
                        <div className="h-[2px] bg-slate-300 flex-1"></div>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold mt-1">Прямой перелет</span>
                    </div>

                    {/* Arrival */}
                    <div className="sm:text-right">
                      <div className="text-2xl font-black text-slate-900">{seg.arrivalTime}</div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        {seg.toCity} ({seg.toIata})
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {seg.toAirport} {seg.toTerminal ? `• Терминал ${seg.toTerminal}` : ''}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{seg.arrivalDate}</div>
                    </div>
                  </div>

                  {/* Baggage Row */}
                  <div className="pt-2 flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <Luggage className="w-4 h-4 text-slate-400" />
                    <span>{seg.baggage || 'Багаж 23 кг + ручная кладь 8 кг включены'}</span>
                  </div>
                </div>

                {/* Layover Box between segments */}
                {idx < segments.length - 1 && (
                  <div className="space-y-3 py-2">
                    <div className="relative py-1 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-dashed border-slate-300"></div>
                      </div>
                      <div className="relative px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2 shadow-xs">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>
                          Пересадка в {seg.toCity} ({seg.toIata}): {flight.transit?.transitDuration || 'Длительная стыковка'}
                        </span>
                        {isStpc && <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold">Отель STPC {stpcInfo?.hotelStars || '4★'}</span>}
                      </div>
                    </div>

                    {/* Integrated STPC Program Conditions Block between segments */}
                    {isStpc && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-blue-50/80 border border-emerald-300/80 text-emerald-950 space-y-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
                            <Hotel className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-emerald-950">
                              Программа бесплатного транзитного отеля от {stpcInfo?.airlineName || seg.airline || 'авиакомпании'}
                            </h4>
                            <p className="text-[11px] text-emerald-800 font-semibold">
                              {stpcInfo?.programName || 'STPC Transit Hotel Program'} • Хаб {seg.toCity} ({seg.toIata})
                            </p>
                          </div>
                        </div>

                        {/* Feature bullets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-emerald-900 pt-1">
                          <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
                            <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Длительность стыковки: {flight.transit?.transitDuration || '8–24 ч'}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
                            <Hotel className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Отель {stpcInfo?.hotelStars || '4★'} бесплатно (1 ночь)</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Бесплатный трансфер аэропорт-отель-аэропорт</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>Питание включено (завтрак / ужин)</span>
                          </div>
                        </div>

                        {/* Tourist Tip on How to Claim Hotel */}
                        <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 text-xs text-slate-700 space-y-1">
                          <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Как оформить отель:</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-600">
                            {stpcInfo?.instructions ||
                              'По прилету в аэропорт пересадки пройдите к стойке «Hotel Desk / Transfer Desk» авиакомпании перед или после паспортного контроля. Предъявите посадочные талоны и получите бесплатный ваучер на гостиницу, трансфер и питание.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Direct GDS Savings & Price Breakdown Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-emerald-600" />
              <span>Расчет стоимости и экономия</span>
            </h2>

            {flight.pricing?.savedPercentage && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                Выгода {flight.pricing.savedPercentage}%
              </span>
            )}
          </div>

          <div className="space-y-3 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Чистый тариф поставщика (Duffel GDS Net Fare):</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(flight.pricing?.netSupplierFare || 40660, currency)}
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-600">Сбор сервиса FlightSaver (5%):</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(flight.pricing?.serviceFee || 2140, currency)}
              </span>
            </div>

            {isStpc && (
              <div className="flex justify-between py-2 text-emerald-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <Hotel className="w-4 h-4" />
                  Стоимость транзитного отеля 4★:
                </span>
                <span className="font-bold">0 ₽ (Бесплатно от авиакомпании)</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 text-lg font-black text-slate-900">
              <span>Итого к оплате:</span>
              <span className="text-2xl text-blue-700">
                {formatCurrency(flight.pricing?.totalPrice || 42800, currency)}
              </span>
            </div>
          </div>

          {flight.pricing?.savedAmount && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Вы экономите {formatCurrency(flight.pricing.savedAmount, currency)}</strong> по сравнению со
                стандартными агрегаторами за счет прямого доступа к GDS тарифам и включенному отелю.
              </div>
            </div>
          )}
        </div>

        {/* Action Bottom Bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-blue-500/5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
          <div>
            <div className="text-xs text-slate-500">Окончательная цена с учетом багажа:</div>
            <div className="text-3xl font-black text-slate-900">
              {formatCurrency(flight.pricing?.totalPrice || 42800, currency)}
            </div>
          </div>

          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-extrabold rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Перейти к бронированию</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Booking Modal */}
      {flight && (
        <BookingModal
          flight={flight}
          passengersCount={1}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onBookingComplete={(order: BookingOrder) => {
            setIsBookingModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function FlightDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Plane className="w-8 h-8 text-blue-600 animate-bounce" />
            <p className="text-sm font-medium text-slate-500">Загрузка информации о рейсе...</p>
          </div>
        </div>
      }
    >
      <FlightDetailsContent />
    </Suspense>
  );
}
