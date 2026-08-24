'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Currency, Language } from '@/lib/types';
import { TRANSLATIONS, formatPrice } from '@/lib/i18n';
import {
  User,
  History,
  Ticket,
  Hotel,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Download,
  Calendar,
  Plane,
  Coins,
  CheckCircle2,
  LogOut,
  Headphones,
  CreditCard,
  TrendingUp,
  Mic,
  FileText
} from 'lucide-react';
import {
  UserProfile,
  StoredOrder,
  StoredSearch,
  DEFAULT_USER,
  DEFAULT_ORDERS,
  DEFAULT_SEARCHES,
  getStoredUser,
  getStoredOrders,
  getStoredSearches,
  calculateStats
} from '@/lib/mockStorage';

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'history' | 'orders') || 'orders';

  const [currentCurrency, setCurrentCurrency] = useState<Currency>('RUB');
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ru');
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'history' | 'orders'>(initialTab);

  const [user, setUser] = useState<UserProfile | null>(DEFAULT_USER);
  const [orders, setOrders] = useState<StoredOrder[]>(DEFAULT_ORDERS);
  const [searches, setSearches] = useState<StoredSearch[]>(DEFAULT_SEARCHES);

  const t = TRANSLATIONS[currentLanguage];

  // Load updated data from localStorage / Supabase on client mount
  useEffect(() => {
    setUser(getStoredUser());
    setOrders(getStoredOrders());
    setSearches(getStoredSearches());
  }, []);

  // Update tab if URL param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'history' | 'orders';
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Sync Accessibility Mode
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('accessibility-mode', isHighContrast);
    }
  }, [isHighContrast]);

  // Calculate live statistics
  const stats = calculateStats(orders);
  const formattedTotalSpent = formatPrice(stats.totalSpentRub, currentCurrency);
  const formattedTotalSaved = formatPrice(stats.totalSavedRub, currentCurrency);

  return (
    <div className="min-h-screen py-3 sm:py-4 px-2 sm:px-6 relative overflow-hidden flex flex-col justify-between">
      {/* Ambient Lights */}
      <div className="ambient-glow-tl" />
      <div className="ambient-glow-br" />

      {/* Watermark */}
      <div className="bg-watermark">
        DASHBOARD
      </div>

      <div className="max-w-5xl mx-auto w-full flex flex-col relative z-10">
        
        {/* Header */}
        <Header
          currentCurrency={currentCurrency}
          onCurrencyChange={setCurrentCurrency}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          isHighContrast={isHighContrast}
          onToggleHighContrast={() => setIsHighContrast((prev) => !prev)}
          onOpenInfoModal={() => {}}
        />

        {/* Main Content */}
        <main className="flex-1 w-full px-2 sm:px-4 pt-5 pb-8 space-y-6">
          
          {/* Top Bar: Back to Home + Profile Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl liquid-glass border border-white hover:bg-white text-slate-700 font-bold text-xs sm:text-sm shadow-sm transition-all w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.backToHome}</span>
            </Link>

            {/* Profile Info */}
            <div className="flex items-center gap-3 p-3 rounded-2xl liquid-glass border border-white shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                {user?.fullName ? user.fullName.charAt(0) : 'И'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {user?.fullName || 'Игорь Путешественник'}
                </p>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {user?.email || 'igor.traveler@flightsaver.ai'}
                </p>
              </div>
            </div>
          </div>

          {/* 1. Виджет статистики (Hero Stats): 3 Карточки с авто-подсчетом */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            
            {/* Card 1: 💳 Всего потрачено */}
            <div className="liquid-glass-card rounded-3xl p-5 border border-white/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Всего потрачено
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {formattedTotalSpent}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Прямые тарифы GDS/NDC
                </p>
              </div>
            </div>

            {/* Card 2: 💎 Чистая экономия + % выгоды */}
            <div className="liquid-glass-card rounded-3xl p-5 border border-white/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Чистая экономия
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                    {formattedTotalSaved}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                    -{stats.avgSavingsPercent}%
                  </span>
                </div>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                  Сэкономлено на билетах и отелях
                </p>
              </div>
            </div>

            {/* Card 3: ✈️ Совершено поездок */}
            <div className="liquid-glass-card rounded-3xl p-5 border border-white/90 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Совершено поездок
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Plane className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {stats.tripsCount} {stats.tripsCount === 1 ? 'маршрут' : 'маршрута'}
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  100% подтвержденные перелёты
                </p>
              </div>
            </div>
          </section>

          {/* Navigation Tabs (Orders / History) */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl liquid-glass border border-white/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>{t.myOrdersTab}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{t.mySearchesTab}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {searches.length}
              </span>
            </button>
          </div>

          {/* 2. История заказов (/dashboard/orders) */}
          {activeTab === 'orders' && (
            <div className="space-y-4 animate-fadeIn">
              {orders.length > 0 ? (
                orders.map((order) => {
                  const formattedPriceVal = formatPrice(order.totalPriceRub, currentCurrency);
                  const formattedSavedVal = formatPrice(order.savedAmountRub, currentCurrency);

                  return (
                    <div
                      key={order.id}
                      className="liquid-glass-card rounded-3xl p-5 sm:p-6 border border-white/90 shadow-md space-y-4"
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Подтвержден
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              PNR: {order.pnr}
                            </span>
                          </div>
                          <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-1 break-words">
                            {order.route}
                          </h3>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900">
                            {formattedPriceVal}
                          </span>
                          <p className="text-xs font-bold text-emerald-600">
                            {t.savedText} {formattedSavedVal}
                          </p>
                        </div>
                      </div>

                      {/* Details & STPC 4★ Hotel */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Plane className="w-4 h-4 text-blue-600 shrink-0" /> Авиакомпании:
                          </p>
                          <p className="text-slate-700 font-semibold">{order.airline}</p>
                          <p className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Вылет: {order.departureDate}
                          </p>
                        </div>

                        {order.stpcHotelIncluded && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 space-y-1">
                            <p className="font-bold text-blue-900 flex items-center gap-1.5">
                              <Hotel className="w-4 h-4 text-blue-600 shrink-0" /> Отель STPC 4★:
                            </p>
                            <p className="text-blue-950 font-bold">{order.stpcHotelName}</p>
                            <p className="text-blue-700 font-medium">Бесплатно при стыковке от 8ч (вкл. трансфер)</p>
                          </div>
                        )}
                      </div>

                      {/* Download Ticket Buttons */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => alert(`Загрузка электронного билета #${order.pnr} (PDF)...`)}
                            className="min-h-[44px] h-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span>Электронный билет (PDF / Маршрутная квитанция)</span>
                          </button>

                          {order.stpcHotelIncluded && (
                            <button
                              type="button"
                              onClick={() => alert(`Загрузка ваучера отеля STPC #${order.pnr}...`)}
                              className="min-h-[44px] h-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
                            >
                              <Download className="w-4 h-4 shrink-0" />
                              <span>{t.hotelVoucherBtn}</span>
                            </button>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 font-medium">
                          Выписано через FlightSaver Direct GDS
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center liquid-glass rounded-3xl">
                  <p className="text-base font-bold text-slate-700">{t.noOrdersYet}</p>
                </div>
              )}
            </div>
          )}

          {/* 3. История запросов к ИИ (/dashboard/history) */}
          {activeTab === 'history' && (
            <div className="space-y-3 animate-fadeIn">
              {searches.length > 0 ? (
                searches.map((item) => (
                  <div
                    key={item.id}
                    className="liquid-glass-card rounded-2xl p-4 border border-white/90 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.inputMode === 'voice' ? 'bg-sky-100 text-sky-600' : 'bg-blue-50 text-blue-600'}`}>
                        {item.inputMode === 'voice' ? (
                          <Mic className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
                          «{item.query}»
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {item.timestamp} • Экономия: ~{item.savingsRub.toLocaleString('ru-RU')} ₽ (-{item.discountPercent}%)
                        </p>
                      </div>
                    </div>

                    {/* Instant 1-Click Re-search ➔ Button */}
                    <Link
                      href={`/?q=${encodeURIComponent(item.query)}`}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
                    >
                      <span className="hidden sm:inline">{t.repeatSearchBtn}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center liquid-glass rounded-3xl">
                  <p className="text-base font-bold text-slate-700">{t.noSearchesYet}</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="w-full py-3 px-6 text-center text-xs text-slate-500 font-medium liquid-glass rounded-full mt-4 mb-2 border border-white/80">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>{t.footerCopyright}</p>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="flex items-center gap-1 text-blue-600 font-semibold">
                <Headphones className="w-3.5 h-3.5" /> {t.footerSupport}
              </span>
              <span>•</span>
              <span>{t.footerFares}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

