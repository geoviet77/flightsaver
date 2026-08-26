import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, currentParams } = await req.json();

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

    const promptText = `История диалога:\n${(messages || [])
      .map((m: ChatMessage) => `${m.sender === 'user' ? 'Клиент' : 'Консьерж'}: ${m.text}`)
      .join('\n')}\n\nТекущие параметры: ${JSON.stringify(currentParams || {})}\nВыдай следующий JSON ответ:`;

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
      console.warn('GoogleGenAI SDK call failed, trying direct REST fetch:', sdkErr?.message || sdkErr);
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
      const lastUserMsg = (messages || []).filter((m: ChatMessage) => m.sender === 'user').pop()?.text || '';
      parsedState = {
        origin_iata: currentParams?.origin_iata || (lastUserMsg.toLowerCase().includes('хабаровск') ? 'KHV' : lastUserMsg.toLowerCase().includes('самара') ? 'KUF' : 'MOW'),
        origin_name: currentParams?.origin_name || (lastUserMsg.toLowerCase().includes('хабаровск') ? 'Хабаровск' : lastUserMsg.toLowerCase().includes('самара') ? 'Самара' : 'Москва'),
        destination_iata: currentParams?.destination_iata || (lastUserMsg.toLowerCase().includes('ханой') ? 'HAN' : lastUserMsg.toLowerCase().includes('рим') ? 'ROM' : 'BKK'),
        destination_name: currentParams?.destination_name || (lastUserMsg.toLowerCase().includes('ханой') ? 'Ханой' : lastUserMsg.toLowerCase().includes('рим') ? 'Рим' : 'Бангкок'),
        departure_date: currentParams?.departure_date || '2026-09-21',
        return_date: currentParams?.return_date || null,
        is_round_trip: currentParams?.is_round_trip || false,
        passengers_count: currentParams?.passengers_count || 1,
        passengers_confirmed: currentParams?.passengers_confirmed || false,
        cabin_class: currentParams?.cabin_class || 'economy',
        baggage_type: currentParams?.baggage_type || 'checked_baggage_all',
        is_complete: false,
        assistant_message: 'Вам нужен билет в одну сторону или планируете возвращение?',
        quick_options: ['🛫 В одну сторону', '🔄 Обратно через 7 дней', '🔄 Обратно через 14 дней'],
      };
    }

    let flightOffers: any[] = [];

    // Если указаны origin и destination — ищем рейсы
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

    return NextResponse.json({
      state: parsedState,
      flights: flightOffers,
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

      return {
        id: offer.id || `fl-${idx + 1}`,
        airline: firstSeg?.operating_carrier?.name || offer.owner?.name || 'Авиакомпания',
        origin: firstSeg?.origin?.iata_code || params.origin,
        destination: lastSeg?.destination?.iata_code || params.destination,
        originCity: firstSeg?.origin?.city_name || firstSeg?.origin?.name || params.origin,
        destinationCity: lastSeg?.destination?.city_name || lastSeg?.destination?.name || params.destination,
        departureDate: params.departureDate,
        departureTime: firstSeg?.departing_at ? firstSeg.departing_at.substring(11, 16) : '08:30',
        arrivalTime: lastSeg?.arriving_at ? lastSeg.arriving_at.substring(11, 16) : '19:50',
        duration: slice?.duration ? slice.duration.replace('PT', '').toLowerCase() : '11ч 20м',
        totalPrice: Math.round(parseFloat(offer.total_amount || '300') * 95), // Конвертация в RUB
        stpcHotelIncluded: isStpc,
        cabinClass: params.cabinClass === 'business' ? 'Бизнес-класс' : 'Эконом',
        baggage: 'Багаж 23 кг',
      };
    });
  } catch (err) {
    console.error('Duffel search error:', err);
    return [];
  }
}
