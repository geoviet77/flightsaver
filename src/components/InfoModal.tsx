'use client';

import React, { useEffect } from 'react';
import { X, Hotel, Plane, Info, CheckCircle2, ArrowRight, Sparkles, Shield } from 'lucide-react';
import { Language } from '../lib/types';
import { TRANSLATIONS } from '../lib/i18n';

export type InfoModalType = 'stpc' | 'twov' | 'split' | null;

interface InfoModalProps {
  type: InfoModalType;
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (query: string) => void;
  language: Language;
}

export function InfoModal({
  type,
  isOpen,
  onClose,
  onSelectScenario,
  language = 'ru',
}: InfoModalProps) {
  const t = TRANSLATIONS[language];

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

  if (!isOpen || !type) return null;

  const isRu = language === 'ru';

  const modalData = {
    stpc: {
      icon: Hotel,
      title: isRu ? 'Бесплатные отели STPC' : 'Free STPC Transit Hotels',
      subtitle: isRu ? 'Stopover Paid by Carrier' : 'Stopover Paid by Carrier',
      headerBg: 'from-sky-500 to-blue-600',
      bullets: isRu
        ? [
            'Бесплатный 4★ или 5★ отель, трансфер и питание при пересадке от 8 до 24 часов.',
            'Действует у Emirates, Qatar Airways, Turkish Airlines, Gulf Air.',
            'FlightSaver автоматически находит такие рейсы и оформляет ваучер отеля.',
          ]
        : [
            'Complimentary 4★/5★ hotel room, transfers, and meals for 8–24h layovers.',
            'Available on Emirates, Qatar Airways, Turkish Airlines, Gulf Air.',
            'FlightSaver automatically finds STPC flights and issues vouchers.',
          ],
      query: isRu ? 'В Бангкок из Москвы с отелем STPC на 2 недели' : 'To Bangkok from Moscow with STPC hotel for 2 weeks',
      actionText: isRu ? 'Найти рейсы с отелем' : 'Search STPC Flights',
    },
    twov: {
      icon: Plane,
      title: isRu ? 'Безвизовый транзит TWOV' : 'Visa-Free Transit TWOV',
      subtitle: isRu ? 'Transit Without Visa' : 'Transit Without Visa',
      headerBg: 'from-sky-400 to-cyan-600',
      bullets: isRu
        ? [
            'Пересадки и выход в город без оформления визы страны транзита.',
            'Китай: 24, 72 и 144ч без визы (Пекин, Шанхай, Гуанчжоу).',
            'ОАЭ, Катар, Бахрейн (штамп по прилёту), Сингапур (96ч транзит).',
            'FlightSaver автоматически проверяет визовую совместимость рейсов.',
          ]
        : [
            'Transit connections and city visits without applying for a visa.',
            'China: 24, 72 & 144h visa-free (Beijing, Shanghai, Guangzhou).',
            'UAE, Qatar, Bahrain (visa on arrival), Singapore (96h transit).',
            'FlightSaver verifies visa rules for every segment automatically.',
          ],
      query: isRu ? 'В Токио через Китай с безвизовым транзитом TWOV' : 'To Tokyo via China with visa-free TWOV transit',
      actionText: isRu ? 'Подобрать маршруты' : 'Find Visa-Free Routes',
    },
    split: {
      icon: Info,
      title: isRu ? 'Технология Split-Ticketing' : 'Split-Ticketing Tech',
      subtitle: isRu ? 'Умная раздельная выписка' : 'Smart Segment Combinations',
      headerBg: 'from-indigo-600 to-sky-600',
      bullets: isRu
        ? [
            'Прямые проверенные тарифы авиакомпаний без наценок и переплат агрегаторов.',
            'Комбинация рейсов разных авиакомпаний для экономии до 30–50%.',
            'Единый и безопасный заказ в FlightSaver с официальными маршрутными квитанциями.',
          ]
        : [
            'Direct verified airline fares with zero hidden middleman fees.',
            'Cross-airline route combinations saving you 30–50% on tickets.',
            'Unified official booking issued directly inside FlightSaver.',
          ],
      query: isRu ? 'На Пхукет с багажом на двоих до 120 000 ₽' : 'To Phuket with baggage for 2 up to $1,300',
      actionText: isRu ? 'Попробовать поиск' : 'Try Split-Ticketing',
    },
  };

  const currentModal = modalData[type];
  const IconComp = currentModal.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* Stitch Liquid Glass Compact Card */}
      <div
        className="w-full max-w-md liquid-glass-card bg-white/95 rounded-3xl shadow-glass-elevated border border-white/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 bg-gradient-to-r ${currentModal.headerBg} text-white`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white shadow-sm">
              <IconComp className="w-5 h-5" />
            </div>
            <div>
              <h2 id="info-modal-title" className="text-base font-bold tracking-tight">
                {currentModal.title}
              </h2>
              <p className="text-[11px] text-white/80 font-medium">
                {currentModal.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High-Readability Compact Bullet Content */}
        <div className="p-5 space-y-3">
          {currentModal.bullets.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                {bullet}
              </p>
            </div>
          ))}
        </div>

        {/* Compact Actions Footer */}
        <div className="px-5 py-3 subtle-glass bg-white/60 border-t border-white/80 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl subtle-glass text-slate-600 font-semibold text-xs hover:bg-white transition-all cursor-pointer"
          >
            {t.modalClose}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectScenario(currentModal.query);
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-btn-shine transition-all cursor-pointer"
          >
            <span>{currentModal.actionText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
