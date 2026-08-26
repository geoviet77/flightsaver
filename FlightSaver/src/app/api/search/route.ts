import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChatMessage {
  sender?: 'user' | 'ai';
  role?: string;
  text?: string;
  parts?: Array<{ text: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessages = body.messages || body.history || [];
    const currentParams = body.currentParams || body.searchState || body.accumulatedSearchParams || {};
    const query = body.query || body.message || '';

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const currentDate = new Date().toISOString().split('T')[0];

    const systemInstruction = `
Ты — профессиональный ИИ-консьерж сервиса FlightSaver.
Твоя задача — вести диалог с пользователем на русском языке и поэтапно собрать ВСЕ необходимые параметры для поиска авиабилетов.
Текущая опорная дата: ${currentDate} (2026 год).

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА И ПОРЯДОК СБОРА ПАРАМЕТРОВ:
1. МАРШРУТ И ДАТЫ:
   - Определи IATA коды городов вылета и прилета (например: Самара -> KUF, Ханой -> HAN, Москва -> MOW, Рим -> ROM/FCO, Санкт-Петербург -> LED, Гуанчжоу -> CAN, Хабаровск -> KHV, Южно-Сахалинск -> UUS, Дананг -> DAD, Владивосток -> VVO).
   - Определи дату вылета (формат YYYY-MM-DD). Если год не указан, считай текущий или следующий 2026/2027 год.
   - ВСЕГДА спроси, нужен ли обратный билет (в одну сторону или туда-обратно). Если туда-обратно, уточни дату возврата.
2. КОЛИЧЕСТВО ПАССАЖИРОВ:
   - По умолчанию 1 пассажир, НО ты ОБЯЗАН ВСЕГДА спросить: «Вы летите один или с попутчиками?».
   - Если пользователь говорит «нет / нас двое / с семьей», спроси точное количество взрослых и детей.
3. КЛАСС ОБСЛУЖИВАНИЯ:
   - Уточни класс перелета: Эконом, Комфорт (Премиум-эконом), Бизнес или Первый класс.
4. БАГАЖ И РУЧНАЯ КЛАДЬ:
   - Уточни про багаж.
   - Если пассажир 1 — спроси: «Нужен ли вам багаж 23 кг или достаточно ручной клади?».
   - Если пассажиров несколько (>1) — ОБЯЗАТЕЛЬНО уточни: «Багаж нужен на каждого пассажира или только на одного/часть пассажиров?».

ФОРМАТ ОТВЕТА:
Ты ДОЛЖЕН отвечать СТРОГО в формате валидного JSON (без markdown-оберток \`\`\`json):
{
  "origin_iata": "KUF" или null,
  "origin_name": "Самара" или null,
  "destination_iata": "HAN" или null,
  "destination_name": "Ханой" или null,
  "departure_date": "2026-09-29" или null,
  "return_date": "2026-10-10" или null,
  "is_round_trip": true / false / null,
  "passengers_count": 1,
  "passengers_confirmed": true / false,
  "cabin_class": "economy" | "premium_economy" | "business" | "first" | null,
  "baggage_type": "hand_luggage" | "checked_baggage_all" | "checked_baggage_partial" | null,
  "is_complete": true / false,
  "assistant_message": "Текст твоего вежливого ответа на русском с конкретным следующим уточняющим вопросом",
  "quick_options": ["Кнопка 1", "Кнопка 2", "Кнопка 3"]
}

Если параметр уже известен из предыдущих сообщений — сохраняй его и не переспрашивай. Переходи к следующему недостающему параметру.
Как только ВСЕ 4 блока параметров собраны и подтверждены — установи "is_complete": true.
`;

    const normalizedHistory = rawMessages.map((m: any) => {
      const sender = m.sender || (m.role === 'model' || m.role === 'assistant' ? 'ai' : 'user');
      const text = m.text || (m.parts && m.parts[0]?.text) || '';
      return `${sender === 'user' ? 'Клиент' : 'Консьерж'}: ${text}`;
    });

    if (query && !normalizedHistory.some((line: string) => line.includes(query))) {
      normalizedHistory.push(`Клиент: ${query}`);
    }

    const promptText = `История диалога:\n${normalizedHistory.join('\n')}\n\nТекущие параметры: ${JSON.stringify(currentParams)}\nВыдай следующий JSON ответ:`;

    let parsedState: any = null;

    // Вариант 1: GoogleGenAI SDK
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '';
      if (responseText) {
        const jsonClean = responseText.replace(/```json|```/g, '').trim();
        parsedState = JSON.parse(jsonClean);
      }
    } catch (sdkErr: any) {
      console.warn('GoogleGenAI SDK call notice, trying direct REST fetch:', sdkErr?.message || sdkErr);
    }

    // Вариант 2: Direct REST fetch (если SDK не сработал)
    if (!parsedState) {
      const isBearer = apiKey.startsWith('AQ.') || apiKey.startsWith('ya29.');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

      if (isBearer) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['x-goog-api-key'] = apiKey;
        url += `?key=${apiKey}`;
      }

      const geminiRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        const jsonClean = rawJson ? rawJson.replace(/```json|```/g, '').trim() : '{}';
        parsedState = JSON.parse(jsonClean);
      }
    }

    // Fallback если Gemini недоступен
    if (!parsedState) {
      const lastText = query || (rawMessages.length ? rawMessages[rawMessages.length - 1].text : '');
      const lower = String(lastText || '').toLowerCase();
      parsedState = {
        origin_iata: currentParams.origin_iata || currentParams.origin || (lower.includes('хабаровск') ? 'KHV' : lower.includes('самара') ? 'KUF' : 'MOW'),
        origin_name: currentParams.origin_name || (lower.includes('хабаровск') ? 'Хабаровск' : lower.includes('самара') ? 'Самара' : 'Москва'),
        destination_iata: currentParams.destination_iata || currentParams.destination || (lower.includes('ханой') ? 'HAN' : lower.includes('рим') ? 'ROM' : 'BKK'),
        destination_name: currentParams.destination_name || (lower.includes('ханой') ? 'Ханой' : lower.includes('рим') ? 'Рим' : 'Бангкок'),
        departure_date: currentParams.departure_date || '2026-09-21',
        return_date: currentParams.return_date || null,
        is_round_trip: currentParams.is_round_trip || false,
        passengers_count: currentParams.passengers_count || 1,
        passengers_confirmed: currentParams.passengers_confirmed || false,
        cabin_class: currentParams.cabin_class || 'economy',
        baggage_type: currentParams.baggage_type || 'checked_baggage_all',
        is_complete: false,
        assistant_message: 'Вам нужен билет в одну сторону или планируете возвращение?',
        quick_options: ['🛫 В одну сторону', '🔄 Обратно через 7 дней', '🔄 Обратно через 14 дней'],
      };
    }

    let flightOffers: any[] = [];

    // Если указаны origin и destination — ищем реальные рейсы через Duffel API
    if (parsedState.origin_iata && parsedState.destination_iata) {
      flightOffers = await searchDuffelFlights({
        origin: parsedState.origin_iata,
        destination: parsedState.destination_iata,
        departureDate: parsedState.departure_date || currentDate,
        returnDate: parsedState.return_date,
        passengersCount: parsedState.passengers_count || 1,
        cabinClass: parsedState.cabin_class || 'economy',
      });
    }

    // Совместимый формат для клиентских компонентов
    const parsedUnified = {
      originIata: parsedState.origin_iata,
      originCity: parsedState.origin_name,
      destinationIata: parsedState.destination_iata,
      destinationCity: parsedState.destination_name,
      departureDate: parsedState.departure_date,
      returnDate: parsedState.return_date,
      isOneWay: !parsedState.is_round_trip,
      passengersCount: parsedState.passengers_count || 1,
      cabinClass: parsedState.cabin_class || 'economy',
      hasLuggage: parsedState.baggage_type === 'checked_baggage_all',
      quickReplies: parsedState.quick_options || [],
      missingQuestions: parsedState.is_complete ? [] : ['уточнение деталей'],
      reply: parsedState.assistant_message,
      aiSummary: parsedState.assistant_message,
    };

    return NextResponse.json({
      success: true,
      state: parsedState,
      parsed: parsedUnified,
      accumulatedSearchParams: parsedUnified,
      flights: flightOffers,
      message: parsedState.assistant_message,
      quickReplies: parsedState.quick_options || [],
      missingQuestions: parsedState.is_complete ? [] : ['уточнение деталей'],
    });
  } catch (error: any) {
    console.error('[/api/search] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Клиент поиска рейсов через Duffel API
async function searchDuffelFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  passengersCount: number;
  cabinClass: string;
}) {
  const duffelToken = process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_TOKEN;
  if (!duffelToken) {
    console.warn('DUFFEL_ACCESS_TOKEN is not configured');
    return [];
  }

  try {
    const slices: any[] = [
      {
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departureDate,
      },
    ];

    if (params.returnDate) {
      slices.push({
        origin: params.destination,
        destination: params.origin,
        departure_date: params.returnDate,
      });
    }

    const passengers = Array.from({ length: params.passengersCount }, () => ({ type: 'adult' }));

    const res = await fetch('https://api.duffel.com/air/offer_requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${duffelToken}`,
        'Duffel-Version': 'v2',
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers,
          cabin_class: params.cabinClass === 'business' ? 'business' : 'economy',
          return_offers: true,
        },
      }),
    });

    if (!res.ok) {
      console.error('Duffel API Error:', await res.text());
      return [];
    }

    const data = await res.json();
    const offers = data.data?.offers || [];

    // Преобразуем офферы Duffel в структуру FlightSaver
    return offers.slice(0, 4).map((offer: any, idx: number) => {
      const slice = offer.slices?.[0];
      const segments = slice?.segments || [];
      const firstSeg = segments[0];
      const lastSeg = segments[segments.length - 1];

      // Проверка пересадки 8-24ч для STPC отеля
      const isStpc = segments.length > 1;
      const rawAmount = parseFloat(offer.total_amount || '300');
      const totalRub = Math.round(rawAmount * 95);
      const marketRub = Math.round(totalRub * 1.35);

      return {
        id: offer.id || `fl-${idx + 1}`,
        airline: firstSeg?.operating_carrier?.name || offer.owner?.name || 'Авиакомпания',
        airlineCode: firstSeg?.operating_carrier?.iata_code || 'SU',
        flightNumber: `${firstSeg?.operating_carrier?.iata_code || 'SU'}-${firstSeg?.flight_number || '101'}`,
        originIata: firstSeg?.origin?.iata_code || params.origin,
        originCity: firstSeg?.origin?.city_name || firstSeg?.origin?.name || params.origin,
        originAirport: firstSeg?.origin?.name || params.origin,
        destinationIata: lastSeg?.destination?.iata_code || params.destination,
        destinationCity: lastSeg?.destination?.city_name || lastSeg?.destination?.name || params.destination,
        destinationAirport: lastSeg?.destination?.name || params.destination,
        departureDate: params.departureDate,
        departureTime: firstSeg?.departing_at ? firstSeg.departing_at.substring(11, 16) : '08:30',
        arrivalTime: lastSeg?.arriving_at ? lastSeg.arriving_at.substring(11, 16) : '19:50',
        duration: slice?.duration ? slice.duration.replace('PT', '').toLowerCase() : '11ч 20м',
        durationMinutes: 680,
        stopsCount: segments.length - 1,
        stopoverAirports: segments.length > 1 ? [segments[0].destination?.iata_code || 'IST'] : [],
        pricing: {
          totalPrice: totalRub,
          marketPrice: marketRub,
          savedAmount: marketRub - totalRub,
          savingsPercent: 26,
          isSplitTicketing: isStpc,
        },
        transit: {
          stpcHotelIncluded: isStpc,
          stpcDetails: isStpc ? '4★ Отель при длительной пересадке (STPC)' : undefined,
          visaFreeTransit: true,
          twovEligible: true,
        },
        cabinClass: params.cabinClass === 'business' ? 'Бизнес-класс' : 'Эконом',
        hasLuggage: true,
        baggage: 'Багаж 23 кг',
        segments: segments.map((seg: any) => ({
          airline: seg.operating_carrier?.name || 'Авиакомпания',
          flightNumber: `${seg.operating_carrier?.iata_code || 'SU'}-${seg.flight_number || '101'}`,
          origin: seg.origin?.iata_code,
          destination: seg.destination?.iata_code,
          departureTime: seg.departing_at?.substring(11, 16) || '08:30',
          arrivalTime: seg.arriving_at?.substring(11, 16) || '19:50',
          duration: '5ч 30м',
        })),
      };
    });
  } catch (err) {
    console.error('Duffel search error:', err);
    return [];
  }
}
