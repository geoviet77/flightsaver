'use client';

import React, { useState } from 'react';

interface Flight {
  id: string;
  routeTitle: string;
  departureDate: string;
  duration: string;
  airlines: string[];
  price: number;
  marketPrice: number;
  savingsAmount: number;
  hasStpcHotel: boolean;
  stpcDetails?: string;
}

export default function ConciergeChat() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; parts: [{ text: string }] }>>([]);
  const [searchState, setSearchState] = useState<Record<string, any>>({});
  const [flights, setFlights] = useState<Flight[]>([]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;

    const newMessages: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [
      ...messages,
      { role: 'user', parts: [{ text: query }] }
    ];

    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          searchState: searchState,
        }),
      });

      const data = await res.json();

      // Сохраняем ответ модели в историю
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: 'model', parts: [{ text: data.message }] }
        ]);
      }

      // Обновляем накопленное состояние параметров
      if (data.searchState) {
        setSearchState((prev) => ({ ...prev, ...data.searchState }));
      }

      // Если собраны все 5 параметров — показываем найденные билеты
      if (data.status === 'ready' && data.flights?.length > 0) {
        setFlights(data.flights);
      } else {
        setFlights([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Лента сообщений диалога */}
      <div className="space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl max-w-[85%] ${
              msg.role === 'user'
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto bg-slate-100 text-slate-900 border border-slate-200'
            }`}
          >
            <p className="text-sm font-semibold mb-1">
              {msg.role === 'user' ? 'Вы' : '✨ ИИ Консьерж FlightSaver'}
            </p>
            <p className="whitespace-pre-line text-base">{msg.parts[0].text}</p>
          </div>
        ))}

        {isLoading && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 animate-pulse">
            ИИ Консьерж анализирует маршрут и подбирает лучшие опции...
          </div>
        )}
      </div>

      {/* Поле ввода */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Например: В Рим из Казани в октябре на неделю, 2 человека с багажом"
          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
        >
          Отправить
        </button>
      </div>

      {/* Блок с найденными билетами (показывается только при готовности всех 5 параметров) */}
      {flights.length > 0 && (
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">
            Рекомендованные маршруты ({flights.length})
          </h3>
          <div className="grid gap-4">
            {flights.map((flight) => (
              <div
                key={flight.id}
                className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex justify-between items-center"
              >
                <div>
                  <div className="text-lg font-bold text-slate-900">{flight.routeTitle}</div>
                  <div className="text-sm text-slate-500">
                    Дата: {flight.departureDate} • В пути: {flight.duration} • Авиакомпании: {Array.isArray(flight.airlines) ? flight.airlines.join(', ') : flight.airlines}
                  </div>
                  {flight.hasStpcHotel && (
                    <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                      🎁 {flight.stpcDetails || 'Бесплатный 4★ отель STPC при стыковке'}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-blue-600">{(flight.price || (flight as any).totalPrice || 0).toLocaleString('ru-RU')} ₽</div>
                  {flight.savingsAmount > 0 && (
                    <div className="text-xs text-emerald-600 font-semibold">
                      Экономия {flight.savingsAmount.toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                  <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    Выбрать билет →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
