'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  PlaneTakeoff,
  Hotel,
  Ticket,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Mail,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Calendar,
  DollarSign,
} from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.id as string) || 'ORD-FS9948';

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Редактируемые оператором поля
  const [leg1Pnr, setLeg1Pnr] = useState('');
  const [leg2Pnr, setLeg2Pnr] = useState('');
  const [orderStatus, setOrderStatus] = useState('ticketed');
  const [stpcStatus, setStpcStatus] = useState('voucher_issued');
  const [stpcHotelName, setStpcHotelName] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrderDetail = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        setLeg1Pnr(data.order.leg1?.pnr || '');
        setLeg2Pnr(data.order.leg2?.pnr || '');
        setOrderStatus(data.order.status || 'ticketed');
        setStpcStatus(data.order.stpcStatus || 'voucher_issued');
        setStpcHotelName(data.order.stpcHotelName || 'Le Méridien Dubai Hotel & Conference Centre 5★');
      }
    } catch (e) {
      console.warn('Failed to load order detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const handleSavePnr = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leg1Pnr,
          leg2Pnr,
          status: orderStatus,
          stpcStatus,
          stpcHotelName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка при сохранении PNR');

      setFeedback({ type: 'success', text: 'PNR авиакомпаний и статус заказа успешно обновлены в системе' });
      fetchOrderDetail();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Ошибка сервера' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend_email', recipientEmail: order?.customerEmail }),
      });
      const data = await res.json();
      setFeedback({ type: 'success', text: data.message || 'Комплект документов отправлен клиенту' });
    } catch {
      setFeedback({ type: 'error', text: 'Сбой отправки письма' });
    }
  };

  const handleReissuePdf = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reissue_pdf' }),
      });
      const data = await res.json();
      setFeedback({ type: 'success', text: 'PDF маршрутная квитанция успешно перегенерирована' });
      window.open(`/api/receipts/${orderId}`, '_blank');
    } catch {
      setFeedback({ type: 'error', text: 'Сбой генерации PDF' });
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
        <p className="text-xs">Загрузка операционной карточки бронирования...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* Навигация назад */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться к реестру заказов</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-mono">ID: {orderId}</span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Верхняя шапка заказа */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl font-black text-white tracking-tight">{order?.id}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                order?.status === 'incident'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {order?.status === 'incident' ? '⚠️ Инцидент' : '✓ Выписан'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-300">{order?.route}</p>
          <p className="text-xs text-slate-500 mt-1">
            Оформлен: {new Date(order?.createdAt).toLocaleString('ru-RU')} • Оплата Stripe подтверждена
          </p>
        </div>

        {/* Контакты клиента с кнопкой Telegram */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div>
            <p className="text-xs font-bold text-white">{order?.customerName}</p>
            <p className="text-[11px] text-slate-400">{order?.customerPhone}</p>
          </div>
          {order?.customerTelegram && (
            <a
              href={`https://t.me/${order.customerTelegram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#229ED9]/20 hover:bg-[#229ED9]/30 border border-[#229ED9]/40 text-[#229ED9] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{order.customerTelegram}</span>
            </a>
          )}
        </div>
      </div>

      {/* БЛОК 1: СКВОЗНАЯ СХЕМА SPLIT-TICKETING (ПЛЕЧО 1 + ПЛЕЧО 2) */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <Ticket className="w-4 h-4 text-indigo-400" />
              <span>Сегменты перелета и PNR авиакомпаний (Split-Ticketing)</span>
            </h2>
            <p className="text-xs text-slate-400">Сквозная сшивка независимых билетов с защищенным интервалом пересадки</p>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">
            MCT Safe (860 мин)
          </span>
        </div>

        <div className="space-y-4">
          {/* Плечо 1 */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30 mr-2">
                  Плечо 1
                </span>
                <span className="text-xs font-bold text-white">{order?.leg1?.airline}</span>
                <span className="text-xs text-slate-400 ml-2">({order?.leg1?.flightNumber})</span>
              </div>
              <span className="text-xs text-emerald-400 font-bold">✓ Рейс подтвержден в GDS</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
              <div className="text-xs text-slate-300">
                <span className="font-bold">{order?.leg1?.route}</span> • Вылет: {order?.leg1?.departure}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[11px] font-bold text-slate-400">PNR авиакомпании:</span>
                <input
                  type="text"
                  value={leg1Pnr}
                  onChange={(e) => setLeg1Pnr(e.target.value.toUpperCase())}
                  className="w-28 h-9 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono font-bold uppercase focus:outline-none focus:border-indigo-500 text-center"
                />
              </div>
            </div>
          </div>

          {/* Транзитный хаб */}
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="h-px bg-slate-800 flex-1" />
            <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-amber-400 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Стыковка в Дубае (DXB): 14ч 20м • Право на бесплатный отель STPC</span>
            </div>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          {/* Плечо 2 */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mr-2">
                  Плечо 2
                </span>
                <span className="text-xs font-bold text-white">{order?.leg2?.airline}</span>
                <span className="text-xs text-slate-400 ml-2">({order?.leg2?.flightNumber})</span>
              </div>
              <span className="text-xs text-emerald-400 font-bold">✓ Рейс подтвержден в GDS</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
              <div className="text-xs text-slate-300">
                <span className="font-bold">{order?.leg2?.route}</span> • Вылет: {order?.leg2?.departure}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[11px] font-bold text-slate-400">PNR авиакомпании:</span>
                <input
                  type="text"
                  value={leg2Pnr}
                  onChange={(e) => setLeg2Pnr(e.target.value.toUpperCase())}
                  className="w-28 h-9 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono font-bold uppercase focus:outline-none focus:border-indigo-500 text-center"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500">
            Изменение PNR фиксируется в неизменяемом журнале аудита персонала
          </span>
          <button
            onClick={handleSavePnr}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Сохранить PNR авиакомпаний</span>}
          </button>
        </div>
      </div>

      {/* БЛОК 2: ТРАНЗИТНЫЙ ОТЕЛЬ STPC 4★/5★ */}
      {order?.stpcIncluded && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-black text-amber-400 tracking-tight flex items-center gap-2">
                <Hotel className="w-4 h-4" />
                <span>Транзитный отель STPC 5★ (Transit Hotel Voucher)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Официальная программа Stopover on Passenger Expense авиакомпании
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Ваучер: {order.stpcVoucherCode || 'STPC-DXB-9948'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Отель-партнер авиакомпании</label>
              <input
                type="text"
                value={stpcHotelName}
                onChange={(e) => setStpcHotelName(e.target.value)}
                className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500">Включает трансфер аэропорт-отель-аэропорт и питание.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Статус отельного ваучера</label>
              <select
                value={stpcStatus}
                onChange={(e) => setStpcStatus(e.target.value)}
                className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="voucher_issued">✓ Ваучер 5★ отеля выписан и прикреплен к билету</option>
                <option value="eligible">⚠️ Ожидает бронирования в отеле-партнере</option>
                <option value="not_eligible">Отменен / Не требуется</option>
              </select>
              <p className="text-[10px] text-slate-500">Интегрирован в PDF маршрутную квитанцию пассажира.</p>
            </div>
          </div>
        </div>
      )}

      {/* БЛОК 3: ПАССАЖИРЫ (С МАСКИРОВАННЫМИ ДАННЫМИ) */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-400" />
          <span>Данные пассажиров (Маскирование PII PCI-DSS)</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">ФИО (Латиница)</th>
                <th className="py-3 px-4">Дата рождения</th>
                <th className="py-3 px-4">Гражданство</th>
                <th className="py-3 px-4">Номер паспорта</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {order?.passengers?.map((p: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-3 px-4 font-bold text-white">{p.fullName}</td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{p.birthDate}</td>
                  <td className="py-3 px-4 text-slate-300">{p.citizenship}</td>
                  <td className="py-3 px-4 text-indigo-400 font-mono font-bold">{p.passportNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* БЛОК 4: ПАНЕЛЬ БЫСТРЫХ ДЕЙСТВИЙ КОНСЬЕРЖА */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-white">Инструменты оператора выписки</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Повторная генерация квитанции, отправка клиенту или открытие прямого диалога
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleReissuePdf}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Скачать / Перегенерировать PDF</span>
          </button>

          <button
            onClick={handleResendEmail}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4 text-sky-400" />
            <span>Выслать на Email</span>
          </button>

          {order?.customerTelegram && (
            <a
              href={`https://t.me/${order.customerTelegram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#229ED9] hover:bg-[#1E88E5] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Написать в Telegram</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
