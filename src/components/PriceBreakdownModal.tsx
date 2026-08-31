'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, TrendingDown } from 'lucide-react';
import { Flight } from '../lib/types';

interface PriceBreakdownModalProps {
  flight: Flight | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PriceBreakdownModal({
  flight,
  isOpen,
  onClose,
}: PriceBreakdownModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !flight) return null;

  const currencySymbol = flight.pricing.currency === 'RUB' ? '₽' : flight.pricing.currency === 'USD' ? '$' : '€';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakdown-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-sky-100 bg-sky-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-2xl shadow-md">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 id="breakdown-title" className="text-xl font-black text-slate-900">
                Прозрачный расчёт стоимости
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-bold">
                {flight.originCity} → {flight.destinationCity} (Split-Ticketing)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно расчета"
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-sky-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Savings Banner */}
          <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-start gap-4 shadow-sm">
            <div className="p-2.5 rounded-xl bg-sky-600 text-white font-black text-sm shrink-0 shadow-md">
              -{flight.pricing.savedPercentage}%
            </div>
            <div>
              <p className="text-base font-black text-sky-800">
                Ваша чистая выгода: {flight.pricing.savedAmount.toLocaleString('ru-RU')} {currencySymbol}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 font-bold mt-0.5">
                {flight.pricing.splitSavingsReason}
              </p>
            </div>
          </div>

          {/* Segment Details */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Из чего состоит маршрут (Сегменты):
            </h3>
            <div className="space-y-3">
              {flight.pricing.segmentBreakdowns.map((seg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-sky-100 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {seg.segmentTitle}
                    </p>
                    <span className="text-xs text-sky-700 font-bold">
                      Провайдер: {seg.providerName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900">
                      {seg.price === 0 ? '0 ₽ (Бесплатно)' : `${seg.price.toLocaleString('ru-RU')} ${currencySymbol}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Comparison Grid */}
          <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-bold">
                Обычные агрегаторы:
              </p>
              <p className="text-lg line-through text-slate-400 font-bold mt-0.5">
                {flight.pricing.marketPrice.toLocaleString('ru-RU')} {currencySymbol}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-sky-700 font-black">
                Итого в FlightSaver:
              </p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {flight.pricing.totalPrice.toLocaleString('ru-RU')} {currencySymbol}
              </p>
            </div>
          </div>

          {/* Direct Ticketing Notice */}
          <div className="space-y-2 text-xs sm:text-sm text-slate-700 font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span><strong>Официальные электронные билеты</strong> авиакомпаний сразу после оплаты.</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
              <span><strong>Прямой подбор тарифов:</strong> прозрачные цены без скрытых сервисных комиссий.</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-sky-50/40 border-t border-sky-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black shadow-md transition-all"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
