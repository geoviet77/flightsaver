'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
    // YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10), day: parseInt(isoMatch[3], 10) };
    }
    // DD.MM or DD.MM.YYYY
    const dotMatch = str.match(/^(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{4}))?/);
    if (dotMatch) {
      return { day: parseInt(dotMatch[1], 10), month: parseInt(dotMatch[2], 10), year: dotMatch[3] ? parseInt(dotMatch[3], 10) : 2026 };
    }
    // "14 сен 2026" or "14 сентября"
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

  // Generate clear route description:
  // Direct: "Владивосток ➔ Ханой (Прямой рейс)"
  // Layover: "Владивосток ➔ Бангкок ➔ Ханой"
  const segments = flight.segments || [];
  const layoverCities = segments
    .slice(0, -1)
    .map((seg) => seg.toCity)
    .filter((city) => city !== flight.originCity && city !== flight.destinationCity);

  let fullRoutePath = '';
  if (segments.length <= 1 || layoverCities.length === 0) {
    fullRoutePath = `${flight.originCity || ''} ➔ ${flight.destinationCity || ''} (Прямой рейс)`;
  } else {
    fullRoutePath = [flight.originCity, ...layoverCities, flight.destinationCity].filter(Boolean).join(' ➔ ');
  }

  return (
    <>
      <div className="w-full liquid-glass-card rounded-3xl p-4 sm:p-6 border border-white/90 shadow-[0_10px_35px_rgba(37,99,235,0.06)] hover:shadow-[0_16px_45px_rgba(37,99,235,0.12)] transition-all duration-300 animate-fadeIn">
        
        {/* Top Header: Route in Large Font (20-22px) & Key Badges (Dates, Cabin, Baggage) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100/80">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Exact Flight Dates Badge */}
              {formattedDates && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-800 font-bold text-[11px] border border-slate-200/80 shrink-0">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{formattedDates}</span>
                </span>
              )}

              {/* Cabin Class Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border shrink-0 ${
                isFirst
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : isBusiness
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : isPremium
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}>
                <span>{isFirst ? '👑 Первый класс' : isBusiness ? '💎 Бизнес' : isPremium ? '✨ Комфорт' : '🎫 Эконом'}</span>
              </span>

              {/* Baggage Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border shrink-0 ${
                flight.baggageIncluded
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span>{flight.baggageIncluded ? '🧳 Багаж 23 кг' : '🎒 Только ручная кладь'}</span>
              </span>

              {/* Passengers Count Badge */}
              {Boolean(flight.passengersCount && flight.passengersCount > 0) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-700 font-bold text-[11px] border border-slate-200/80 shrink-0">
                  <Users className="w-3 h-3 text-slate-500" />
                  <span>👤 {flight.passengersCount} {flight.passengersCount === 1 ? 'пасс.' : 'пассажира'}</span>
                </span>
              )}

              {/* Corporate Tariff Badge if applicable */}
              {flight.isCorporate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200 shrink-0">
                  <Briefcase className="w-3 h-3 text-amber-600" />
                  <span>🏢 Корпоративный тариф</span>
                </span>
              )}

              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                <Clock className="w-3.5 h-3.5" /> {flight.totalDuration}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 mt-1 break-words leading-tight">
              {fullRoutePath}
            </h2>
          </div>

          {/* Airlines Logos / Badges */}
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center shrink-0">
            {(flight.segments || []).map((seg, idx) => (
              <span
                key={idx}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100/90 text-slate-700 border border-slate-200/60"
              >
                {seg.airline}
              </span>
            ))}
          </div>
        </div>

        {/* Middle Section: Key Bonus & Highlight (STPC Hotel / Visa-Free TWOV) */}
        <div className="py-3.5 space-y-2">
          {flight.transit?.stpcHotelIncluded ? (
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 text-blue-950">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                <Hotel className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-blue-900 leading-snug break-words">
                  ✨ {flight.transit?.stpcDetails || 'Бесплатный отель 4★ STPC при стыковке'} ({t.hotelIncludedBadge})
                </p>
                <p className="text-[11px] sm:text-xs text-blue-700 font-medium mt-0.5 break-words">
                  Включен бесплатный трансфер и питание • {t.layoverText(flight.transit?.transitCity || '', flight.transit?.transitDuration || '')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-slate-800">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
                  ⚡ {t.directIssuance}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 break-words">
                  Оптовые агентские сегменты GDS/NDC без наценок и скрытых комиссий
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: Price Block + Single Major Button (min-h-[50px] height) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          
          {/* Price & Savings Block */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formattedPrice}
              </span>
              <span className="text-xs sm:text-sm text-slate-400 line-through font-semibold">
                {formattedCompetitor}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shrink-0">
                {t.savedText} {formattedSaved} • -{flight.pricing?.savedPercentage ?? 0}%
              </span>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1 transition-colors shrink-0"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{t.fareDetailsBtn}</span>
              </button>
              <Link
                href={`/flight/${encodeURIComponent(flight.id)}`}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors shrink-0"
              >
                <span>Подробнее о рейсе</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Single Major Action Button (Elastic min-h-[50px]) */}
          <button
            type="button"
            onClick={() => onSelect(flight)}
            className="w-full sm:w-auto min-h-[50px] h-auto py-2.5 px-7 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <span>{t.selectFlightBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Price Transparency Breakdown Modal */}
      <PriceBreakdownModal
        flight={flight}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
}
