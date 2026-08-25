'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Flight, ParsedSearchParams, ChatMessage, Currency, Language, QuickReplyOption, FlightSortOption, FlightStopsFilter, FlightTimeFilter } from '../lib/types';
import { FlightCard } from './FlightCard';
import { TRANSLATIONS } from '../lib/i18n';
import { Sparkles, Bot, User, Loader2, Plane, Calendar, Users, Luggage, Hotel, HelpCircle, MessageSquare, RotateCcw, SlidersHorizontal, ArrowUpDown, ChevronDown, Check, Zap, Clock, ShieldCheck, Sun, Moon, Sunrise } from 'lucide-react';

interface FlightResultsListProps {
  conversationHistory: ChatMessage[];
  parsedParams: ParsedSearchParams | null;
  flights: Flight[];
  isLoading: boolean;
  onSelectFlight: (flight: Flight) => void;
  onClarificationReply?: (replyText: string) => void;
  onResetSearch?: () => void;
  currency?: Currency;
  language?: Language;
}

export function FlightResultsList({
  conversationHistory,
  parsedParams,
  flights,
  isLoading,
  onSelectFlight,
  onClarificationReply,
  onResetSearch,
  currency = 'RUB',
  language = 'ru',
}: FlightResultsListProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.ru;
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Filter, Sort and Pagination State
  const [sortBy, setSortBy] = useState<FlightSortOption>('best');
  const [stopsFilter, setStopsFilter] = useState<FlightStopsFilter>('all');
  const [timeFilter, setTimeFilter] = useState<FlightTimeFilter>('all');
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Reset pagination on new flights or filter changes
  useEffect(() => {
    setVisibleCount(10);
  }, [flights, sortBy, stopsFilter, timeFilter]);

  // Auto-scroll ONLY the internal container of the conversation stream (without scrolling the entire webpage)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [conversationHistory, isLoading]);

  const handleReplyClick = (q: QuickReplyOption) => {
    if (q.isCustomInputPrompt) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('focus-ai-input', { detail: { prompt: q.promptText } }));
      }
    } else if (onClarificationReply) {
      onClarificationReply(q.queryText);
    }
  };

  // Filtered and Sorted Flights calculation
  const filteredAndSortedFlights = useMemo(() => {
    let result = [...flights];

    // 1. Stops filter
    if (stopsFilter === 'direct') {
      result = result.filter(f => f.stopsCount === 0 || !f.transit?.hasTransit);
    } else if (stopsFilter === '1stop') {
      result = result.filter(f => f.stopsCount === 1 || (f.transit?.hasTransit && !f.transit.stpcHotelIncluded));
    } else if (stopsFilter === 'stpc') {
      result = result.filter(f => f.isStpcEligible || f.transit?.stpcHotelIncluded);
    }

    // 2. Time of day filter
    if (timeFilter !== 'all') {
      result = result.filter(f => f.departureTimeOfDay === timeFilter);
    }

    // 3. Sorting
    if (sortBy === 'cheap') {
      result.sort((a, b) => (a.pricing?.totalPrice ?? 0) - (b.pricing?.totalPrice ?? 0));
    } else if (sortBy === 'fast') {
      result.sort((a, b) => (a.totalDurationMinutes ?? 9999) - (b.totalDurationMinutes ?? 9999));
    } else if (sortBy === 'stpc') {
      result.sort((a, b) => (b.isStpcEligible ? 1 : 0) - (a.isStpcEligible ? 1 : 0));
    } else {
      // 'best' - prioritize best value split, then savings
      result.sort((a, b) => (b.isBestValue ? 1 : 0) - (a.isBestValue ? 1 : 0) || (b.pricing?.savedAmount ?? 0) - (a.pricing?.savedAmount ?? 0));
    }

    return result;
  }, [flights, sortBy, stopsFilter, timeFilter]);

  const visibleFlights = filteredAndSortedFlights.slice(0, visibleCount);

  if (conversationHistory.length === 0 && !isLoading && flights.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-fadeIn">
      {/* 1. Header with New Search action */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Диалог с ИИ Консьержем
          </span>
        </div>
        {onResetSearch && (
          <button
            type="button"
            onClick={onResetSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.newSearchBtn}</span>
          </button>
        )}
      </div>

      {/* 2. Scrollable Chat Stream Container (max-h-[380px]) */}
      <div 
        ref={chatContainerRef}
        className="max-h-[380px] overflow-y-auto custom-scrollbar rounded-3xl p-3 sm:p-4 liquid-glass border border-white/90 shadow-sm space-y-3.5"
      >
        {conversationHistory.map((msg, index) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id || `msg-${index}`} className="flex items-start justify-end gap-2.5 animate-fadeIn">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-3.5 shadow-md shadow-blue-500/20">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-[11px] font-medium text-blue-100 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Вы
                    </span>
                    <span className="text-[10px] text-blue-200">{msg.timestamp}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          }

          const params = msg.parsedParams || parsedParams;
          const isLatestAssistant = index === conversationHistory.length - 1;

          return (
            <div key={msg.id || `msg-${index}`} className="flex items-start gap-2.5 animate-fadeIn">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 mt-0.5">
                <Bot className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="flex-1 max-w-[90%] sm:max-w-[85%] bg-white/95 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 border border-slate-100/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    ИИ Консьерж FlightSaver
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{msg.timestamp}</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                  {msg.text}
                </p>

                {/* Route metadata pills */}
                {params && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100">
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100/90 py-1 px-2.5 rounded-lg">
                      <Plane className="w-3 h-3 text-blue-600" />
                      <span>
                        {params.originCity} [{params.originIata}] ➔ {params.destinationCity} [{params.destinationIata}]
                      </span>
                    </div>

                    {(params.departureDate || params.departureMonth) && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 py-1 px-2 rounded-lg">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>
                          {params.departureDate}
                          {params.returnDate ? ` — ${params.returnDate}` : ''}
                          {params.durationDays ? ` (${params.durationDays} дн.)` : ''}
                        </span>
                      </div>
                    )}

                    {params.passengersCount && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/90 py-1 px-2 rounded-lg">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span>{params.passengersCount} {params.passengersCount === 1 ? 'пасс.' : 'пассажира'}</span>
                      </div>
                    )}

                    {(params.baggageIncluded || params.hasLuggage) && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 py-1 px-2 rounded-lg border border-emerald-200/60">
                        <Luggage className="w-3 h-3 text-emerald-600" />
                        <span>Багаж включен</span>
                      </div>
                    )}

                    {(params.stpcHotelOnly || params.wantsStpcHotel) && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 py-1 px-2 rounded-lg border border-sky-200/60">
                        <Hotel className="w-3 h-3 text-sky-600" />
                        <span>Отель STPC 4★</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Proactive Clarification & Interactive Quick Reply Pills */}
                {isLatestAssistant && (
                  (params?.missingQuestions && params.missingQuestions.length > 0) ||
                  (params?.missingFields && params.missingFields.length > 0) ||
                  (!params?.missingFields && Boolean(params?.needsClarification))
                ) && (
                  <div className="mt-2.5 bg-gradient-to-br from-blue-50/90 via-sky-50/60 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-3.5 space-y-3 shadow-xs">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {params?.clarificationMessage || 'Уточните детали перелёта:'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-0.5">
                      {params?.missingQuestions && params.missingQuestions.length > 0 ? (
                        params.missingQuestions.map((qItem, idx) => (
                          <div key={idx} className="space-y-1.5 animate-fadeIn">
                            <span className="text-[11px] font-bold text-slate-700">{qItem.question}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {qItem.options.map((opt, oIdx) => (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => handleReplyClick({
                                    id: `mq-${idx}-${oIdx}`,
                                    label: opt,
                                    queryText: opt,
                                    category: qItem.field as any
                                  })}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-200/80 bg-white text-blue-900 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>{opt}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          {params?.missingFields?.includes('tripType') && (
                            <div className="space-y-1.5 animate-fadeIn">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Нужен ли обратный билет?</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(params.quickReplies?.filter(q => q.category === 'tripType').length ? params.quickReplies.filter(q => q.category === 'tripType') : [
                                  { id: 'oneway', label: '🛫 В одну сторону', queryText: 'в одну сторону', category: 'tripType' },
                                  { id: 'ret-7d', label: '🔄 Обратно через 7 дней', queryText: 'обратно через 7 дней', category: 'tripType' },
                                  { id: 'ret-14d', label: '🔄 Обратно через 14 дней', queryText: 'обратно через 14 дней', category: 'tripType' },
                                  { id: 'custom-dates', label: '✏️ Свой вариант', queryText: 'свой вариант дат', category: 'tripType', isCustomInputPrompt: true, promptText: 'Укажите дату возврата (например: 25 октября)' }
                                ]).map(q => (
                                  <button key={q.id} type="button" onClick={() => handleReplyClick(q as any)} className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-200/80 bg-white text-blue-900 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer">
                                    <span>{q.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {params?.missingFields?.includes('passengers') && (
                            <div className="space-y-1.5 animate-fadeIn">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Сколько пассажиров летит?</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(params.quickReplies?.filter(q => q.category === 'passengers').length ? params.quickReplies.filter(q => q.category === 'passengers') : [
                                  { id: 'pass-1', label: '👤 1 пассажир', queryText: '1 пассажир', category: 'passengers' },
                                  { id: 'pass-2', label: '👥 2 пассажира', queryText: 'на двоих', category: 'passengers' },
                                  { id: 'pass-fam', label: '👨‍👩‍👧 Семья (2+1)', queryText: '2 взрослых и 1 ребенок', category: 'passengers' },
                                  { id: 'custom-pass', label: '✏️ Свой вариант', queryText: 'свой вариант пассажиров', category: 'passengers', isCustomInputPrompt: true, promptText: 'Укажите число пассажиров (например: 3 пассажира)' }
                                ]).map(q => (
                                  <button key={q.id} type="button" onClick={() => handleReplyClick(q as any)} className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer">
                                    <span>{q.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {params?.missingFields?.includes('cabinClass') && (
                            <div className="space-y-1.5 animate-fadeIn">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Класс обслуживания:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(params.quickReplies?.filter(q => q.category === 'cabinClass').length ? params.quickReplies.filter(q => q.category === 'cabinClass') : [
                                  { id: 'cab-eco', label: '🎫 Эконом', queryText: 'эконом-класс', category: 'cabinClass' },
                                  { id: 'cab-prem', label: '✨ Комфорт', queryText: 'премиум-эконом', category: 'cabinClass' },
                                  { id: 'cab-biz', label: '💎 Бизнес', queryText: 'бизнес-класс', category: 'cabinClass' },
                                  { id: 'cab-first', label: '👑 Первый класс', queryText: 'первый класс', category: 'cabinClass' }
                                ]).map(q => (
                                  <button key={q.id} type="button" onClick={() => handleReplyClick(q as any)} className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer">
                                    <span>{q.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {params?.missingFields?.includes('luggage') && (
                            <div className="space-y-1.5 animate-fadeIn">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Багаж:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(params.quickReplies?.filter(q => q.category === 'luggage').length ? params.quickReplies.filter(q => q.category === 'luggage') : [
                                  { id: 'lug-hand', label: '🎒 Только ручная кладь', queryText: 'только ручная кладь', category: 'luggage' },
                                  { id: 'lug-23kg', label: '🧳 С багажом 23 кг', queryText: 'с багажом 23 кг', category: 'luggage' },
                                  { id: 'lug-2bags', label: '🧳🧳 2 места багажа', queryText: '2 места багажа', category: 'luggage' }
                                ]).map(q => (
                                  <button key={q.id} type="button" onClick={() => handleReplyClick(q as any)} className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer">
                                    <span>{q.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Dynamic Loading State Bubble in Chat */}
        {isLoading && (
          <div className="flex items-start gap-2.5 animate-fadeIn">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25 mt-0.5">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 max-w-[85%] bg-white/95 rounded-2xl rounded-tl-xs p-3.5 border border-slate-100 shadow-xs flex items-center gap-3">
              <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  ИИ Консьерж подбирает стыковки и проверяет отели STPC...
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Расчет чистой агентской цены, скидок Split-Ticketing до 40% и времени пересадки
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Filter & Sort Control Bar */}
      {!isLoading && flights.length > 0 && (
        <div className="liquid-glass rounded-3xl p-4 border border-white/90 shadow-sm space-y-3.5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Фильтры и сортировка
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Найдено вариантов:</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-extrabold rounded-full text-[11px]">
                {filteredAndSortedFlights.length}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Sort Options */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Сортировка:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'best', label: '✨ Оптимальные (цена/время)' },
                  { id: 'cheap', label: '⚡ Сначала дешевые' },
                  { id: 'fast', label: '⏱️ Самые быстрые' },
                  { id: 'stpc', label: '🏨 С отелем STPC' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortBy(s.id as FlightSortOption)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all shadow-2xs cursor-pointer ${
                      sortBy === s.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/25 font-bold'
                        : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stops & Time Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Stops Filter */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Пересадки:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Все рейсы' },
                    { id: 'direct', label: 'Только прямые' },
                    { id: '1stop', label: '1 пересадка' },
                    { id: 'stpc', label: 'Отель STPC' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStopsFilter(st.id as FlightStopsFilter)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        stopsFilter === st.id
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time of Day Filter */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Время вылета:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Любое' },
                    { id: 'morning', label: '🌅 Утро' },
                    { id: 'day', label: '☀️ День' },
                    { id: 'evening', label: '🌙 Вечер' },
                  ].map((tm) => (
                    <button
                      key={tm.id}
                      type="button"
                      onClick={() => setTimeFilter(tm.id as FlightTimeFilter)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        timeFilter === tm.id
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      {tm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Flight Results Cards Header */}
      {!isLoading && filteredAndSortedFlights.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>Рекомендованные маршруты</span>
            <span className="px-2 py-0.5 bg-blue-100/80 text-blue-700 text-[11px] font-extrabold rounded-full">
              Показано {visibleFlights.length} из {filteredAndSortedFlights.length}
            </span>
          </h3>
          {parsedParams && (
            <span className="text-xs text-slate-500 font-medium">
              {parsedParams.originCity} ➔ {parsedParams.destinationCity}
            </span>
          )}
        </div>
      )}

      {/* 5. Flight Cards List (Visible Items) */}
      {!isLoading && visibleFlights.length > 0 && (
        <div className="space-y-4">
          {visibleFlights.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              onSelect={onSelectFlight}
              currency={currency}
              language={language}
            />
          ))}
        </div>
      )}

      {/* Empty State when filters match 0 items */}
      {!isLoading && flights.length > 0 && filteredAndSortedFlights.length === 0 && (
        <div className="liquid-glass rounded-3xl p-8 text-center space-y-3 border border-white/90 shadow-sm">
          <p className="text-sm font-bold text-slate-700">
            По выбранным фильтрам рейсов не найдено
          </p>
          <p className="text-xs text-slate-500">
            Попробуйте сбросить фильтры времени или пересадок
          </p>
          <button
            type="button"
            onClick={() => {
              setStopsFilter('all');
              setTimeFilter('all');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-sm shadow-blue-500/20"
          >
            Сбросить фильтры
          </button>
        </div>
      )}

      {/* 6. Pagination / Load More (10 flights per page) */}
      {!isLoading && filteredAndSortedFlights.length > 10 && visibleCount < filteredAndSortedFlights.length && (
        <div className="flex flex-col items-center justify-center pt-2 pb-4 space-y-2 animate-fadeIn">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setVisibleCount((prev) => prev + 10);
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            <span>Показать еще 10 билетов</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-slate-400 font-medium">
            Осталось {filteredAndSortedFlights.length - visibleCount} из {filteredAndSortedFlights.length} вариантов
          </p>
        </div>
      )}

      {/* Skeletons while loading first search */}
      {isLoading && flights.length === 0 && (
        <div className="space-y-3 pt-2">
          <div className="h-40 rounded-3xl bg-white/60 animate-pulse border border-white/80" />
          <div className="h-40 rounded-3xl bg-white/40 animate-pulse border border-white/80" />
        </div>
      )}
    </div>
  );
}
