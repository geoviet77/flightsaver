'use client';

import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import DashboardModal from '../components/DashboardModal';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  quickOptions?: string[];
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Параметры поиска
  const [searchParams, setSearchParams] = useState<any>({
    origin_iata: 'CSY',
    origin_name: 'Чебоксары',
    destination_iata: 'LUX',
    destination_name: 'Люксембург',
    departure_date: '2026-11-29',
    return_date: null,
    is_round_trip: null,
    passengers_count: 1,
    passengers_confirmed: false,
    cabin_class: 'economy',
    baggage_info: 'Багаж 23 кг',
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      sender: 'ai',
      text: 'Вам нужен билет в одну сторону или планируете возвращение?',
      time: '18:20',
      quickOptions: ['🛫 В одну сторону', '🔄 Обратно через 7 дней', '🔄 Обратно через 14 дней'],
    },
  ]);

  const [flightResults, setFlightResults] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Голосовой ввод не поддерживается в вашем браузере');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'ru-RU';
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      handleSendQuery(transcript);
    };
    rec.start();
  };

  const handleSendQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isLoading) return;

    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const updatedMessages: Message[] = [
      ...messages,
      { id: `user-${Date.now()}`, sender: 'user' as const, text, time: now },
    ];

    setMessages(updatedMessages);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          currentParams: searchParams,
        }),
      });

      const data = await res.json();

      // Гарантируем, что text — это всегда СТРОКА, а не объект!
      const replyText = typeof data.assistant_message === 'string'
        ? data.assistant_message
        : (typeof data.message === 'string' ? data.message : 'Уточните, пожалуйста, детали перелета.');

      const quickOpts = Array.isArray(data.quick_options)
        ? data.quick_options.filter((opt: any) => typeof opt === 'string')
        : [];

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai' as const,
          text: replyText,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          quickOptions: quickOpts,
        },
      ]);

      if (data.state && typeof data.state === 'object') {
        setSearchParams(data.state);
      }

      if (Array.isArray(data.flights) && data.flights.length > 0) {
        setFlightResults(data.flights);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai' as const,
          text: 'Вам нужен билет в одну сторону или планируете возвращение?',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          quickOptions: ['🛫 В одну сторону', '🔄 Обратно через 7 дней'],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'init-msg',
        sender: 'ai',
        text: 'Куда и когда вы хотите полететь? (Например: Чебоксары Люксембург 29 ноября)',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        quickOptions: ['Чебоксары Люксембург 29 ноября', 'Самара Рим 22 октября', 'Питер Гуанчжоу 12 сентября'],
      },
    ]);
    setSearchParams({});
    setFlightResults([]);
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(query);
            }}
            className="relative flex items-center w-full h-16 bg-white rounded-full border-2 border-sky-300 shadow-[0_0_28px_rgba(14,165,233,0.30)] focus-within:border-sky-500 transition-all px-4"
          >
            <span className="text-sky-400 pl-2 pr-1 text-lg">✨</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Куда и когда вы хотите полететь? (например: Чебоксары Люксембург 29 ноября)"
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
              type="submit"
              disabled={!query.trim() || isLoading}
              className="w-10 h-10 ml-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/30 transition-all shrink-0 cursor-pointer disabled:opacity-50"
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
          </form>
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
              onClick={handleResetChat}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 font-medium transition-colors"
            >
              <span>🔄</span>
              <span>Задать новый вопрос</span>
            </button>
          </div>

          {/* Карточка чата */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
            {/* Плашка распознанного маршрута */}
            {searchParams.origin_iata && searchParams.destination_iata && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold">
                  <span>🛫</span>
                  <span>
                    {searchParams.origin_name || searchParams.origin_iata} [{searchParams.origin_iata}] →{' '}
                    {searchParams.destination_name || searchParams.destination_iata} [
                    {searchParams.destination_iata}]
                  </span>
                </div>
                {searchParams.departure_date && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                    <span>📅</span>
                    <span>{searchParams.departure_date}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                  <span>👥</span>
                  <span>{searchParams.passengers_count || 1} пасс.</span>
                </div>
              </div>
            )}

            {/* Карточка диалога сообщений */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
                        🤖
                      </div>
                    )}
                    <div
                      className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                          : 'bg-[#f8fbff] text-slate-800 rounded-tl-none border border-sky-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-[11px] font-semibold opacity-75">
                          {msg.sender === 'user' ? 'Вы' : '✨ ИИ Консьерж FlightSaver'}
                        </span>
                        <span className="text-[10px] opacity-60">{msg.time}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{String(msg.text || '')}</p>
                    </div>
                  </div>

                  {/* Быстрые динамические кнопки ответа внутри ответа ИИ */}
                  {msg.sender === 'ai' && Array.isArray(msg.quickOptions) && msg.quickOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-11">
                      {msg.quickOptions.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSendQuery(opt)}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-sky-200 hover:border-blue-500 hover:bg-sky-50 text-xs font-semibold text-sky-800 shadow-sm transition-all text-left cursor-pointer"
                        >
                          {String(opt)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start items-center text-slate-400 text-xs pl-11 py-2">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1">ИИ-консьерж анализирует параметры...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Блок «Рекомендованные маршруты» */}
        {Array.isArray(flightResults) && flightResults.length > 0 && (
          <div className="w-full max-w-2xl space-y-3">
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <span>Рекомендованные маршруты</span>
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {flightResults.length}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {searchParams.origin_name || searchParams.origin_iata || 'Чебоксары'} →{' '}
                {searchParams.destination_name || searchParams.destination_iata || 'Люксембург'}
              </span>
            </div>

            {flightResults.map((flight, idx) => (
              <div
                key={flight.id || idx}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow space-y-3"
              >
                {/* Верхние бейджи */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold">
                      {flight.stpcHotelIncluded ? '🎁 Отель STPC 4★' : 'О технологии Split-Ticketing'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                      📅 {flight.departureDate || '29 ноя'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
                      ⚡ {flight.cabinClass || 'Эконом'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                      🧳 {flight.baggage || 'Багаж 23 кг'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 hidden sm:flex items-center gap-2">
                    <span>{flight.airline || 'Авиакомпания'}</span>
                  </div>
                </div>

                {/* Время и детали рейса */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-xs text-slate-400 font-medium mb-1">
                      ⏱️ {flight.duration || '11ч 20м'}{' '}
                      {flight.departureTime ? `(${flight.departureTime} - ${flight.arrivalTime})` : ''}
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {flight.originCity || searchParams.origin_name || 'Чебоксары'} →{' '}
                      {flight.destinationCity || searchParams.destination_name || 'Люксембург'}{' '}
                      <span className="text-sm font-normal text-slate-500">
                        {flight.stpcHotelIncluded ? '(Стыковка с отелем)' : '(Прямой рейс)'}
                      </span>
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900">
                      {typeof flight.totalPrice === 'number'
                        ? flight.totalPrice.toLocaleString('ru-RU')
                        : '42 800'}{' '}
                      ₽
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDashboardOpen(true)}
                      className="mt-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Выбрать
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Модальное окно ЛК */}
      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
      />
    </div>
  );
}
