'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../../../components/Header';
import { Currency, Language } from '../../../../lib/types';
import { TRANSLATIONS, formatPrice, useI18n } from '../../../../lib/i18n';
import {
  Ticket,
  Hotel,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Download,
  Calendar,
  Plane,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  TrendingUp,
  Headphones,
  Search,
  Check,
  RotateCw
} from 'lucide-react';
import {
  UserProfile,
  StoredOrder,
  getStoredOrders,
  calculateStats
} from '../../../../lib/mockStorage';
import { createClient } from '../../../../lib/supabase/client';

type OrderStepStatus = 'pending' | 'processing' | 'confirmed' | 'ticketed';

interface StepInfo {
  id: OrderStepStatus;
  labelRu: string;
  labelEn: string;
  description: string;
}

const ORDER_STEPS: StepInfo[] = [
  { id: 'pending', labelRu: 'Ожидает', labelEn: 'Pending', description: 'Заказ создан, ожидает проверки' },
  { id: 'processing', labelRu: 'В обработке', labelEn: 'Processing', description: 'Бронирование мест в GDS' },
  { id: 'confirmed', labelRu: 'Подтвержден', labelEn: 'Confirmed', description: 'Места и отель STPC зафиксированы' },
  { id: 'ticketed', labelRu: 'Выписан', labelEn: 'Ticketed', description: 'Билет выписан, PNR активен' },
];

function getStepIndex(status?: string): number {
  if (!status) return 0;
  const s = status.toLowerCase();
  if (s === 'pending') return 0;
  if (s === 'processing') return 1;
  if (s === 'confirmed') return 2;
  if (s === 'ticketed' || s === 'completed') return 3;
  return 0;
}

function OrdersDashboardContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';
  const { lang: currentLanguage, setLang: setCurrentLanguage, t } = useI18n();

  const [currentCurrency, setCurrentCurrency] = useState<Currency>('RUB');
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSuccessToast, setShowSuccessToast] = useState(isSuccess);

  useEffect(() => {
    const fetchOrdersData = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        let dbOrdersList: StoredOrder[] = [];

        if (authUser) {
          const { data: dbOrders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: false });

          if (!error && dbOrders && dbOrders.length > 0) {
            dbOrdersList = dbOrders.map((o: any) => ({
              id: o.id,
              pnr: o.e_ticket_number || o.pnr || `FS-${o.id.slice(0, 6).toUpperCase()}`,
              route: o.route || '',
              airline: o.airline || '',
              departureDate: o.departure_date ? new Date(o.departure_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
              totalPriceRub: Number(o.total_price || 0),
              originalPriceRub: Number(o.original_price || 0),
              savedAmountRub: Number(o.savings_amount || 0),
              stpcHotelIncluded: Boolean(o.stpc_hotel_included),
              stpcHotelName: o.stpc_hotel_name || (o.stpc_hotel_included ? 'Отель STPC 4★' : undefined),
              status: o.status || 'pending',
            }));
          }
        }

        // Merge with client localStorage for instant responsiveness
        const localList = getStoredOrders();
        const mergedMap = new Map<string, StoredOrder>();

        localList.forEach((o) => mergedMap.set(o.pnr || o.id, o));
        dbOrdersList.forEach((o) => mergedMap.set(o.pnr || o.id, o));

        const finalOrders = Array.from(mergedMap.values());
        setOrders(finalOrders);
      } catch (err) {
        console.error('Error fetching dashboard orders:', err);
        setOrders(getStoredOrders());
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrdersData();
  }, []);

  // Stats calculation
  const stats = calculateStats(orders);
  const formattedTotalSpent = formatPrice(stats.totalSpentRub, currentCurrency);
  const formattedTotalSaved = formatPrice(stats.totalSavedRub, currentCurrency);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        currentCurrency={currentCurrency}
        onCurrencyChange={setCurrentCurrency}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Success Toast Banner */}
        {showSuccessToast && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg">Заказ успешно оформлен!</h3>
                <p className="text-xs sm:text-sm text-emerald-100">
                  Ваш заказ передан в автоматическую систему бронирования. Статус обновляется в реальном времени.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold transition shrink-0"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Top Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm shadow-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.backToHome}</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Мои заказы и билеты</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              Всего заказов: {orders.length}
            </span>
          </div>
        </div>

        {/* 1. Верхние плашки статистики (Автоматический расчет) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Всего потрачено */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Всего потрачено</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formattedTotalSpent}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Сумма всех оформленных билетов</p>
            </div>
          </div>

          {/* Card 2: Сэкономлено */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Сэкономлено</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                  {formattedTotalSaved}
                </span>
                {stats.avgSavingsPercent > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                    -{stats.avgSavingsPercent}%
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">Экономия на GDS-тарифах и отелях</p>
            </div>
          </div>

          {/* Card 3: Всего поездок */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Всего поездок</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.tripsCount} {stats.tripsCount === 1 ? 'маршрут' : 'маршрутов'}
              </p>
              <p className="text-xs text-sky-600 font-semibold mt-0.5">
                {stats.tripsCount > 0 ? 'Активные и завершенные рейсы' : 'Нет оформленных поездок'}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Список заказов с 4-шаговым статус-трекером */}
        <section className="space-y-5">
          {orders.length > 0 ? (
            orders.map((order) => {
              const currentStepIdx = getStepIndex(order.status);
              const formattedPriceVal = formatPrice(order.totalPriceRub, currentCurrency);
              const formattedSavedVal = formatPrice(order.savedAmountRub, currentCurrency);

              return (
                <div
                  key={order.id || order.pnr}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6"
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                            order.status === 'pending'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {order.status === 'pending' ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                              <span>Ожидает обработки</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Подтвержден</span>
                            </>
                          )}
                        </span>

                        <span className="text-xs font-bold text-slate-500">
                          PNR: <strong className="text-blue-700">{order.pnr}</strong>
                        </span>

                        {order.departureDate && (
                          <span className="text-xs text-slate-400 font-medium">
                            • Вылет: {order.departureDate}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                        {order.route}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{order.airline}</p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-2xl sm:text-3xl font-black text-slate-900">
                        {formattedPriceVal}
                      </div>
                      {order.savedAmountRub > 0 && (
                        <p className="text-xs font-bold text-emerald-600 mt-0.5">
                          {t.savedText} {formattedSavedVal}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 3. Интерактивный 4-шаговый статус-трекер */}
                  <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Статус оформления заказа:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 relative">
                      {ORDER_STEPS.map((step, sIdx) => {
                        const isDone = sIdx <= currentStepIdx;
                        const isCurrent = sIdx === currentStepIdx;

                        return (
                          <div
                            key={step.id}
                            className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                              isCurrent
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/30'
                                : isDone
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : 'bg-white text-slate-400 border-slate-200 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              {isCurrent ? (
                                <RotateCw className="w-4 h-4 animate-spin text-white" />
                              ) : isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">
                                  {sIdx + 1}
                                </div>
                              )}
                            </div>
                            <span className="font-extrabold text-xs">
                              {currentLanguage === 'ru' ? step.labelRu : step.labelEn}
                            </span>
                            <span className={`text-[10px] leading-tight line-clamp-1 ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                              {step.description}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* STPC Hotel Highlight if included */}
                  {order.stpcHotelIncluded && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-950 font-semibold">
                      <div className="flex items-center gap-2.5">
                        <Hotel className="w-5 h-5 text-emerald-700 shrink-0" />
                        <div>
                          <div className="font-extrabold text-sm">{order.stpcHotelName || 'Отель STPC 4★'}</div>
                          <p className="text-emerald-800 text-xs font-normal">
                            Бесплатный отель и трансфер включены в данный заказ при пересадке от 8 часов.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-200/80 text-emerald-900 font-extrabold text-[11px] shrink-0">
                        0 ₽
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`/api/receipts/${order.id || order.pnr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 transition"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Маршрутная квитанция (PDF)</span>
                      </a>

                      {order.stpcHotelIncluded && (
                        <button
                          type="button"
                          onClick={() => alert(`Загрузка ваучера отеля STPC #${order.pnr}...`)}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center gap-2 transition"
                        >
                          <Download className="w-4 h-4" />
                          <span>{t.hotelVoucherBtn}</span>
                        </button>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 font-medium">
                      Выписано через FlightSaver Direct GDS
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                <Ticket className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-slate-800">
                  {t.noOrdersYet || 'У вас пока нет оформленных билетов'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Найдите билеты на главной странице с экономией до 40% и бесплатным отелем STPC
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition"
              >
                <Search className="w-4 h-4" />
                <span>Найти перелёт</span>
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function OrdersDashboardPage() {
  return (
    <Suspense fallback={null}>
      <OrdersDashboardContent />
    </Suspense>
  );
}
