'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Headphones,
  Search,
  User,
  Phone,
  Mail,
  MessageSquare,
  PlaneTakeoff,
  Hotel,
  Ticket,
  Send,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface ClientRecord {
  id: string;
  telegramId: string | null;
  telegramUsername: string | null;
  fullName: string;
  email: string;
  phone: string;
  originCity: string;
  vipStatus: string;
  activeBooking?: {
    orderId: string;
    pnr: string;
    route: string;
    flightStatus: string;
    terminal: string;
    departureDate: string;
    stpcHotel?: string | null;
    stpcVoucherCode?: string | null;
    ticketPdfUrl: string;
    airline: string;
  };
  ticketCount: number;
  lastActive: string;
}

export default function SupportL1Page() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Статус действий
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchClients = async (query = searchQuery) => {
    try {
      setIsLoading(true);
      const url = new URL('/api/admin/support', window.location.origin);
      if (query) url.searchParams.set('q', query);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setClients(data.clients || []);
        setStats(data.stats || null);
      }
    } catch (e) {
      console.warn('Failed to load support clients:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients(searchQuery);
  };

  const handleSendTelegramLink = async (client: ClientRecord) => {
    setActionLoadingId(client.id + '_tg');
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_telegram_ticket_link',
          clientId: client.id,
          orderId: client.activeBooking?.orderId,
          destinationContact: client.telegramUsername || client.telegramId,
        }),
      });
      const data = await res.json();
      setActionNotice({ type: 'success', text: data.message || 'Ссылка на билет отправлена в Telegram' });
    } catch {
      setActionNotice({ type: 'error', text: 'Сбой отправки сообщения в Telegram' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResendEmail = async (client: ClientRecord) => {
    setActionLoadingId(client.id + '_email');
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_email',
          clientId: client.id,
          orderId: client.activeBooking?.orderId,
          destinationContact: client.email,
        }),
      });
      const data = await res.json();
      setActionNotice({ type: 'success', text: data.message || 'Квитанция отправлена на email' });
    } catch {
      setActionNotice({ type: 'error', text: 'Сбой отправки на email' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Customer Support L1
            </span>
            <span className="text-xs text-slate-400">• Пульт оперативной заботы о клиентах</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Headphones className="w-5 h-5 text-sky-400" />
            <span>Техподдержка: быстрый поиск пассажира и помощь в 1 клик</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Поиск по Telegram ID, телефону или номеру заказа. Проверка статуса рейса, терминала и переотправка билетов.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>L1 Data Privacy: Паспорта маскированы, доступ к финансам изолирован</span>
        </div>
      </div>

      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Быстрый поиск пассажира */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Введите Telegram ID (8910...), @username, телефон, фамилию пассажира или номер заказа ORD-FS..."
          className="w-full h-12 pl-11 pr-28 bg-slate-900/90 border-2 border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-medium shadow-xl transition-all"
        />
        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
        <button
          type="submit"
          className="absolute right-2 top-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-sky-500/20"
        >
          Найти
        </button>
      </form>

      {/* Список клиентов и их активных билетов */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-400" />
            <p className="text-xs">Поиск пассажиров в базе FlightSaver...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
            <p className="text-xs">Пассажиры по заданному запросу не найдены</p>
          </div>
        ) : (
          clients.map((client) => {
            const booking = client.activeBooking;
            return (
              <div
                key={client.id}
                className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700/80 transition-all"
              >
                {/* Верхняя строка профиля */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                      {client.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{client.fullName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {client.vipStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Ближайший домашний аэропорт: <span className="text-indigo-400 font-bold">{client.originCity}</span>
                      </p>
                    </div>
                  </div>

                  {/* Контактные бейджи */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{client.phone}</span>
                    </div>

                    {client.telegramUsername && (
                      <a
                        href={`https://t.me/${client.telegramUsername.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#229ED9]/20 hover:bg-[#229ED9]/30 border border-[#229ED9]/40 text-[11px] text-[#229ED9] font-bold transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{client.telegramUsername}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Карточка активного перелета (если есть) */}
                {booking && (
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <PlaneTakeoff className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-white">{booking.route}</span>
                        <span className="text-[11px] text-slate-400">({booking.airline})</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {booking.flightStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-900">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Номер заказа / PNR</span>
                        <p className="font-bold text-white font-mono">{booking.orderId} • {booking.pnr}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Вылет и Терминал</span>
                        <p className="font-bold text-slate-300">{booking.departureDate} • {booking.terminal}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Транзитный отель STPC</span>
                        <p className="font-bold text-amber-400 flex items-center gap-1">
                          <Hotel className="w-3.5 h-3.5" />
                          <span>{booking.stpcHotel || 'Не включен'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Панель быстрых действий первой линии помощи */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Активность: {client.lastActive} • Перелетов: {client.ticketCount}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Отправить ссылку в Telegram */}
                    {client.telegramUsername && (
                      <button
                        onClick={() => handleSendTelegramLink(client)}
                        disabled={actionLoadingId === client.id + '_tg'}
                        className="px-3.5 py-1.5 rounded-xl bg-[#229ED9] hover:bg-[#1E88E5] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {actionLoadingId === client.id + '_tg' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Отправить билет в Telegram</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Выслать на Email */}
                    <button
                      onClick={() => handleResendEmail(client)}
                      disabled={actionLoadingId === client.id + '_email'}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === client.id + '_email' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5 text-sky-400" />
                          <span>Выслать на Email</span>
                        </>
                      )}
                    </button>

                    {/* Открыть PDF квитанцию */}
                    {booking?.orderId && (
                      <a
                        href={`/api/receipts/${booking.orderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Открыть PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
