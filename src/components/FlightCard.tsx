'use client';

import React, { useState } from 'react';
import { Flight, Currency, Language } from '../lib/types';
import { TRANSLATIONS, formatPrice } from '../lib/i18n';
import { PriceBreakdownModal } from './PriceBreakdownModal';
import {
  Hotel,
  Clock,
  ArrowRight,
  Info,
  ShieldCheck,
  Calendar,
  Briefcase,
  Users
} from 'lucide-react';

function formatFlightDates(depDate?: string, retDate?: string): string {
  if (!depDate) return '';
  const monthsRu = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const parseToParts = (str?: string): { day: number; month: number; year: number } | null => {
    if (!str) return null;
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10), day: parseInt(isoMatch[3], 10) };
    }
    const dotMatch = str.match(/^(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{4}))?/);
    if (dotMatch) {
      return { day: parseInt(dotMatch[1], 10), month: parseInt(dotMatch[2], 10), year: dotMatch[3] ? parseInt(dotMatch[3], 10) : 2026 };
    }
    const textMatch = str.match(/(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?/i);
    if (textMatch) {
      const d = parseInt(textMatch[1], 10);
      const mStr = textMatch[2].toLowerCase();
      const y = textMatch[3] ? parseInt(textMatch[3], 10) : 2026;
      let m = 9;
      const MONTH_MAP_SHORT: Record<string, number> = {
        'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4, 'май': 5, 'мая': 5, 'июн': 6, 'июл': 7, 'авг': 8, 'сен': 9, 'окт': 10, 'ноя': 11, 'дек': 12
      };
      for (const [k, v] of Object.entries(MONTH_MAP_SHORT)) {
        if (mStr.startsWith(k)) {
          m = v;
          break;
        }
      }
      return { day: d, month: m, year: y };
    }
    return null;
  };

  const p1 = parseToParts(depDate);
  if (!p1) return depDate;

  const mName1 = monthsRu[p1.month - 1] || 'сен';
  if (!retDate) {
    return `${p1.day} ${mName1} ${p1.year}`;
  }

  const p2 = parseToParts(retDate);
  if (!p2) return `${p1.day} ${mName1} ${p1.year}`;

  const mName2 = monthsRu[p2.month - 1] || 'сен';
  const d1 = new Date(p1.year, p1.month - 1, p1.day);
  const d2 = new Date(p2.year, p2.month - 1, p2.day);
  const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));

  if (p1.month === p2.month && p1.year === p2.year) {
    return `${p1.day}–${p2.day} ${mName1} ${p1.year} (${diffDays} дн.)`;
  }
  return `${p1.day} ${mName1} – ${p2.day} ${mName2} ${p2.year} (${diffDays} дн.)`;
}

const FALLBACK_CITIES: Record<string, string> = {
  PQC: 'Фукуок',
  USM: 'Самуи',
  DPS: 'Бали',
  HKT: 'Пхукет',
  BKK: 'Бангкок',
  DAD: 'Дананг',
  CXR: 'Нячанг',
  HAN: 'Ханой',
  SGN: 'Хошимин',
  MOW: 'Москва',
  SVO: 'Москва',
  DME: 'Москва',
  VKO: 'Москва',
  LED: 'Санкт-Петербург',
  IST: 'Стамбул',
  SAW: 'Стамбул',
  AYT: 'Анталья',
  DXB: 'Дубай',
  DOH: 'Доха',
  CAN: 'Гуанчжоу',
  PEK: 'Пекин',
  PVG: 'Шанхай',
  MLE: 'Мале',
  GOI: 'Гоа',
  GOX: 'Гоа',
  CMB: 'Коломбо',
  KWI: 'Эль-Кувейт',
  BAH: 'Манама',
  MCT: 'Маскат',
  SHJ: 'Шарджа',
  TAS: 'Ташкент',
  ALA: 'Алматы',
  NQZ: 'Астана',
};

function formatCityName(city?: string, iata?: string): string {
  const code = (iata || '').toUpperCase();
  if (!city || city.toUpperCase() === code) {
    if (code && FALLBACK_CITIES[code]) {
      return FALLBACK_CITIES[code];
    }
  }
  return city || code;
}

interface FlightCardProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
  currency?: Currency;
  language?: Language;
}

