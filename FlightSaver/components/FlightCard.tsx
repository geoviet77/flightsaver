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
  ShieldCheck
} from 'lucide-react';

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

  const formattedPrice = formatPrice(flight.pricing.totalPrice, currency);
  const formattedSaved = formatPrice(flight.pricing.savedAmount, currency);
  const formattedCompetitor = formatPrice(flight.pricing.marketPrice, currency);

  // Generate clear route description (e.g. Москва ➔ Дубай ➔ Бангкок)
  const layoverCities = flight.segments.slice(0, -1).map((seg) => seg.toCity);
  const fullRoutePath = [
    flight.originCity,
    ...layoverCities,
    flight.destinationCity
  ].join(' ➔ ');

  return (
    <>
      <div className="w-full liquid-glass-card rounded-3xl p-4 sm:p-6 border border-white/90 shadow-[0_10px_35px_rgba(37,99,235,0.06)] hover:shadow-[0_16px_45px_rgba(37,99,235,0.12)] transition-all duration-300 animate-fadeIn">
        
        {/* Top Header: Route in Large Font (20-22px) & Flight Duration */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100/80">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100 shrink-0">
                {flight.segments.length > 1 ? t.splitTitle : t.directIssuance}
              </span>
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
            {flight.segments.map((seg, idx) => (
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
          {flight.transit.stpcHotelIncluded ? (
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 text-blue-950">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                <Hotel className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-blue-900 leading-snug break-words">
                  ✨ {flight.transit.stpcDetails || 'Бесплатный отель 4★ STPC при стыковке'} ({t.hotelIncludedBadge})
                </p>
                <p className="text-[11px] sm:text-xs text-blue-700 font-medium mt-0.5 break-words">
                  Включен бесплатный трансфер и питание • {t.layoverText(flight.transit.transitCity || '', flight.transit.transitDuration || '')}
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
                {t.savedText} {formattedSaved} • -{flight.pricing.savedPercentage}%
              </span>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors shrink-0"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{t.fareDetailsBtn}</span>
              </button>
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
