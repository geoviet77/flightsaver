'use client';

import React, { useState } from 'react';
import Header from '../components/Header';
import DashboardModal from '../components/DashboardModal';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // Выбранные параметры в карточке уточнения
  const [tripType, setTripType] = useState('one_way');
  const [passengers, setPassengers] = useState('1');
  const [serviceClass, setServiceClass] = useState('economy_baggage');

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Голосовой ввод не поддерживается');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'ru-RU';
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = (e: any) => {
      setQuery(e.results[0][0].transcript);
    };
    rec.start();
  };

  return (
    <div className="min-h-screen bg-[#edf6ff] flex flex-col font-sans">
      <Header
        user={null}
        onOpenAuthModal={() => setIsDashboardOpen(true)}
        onOpenDashboardModal={() => setIsDashboardOpen(true)}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-8 pb-16 flex flex-col items-center">
        {/* Заголовок Hero */}
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 text-center tracking-tight leading-tight mb-3">
          Умный поиск перелётов <br />
          <span className="text-blue-600">одной фразой</span>
        </h1>

        {/* Подзаголовок-плашка */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-sky-100 text-slate-600 text-xs sm:text-sm font-medium mb-7 shadow-sm">
          <span>💡</span>
          <span>Напишите или скажите голосом куда и когда вы хотите полететь</span>
        </div>

        {/* Строка поиска One-Input (с неоновым свечением) */}
        <div className="w-full max-w-2xl relative mb-10">
          <div className="relative flex items-center w-full h-16 bg-white rounded-full border-2 border-sky-300 shadow-[0_0_28px_rgba(14,165,233,0.30)] focus-within:border-sky-500 transition-all px-4">
            <span className="text-sky-400 pl-2 pr-1 text-lg">✨</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Куда и когда вы хотите полететь? (например: В Бангкок из Москвы в ноябре на 2 недели)"
              className="flex-1 h-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm sm:text-base px-2"
            />

            {/* Микрофон */}
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-2.5 rounded-full text-slate-400 hover:text-sky-600 transition-colors ${
                isListening ? 'text-red-500 animate-pulse' : ''
              }`}
              title="Голосовой ввод"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>

            {/* Круглая кнопка со стрелкой */}
            <button
              type="button"
              className="w-10 h-10 ml-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/30 transition-all shrink-0 cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        {/* Блок «ДИАЛОГ С ИИ КОНСЬЕРЖЕМ» */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ДИАЛОГ С ИИ КОНСЬЕРЖЕМ</span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 font-medium transition-colors"
            >
              <span>🔄</span>
              <span>Задать новый вопрос</span>
            </button>
          </div>

          {/* Карточка чата */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
            {/* Плашка распознанного маршрута */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold">
                <span>🛫</span>
                <span>Хабаровск [KHV] → Ханой [HAN]</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                <span>📅</span>
                <span>2026-09-21</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                <span>👥</span>
                <span>1 пасс.</span>
              </div>
            </div>

            {/* Карточка уточняющих вопросов от ИИ */}
            <div className="bg-[#f8fbff] rounded-2xl p-5 border border-sky-100 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="text-blue-600">❓</span>
                <span>Вам нужен билет в одну сторону или планируете возвращение?</span>
              </div>

              {/* ТИП ПОЕЗДКИ */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  ТИП ПОЕЗДКИ:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTripType('one_way')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      tripType === 'one_way'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    🛫 В одну сторону
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripType('return_7')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      tripType === 'return_7'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    🔄 Обратно через 7 дней
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripType('return_14')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      tripType === 'return_14'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    🔄 Обратно через 14 дней
                  </button>
                </div>
              </div>

              {/* ПАССАЖИРЫ */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  ПАССАЖИРЫ:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPassengers('1')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      passengers === '1'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    👤 1 пассажир
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassengers('2')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      passengers === '2'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    👥 2 пассажира
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassengers('family')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      passengers === 'family'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    👨👩👧 Семья с ребенком (2+1)
                  </button>
                </div>
              </div>

              {/* КЛАСС И БАГАЖ */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  КЛАСС И БАГАЖ:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setServiceClass('economy_hand')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      serviceClass === 'economy_hand'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    🧳 Эконом (только ручная кладь)
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceClass('economy_baggage')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      serviceClass === 'economy_baggage'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    🧳 Эконом с багажом 23 кг
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceClass('business')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      serviceClass === 'business'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    💎 Бизнес-класс
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Блок «Рекомендованные маршруты 4» */}
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span>Рекомендованные маршруты</span>
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                4
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Хабаровск → Ханой</span>
          </div>

          {/* Карточка билета */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            {/* Верхние бейджи */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold">
                  О технологии Split-Ticketing
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                  📅 21 сен
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
                  ⚡ Эконом
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                  🧳 Багаж 23 кг
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-400 hidden sm:flex items-center gap-2">
                <span>Vietnam Airlines</span>
                <span>•</span>
                <span>VietJet Air</span>
              </div>
            </div>

            {/* Время и детали рейса */}
            <div>
              <div className="text-xs text-slate-400 font-medium mb-1">⏱️ 11ч 20м</div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Хабаровск → Ханой <span className="text-sm font-normal text-slate-500">(Прямой рейс)</span>
              </h3>
            </div>
          </div>
        </div>
      </main>

      {/* Модальное окно ЛК */}
      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
      />
    </div>
  );
}