export function FlightCard({
  flight,
  onSelect,
  currency = 'RUB',
  language = 'ru',
}: FlightCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const formattedPrice = formatPrice(flight.pricing?.totalPrice ?? 0, currency);
  const formattedSaved = formatPrice(flight.pricing?.savedAmount ?? 0, currency);
  const formattedCompetitor = formatPrice(flight.pricing?.marketPrice ?? 0, currency);
  const formattedDates = formatFlightDates(flight.departureDate, flight.returnDate);

  const primaryCabin = (flight as any).cabinClass || (flight as any).cabin || flight.segments?.[0]?.cabinClass || 'Economy';
  const cabinLower = String(primaryCabin || '').toLowerCase();
  const isFirst = cabinLower.includes('first') || cabinLower.includes('первый');
  const isBusiness = cabinLower.includes('business') || cabinLower.includes('бизнес');
  const isPremium = cabinLower.includes('premium') || cabinLower.includes('комфорт') || cabinLower.includes('премиум');

  const originDisplayCity = formatCityName(flight.originCity, flight.originIata);
  const destDisplayCity = formatCityName(flight.destinationCity, flight.destinationIata);

  const segments = flight.segments || [];
  const layoverCities = segments
    .slice(0, -1)
    .map((seg) => formatCityName(seg.toCity, seg.toIata))
    .filter((city) => Boolean(city) && city !== originDisplayCity && city !== destDisplayCity && !city.includes('Хаб') && !city.includes('Стыковка'));

  let fullRoutePath = '';
  if (segments.length <= 1 || layoverCities.length === 0) {
    fullRoutePath = `${originDisplayCity} ➔ ${destDisplayCity} (Прямой рейс)`;
  } else {
    fullRoutePath = [originDisplayCity, ...layoverCities, destDisplayCity].filter(Boolean).join(' ➔ ');
  }

  const isStpcEligible = Boolean(flight.stpcInfo?.eligible || flight.isStpcEligible || flight.transit?.stpcHotelIncluded);
  const departureTime = segments[0]?.departureTime || '08:00';
  const arrivalTime = segments[segments.length - 1]?.arrivalTime || '16:30';

  return (
    <>
      <article className="w-full liquid-glass-card rounded-3xl p-4 sm:p-5 shadow-glass-elevated border-2 border-white/90 relative overflow-hidden transition hover:shadow-liquid-glow animate-fadeIn">
        
        {/* Top Banner: Badge & Highlights (Stitch Spec) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/80">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Hit / Recommended Badge */}
            <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <span>★</span> Рекомендованный хит
            </span>

            {/* Savings Pill */}
            {flight.pricing?.savedAmount > 0 && (
              <span className="subtle-glass text-emerald-700 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                {t.savedText} {formattedSaved} • -{flight.pricing?.savedPercentage ?? 0}%
              </span>
            )}

            {/* Dates Badge */}
            {formattedDates && (
              <span className="subtle-glass text-slate-700 font-semibold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{formattedDates}</span>
              </span>
            )}

            {/* Cabin Badge */}
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              isFirst
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : isBusiness
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : isPremium
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'subtle-glass text-sky-700 border-sky-200'
            }`}>
              {isFirst ? '👑 Первый класс' : isBusiness ? '💎 Бизнес' : isPremium ? '✨ Комфорт' : '🎫 Эконом'}
            </span>

            {/* Passengers Badge */}
            {Boolean(flight.passengersCount && flight.passengersCount > 0) && (
              <span className="subtle-glass text-slate-700 font-semibold text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-500" />
                <span>{flight.passengersCount} пасс.</span>
              </span>
            )}
          </div>

          <div className="text-[10px] text-slate-500 font-medium">
            Тариф: <span className="text-slate-800 font-bold">{(t as any).tariffOfficial || 'Официальный'}</span>
          </div>
        </div>

        {/* Route Title */}
        <h2 className="text-base sm:text-xl font-black tracking-tight text-slate-900 mt-2 mb-2 break-words leading-tight">
          {fullRoutePath}
        </h2>

        {/* Airline & Route Timeline Grid (Stitch Specular Visualizer) */}
        <div className="grid grid-cols-12 gap-2 items-center bg-white/45 p-3 rounded-2xl border border-white/70">
          {/* Origin */}
          <div className="col-span-4 sm:col-span-3 text-left">
            <div className="text-base sm:text-xl font-black text-slate-900 leading-none">{departureTime}</div>
            <div className="text-xs font-bold text-sky-700 mt-1 truncate">
              {flight.originIata} • {originDisplayCity}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Вылет</div>
          </div>

          {/* Flight Path Visualization */}
          <div className="col-span-4 sm:col-span-6 flex flex-col items-center px-1">
            <span className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {flight.totalDuration}
            </span>
            <div className="w-full flex items-center relative">
              <div className="w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white shrink-0"></div>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-sky-400 via-sky-300 to-sky-500 mx-1 relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-sky-600 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-sky-600"></div>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white shrink-0"></div>
            </div>
            {/* Airlines & Stopovers */}
            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-600 font-medium truncate max-w-full">
              <span className="text-sky-700 font-bold truncate">
                {(flight.segments || []).map((s) => s.airline).join(' + ')}
              </span>
              {layoverCities.length > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-700 bg-emerald-50/90 px-1 rounded truncate">
                    {layoverCities.length} пересадка ({layoverCities.join(', ')})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Destination */}
          <div className="col-span-4 sm:col-span-3 text-right">
            <div className="text-base sm:text-xl font-black text-slate-900 leading-none">{arrivalTime}</div>
            <div className="text-xs font-bold text-sky-700 mt-1 truncate">
              {flight.destinationIata} • {destDisplayCity}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Прилёт</div>
          </div>
        </div>

        {/* Highlight Perks Section (STPC Hotel or Direct Issuance) */}
        <div className="mt-3">
          {isStpcEligible ? (
            <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-sky-50/80 border border-emerald-200 text-emerald-950 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Hotel className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs sm:text-sm font-bold text-emerald-950 leading-snug break-words">
                    ✨ {flight.stpcInfo?.programName ? `${flight.stpcInfo.programName}: Бесплатный отель ${flight.stpcInfo.hotelStars}` : (flight.transit?.stpcDetails || 'Бесплатный отель 4★ STPC при стыковке')} ({t.hotelIncludedBadge})
                  </p>
                  <span className="px-2 py-0.2 rounded-md bg-emerald-200/80 text-emerald-900 font-extrabold text-[10px]">
                    +{flight.stpcInfo?.estimatedSavingsRub ? flight.stpcInfo.estimatedSavingsRub.toLocaleString('ru-RU') : '8 500'} ₽ за отель
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-emerald-800 font-medium mt-0.5 break-words">
                  Включен бесплатный трансфер и питание • {t.layoverText(flight.stpcInfo?.hubCity || flight.transit?.transitCity || '', flight.transit?.transitDuration || 'от 8 часов')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-2 rounded-2xl bg-white/40 border border-white/70 text-slate-800">
              <div className="w-7 h-7 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 leading-snug">
                  🛡️ {t.directIssuance}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {(t as any).directIssuanceDesc || 'Прямой поиск по тарифам авиакомпаний без наценок и скрытых комиссий'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Amenities & Price Bar */}
        <div className="mt-3 pt-2.5 border-t border-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Amenities Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
            <span className={`subtle-glass px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold ${
              flight.baggageIncluded ? 'text-emerald-700 bg-emerald-50/70' : 'text-amber-700 bg-amber-50/70'
            }`}>
              {flight.baggageIncluded ? '✓ 🧳 Багаж 23 кг' : '🎒 Ручная кладь'}
            </span>
            {isStpcEligible && (
              <span className="subtle-glass px-2.5 py-1 rounded-lg text-sky-800 bg-sky-50/70 font-semibold flex items-center gap-1">
                🏨 Отель STPC
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 ml-1 hover:underline cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t.fareDetailsBtn}</span>
            </button>
          </div>

          {/* Price & CTA Button */}
          <div className="flex items-center justify-between sm:justify-end gap-3 ml-0 sm:ml-auto">
            <div className="text-left sm:text-right">
              {flight.pricing?.marketPrice > flight.pricing?.totalPrice && (
                <span className="text-[11px] text-slate-400 line-through font-medium block">
                  {formattedCompetitor}
                </span>
              )}
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {formattedPrice}
              </div>
            </div>

            {/* Select Button */}
            <button
              type="button"
              onClick={() => onSelect(flight)}
              className="min-h-[44px] px-5 py-2 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white font-bold text-xs sm:text-sm shadow-btn-shine hover:brightness-105 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>{t.selectFlightBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </article>

      {/* Price Transparency Breakdown Modal */}
      <PriceBreakdownModal
        flight={flight}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
}
