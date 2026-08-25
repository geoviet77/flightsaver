import { NextRequest, NextResponse } from 'next/server';
import { parseTravelQuery } from '@/lib/nlpParser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message || body.query;
    const history = body.history;
    const currentParams = body.currentParams || body.accumulatedSearchParams || body.previousParams;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not found in .env.local' }, { status: 500 });
    }

    const systemInstruction = `Ты — умный ИИ-авиаконсьерж сервиса FlightSaver. Текущий год: 2026.
Твоя задача: вести естественный, заботливый диалог с клиентом, понимать любые опечатки и разговорную речь, рассуждать о маршруте и извлекать точные параметры для поиска авиабилетов.

ТВОИ ПРАВИЛА:
1. Понимай любые опечатки: "Люксенбург" -> Люксембург [LUX], "Екатиринбург" -> Екатеринбург [SVX], "Питер" -> Санкт-Петербург [LED], "Париж" -> [CDG], "Рим" -> [FCO], "Самара" -> [KUF], "Мюнхен" -> [MUC], "Конго" -> [BZV].
2. ПОМНИ ВСЮ ИСТОРИЮ ДИАЛОГА И НАКАПЛИВАЙ ПАРАМЕТРЫ! В объекте "data" ты ОБЯЗАН сохранять ВСЕ ранее названные города (origin, destination), даты и параметры. Если пользователь ранее указал маршрут "Екатеринбург конго 17 октября", а потом пишет "11 ноября" — это дата возврата (returnDate: "2026-11-11"), при этом origin ("SVX"), destination ("BZV") и departureDate ("2026-10-17") ОБЯЗАНЫ СОХРАНЯТЬСЯ в "data"!
3. Рассуждай как профи: знай, что из РФ в Европу нет прямых рейсов, предлагай стыковки через Стамбул [IST] или Дубай [DXB].
4. Пиши живой, теплый, персональный ответ своими словами в поле "replyText". Задавай только те вопросы, которых РЕАЛЬНО не хватает.

ФОРМАТ ОТВЕТА (строго валидный JSON):
{
  "replyText": "Твой живой развернутый ответ на русском языке с рассуждениями о маршруте и вопросом клиенту",
  "data": {
    "origin": "IATA-код вылета (например KUF, SVX) или null",
    "originName": "Название города вылета (например Самара, Екатеринбург) или null",
    "destination": "IATA-код прилета (например LUX, BZV) или null",
    "destinationName": "Название города прилета (например Люксембург, Конго) или null",
    "departureDate": "YYYY-MM-DD или null",
    "returnDate": "YYYY-MM-DD или null",
    "isOneWay": boolean | null,
    "passengers": number | null,
    "cabinClass": "economy" | "premium_economy" | "business" | "first" | null,
    "hasLuggage": boolean | null,
    "missingQuestions": [
      {
        "field": "passengers" | "cabinClass" | "luggage" | "returnDate",
        "question": "Текст вопроса",
        "options": ["Вариант 1", "Вариант 2", "Вариант 3"]
      }
    ]
  }
}`;

    // Формируем историю для Gemini
    const contents: any[] = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: 'Понял задачу. Я готов работать как живой ИИ-консьерж FlightSaver с полным рассуждением и извлечением параметров.' }] }
    ];

    if (Array.isArray(history)) {
      for (const h of history) {
        if (h && h.text) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: typeof h.text === 'string' ? h.text : JSON.stringify(h.text) }]
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

    let aiRaw: any = null;

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
            aiRaw = JSON.parse(rawText);
            break;
          }
        }
      } catch (e: any) {}
    }

    if (!aiRaw) {
      // Fallback local semantic parser
      const prevNormalized: any = { ...currentParams };
      const fallback = parseTravelQuery(message, prevNormalized);
      const missingQuestions: any[] = [];
      if (!fallback.returnDate && fallback.isOneWay == null && !currentParams?.returnDate && currentParams?.isOneWay == null) {
        missingQuestions.push({
          field: 'returnDate',
          question: 'Вам нужен билет в одну сторону или планируете возвращение?',
          options: ['🛫 В одну сторону', '🔄 Обратно через 7 дней', '🔄 Обратно через 14 дней']
        });
      }
      if ((fallback.passengersCount == null && currentParams?.passengers == null) || (!/пассажир|человек|взросл/i.test(message) && currentParams?.passengers == null)) {
        missingQuestions.push({
          field: 'passengers',
          question: 'Сколько пассажиров летит?',
          options: ['👤 1 пассажир', '👥 2 пассажира', '👨‍👩‍👧 Семья (2+1)']
        });
      }
      if (!fallback.cabinClass && !currentParams?.cabinClass) {
        missingQuestions.push({
          field: 'cabinClass',
          question: 'Какой класс обслуживания предпочитаете?',
          options: ['🎫 Эконом', '✨ Комфорт', '💎 Бизнес']
        });
      }
      if (fallback.hasLuggage == null && currentParams?.hasLuggage == null) {
        missingQuestions.push({
          field: 'luggage',
          question: 'Понадобится ли багаж?',
          options: ['🎒 Только ручная кладь', '🧳 Багаж 23 кг', '🧳🧳 2 места багажа']
        });
      }

      aiRaw = {
        replyText: fallback.aiSummary || (fallback.originCity && fallback.destinationCity ? `Подобрал оптимальные маршруты ${fallback.originCity} ➔ ${fallback.destinationCity}.` : 'Пожалуйста, укажите город вылета и прилета.'),
        data: {
          origin: fallback.originIata || currentParams?.origin || null,
          originName: fallback.originCity || currentParams?.originName || null,
          destination: fallback.destinationIata || currentParams?.destination || null,
          destinationName: fallback.destinationCity || currentParams?.destinationName || null,
          departureDate: fallback.departureDate || currentParams?.departureDate || null,
          returnDate: fallback.returnDate || currentParams?.returnDate || null,
          isOneWay: fallback.isOneWay ?? currentParams?.isOneWay ?? null,
          passengers: fallback.passengersCount || currentParams?.passengers || null,
          cabinClass: (fallback.cabinClass ? fallback.cabinClass.toLowerCase() : null) || currentParams?.cabinClass || null,
          hasLuggage: fallback.hasLuggage ?? currentParams?.hasLuggage ?? null,
          missingQuestions
        }
      };
    }

    const incoming = aiRaw.data || {};
    const data: any = {
      origin: incoming.origin || currentParams?.origin || null,
      originName: incoming.originName || currentParams?.originName || null,
      destination: incoming.destination || currentParams?.destination || null,
      destinationName: incoming.destinationName || currentParams?.destinationName || null,
      departureDate: incoming.departureDate || currentParams?.departureDate || null,
      returnDate: incoming.returnDate || currentParams?.returnDate || null,
      isOneWay: incoming.isOneWay != null ? incoming.isOneWay : (currentParams?.isOneWay ?? null),
      passengers: incoming.passengers != null ? incoming.passengers : (currentParams?.passengers ?? null),
      cabinClass: incoming.cabinClass || currentParams?.cabinClass || null,
      hasLuggage: incoming.hasLuggage != null ? incoming.hasLuggage : (currentParams?.hasLuggage ?? null),
      missingQuestions: incoming.missingQuestions || []
    };

    data.originCity = data.originName || data.origin;
    data.destinationCity = data.destinationName || data.destination;
    data.originIata = data.origin;
    data.destinationIata = data.destination;
    data.missingFields = data.missingQuestions ? data.missingQuestions.map((q: any) => q.field) : [];

    // Генерируем карточки рейсов ТОЛЬКО если определены оба города
    const flights = generateFlights(data);

    return NextResponse.json({
      replyText: aiRaw.replyText,
      aiSummary: aiRaw.replyText,
      parsed: data,
      accumulatedSearchParams: data,
      flights
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateFlights(data: any) {
  if (!data?.origin || !data?.destination) return [];
  const pass = data.passengers || 1;
  const dest = (data.destination || '').toUpperCase();
  const hub = (dest === 'LUX' || dest === 'MUC' || dest === 'FCO' || dest === 'BER' || dest === 'CDG' || dest === 'PMF') ? 'Стамбул [IST]' : 'Дубай [DXB]';
  const hubCity = hub.includes('IST') ? 'Стамбул' : 'Дубай';
  const hubIata = hub.includes('IST') ? 'IST' : 'DXB';
  const isBusiness = data.cabinClass === 'business';
  const isPremium = data.cabinClass === 'premium_economy';
  const basePrice1 = isBusiness ? 135000 : isPremium ? 72000 : 39400;
  const basePrice2 = isBusiness ? 152000 : isPremium ? 81000 : 44800;
  const bagMod = data.hasLuggage === false ? 0 : 5400;

  const p1 = Math.round((basePrice1 + bagMod) * pass);
  const p2 = Math.round((basePrice2 + bagMod) * pass);

  return [
    {
      id: `fl_${data.origin}_${data.destination}_1`,
      origin: data.origin,
      originName: data.originName,
      originCity: data.originName,
      originIata: data.origin,
      destination: data.destination,
      destinationName: data.destinationName,
      destinationCity: data.destinationName,
      destinationIata: data.destination,
      departureDate: data.departureDate || '2026-11-11',
      returnDate: data.returnDate || null,
      passengers: pass,
      passengersCount: pass,
      cabinClass: data.cabinClass || 'economy',
      hasLuggage: data.hasLuggage ?? true,
      baggageIncluded: data.hasLuggage ?? true,
      hasStpcHotel: false,
      isStpcEligible: false,
      totalPrice: p1,
      oldPrice: Math.round(p1 * 1.42),
      duration: '8ч 45м',
      totalDuration: '8ч 45м',
      routeSegments: [`${data.originName} → ${hub} → ${data.destinationName}`],
      airlines: ['Turkish Airlines', 'Pegasus'],
      pricing: {
        totalPrice: p1,
        marketPrice: Math.round(p1 * 1.42),
        savedAmount: Math.round(p1 * 0.42),
        discountPercentage: 29,
        currency: 'RUB',
        fareDescription: `Оптимальный тариф со стыковкой через ${hubCity} (${hubIata}).`,
        breakdown: {
          leg1: { title: `${data.originName} → ${hubCity}`, price: Math.round(p1 * 0.55), provider: 'Turkish Airlines' },
          leg2: { title: `${hubCity} → ${data.destinationName}`, price: Math.round(p1 * 0.45), provider: 'Turkish Airlines' }
        }
      },
      transit: {
        hasTransit: true,
        transitCity: hubCity,
        transitAirport: hubIata,
        transitDuration: '2ч 10м',
        stpcHotelIncluded: false,
        visaFreeTransit: true,
        baggageRecheckRequired: false
      },
      segments: [
        {
          airline: 'Turkish Airlines',
          airlineCode: 'TK',
          flightNumber: 'TK 412',
          fromCity: data.originName,
          fromAirport: `${data.originName} (${data.origin})`,
          fromIata: data.origin,
          toCity: hubCity,
          toAirport: `${hubCity} (${hubIata})`,
          toIata: hubIata,
          departureTime: '09:20',
          arrivalTime: '13:30',
          duration: '4ч 10м',
          bookingProvider: 'Turkish Airlines Direct',
          cabinClass: data.cabinClass || 'economy',
          aircraft: 'Airbus A330-300',
          baggage: data.hasLuggage === false ? 'Ручная кладь 8 кг' : '23 кг'
        },
        {
          airline: 'Turkish Airlines',
          airlineCode: 'TK',
          flightNumber: 'TK 680',
          fromCity: hubCity,
          fromAirport: `${hubCity} (${hubIata})`,
          fromIata: hubIata,
          toCity: data.destinationName,
          toAirport: `${data.destinationName} (${data.destination})`,
          toIata: data.destination,
          departureTime: '15:40',
          arrivalTime: '19:05',
          duration: '3ч 25м',
          bookingProvider: 'Turkish Airlines Direct',
          cabinClass: data.cabinClass || 'economy',
          aircraft: 'Boeing 737-800',
          baggage: data.hasLuggage === false ? 'Ручная кладь 8 кг' : '23 кг'
        }
      ],
      tags: ['⚡ Оптимальный маршрут', 'Быстрая пересадка']
    },
    {
      id: `fl_${data.origin}_${data.destination}_2`,
      origin: data.origin,
      originName: data.originName,
      originCity: data.originName,
      originIata: data.origin,
      destination: data.destination,
      destinationName: data.destinationName,
      destinationCity: data.destinationName,
      destinationIata: data.destination,
      departureDate: data.departureDate || '2026-11-11',
      returnDate: data.returnDate || null,
      passengers: pass,
      passengersCount: pass,
      cabinClass: data.cabinClass || 'economy',
      hasLuggage: data.hasLuggage ?? true,
      baggageIncluded: data.hasLuggage ?? true,
      hasStpcHotel: true,
      isStpcEligible: true,
      totalPrice: p2,
      oldPrice: Math.round(p2 * 1.45),
      duration: '15ч 30м (Отель STPC)',
      totalDuration: '15ч 30м (Отель STPC)',
      routeSegments: [`${data.originName} → Дубай [DXB] (Бесплатный 4* отель) → ${data.destinationName}`],
      airlines: ['Emirates', 'Flydubai'],
      pricing: {
        totalPrice: p2,
        marketPrice: Math.round(p2 * 1.45),
        savedAmount: Math.round(p2 * 0.45),
        discountPercentage: 31,
        currency: 'RUB',
        fareDescription: 'Включен бесплатный 4★ отель STPC в Дубае при длительной стыковке.',
        breakdown: {
          leg1: { title: `${data.originName} → Дубай`, price: Math.round(p2 * 0.52), provider: 'Flydubai' },
          leg2: { title: `Дубай → ${data.destinationName}`, price: Math.round(p2 * 0.48), provider: 'Emirates' }
        }
      },
      transit: {
        hasTransit: true,
        transitCity: 'Дубай',
        transitAirport: 'DXB',
        transitDuration: '8ч 30м',
        stpcHotelIncluded: true,
        stpcDetails: 'Бесплатный 4★ отель в Дубае с трансфером и питанием',
        visaFreeTransit: true,
        baggageRecheckRequired: false
      },
      segments: [
        {
          airline: 'Flydubai',
          airlineCode: 'FZ',
          flightNumber: 'FZ 922',
          fromCity: data.originName,
          fromAirport: `${data.originName} (${data.origin})`,
          fromIata: data.origin,
          toCity: 'Дубай',
          toAirport: 'Дубай (DXB)',
          toIata: 'DXB',
          departureTime: '08:00',
          arrivalTime: '13:45',
          duration: '5ч 45м',
          bookingProvider: 'Flydubai Direct',
          cabinClass: data.cabinClass || 'economy',
          aircraft: 'Boeing 737 MAX 8',
          baggage: data.hasLuggage === false ? 'Ручная кладь 8 кг' : '23 кг'
        },
        {
          airline: 'Emirates',
          airlineCode: 'EK',
          flightNumber: 'EK 037',
          fromCity: 'Дубай',
          fromAirport: 'Дубай (DXB)',
          fromIata: 'DXB',
          toCity: data.destinationName,
          toAirport: `${data.destinationName} (${data.destination})`,
          toIata: data.destination,
          departureTime: '22:15',
          arrivalTime: '03:45',
          duration: '5ч 30м',
          bookingProvider: 'Emirates NDC',
          cabinClass: data.cabinClass || 'economy',
          aircraft: 'Airbus A380-800',
          baggage: data.hasLuggage === false ? 'Ручная кладь 8 кг' : '23 кг'
        }
      ],
      tags: ['🏨 Отель STPC 4★ Бесплатно', 'Комфортный отдых']
    }
  ];
}
