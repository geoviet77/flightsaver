'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plane,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Hotel,
  Luggage,
  Calendar,
  Users,
  CreditCard,
  Lock,
  Download,
  User,
  Sparkles,
  Plus,
  Trash2,
  QrCode,
  Check,
  HelpCircle,
  Headphones,
  Crown
} from 'lucide-react';
import { Header } from '../../../../components/Header';
import { getFlightById } from '../../../lib/api';
import { addStoredOrder, StoredOrder } from '../../../../lib/mockStorage';
import { Flight, Currency, Language } from '../../../../lib/types';

function formatCurrency(amount: number, currency: Currency): string {
  const rounded = Math.round(amount);
  if (currency === 'RUB') return `${rounded.toLocaleString('ru-RU')} ₽`;
  if (currency === 'USD') return `$${rounded.toLocaleString('en-US')}`;
  if (currency === 'EUR') return `€${rounded.toLocaleString('de-DE')}`;
  if (currency === 'AED') return `${rounded.toLocaleString('en-US')} AED`;
  if (currency === 'THB') return `${rounded.toLocaleString('en-US')} ฿`;
  return `${rounded.toLocaleString('ru-RU')} ₽`;
}

interface FormPassenger {
  firstName: string;
  lastName: string;
  birthDate: string;
  passportNumber: string;
  citizenship: string;
  gender: 'M' | 'F';
}

