'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plane,
  Hotel,
  Sparkles,
  Share2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingDown,
  ExternalLink
} from 'lucide-react';
import { TelegramLinkService } from '@/lib/tma/telegramLinks';

function TmaContent() {
  const searchParams = useSearchParams();
  const flightId = searchParams.get('flightId') || 'fl_split_001';
  const origin = searchParams.get('origin') || 'Москва (SVO)';
  const destination = searchParams.get('destination') || 'Бангкок (BKK)';
  const layover = searchParams.get('layover') || 'Дубай (DXB) • 14ч';
  const price = Number(searchParams.get('price')) || 55780;
  const originalPrice = Number(searchParams.get('originalPrice')) || 78500;
  const savings = originalPrice - price;
  const stpcHotel = searchParams.get('hotel') || 'Le Méridien Dubai Hotel & Conference Centre 5★';

  const [copied, setCopied] = useState(false);
  const [telegramUser, setTelegramUser] = useState<string | null>(null);

  useEffect(() => {
    // Если страница TMA открыта без конкретного билета, перенаправляем на Главную страницу поиска
    if (typeof window !== 'undefined' && !searchParams.has('flightId')) {
      window.location.replace('/');
      return;
    }

    // Получение контекста пользователя из Telegram WebApp API
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setTelegramUser(tg.initDataUnsafe.user.first_name || 'Путешественник');
      }
    }
  }, [searchParams]);


  const handleShare = () => {
    const shareUrl = TelegramLinkService.generateShareMessageUrl({
      flightId,
      origin,
      destination,
      priceRub: price,
      savingsRub: savings,
      stpcHotel,
    });
    window.open(shareUrl, '_blank');
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f7ff] via-[#e1effe] to-[#f8fafc] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient Radial Glows */}
      <div className="ambient-glow-tl pointer-events-none" />
      <div className="ambient-glow-br pointer-events-none" />

      <main className="w-full max-w-lg z-10 flex flex-col gap-5">
        {/* Header Branding */}
        <header className="flex items-center justify-between bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                FlightSaver <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">TMA</span>
              </h1>
              <p className="text-xs text-slate-500">Умный сплит-поиск и отели STPC</p>
            </div>
          </div>
          {telegramUser && (
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Привет,</span>
              <span className="text-xs font-semibold text-blue-600">@{telegramUser}</span>
            </div>
          )}
        </header>

        {/* Flight Ticket Card in Liquid Glass style */}
        <section aria-label="Детали авиабилета" className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
          {/* Top Route Line */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Откуда</span>
              <span className="text-base font-bold text-slate-900">{origin}</span>
            </div>
            <div className="flex flex-col items-center px-3">
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-500" /> Сплит-маршрут
              </span>
              <div className="w-16 h-[2px] bg-slate-200 relative flex items-center justify-center">
                <Plane className="w-3.5 h-3.5 text-blue-500 absolute bg-white p-0.5 rounded-full" />
              </div>
              <span className="text-[10px] text-slate-500 mt-1">{layover}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Куда</span>
              <span className="text-base font-bold text-slate-900">{destination}</span>
            </div>
          </div>

          {/* STPC Hotel Voucher Box */}
          <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/70 border border-amber-200/70 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <Hotel className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                🏨 Бесплатный транзитный отель 5★ (STPC)
              </span>
              <span className="text-xs text-amber-800/80 mt-0.5">{stpcHotel}</span>
              <span className="text-[11px] text-amber-700/70 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Трансфер и питание включены авиакомпанией
              </span>
            </div>
          </div>

          {/* Pricing Breakdown & Savings */}
          <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 line-through">
                {originalPrice.toLocaleString('ru-RU')} ₽ (прямой)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {price.toLocaleString('ru-RU')}
                </span>
                <span className="text-sm font-bold text-slate-600">₽</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                <TrendingDown className="w-3.5 h-3.5" /> Выгода {savings.toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-[10px] text-slate-500 mt-1">FX-буфер 1.5% включен</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href={`/booking/${flightId}`}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Забронировать с ИИ Консьержем</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleShare}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-2xl border border-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>{copied ? 'Ссылка открыта в Telegram!' : 'Поделиться билетом в Telegram'}</span>
            </button>
          </div>
        </section>

        {/* Security & Guarantee Footer Badge */}
        <footer className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-white/40 backdrop-blur-md rounded-xl py-2 px-3 border border-white/40">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Гарантия безопасной стыковки MCT & In-House эквайринг Stripe</span>
        </footer>
      </main>
    </div>
  );
}

export default function TmaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Загрузка карточки FlightSaver...</div>}>
      <TmaContent />
    </Suspense>
  );
}
