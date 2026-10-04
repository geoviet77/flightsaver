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
  User,
  Sparkles,
  Plus,
  Trash2,
  QrCode,
  Check,
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

  const isStpcAvailable = Boolean(flight?.transit?.stpcHotelIncluded || flight?.isStpcEligible);

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
        stpcIncluded: wantStpcHotel && isStpcAvailable,
        stpcHotelName: flight.transit?.stpcInfo?.hotelName || 'Партнерский 4★ / 5★ отель авиакомпании',
        passengers,
        contactEmail,
        contactPhone,
        paymentMethod,
        serviceType,
        serviceFee,
        fxBuffer,
        netFare,
        isClubMember: serviceType === 'club',
      };

      // Если выбрана оплата банковской картой — используем Stripe Checkout
      if (paymentMethod === 'card') {
        const res = await fetch('/api/checkout/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Ошибка инициализации Stripe Checkout');
        }

        // Сохранение предварительного заказа в локальное хранилище
        const storedOrder: StoredOrder = {
          id: data.orderId || `ord-${Date.now()}`,
          pnr: data.pnr || `FS-${Date.now().toString().slice(-6)}`,
          route: `${flight.originCity} → ${flight.destinationCity}`,
          airline: flight.segments?.[0]?.airline || 'Turkish Airlines',
          departureDate: flight.departureDate || '2026-09-15',
          totalPriceRub: totalPrice,
          originalPriceRub: marketPrice,
          savedAmountRub: savingsAmount,
          stpcHotelIncluded: wantStpcHotel && isStpcAvailable,
          stpcHotelName: flight.transit?.stpcInfo?.hotelName,
          status: 'pending',
        };
        addStoredOrder(storedOrder);

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }

      // Оплата через СБП / T-Pay или стандартный эндпоинт
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка оформления заказа');
      }

      // Сохранение подтвержденного заказа в локальное хранилище
      const storedOrder: StoredOrder = {
        id: data.orderId || `ord-${Date.now()}`,
        pnr: data.pnr || `FS-${Date.now().toString().slice(-6)}`,
        route: `${flight.originCity} → ${flight.destinationCity}`,
        airline: flight.segments?.[0]?.airline || 'Turkish Airlines',
        departureDate: flight.departureDate || '2026-09-15',
        totalPriceRub: totalPrice,
        originalPriceRub: marketPrice,
        savedAmountRub: savingsAmount,
        stpcHotelIncluded: wantStpcHotel && isStpcAvailable,
        stpcHotelName: flight.transit?.stpcInfo?.hotelName,
        status: 'confirmed',
      };
      addStoredOrder(storedOrder);

      // Переход на страницу успешного оформления заказа
      router.push(`/dashboard/orders?success=true&pnr=${storedOrder.pnr}`);
    } catch (err: any) {
      console.error('Submit booking error:', err);
      setValidationErrors([err?.message || 'Произошла непредвиденная ошибка при бронировании. Попробуйте снова.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-slate-900 flex flex-col font-sans relative overflow-x-hidden select-none">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-24 left-1/3 w-[600px] h-[350px] bg-sky-300/35 rounded-full blur-[80px]" />
          <div className="absolute bottom-10 right-10 w-[500px] h-[400px] bg-blue-300/25 rounded-full blur-[90px]" />
        </div>
        <Header
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          currentLanguage={language}
          onLanguageChange={setLanguage}
        />
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 flex-1 relative z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Plane className="w-8 h-8 text-sky-600 animate-bounce" />
            <p className="text-sm font-bold text-slate-600">Загрузка данных для бронирования...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans relative overflow-x-hidden select-none">
      {/* Ambient Lighting Volumetric Orbs (Stitch Spec) */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 left-1/3 w-[600px] h-[350px] bg-sky-300/35 rounded-full blur-[80px]" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[400px] bg-blue-300/25 rounded-full blur-[90px]" />
      </div>

      <Header
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />

      {/* Top Breadcrumbs */}
      <div className="liquid-glass border-b border-white/80 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-glass-inner backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-sky-700 transition px-3 py-1.5 rounded-full subtle-glass hover:bg-white shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span>Назад к рейсу</span>
          </button>
          <span className="text-xs font-bold text-slate-400 subtle-glass px-3 py-1 rounded-full border border-white/80">
            Шаг 2 из 2 • Оформление
          </span>
        </div>
      </div>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 relative z-10">
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 rounded-3xl bg-rose-50/90 border border-rose-200 text-rose-800 text-sm space-y-1 shadow-sm">
            <div className="font-bold flex items-center gap-2 text-rose-900">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Пожалуйста, исправьте следующие ошибки:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-2 text-xs font-medium text-rose-700">
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
            <div className="liquid-glass-card rounded-3xl p-6 border border-white/90 shadow-glass-elevated space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-black text-slate-900 font-heading">Данные пассажиров</h2>
                </div>

                <button
                  type="button"
                  onClick={handleAddPassenger}
                  className="px-3.5 py-1.5 rounded-full subtle-glass hover:bg-white text-sky-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs border border-sky-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить пассажира</span>
                </button>
              </div>

              <div className="space-y-6 divide-y divide-white/80">
                {passengers.map((p, idx) => (
                  <div key={idx} className={`space-y-4 ${idx > 0 ? 'pt-6' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-sky-700 subtle-glass px-2.5 py-0.5 rounded-full border border-sky-200">
                        Пассажир #{idx + 1}
                      </span>
                      {passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePassenger(idx)}
                          className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Удалить
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Фамилия (латиницей, как в паспорте) *
                        </label>
                        <input
                          type="text"
                          required
                          value={p.lastName}
                          onChange={(e) => handlePassengerChange(idx, 'lastName', e.target.value.toUpperCase())}
                          placeholder="IVANOV"
                          className="w-full px-3.5 py-2.5 rounded-xl subtle-glass bg-white/80 focus:bg-white border border-white/90 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Имя (латиницей, как в паспорте) *
                        </label>
                        <input
                          type="text"
                          required
                          value={p.firstName}
                          onChange={(e) => handlePassengerChange(idx, 'firstName', e.target.value.toUpperCase())}
                          placeholder="IVAN"
                          className="w-full px-3.5 py-2.5 rounded-xl subtle-glass bg-white/80 focus:bg-white border border-white/90 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Серия и номер загранпаспорта *
                        </label>
                        <input
                          type="text"
                          required
                          value={p.passportNumber}
                          onChange={(e) => handlePassengerChange(idx, 'passportNumber', e.target.value)}
                          placeholder="75 1234567"
                          className="w-full px-3.5 py-2.5 rounded-xl subtle-glass bg-white/80 focus:bg-white border border-white/90 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Дата рождения *
                        </label>
                        <input
                          type="date"
                          required
                          value={p.birthDate}
                          onChange={(e) => handlePassengerChange(idx, 'birthDate', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl subtle-glass bg-white/80 focus:bg-white border border-white/90 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Details */}
            <div className="liquid-glass-card rounded-3xl p-6 border border-white/90 shadow-glass-elevated space-y-4">
              <h2 className="text-lg font-black text-slate-900 font-heading">Контактные данные</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Электронная почта (для билетов) *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl subtle-glass bg-white/80 focus:bg-white border border-white/90 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Телефон для SMS-оповещений *
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full px-3.5 py-2.5 rounded-xl subtle-glass bg-white/80 focus:bg-white border border-white/90 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Service Type Switch: Assistant (1500 RUB) vs Club (0 RUB) */}
            <div className="liquid-glass-card rounded-3xl p-6 border border-white/90 shadow-glass-elevated space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
                <Sparkles className="w-5 h-5 text-sky-600" />
                <span>Тип оформления заказа</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assistant Option */}
                <div
                  onClick={() => setServiceType('assistant')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    serviceType === 'assistant'
                      ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-2 ring-sky-500/20'
                      : 'border-white/80 subtle-glass hover:bg-white/90'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">С ассистентом FlightSaver</h3>
                        <span className="text-xs text-sky-700 font-black">1 500 ₽ за заказ</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${serviceType === 'assistant' ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'}`}>
                      {serviceType === 'assistant' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Персональный тревел-консьерж 24/7, проверка паспортов, подтверждение ваучера STPC и онлайн-регистрация на рейс.
                  </p>
                </div>

                {/* Club Option */}
                <div
                  onClick={() => setServiceType('club')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    serviceType === 'club'
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-white/80 subtle-glass hover:bg-white/90'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">FlightSaver Club</h3>
                        <span className="text-xs text-emerald-700 font-black">0 ₽ сбор (Бесплатно)</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${serviceType === 'club' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                      {serviceType === 'club' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Самостоятельное автоматическое оформление билетов напрямую через GDS без дополнительных сервисных сборов.
                  </p>
                </div>
              </div>
            </div>

            {/* STPC Hotel Option */}
            {isStpcAvailable && (
              <div className="liquid-glass-card rounded-3xl p-6 border-2 border-emerald-300/80 shadow-glass-elevated space-y-3 bg-emerald-50/40">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="stpcCheck"
                    checked={wantStpcHotel}
                    onChange={(e) => setWantStpcHotel(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="stpcCheck" className="text-sm font-bold text-emerald-950 cursor-pointer">
                      Включить бесплатный транзитный отель 4★ STPC от авиакомпании
                    </label>
                    <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                      Бесплатный номер в отеле, питание и трансфер от аэропорта при пересадке от 8 часов. Стоимость: 0 ₽.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="liquid-glass-card rounded-3xl p-6 border border-white/90 shadow-glass-elevated space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
                <CreditCard className="w-5 h-5 text-sky-600" />
                <span>Способ оплаты</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('sbp')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                    paymentMethod === 'sbp'
                      ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-white/80 subtle-glass hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">СБП (QR-код)</span>
                    <QrCode className="w-5 h-5 text-sky-600" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">0% комиссия • Моментально</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-white/80 subtle-glass hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">Банковская карта</span>
                    <CreditCard className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">Мир, Visa, Mastercard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('tpay')}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                    paymentMethod === 'tpay'
                      ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-white/80 subtle-glass hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">T-Pay / SberPay</span>
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">В 1 клик через приложение</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Summary (1 Col) */}
          <div className="space-y-6">
            <div className="liquid-glass-card rounded-3xl p-6 border border-white/90 shadow-glass-elevated space-y-5 sticky top-20">
              <h3 className="font-black text-slate-900 text-lg font-heading">Сводка стоимости</h3>

              {/* Route Summary */}
              <div className="space-y-2 pb-4 border-b border-white/80 text-sm">
                <div className="flex items-center gap-2 font-black text-slate-900">
                  <span>{flight?.originCity || 'Москва'}</span>
                  <ArrowRight className="w-4 h-4 text-sky-600" />
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
              <div className="pt-4 border-t border-white/80 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Net Fare (Тариф поставщика):</span>
                  <span className="font-bold text-slate-900">{formatCurrency(netFare, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <span>FX буфер конвертации (1.5%):</span>
                  </span>
                  <span className="font-bold text-slate-900">+{formatCurrency(fxBuffer, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Сервисный сбор ({serviceType === 'assistant' ? 'Ассистент' : 'Club'}):</span>
                  <span className="font-bold text-slate-900">
                    {serviceFee > 0 ? `+${formatCurrency(serviceFee, currency)}` : '0 ₽ (Бесплатно)'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-white/80 text-slate-900">
                  <span className="font-black text-sm">Итого к оплате:</span>
                  <span className="text-2xl font-black text-sky-600 font-heading">
                    {formatCurrency(totalPrice, currency)}
                  </span>
                </div>
              </div>

              {savingsAmount > 0 && (
                <div className="p-3.5 rounded-2xl subtle-glass border border-emerald-200/80 text-emerald-900 text-xs font-bold">
                  🎉 Ваша чистая выгода: {formatCurrency(savingsAmount, currency)}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold rounded-2xl shadow-btn-shine transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Оформление...' : 'Подтвердить и забронировать'}</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium">
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
