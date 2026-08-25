import { NextRequest, NextResponse } from 'next/server';
import { parseTravelQuery } from '@/lib/nlpParser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message || body.query;
    const history = body.history;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY не задан' }, { status: 500 });
    }

    const systemPrompt = `Ты — живой ИИ Консьерж сервиса FlightSaver. Текущий год: 2026.
Веди естественный, умный диалог с клиентом как опытный тревел-эксперт.
Используй свои знания географии, авиации и поиск Google для исправления любых опечаток в городах и поиска точных IATA-кодов аэропортов.

В каждом ответе верни строго валидный JSON:
{
  "reply": "Твой живой развернутый ответ клиенту на русском (объясни маршрут, особенности стыковок, отели STPC и задай недостающие вопросы)",
  "origin": "IATA код города вылета (например SVX, KUF, MOW) или null",
  "originCity": "Название города вылета на русском или null",
  "destination": "IATA код города прилета (например LAX, LUX, BZV, MUC) или null",
  "destinationCity": "Название города прилета на русском или null",
  "departureDate": "YYYY-MM-DD или null",
  "returnDate": "YYYY-MM-DD или null",
  "isOneWay": boolean | null,
  "passengers": number | null,
  "cabinClass": "economy" | "premium_economy" | "business" | "first" | null,
  "hasLuggage": boolean | null,
  "missingQuestions": [
    {
      "id": "passengers" | "cabinClass" | "luggage" | "returnDate",
      "question": "Текст вопроса",
      "options": ["Кнопка 1", "Кнопка 2", "Кнопка 3"]
    }
  ]
}`;

    // Передаем полную историю диалога в Gemini
    const contents: any[] = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Принято. Я работаю как полноценный живой ИИ Консьерж FlightSaver с веб-поиском и рассуждением.' }] }
    ];

    if (Array.isArray(history)) {
      for (const h of history) {
        if (h && (h.text || h.message)) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: typeof h.text === 'string' ? h.text : JSON.stringify(h) }]
          });
        }
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];

    let parsedData: any = null;

    for (const modelName of candidateModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        if (geminiRes.ok) {
          const json = await geminiRes.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            parsedData = JSON.parse(rawText);
            break;
          }
        }
      } catch (e: any) {}
    }

    // Если Gemini временно недоступен или превышена квота — используем семантическое извлечение
    if (!parsedData) {
      const fallback = parseTravelQuery(message, body.currentParams || body.previousParams);
      parsedData = {
        reply: fallback.originCity && fallback.destinationCity
          ? (fallback.aiSummary || `Подобрал оптимальные маршруты ${fallback.originCity} ➔ ${fallback.destinationCity}.`)
          : 'Пожалуйста, укажите город вылета и назначения для подбора авиабилетов.',
        origin: fallback.originIata,
        originCity: fallback.originCity,
        destination: fallback.destinationIata,
        destinationCity: fallback.destinationCity,
        departureDate: fallback.departureDate || null,
        returnDate: fallback.returnDate || null,
        isOneWay: fallback.isOneWay ?? null,
        passengers: fallback.passengersCount ?? 1,
        cabinClass: fallback.cabinClass ? String(fallback.cabinClass).toLowerCase() : 'economy',
        hasLuggage: fallback.hasLuggage ?? true,
        missingQuestions: (fallback as any).missingQuestions || []
      };
    }

    // Формируем карточки рейсов под РЕАЛЬНО найденные города
    const flights = generateDynamicFlights(parsedData);

    return NextResponse.json({
      replyText: parsedData.reply || parsedData.replyText || 'Подобрал подходящие рейсы.',
      parsed: {
        ...parsedData,
        originIata: parsedData.origin,
        destinationIata: parsedData.destination,
        originCity: parsedData.originCity || parsedData.origin,
        destinationCity: parsedData.destinationCity || parsedData.destination,
        missingQuestions: parsedData.missingQuestions || []
      },
      flights
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateDynamicFlights(data: any) {
  if (!data?.origin || !data?.destination) return [];
  const pass = data.passengers || 1;
  const basePrice = data.cabinClass === 'business' ? 160000 : 45000;
  const bagPrice = data.hasLuggage === false ? 0 : 6000;

  const originName = data.originCity || data.origin;
  const destinationName = data.destinationCity || data.destination;
  const departureDate = data.departureDate || '2026-09-12';
  const returnDate = data.returnDate || undefined;
  const cabin = data.cabinClass || 'economy';
  const hasLuggage = data.hasLuggage ?? true;

  return [
    {
      id: 'fl_1',
      originCity: originName,
      destinationCity: destinationName,
      originIata: data.origin,
      destinationIata: data.destination,
      departureDate: departureDate,
      returnDate: returnDate,
      passengers: pass,
      passengersCount: pass,
      cabinClass: cabin,
      hasLuggage: hasLuggage,
      baggageIncluded: hasLuggage,
      baggageDescription: hasLuggage ? 'Багаж 23 кг включен' : 'Только ручная кладь',
      hasStpcHotel: false,
      isStpcEligible: false,
      isBestValue: true,
      isFastest: false,
      totalDuration: '14ч 30м',
      totalDurationMinutes: 870,
      totalPrice: (basePrice + bagPrice) * pass,
      oldPrice: Math.round((basePrice + bagPrice) * pass * 1.35),
      pricing: {
        currency: 'RUB',
        totalPrice: (basePrice + bagPrice) * pass,
        marketPrice: Math.round((basePrice + bagPrice) * pass * 1.35),
        savedAmount: Math.round((basePrice + bagPrice) * pass * 0.35),
        savedPercentage: 26,
        segmentBreakdowns: [],
        netSupplierFare: Math.round((basePrice + bagPrice) * pass * 0.95),
        serviceFee: Math.round((basePrice + bagPrice) * pass * 0.05),
        splitSavingsReason: 'Раздельная выписка сегментов'
      },
      segments: [
        {
          airline: 'Turkish Airlines',
          airlineCode: 'TK',
          flightNumber: 'TK-418',
          fromAirport: originName,
          fromCity: originName,
          fromIata: data.origin,
          toAirport: 'Стамбул',
          toCity: 'Стамбул',
          toIata: 'IST',
          departureTime: '10:30',
          arrivalTime: '14:45',
          duration: '4ч 15м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        },
        {
          airline: 'Turkish Airlines',
          airlineCode: 'TK',
          flightNumber: 'TK-792',
          fromAirport: 'Стамбул',
          fromCity: 'Стамбул',
          fromIata: 'IST',
          toAirport: destinationName,
          toCity: destinationName,
          toIata: data.destination,
          departureTime: '18:15',
          arrivalTime: '23:00',
          duration: '4ч 45м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        }
      ],
      transit: {
        hasTransit: true,
        transitCity: 'Стамбул',
        transitAirport: 'IST',
        transitDuration: '3ч 30м',
        stpcHotelIncluded: false,
        visaFreeTransit: true
      },
      routeSegments: [`${originName} → Стамбул [IST] → ${destinationName}`],
      airlines: ['Turkish Airlines'],
      tags: ['Оптимальный', 'Split-Ticketing']
    },
    {
      id: 'fl_2',
      originCity: originName,
      destinationCity: destinationName,
      originIata: data.origin,
      destinationIata: data.destination,
      departureDate: departureDate,
      returnDate: returnDate,
      passengers: pass,
      passengersCount: pass,
      cabinClass: cabin,
      hasLuggage: hasLuggage,
      baggageIncluded: hasLuggage,
      baggageDescription: hasLuggage ? 'Багаж 23 кг включен' : 'Только ручная кладь',
      hasStpcHotel: true,
      isStpcEligible: true,
      isBestValue: false,
      isFastest: false,
      totalDuration: '18ч 45м (Отель STPC)',
      totalDurationMinutes: 1125,
      totalPrice: (basePrice + bagPrice + 5000) * pass,
      oldPrice: Math.round((basePrice + bagPrice + 5000) * pass * 1.4),
      pricing: {
        currency: 'RUB',
        totalPrice: (basePrice + bagPrice + 5000) * pass,
        marketPrice: Math.round((basePrice + bagPrice + 5000) * pass * 1.4),
        savedAmount: Math.round((basePrice + bagPrice + 5000) * pass * 0.4),
        savedPercentage: 28,
        segmentBreakdowns: [],
        netSupplierFare: Math.round((basePrice + bagPrice + 5000) * pass * 0.95),
        serviceFee: Math.round((basePrice + bagPrice + 5000) * pass * 0.05),
        splitSavingsReason: 'Включен бесплатный 4★ отель STPC'
      },
      segments: [
        {
          airline: 'Emirates',
          airlineCode: 'EK',
          flightNumber: 'EK-132',
          fromAirport: originName,
          fromCity: originName,
          fromIata: data.origin,
          toAirport: 'Дубай',
          toCity: 'Дубай',
          toIata: 'DXB',
          departureTime: '17:20',
          arrivalTime: '23:30',
          duration: '5ч 10м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        },
        {
          airline: 'Emirates',
          airlineCode: 'EK',
          flightNumber: 'EK-384',
          fromAirport: 'Дубай',
          fromCity: 'Дубай',
          fromIata: 'DXB',
          toAirport: destinationName,
          toCity: destinationName,
          toIata: data.destination,
          departureTime: '08:45',
          arrivalTime: '14:05',
          duration: '5ч 20м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        }
      ],
      transit: {
        hasTransit: true,
        transitCity: 'Дубай',
        transitAirport: 'DXB',
        transitDuration: '9ч 15м',
        stpcHotelIncluded: true,
        stpcDetails: 'Бесплатный отель 4★ STPC + трансфер',
        visaFreeTransit: true
      },
      routeSegments: [`${originName} → Дубай [DXB] (Отель STPC) → ${destinationName}`],
      airlines: ['Emirates', 'Flydubai'],
      tags: ['Отель STPC 4★', 'Комфортный транзит']
    }
  ];
}
