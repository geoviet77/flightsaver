'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlaneTakeoff,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Hotel,
  Ticket,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

interface OrderItem {
  id: string;
  orderReference: string;
  route: string;
  totalPrice: number;
  currency: string;
  savingsAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerTelegram?: string | null;
  status: 'paid' | 'ticketed' | 'incident' | 'refunded';
  stpcIncluded: boolean;
  stpcHotelName?: string | null;
  stpcStatus?: string;
  leg1?: {
    airline: string;
    flightNumber: string;
    pnr: string;
  };
  leg2?: {
    airline: string;
    flightNumber: string;
    pnr: string;
  };
  createdAt: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0, paid: 0, ticketed: 0, incident: 0, refunded: 0 });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async (status = selectedStatus, query = searchQuery) => {
    try {
      setIsLoading(true);
      const url = new URL('/api/admin/orders', window.location.origin);
      if (status !== 'all') url.searchParams.set('status', status);
      if (query) url.searchParams.set('q', query);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setCounts(data.counts || {});
      }
    } catch (e) {
      console.warn('Failed to load orders:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(selectedStatus, searchQuery);
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(selectedStatus, searchQuery);
  };

  const statusTabs = [
    { id: 'all', label: 'Все заказы', count: counts.all, color: 'text-slate-300' },
    { id: 'incident', label: '⚠️ Инциденты', count: counts.incident, color: 'text-amber-400' },
    { id: 'paid', label: '💳 Оплачено (в очереди)', count: counts.paid, color: 'text-sky-400' },
    { id: 'ticketed', label: '✈️ Выписано', count: counts.ticketed, color: 'text-emerald-400' },
    { id: 'refunded', label: '🔄 Возвраты', count: counts.refunded, color: 'text-slate-400' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Заголовок страницы */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Travel Concierge & Ops Hub
            </span>
            <span className="text-xs text-slate-400">• Оперативное управление бронированиями</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <PlaneTakeoff className="w-5 h-5 text-indigo-400" />
            <span>Реестр бронирований, Split-Ticketing и отелей STPC</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Контроль PNR авиакомпаний, выписка транзитных отелей 4★/5★ и оперативная помощь пассажирам.
          </p>
        </div>
      </div>

      {/* Вкладки фильтрации по статусам */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/30'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Поисковая строка */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по номеру заказа (ORD-FS...), фамилии пассажира, PNR авиакомпании или телефону..."
          className="w-full h-11 pl-10 pr-24 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
        <button
          type="submit"
          className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
        >
          Найти
        </button>
      </form>

      {/* Таблица заказов */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">Заказ / Дата</th>
                <th className="py-3.5 px-5">Маршрут & STPC Отель</th>
                <th className="py-3.5 px-5">Авиакомпании & PNR</th>
                <th className="py-3.5 px-5">Пассажир / Контакты</th>
                <th className="py-3.5 px-5">Стоимость</th>
                <th className="py-3.5 px-5">Статус</th>
                <th className="py-3.5 px-5 text-right">Управление</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Загрузка бронирований...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Заказы по заданным критериям не найдены
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isIncident = order.status === 'incident';
                  const isPaid = order.status === 'paid';
                  const isTicketed = order.status === 'ticketed';

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Номер и дата */}
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-white tracking-wide">{order.id}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </td>

                      {/* Маршрут и STPC */}
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-white">{order.route}</p>
                        {order.stpcIncluded && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-400 font-medium">
                            <Hotel className="w-3.5 h-3.5" />
                            <span>{order.stpcHotelName || 'STPC Отель 5★ включен'}</span>
                          </div>
                        )}
                      </td>

                      {/* Авиакомпании и PNR */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-0.5">
                          {order.leg1 && (
                            <p className="text-[11px] text-slate-300">
                              <span className="font-bold">{order.leg1.airline}:</span>{' '}
                              <span className="font-mono text-indigo-400 font-bold">{order.leg1.pnr}</span>
                            </p>
                          )}
                          {order.leg2 && (
                            <p className="text-[11px] text-slate-400">
                              <span className="font-bold">{order.leg2.airline}:</span>{' '}
                              <span className="font-mono text-indigo-400 font-bold">{order.leg2.pnr}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Пассажир и контакты */}
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-slate-200">{order.customerName}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{order.customerPhone}</span>
                          {order.customerTelegram && (
                            <span className="text-sky-400 font-bold">{order.customerTelegram}</span>
                          )}
                        </div>
                      </td>

                      {/* Стоимость и экономия */}
                      <td className="py-3.5 px-5">
                        <p className="font-black text-white font-mono">
                          {order.totalPrice.toLocaleString('ru-RU')} ₽
                        </p>
                        {order.savingsAmount > 0 && (
                          <p className="text-[10px] font-bold text-emerald-400">
                            -{(order.savingsAmount).toLocaleString('ru-RU')} ₽ выгода
                          </p>
                        )}
                      </td>

                      {/* Статус */}
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            isIncident
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse'
                              : isTicketed
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : isPaid
                              ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {isIncident
                            ? '⚠️ Требует внимания'
                            : isTicketed
                            ? '✓ Выписан'
                            : isPaid
                            ? '💳 Оплачен'
                            : order.status}
                        </span>
                      </td>

                      {/* Кнопка открытия */}
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                        >
                          <span>Открыть</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