function BookingPageContent() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || 'fl-001';

  const [flight, setFlight] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [language, setLanguage] = useState<Language>('ru');

  // Form State
  const [passengers, setPassengers] = useState<FormPassenger[]>([
    {
      firstName: 'IVAN',
      lastName: 'IVANOV',
      birthDate: '1990-05-15',
      passportNumber: '75 1234567',
      citizenship: 'RU',
      gender: 'M',
    },
  ]);

  const [contactEmail, setContactEmail] = useState('user@example.com');
  const [contactPhone, setContactPhone] = useState('+7 (999) 123-45-67');
  const [wantStpcHotel, setWantStpcHotel] = useState(true);
  const [serviceType, setServiceType] = useState<'assistant' | 'club'>('assistant');
  const [paymentMethod, setPaymentMethod] = useState<'sbp' | 'card' | 'tpay'>('sbp');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    async function loadFlight() {
      setLoading(true);
      try {
        const data = await getFlightById(id);
        setFlight(data);
      } catch (err) {
        console.error('Error fetching flight for booking:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadFlight();
    }
  }, [id]);

  const handleAddPassenger = () => {
    setPassengers((prev) => [
      ...prev,
      {
        firstName: '',
        lastName: '',
        birthDate: '1995-01-01',
        passportNumber: '',
        citizenship: 'RU',
        gender: 'M',
      },
    ]);
  };

  const handleRemovePassenger = (idx: number) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePassengerChange = (idx: number, field: keyof FormPassenger, val: string) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  // Pricing calculations
  const rawBaseFare = flight?.pricing?.netSupplierFare || 40660;
  const netFare = Math.round(rawBaseFare * passengers.length);
  const fxBuffer = Math.round(netFare * 0.015); // 1.5% FX буфер
  const serviceFee = serviceType === 'assistant' ? 1500 : 0;
  const totalPrice = netFare + fxBuffer + serviceFee;
  const marketPrice = Math.round((flight?.pricing?.marketPrice || 58900) * passengers.length);
  const savingsAmount = Math.max(0, marketPrice - totalPrice);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Validate email
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errors.push('Укажите корректный адрес электронной почты');
    }

    // Validate phone
    if (!contactPhone || contactPhone.trim().length < 10) {
      errors.push('Укажите контактный номер телефона');
    }

    // Validate passengers
    passengers.forEach((p, i) => {
      const pNum = i + 1;
      if (!p.firstName || !/^[A-Za-z\s\-]+$/.test(p.firstName.trim())) {
        errors.push(`Пассажир #${pNum}: Имя должно быть указано латинскими буквами (как в загранпаспорте)`);
      }
      if (!p.lastName || !/^[A-Za-z\s\-]+$/.test(p.lastName.trim())) {
        errors.push(`Пассажир #${pNum}: Фамилия должна быть указана латинскими буквами`);
      }
      if (!p.passportNumber || p.passportNumber.trim().length < 5) {
        errors.push(`Пассажир #${pNum}: Укажите номер загранпаспорта`);
      }
      if (!p.birthDate) {
        errors.push(`Пассажир #${pNum}: Укажите дату рождения`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!flight || isSubmitting) return;

    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      const payload = {
        flightId: flight.id,
        route: `${flight.originCity} → ${flight.destinationCity}`,
        airline: flight.segments?.[0]?.airline || 'Turkish Airlines',
        departureDate: flight.departureDate || '2026-09-15',
        returnDate: flight.returnDate,
        totalPrice,
        originalPrice: marketPrice,
        savingsAmount,
        currency,
        stpcIncluded: wantStpcHotel && Boolean(flight.transit?.stpcHotelIncluded),
        stpcHotelName: flight.transit?.stpcInfo?.hotelName || 'Партнерский 4★ / 5★ отель авиакомпании',
        passengers,
        contactEmail,
        contactPhone,
        paymentMethod,
        serviceType,
        serviceFee,
        fxBuffer,
        netFare,
      };

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка оформления заказа');
      }

      const order = data.order || data;

      // Save into client localStorage fallback for instant dashboard rendering
      const storedOrder: StoredOrder = {
        id: order.id || `ord-${Date.now()}`,
        pnr: order.pnr || order.orderId || `FS-${Date.now().toString().slice(-6)}`,
        route: order.route || `${flight.originCity} → ${flight.destinationCity}`,
        airline: order.airline || 'Turkish Airlines',
        departureDate: order.departureDate || '2026-09-15',
        totalPriceRub: totalPrice,
        originalPriceRub: marketPrice,
        savedAmountRub: savingsAmount,
        stpcHotelIncluded: order.stpcHotelIncluded,
        stpcHotelName: order.stpcHotelName,
        status: 'pending',
      };
      addStoredOrder(storedOrder);

      // Redirect to /dashboard/orders?success=true
      router.push('/dashboard/orders?success=true');
    } catch (err: any) {
      console.error('Booking submission error:', err);
      setValidationErrors([err?.message || 'Ошибка оформления билета. Попробуйте снова.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          currentLanguage={language}
          onLanguageChange={setLanguage}
        />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
          <Plane className="w-10 h-10 text-blue-600 animate-bounce mx-auto" />
          <p className="text-slate-500 font-semibold">Подготовка формы бронирования...</p>
        </div>
      </div>
    );
  }

  const isStpcAvailable = Boolean(flight?.transit?.stpcHotelIncluded);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      {/* Top Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад к рейсу</span>
          </button>
          <span className="text-xs font-bold text-slate-400">Шаг 2 из 2 • Оформление</span>
        </div>
      </div>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-1">
            <div className="font-bold flex items-center gap-2 text-rose-900">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Пожалуйста, исправьте следующие ошибки:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-2 text-xs">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Passengers Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-black text-slate-900">Данные пассажиров</h2>
                </div>

                <button
                  type="button"
                  onClick={handleAddPassenger}
                  className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить пассажира</span>
                </button>
              </div>

              <div className="space-y-6 divide-y divide-slate-100">
                {passengers.map((p, idx) => (
                  <div key={idx} className={`space-y-4 ${idx > 0 ? 'pt-6' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Пассажир #{idx + 1}
                      </span>
                      {passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePassenger(idx)}
                          className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Удалить
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Фамилия (латиницей, как в паспорте) *
                        </label>
                        <input
                          type="text"
                          required
                          value={p.lastName}
                          onChange={(e) => handlePassengerChange(idx, 'lastName', e.target.value.toUpperCase())}
                          placeholder="IVANOV"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Имя (латиницей, как в паспорте) *
                        </label>
                        <input
                          type="text"
                          required
                          value={p.firstName}
                          onChange={(e) => handlePassengerChange(idx, 'firstName', e.target.value.toUpperCase())}
                          placeholder="IVAN"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Серия и номер загранпаспорта *
                        </label>
                        <input
                          type="text"
                          required
                          value={p.passportNumber}
                          onChange={(e) => handlePassengerChange(idx, 'passportNumber', e.target.value)}
                          placeholder="75 1234567"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Дата рождения *
                        </label>
                        <input
                          type="date"
                          required
                          value={p.birthDate}
                          onChange={(e) => handlePassengerChange(idx, 'birthDate', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900">Контактные данные</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Электронная почта (для билетов) *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Телефон для SMS-оповещений *
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Service Type Switch: Assistant (1500 RUB) vs Club (0 RUB) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>Тип оформления заказа</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assistant Option */}
                <div
                  onClick={() => setServiceType('assistant')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    serviceType === 'assistant'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">С ассистентом FlightSaver</h3>
                        <span className="text-xs text-blue-700 font-bold">1 500 ₽ за заказ</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${serviceType === 'assistant' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                      {serviceType === 'assistant' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Персональный тревел-консьерж 24/7, проверка паспортов, подтверждение ваучера STPC и онлайн-регистрация на рейс.
                  </p>
                </div>

                {/* Club Option */}
                <div
                  onClick={() => setServiceType('club')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    serviceType === 'club'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">FlightSaver Club</h3>
                        <span className="text-xs text-emerald-700 font-bold">0 ₽ сбор (Бесплатно)</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${serviceType === 'club' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                      {serviceType === 'club' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Самостоятельное автоматическое оформление билетов напрямую через GDS без дополнительных сервисных сборов.
                  </p>
                </div>
              </div>
            </div>

            {/* STPC Hotel Option */}
            {isStpcAvailable && (
              <div className="bg-emerald-50/80 rounded-3xl p-6 border border-emerald-200 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="stpcCheck"
                    checked={wantStpcHotel}
                    onChange={(e) => setWantStpcHotel(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                  />
                  <div>
                    <label htmlFor="stpcCheck" className="text-sm font-bold text-emerald-950 cursor-pointer">
                      Включить бесплатный транзитный отель 4★ STPC от авиакомпании
                    </label>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Бесплатный номер в отеле, питание и трансфер от аэропорта при пересадке от 8 часов. Стоимость: 0 ₽.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Способ оплаты</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('sbp')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                    paymentMethod === 'sbp'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">СБП (QR-код)</span>
                    <QrCode className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700">0% комиссия • Моментально</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">Банковская карта</span>
                    <CreditCard className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Мир, Visa, Mastercard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('tpay')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                    paymentMethod === 'tpay'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">T-Pay / SberPay</span>
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">В 1 клик через приложение</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Summary (1 Col) */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 sticky top-20">
              <h3 className="font-black text-slate-900 text-lg">Сводка стоимости</h3>

              {/* Route Summary */}
              <div className="space-y-2 pb-4 border-b border-slate-100 text-sm">
                <div className="flex items-center gap-2 font-black text-slate-900">
                  <span>{flight?.originCity || 'Москва'}</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  <span>{flight?.destinationCity || 'Бангкок'}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {flight?.departureDateFormatted || flight?.departureDate || '15 сентября 2026'}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {flight?.segments?.[0]?.airline || 'Turkish Airlines'} • {passengers.length} {passengers.length === 1 ? 'пассажир' : 'пассажира'}
                </div>
              </div>

              {/* Inclusions */}
              <div className="space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Багаж 23 кг + ручная кладь 8 кг</span>
                </div>
                {wantStpcHotel && isStpcAvailable && (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Hotel className="w-4 h-4 shrink-0" />
                    <span>Бесплатный отель 4★ STPC включен</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sky-700">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Гарантия стыковки FlightSaver</span>
                </div>
              </div>

              {/* Price Calculation: Net Fare + 1.5% FX Buffer + Service Fee */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Net Fare (Тариф поставщика):</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(netFare, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <span>FX буфер конвертации (1.5%):</span>
                  </span>
                  <span className="font-semibold text-slate-900">+{formatCurrency(fxBuffer, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Сервисный сбор ({serviceType === 'assistant' ? 'Ассистент' : 'Club'}):</span>
                  <span className="font-semibold text-slate-900">
                    {serviceFee > 0 ? `+${formatCurrency(serviceFee, currency)}` : '0 ₽ (Бесплатно)'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900">
                  <span className="font-black text-sm">Итого к оплате:</span>
                  <span className="text-2xl font-black text-blue-700">
                    {formatCurrency(totalPrice, currency)}
                  </span>
                </div>
              </div>

              {savingsAmount > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                  🎉 Ваша чистая выгода: {formatCurrency(savingsAmount, currency)}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Оформление...' : 'Подтвердить и забронировать'}</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Нажимая кнопку, вы подтверждаете согласие с правилами тарифа и политикой конфиденциальности.
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={null}>
      <BookingPageContent />
    </Suspense>
  );
}
