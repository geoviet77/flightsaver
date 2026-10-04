'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !flight || !mounted) return null;

  const currencySymbol = flight.pricing.currency === 'RUB' ? '₽' : flight.pricing.currency === 'USD' ? '$' : '€';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakdown-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl liquid-glass-card bg-white/95 rounded-3xl shadow-glass-elevated border border-white/90 overflow-hidden my-auto max-h-[calc(100dvh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-white/80 subtle-glass bg-white/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-2xl shadow-btn-shine shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 id="breakdown-title" className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
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
            className="p-2 rounded-full subtle-glass text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Savings Banner */}
          <div className="p-4 rounded-2xl subtle-glass bg-sky-50/80 border border-sky-200/80 flex items-start gap-3 sm:gap-4 shadow-xs">
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-600 text-white font-black text-sm shrink-0 shadow-md">
              -{flight.pricing.savedPercentage}%
            </div>
            <div>
              <p className="text-sm sm:text-base font-black text-sky-900">
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
            <div className="space-y-2.5">
              {flight.pricing.segmentBreakdowns.map((seg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl subtle-glass bg-white/70 border border-white/90 shadow-xs"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-900">
                      {seg.segmentTitle}
                    </p>
                    <span className="text-[11px] sm:text-xs text-sky-700 font-bold">
                      Провайдер: {seg.providerName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-slate-900">
                      {seg.price === 0 ? '0 ₽ (Бесплатно)' : `${seg.price.toLocaleString('ru-RU')} ${currencySymbol}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Comparison Grid */}
          <div className="p-4 sm:p-5 rounded-2xl liquid-card border border-white/90 shadow-glass-edge grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs text-slate-500 font-bold">
                Обычные агрегаторы:
              </p>
              <p className="text-base sm:text-lg line-through text-slate-400 font-bold mt-0.5">
                {flight.pricing.marketPrice.toLocaleString('ru-RU')} {currencySymbol}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-sky-700 font-black">
                Итого в FlightSaver:
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
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
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 subtle-glass bg-white/40 border-t border-white/80 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-sm font-black shadow-btn-shine transition-all cursor-pointer text-center"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

