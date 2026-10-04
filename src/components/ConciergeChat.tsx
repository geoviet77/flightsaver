'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, Hotel, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

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
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Concierge Panel Header */}
      <div className="liquid-glass-card rounded-3xl p-4 shadow-glass-elevated border border-white/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">ИИ Консьерж FlightSaver</h2>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              В сети • Анализирует 740 авиалиний
            </p>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="liquid-glass-card rounded-3xl p-4 border border-white/90 shadow-glass-elevated space-y-3.5 max-h-[450px] overflow-y-auto custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs sm:text-sm font-medium">
            Напишите любой маршрут в свободной форме (например: <i>«В Париж из Тбилиси в ноябре на двоих»</i> или <i>«Из Новосибирска в Дубай 10 сентября»</i>)
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 animate-fadeIn ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-tr-none shadow-md shadow-sky-500/20 font-semibold'
                  : 'subtle-glass bg-white/80 text-slate-900 rounded-tl-none border border-white/90 shadow-xs font-medium'
              }`}
            >
              <p className="text-[10px] font-bold mb-1 opacity-75">
                {msg.role === 'user' ? 'Вы' : '✨ ИИ Консьерж'}
              </p>
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 p-3.5 subtle-glass bg-white/80 border border-white/90 rounded-2xl text-slate-700 animate-pulse text-xs sm:text-sm font-medium">
            <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
            <span>✨ ИИ Консьерж подбирает оптимальные варианты перелёта...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="liquid-capsule specular-rim shadow-pill-capsule rounded-full p-2 pl-4 flex items-center gap-2.5 border border-white/90">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Куда и когда вы хотите полететь?"
          className="flex-1 bg-transparent border-0 text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:ring-0"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="h-9 px-4 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs shadow-btn-shine transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>Отправить</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Found Flights List */}
      {flights.length > 0 && (
        <div className="pt-4 space-y-3.5">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
            <span>Найденные варианты перелёта</span>
            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 font-extrabold rounded-full text-xs">
              {flights.length}
            </span>
          </h3>
          <div className="grid gap-3.5">
            {flights.map((flight) => (
              <div
                key={flight.id}
                className="liquid-glass-card rounded-3xl p-4 sm:p-5 border border-white/90 shadow-glass-elevated flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-liquid-glow transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {flight.routeTitle}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Дата: {flight.departureDate} • В пути: {flight.duration} • Авиакомпании: {flight.airlines?.join(', ')}
                  </div>
                  {flight.hasStpcHotel && (
                    <div className="text-xs font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                      <Hotel className="w-3 h-3 text-emerald-600" />
                      <span>{flight.stpcDetails || 'Бесплатный 4★ отель STPC при стыковке от 8ч'}</span>
                    </div>
                  )}
                </div>
                <div className="text-left md:text-right w-full md:w-auto shrink-0">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                    {(flight.price || flight.totalPrice || 0).toLocaleString('ru-RU')} ₽
                  </div>
                  {flight.savingsAmount > 0 && (
                    <div className="text-xs text-emerald-600 font-bold mt-0.5">
                      Экономия {flight.savingsAmount?.toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                  <button className="mt-2 w-full md:w-auto px-4 py-2 bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white rounded-xl text-xs font-bold shadow-btn-shine hover:brightness-105 transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <span>Выбрать этот билет</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
