'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Plane,
  User,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { Flight, PassengerDetails, ContactDetails, PaymentMethod, BookingOrder } from '../lib/types';

interface BookingModalProps {
  flight: Flight | null;
  passengersCount: number;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete: (order: BookingOrder) => void;
}

export function BookingModal({
  flight,
  passengersCount = 1,
  isOpen,
  onClose,
  onBookingComplete,
}: BookingModalProps) {
  const [step, setStep] = useState<'passengers' | 'contacts' | 'payment' | 'confirmed'>('passengers');

  const [passengers, setPassengers] = useState<PassengerDetails[]>([]);

  const [contact, setContact] = useState<ContactDetails>({
    email: '',
    phone: '',
    telegram: '',
    receiveUpdatesOnTelegram: true,
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('sbp');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<BookingOrder | null>(null);

  useEffect(() => {
    if (isOpen && flight) {
      const count = Math.max(1, passengersCount);
      const initialList: PassengerDetails[] = Array.from({ length: count }, (_, i) => ({
        id: `p-${i + 1}`,
        type: i === 0 ? 'adult' : 'adult',
        gender: 'M',
        firstName: '',
        lastName: '',
        birthDate: '',
        citizenship: 'Россия (RUS)',
        passportNumber: '',
        passportExpiry: '',
      }));
      setPassengers(initialList);
      setStep('passengers');
      setConfirmedOrder(null);
    }
  }, [isOpen, flight, passengersCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'confirmed') onClose();
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
  }, [isOpen, step, onClose]);

  if (!isOpen || !flight) return null;

  const currencySymbol = flight.pricing.currency === 'RUB' ? '₽' : flight.pricing.currency === 'USD' ? '$' : '€';

  const handlePassengerChange = (index: number, field: keyof PassengerDetails, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const handleProcessPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      const pnr = `FS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const guaranteeId = `GAR-SPLIT-${Math.floor(100000 + Math.random() * 900000)}`;

      const order: BookingOrder = {
        bookingId: `ord-${Date.now()}`,
        pnr,
        createdAt: new Date().toISOString(),
        flight,
        passengers,
        contact,
        totalAmount: flight.pricing.totalPrice,
        currency: flight.pricing.currency,
        paymentMethod,
        status: 'confirmed',
        splitTicketGuaranteeId: guaranteeId,
      };

      setConfirmedOrder(order);
      setIsProcessingPayment(false);
      setStep('confirmed');
      onBookingComplete(order);
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xl animate-fadeIn overflow-y-auto"
      onClick={() => {
        if (step !== 'confirmed') onClose();
      }}
    >
      <div
        className="w-full max-w-3xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-sky-100 bg-sky-50/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-2xl shadow-md shadow-sky-500/25">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <h2 id="booking-modal-title" className="text-xl font-black text-slate-900">
                Оформление и выписка билетов
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-bold">
                Прямая агентская покупка в системе FlightSaver
              </p>
            </div>
          </div>

          {step !== 'confirmed' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть окно бронирования"
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-sky-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Steps Progress Indicator */}
        {step !== 'confirmed' && (
          <div className="px-6 py-3 bg-sky-50/40 border-b border-sky-100">
            <div className="flex items-center justify-between text-xs font-black">
              <span className={`flex items-center gap-1.5 ${step === 'passengers' ? 'text-sky-700' : 'text-slate-400'}`}>
                1. Пассажиры
              </span>
              <span className="text-sky-200">→</span>
              <span className={`flex items-center gap-1.5 ${step === 'contacts' ? 'text-sky-700' : 'text-slate-400'}`}>
                2. Контакты
              </span>
              <span className="text-sky-200">→</span>
              <span className={`flex items-center gap-1.5 ${step === 'payment' ? 'text-sky-700' : 'text-slate-400'}`}>
                3. Оплата и выписка
              </span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Flight Summary Card */}
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">
                  {flight.originCity} ({flight.originIata}) → {flight.destinationCity} ({flight.destinationIata})
                </span>
                <span className="text-xs font-black text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-md">
                  {flight.departureDate}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-bold mt-1">
                {flight.segments.map((s) => `${s.airline} (${s.fromIata}-${s.toIata})`).join(' + ')}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-2xl font-black text-slate-900">
                {flight.pricing.totalPrice.toLocaleString('ru-RU')} {currencySymbol}
              </span>
              <p className="text-xs font-black text-sky-600">
                Экономия: {flight.pricing.savedAmount.toLocaleString('ru-RU')} {currencySymbol} (-{flight.pricing.savedPercentage}%)
              </p>
            </div>
          </div>

          {/* STEP 1: Passengers Details */}
          {step === 'passengers' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-600" />
                  Пассажиры ({passengers.length})
                </h3>
                <span className="text-xs font-bold text-slate-500">Заполните как в загранпаспорте</span>
              </div>

              {passengers.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl border border-sky-100 bg-white shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-sky-800 tracking-wider">
                      Пассажир #{idx + 1} ({idx === 0 ? 'Основной' : 'Дополнительный'})
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`gender-${p.id}`}
                          checked={p.gender === 'M'}
                          onChange={() => handlePassengerChange(idx, 'gender', 'M')}
                          className="text-sky-600 focus:ring-sky-500"
                        />
                        М
                      </label>
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`gender-${p.id}`}
                          checked={p.gender === 'F'}
                          onChange={() => handlePassengerChange(idx, 'gender', 'F')}
                          className="text-sky-600 focus:ring-sky-500"
                        />
                        Ж
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Имя (латиницей как в паспорте) *
                      </label>
                      <input
                        type="text"
                        placeholder="IVAN"
                        value={p.firstName}
                        onChange={(e) => handlePassengerChange(idx, 'firstName', e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Фамилия (латиницей как в паспорте) *
                      </label>
                      <input
                        type="text"
                        placeholder="IVANOV"
                        value={p.lastName}
                        onChange={(e) => handlePassengerChange(idx, 'lastName', e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Дата рождения *
                      </label>
                      <input
                        type="date"
                        value={p.birthDate}
                        onChange={(e) => handlePassengerChange(idx, 'birthDate', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Серия и номер загранпаспорта *
                      </label>
                      <input
                        type="text"
                        placeholder="75 1234567"
                        value={p.passportNumber}
                        onChange={(e) => handlePassengerChange(idx, 'passportNumber', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Срок действия паспорта *
                      </label>
                      <input
                        type="date"
                        value={p.passportExpiry}
                        onChange={(e) => handlePassengerChange(idx, 'passportExpiry', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2: Contacts Details */}
          {step === 'contacts' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-base font-black text-slate-900">
                Контактные данные для отправки маршрутных квитанций
              </h3>

              <div className="p-5 rounded-2xl border border-sky-100 bg-white shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Электронная почта (Email) *
                  </label>
                  <input
                    type="email"
                    placeholder="traveler@example.com"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-bold text-slate-900"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Сюда поступят билеты и подтверждение STPC отеля
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Номер телефона (для SMS-оповещений о вылетах) *
                  </label>
                  <input
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Telegram @username (для мгновенной поддержки 24/7)
                  </label>
                  <input
                    type="text"
                    placeholder="@my_telegram"
                    value={contact.telegram}
                    onChange={(e) => setContact({ ...contact, telegram: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-sky-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Payment */}
          {step === 'payment' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-base font-black text-slate-900">
                Выберите способ прямой оплаты
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('sbp')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    paymentMethod === 'sbp'
                      ? 'border-sky-600 ring-2 ring-sky-400/30 bg-sky-50/70'
                      : 'border-sky-100 bg-white hover:border-sky-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-900">
                      Система быстрых платежей (СБП)
                    </span>
                    <span className="text-[10px] font-black bg-sky-100 text-sky-700 px-2.5 py-0.5 rounded-full">
                      0% комиссии
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">Оплата через QR-код любого банка РФ</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    paymentMethod === 'card'
                      ? 'border-sky-600 ring-2 ring-sky-400/30 bg-sky-50/70'
                      : 'border-sky-100 bg-white hover:border-sky-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-900">
                      Банковская карта (МИР / РФ)
                    </span>
                    <CreditCard className="w-4 h-4 text-sky-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold">Безопасная оплата 3D-Secure</p>
                </button>
              </div>

              {/* Total Summary */}
              <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold">Итого к списанию за {passengers.length} пасс.:</span>
                  <p className="text-2xl font-black text-slate-900">
                    {flight.pricing.totalPrice.toLocaleString('ru-RU')} {currencySymbol}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-sky-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Сэкономлено: {flight.pricing.savedAmount.toLocaleString('ru-RU')} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmed Order Result */}
          {step === 'confirmed' && confirmedOrder && (
            <div className="space-y-6 py-4 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-sky-600/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  Билеты успешно забронированы и выписаны!
                </h3>
                <p className="text-sm text-slate-600 font-bold mt-1">
                  Номер бронирования FlightSaver: <strong className="text-slate-900">{confirmedOrder.pnr}</strong>
                </p>
              </div>

              {/* Electronic Receipt & Tickets */}
              <div className="p-5 rounded-3xl bg-sky-50/80 border border-sky-200 text-left space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-sky-600" /> Маршрутная квитанция FlightSaver
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-700">
                    № {confirmedOrder.pnr}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-bold leading-relaxed">
                  Все сегменты перелёта оформлены и выписаны напрямую в агентской системе FlightSaver. Электронные билеты прикреплены к заказу.
                </p>
              </div>

              <p className="text-xs text-slate-500 font-bold">
                Маршрутные квитанции отправлены на <strong>{contact.email || 'ваш email'}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 bg-sky-50/40 border-t border-sky-100 flex items-center justify-between">
          {step === 'passengers' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-sky-200 text-slate-600 font-bold text-sm hover:bg-white transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => setStep('contacts')}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm flex items-center gap-1.5 shadow-md transition-all"
              >
                <span>Далее к контактам</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'contacts' && (
            <>
              <button
                type="button"
                onClick={() => setStep('passengers')}
                className="px-5 py-2.5 rounded-xl border border-sky-200 text-slate-600 font-bold text-sm hover:bg-white flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
              <button
                type="button"
                onClick={() => setStep('payment')}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm flex items-center gap-1.5 shadow-md transition-all"
              >
                <span>К оплате</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'payment' && (
            <>
              <button
                type="button"
                onClick={() => setStep('contacts')}
                disabled={isProcessingPayment}
                className="px-5 py-2.5 rounded-xl border border-sky-200 text-slate-600 font-bold text-sm hover:bg-white flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={isProcessingPayment}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-sky-500/25 transition-all disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isProcessingPayment ? 'Выписка билетов...' : `Оплатить ${flight.pricing.totalPrice.toLocaleString('ru-RU')} ${currencySymbol}`}
                </span>
              </button>
            </>
          )}

          {step === 'confirmed' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm shadow-md transition-all"
              >
                Готово
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
