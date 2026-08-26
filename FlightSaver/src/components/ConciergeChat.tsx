'use client';

import React, { useState } from 'react';

export default function ConciergeChat() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([]);
  const [flights, setFlights] = useState<any[]>([]);

  const sendMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: 'user' as const, text: textToSend };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Преобразуем формат истории для API
      const apiPayload = newMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiPayload })
      });

      const data = await res.json();

      if (data.message) {
        setMessages((prev) => [...prev, { role: 'model', text: data.message }]);
      }

      if (data.status === 'ready' && data.flights?.length > 0) {
        setFlights(data.flights);
      } else {
        setFlights([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Лента сообщений */}
      <div className="space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Напишите любой маршрут в свободной форме (например: <i>«В Париж из Тбилиси в ноябре на двоих»</i> или <i>«Из Новосибирска в Дубай 10 сентября»</i>)
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-2xl max-w-[85%] ${
              msg.role === 'user'
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto bg-slate-100 text-slate-900 border border-slate-200'
            }`}
          >
            <p className="text-xs font-semibold mb-1 opacity-70">
              {msg.role === 'user' ? 'Вы' : '✨ ИИ Консьерж'}
            </p>
            <p className="whitespace-pre-line text-base">{msg.text}</p>
          </div>
        ))}

        {loading && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 animate-pulse">
            ✨ ИИ Консьерж подбирает варианты перелёта...
          </div>
        )}
      </div>

      {/* Поле ввода */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Куда и когда вы хотите полететь?"
          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
        >
          Отправить
        </button>
      </div>

      {/* Карточки найденных билетов */}
      {flights.length > 0 && (
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">
            Найденные варианты перелёта ({flights.length})
          </h3>
          <div className="grid gap-4">
            {flights.map((flight) => (
              <div
                key={flight.id}
                className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xl font-bold text-slate-900">{flight.routeTitle}</div>
                  <div className="text-sm text-slate-500">
                    Дата: {flight.departureDate} • В пути: {flight.duration} • Авиакомпании: {flight.airlines?.join(', ')}
                  </div>
                  {flight.hasStpcHotel && (
                    <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                      🎁 {flight.stpcDetails || 'Бесплатный 4★ отель STPC при стыковке от 8ч'}
                    </div>
                  )}
                </div>
                <div className="text-left md:text-right w-full md:w-auto">
                  <div className="text-2xl font-black text-blue-600">{(flight.price || flight.totalPrice || 0).toLocaleString('ru-RU')} ₽</div>
                  {flight.savingsAmount > 0 && (
                    <div className="text-xs text-emerald-600 font-semibold">
                      Экономия {flight.savingsAmount?.toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                  <button className="mt-2 w-full md:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                    Выбрать этот билет →
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
