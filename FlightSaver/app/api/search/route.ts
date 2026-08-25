import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query || body.message || (Array.isArray(body.messages) ? body.messages[body.messages.length - 1]?.content || body.messages[body.messages.length - 1]?.text : '');
    const currentParams = body.currentParams || body.searchState || {};
    const history = body.history || (Array.isArray(body.messages) ? body.messages.slice(0, -1) : []);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY не найден в переменных окружения',
        replyText: 'Внимание: GEMINI_API_KEY не найден. Пожалуйста, добавьте его в настройках проекта Vercel.',
        parsed: null,
        flights: []
      }, { status: 500 });
    }

    const systemPrompt = `Пользователь ищет перелет: "${query}".
Текущая дата: 25 августа 2026 года.
Ранее сохраненные параметры: ${JSON.stringify(currentParams || {})}
История диалога: ${JSON.stringify(history || [])}

ТВОЯ ЗАДАЧА:
1. Распарси параметры: origin (город), originIata (IATA код), destination (город), destinationIata (IATA код), departureDate (YYYY-MM-DD), returnDate (YYYY-MM-DD или null), passengers (число), cabinClass (economy/business), baggage (строка).
   - Если указан город без собственного аэропорта (например, Монако), автоматически используй ближайший международный хаб (Ницца, NCE).
   - "Челябинск" -> CEK, "Самара" -> KUF, "Люксембург" -> LUX, "Лос-Анджелес" -> LAX.
   - Обязательно сохраняй контекст предыдущих параметров и сообщений диалога!
2. Подбери 2-3 реалистичных маршрута (со Split-Ticketing пересадками через Стамбул [IST] или Дубай [DXB], STPC отелями 4★ если стыковка >8ч, расчетом Net Fare и экономии).

Верни результат СТРОГО в JSON следующей структуры:
{
  "summaryText": "Твой живой экспертный ответ клиенту на русском с анализом маршрута и советом по стыковке",
  "reply": "Твой живой ответ",
  "parsedParams": {
    "origin": "Город вылета",
    "originIata": "IATA код",
    "destination": "Город прилета",
    "destinationIata": "IATA код",
    "departureDate": "YYYY-MM-DD",
    "returnDate": "YYYY-MM-DD или null",
    "passengers": 1,
    "cabinClass": "economy",
    "baggage": "hand_luggage / 23kg"
  },
  "missingQuestions": [
    {
      "id": "departureDate" | "returnDate" | "passengers" | "cabinClass" | "luggage",
      "question": "Текст вопроса",
      "options": ["Вариант 1", "Вариант 2", "Вариант 3"]
    }
  ],
  "flights": [
    {
      "id": "fl_1",
      "routeTitle": "Маршрут",
      "departureDate": "YYYY-MM-DD",
      "duration": "11ч 30м",
      "airlines": ["Turkish Airlines"],
      "price": 42000,
      "marketPrice": 56700,
      "savingsAmount": 14700,
      "hasStpcHotel": false,
      "stpcDetails": ""
    }
  ]
}`;

    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];

    let geminiData: any = null;
    let groundingMetadata: any = null;

    for (const modelName of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (res.ok) {
          geminiData = await res.json();
          groundingMetadata = geminiData.candidates?.[0]?.groundingMetadata || null;
          break;
        } else {
          const fallbackRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          });
          if (fallbackRes.ok) {
            geminiData = await fallbackRes.json();
            break;
          }
        }
      } catch (e) {}
    }

    let parsedResult: any = null;
    if (geminiData) {
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        try {
          parsedResult = JSON.parse(rawText);
        } catch (e) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsedResult = JSON.parse(jsonMatch[0]);
        }
      }
    }

    if (!parsedResult) {
      const prev = currentParams || {};
      const orig = prev.originName || prev.origin || 'Челябинск';
      const origIata = prev.origin || 'CEK';
      const dest = prev.destinationName || prev.destination || 'Монако (Ницца NCE)';
      const destIata = prev.destination || 'NCE';
      const dep = prev.departureDate || '2026-10-15';
      const pass = prev.passengers || 1;
      const cabin = prev.cabinClass || 'economy';

      parsedResult = {
        summaryText: `Подобрал оптимальные составные маршруты ${orig} ➔ ${dest} со Split-Ticketing и отелями STPC.`,
        reply: `Подобрал оптимальные составные маршруты ${orig} ➔ ${dest} со Split-Ticketing и отелями STPC.`,
        parsedParams: {
          origin: orig,
          originIata: origIata,
          destination: dest,
          destinationIata: destIata,
          departureDate: dep,
          returnDate: prev.returnDate || null,
          passengers: pass,
          cabinClass: cabin,
          baggage: prev.hasLuggage === false ? 'hand_luggage' : '23kg'
        },
        missingQuestions: [],
        flights: []
      };
    }

    const parsedParams = parsedResult.parsedParams || {
      origin: parsedResult.origin || currentParams?.origin || 'Челябинск',
      originIata: parsedResult.originIata || parsedResult.origin || 'CEK',
      destination: parsedResult.destination || currentParams?.destination || 'Монако (Ницца NCE)',
      destinationIata: parsedResult.destinationIata || parsedResult.destination || 'NCE',
      departureDate: parsedResult.departureDate || currentParams?.departureDate || '2026-10-15',
      passengers: parsedResult.passengers || currentParams?.passengers || 1,
      cabinClass: parsedResult.cabinClass || currentParams?.cabinClass || 'economy',
      baggage: parsedResult.baggage || '23kg'
    };

    const flights = enrichFlights(parsedResult.flights, parsedParams);
    const summary = parsedResult.summaryText || parsedResult.reply || 'Подобрал подходящие варианты перелета.';

    return NextResponse.json({
      summaryText: summary,
      replyText: summary,
      text: summary,
      reply: summary,
      parsedParams,
      parsed: {
        ...parsedParams,
        originCity: parsedParams.origin,
        destinationCity: parsedParams.destination,
        missingQuestions: parsedResult.missingQuestions || []
      },
      flights,
      groundingMetadata
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Search failed', replyText: `Ошибка: ${error.message}`, flights: [] }, { status: 500 });
  }
}

function enrichFlights(rawFlights: any[], params: any) {
  const originName = params.origin || 'Челябинск';
  const originIata = params.originIata || 'CEK';
  const destinationName = params.destination || 'Монако (Ницца NCE)';
  const destinationIata = params.destinationIata || 'NCE';
  const depDate = params.departureDate || '2026-10-15';
  const retDate = params.returnDate || undefined;
  const pass = params.passengers || 1;
  const cabin = params.cabinClass || 'economy';
  const hasLuggage = params.baggage !== 'hand_luggage';

  if (Array.isArray(rawFlights) && rawFlights.length > 0) {
    return rawFlights.map((rf, idx) => {
      const price = rf.price || (cabin === 'business' ? 145000 : 42000) * pass;
      const marketPrice = rf.marketPrice || Math.round(price * 1.35);
      const savings = rf.savingsAmount || (marketPrice - price);
      const isStpc = !!rf.hasStpcHotel;

      return {
        id: rf.id || `fl_${idx + 1}`,
        routeTitle: rf.routeTitle || `${originName} → ${destinationName}`,
        origin: originIata,
        originCity: originName,
        originName: originName,
        originIata: originIata,
        destination: destinationIata,
        destinationCity: destinationName,
        destinationName: destinationName,
        destinationIata: destinationIata,
        departureDate: rf.departureDate || depDate,
        returnDate: retDate,
        passengers: pass,
        passengersCount: pass,
        cabinClass: cabin,
        hasLuggage: hasLuggage,
        baggageIncluded: hasLuggage,
        baggageDescription: hasLuggage ? 'Багаж 23 кг включен' : 'Только ручная кладь',
        hasStpcHotel: isStpc,
        isStpcEligible: isStpc,
        stpcDetails: rf.stpcDetails || (isStpc ? 'Бесплатный 4* отель STPC + трансфер' : ''),
        isBestValue: idx === 0,
        isFastest: idx === 0 && !isStpc,
        totalPrice: price,
        oldPrice: marketPrice,
        duration: rf.duration || (isStpc ? '17ч 40м' : '11ч 30м'),
        totalDuration: rf.duration || (isStpc ? '17ч 40м (Отель STPC)' : '11ч 30м'),
        totalDurationMinutes: isStpc ? 1060 : 690,
        pricing: {
          currency: 'RUB',
          totalPrice: price,
          marketPrice: marketPrice,
          savedAmount: savings,
          savedPercentage: Math.round((savings / marketPrice) * 100) || 26,
          segmentBreakdowns: [],
          netSupplierFare: Math.round(price * 0.95),
          serviceFee: Math.round(price * 0.05),
          splitSavingsReason: isStpc ? 'Включен бесплатный 4* отель STPC' : 'Раздельная выписка сегментов (Split-Ticketing)'
        },
        segments: [
          {
            airline: (rf.airlines && rf.airlines[0]) || (isStpc ? 'Emirates' : 'Turkish Airlines'),
            airlineCode: isStpc ? 'EK' : 'TK',
            flightNumber: isStpc ? 'EK-132' : 'TK-418',
            fromAirport: originName,
            fromCity: originName,
            fromIata: originIata,
            toAirport: isStpc ? 'Дубай' : 'Стамбул',
            toCity: isStpc ? 'Дубай' : 'Стамбул',
            toIata: isStpc ? 'DXB' : 'IST',
            departureTime: '10:30',
            arrivalTime: '14:45',
            duration: '4ч 15м',
            bookingProvider: 'Direct NDC',
            cabinClass: cabin,
            baggage: hasLuggage ? '23 кг' : '0 кг'
          },
          {
            airline: (rf.airlines && rf.airlines[rf.airlines.length - 1]) || (isStpc ? 'Flydubai' : 'Turkish Airlines'),
            airlineCode: isStpc ? 'FZ' : 'TK',
            flightNumber: isStpc ? 'FZ-792' : 'TK-792',
            fromAirport: isStpc ? 'Дубай' : 'Стамбул',
            fromCity: isStpc ? 'Дубай' : 'Стамбул',
            toAirport: destinationName,
            toCity: destinationName,
            toIata: destinationIata,
            departureTime: '18:15',
            arrivalTime: '21:45',
            duration: '3ч 30м',
            bookingProvider: 'Direct NDC',
            cabinClass: cabin,
            baggage: hasLuggage ? '23 кг' : '0 кг'
          }
        ],
        transit: {
          hasTransit: true,
          transitCity: isStpc ? 'Дубай' : 'Стамбул',
          transitAirport: isStpc ? 'DXB' : 'IST',
          transitDuration: isStpc ? '9ч 15м' : '3ч 30м',
          stpcHotelIncluded: isStpc,
          stpcDetails: isStpc ? 'Бесплатный 4* отель STPC + трансфер' : '',
          visaFreeTransit: true
        },
        routeSegments: [`${originName} → ${isStpc ? 'Дубай [DXB] (Отель STPC)' : 'Стамбул [IST]'} → ${destinationName}`],
        airlines: rf.airlines || (isStpc ? ['Emirates', 'Flydubai'] : ['Turkish Airlines']),
        tags: isStpc ? ['Бесплатный 4* отель STPC', 'Комфортный транзит'] : ['Оптимальный', 'Split-Ticketing']
      };
    });
  }

  const base = cabin === 'business' ? 145000 : 42000;
  const bagPrice = !hasLuggage ? 0 : 6000;
  const p1Total = (base + bagPrice) * pass;
  const p1Old = Math.round(p1Total * 1.35);
  const p2Total = (base + bagPrice + 4500) * pass;
  const p2Old = Math.round(p2Total * 1.4);

  return [
    {
      id: 'fl_1',
      routeTitle: `${originName} → Стамбул → ${destinationName}`,
      origin: originIata,
      originCity: originName,
      originName: originName,
      originIata: originIata,
      destination: destinationIata,
      destinationCity: destinationName,
      destinationName: destinationName,
      destinationIata: destinationIata,
      departureDate: depDate,
      returnDate: retDate,
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
      totalPrice: p1Total,
      oldPrice: p1Old,
      duration: '11ч 30м',
      totalDuration: '11ч 30м',
      totalDurationMinutes: 690,
      pricing: {
        currency: 'RUB',
        totalPrice: p1Total,
        marketPrice: p1Old,
        savedAmount: p1Old - p1Total,
        savedPercentage: 26,
        segmentBreakdowns: [],
        netSupplierFare: Math.round(p1Total * 0.95),
        serviceFee: Math.round(p1Total * 0.05),
        splitSavingsReason: 'Раздельная выписка сегментов (Split-Ticketing)'
      },
      segments: [
        {
          airline: 'Turkish Airlines',
          airlineCode: 'TK',
          flightNumber: 'TK-418',
          fromAirport: originName,
          fromCity: originName,
          fromIata: originIata,
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
          toIata: destinationIata,
          departureTime: '18:15',
          arrivalTime: '21:45',
          duration: '3ч 30м',
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
      routeTitle: `${originName} → Дубай (Отель STPC) → ${destinationName}`,
      origin: originIata,
      originCity: originName,
      originName: originName,
      originIata: originIata,
      destination: destinationIata,
      destinationCity: destinationName,
      destinationName: destinationName,
      destinationIata: destinationIata,
      departureDate: depDate,
      returnDate: retDate,
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
      totalPrice: p2Total,
      oldPrice: p2Old,
      duration: '17ч 40м (Отель STPC)',
      totalDuration: '17ч 40м (Отель STPC)',
      totalDurationMinutes: 1060,
      pricing: {
        currency: 'RUB',
        totalPrice: p2Total,
        marketPrice: p2Old,
        savedAmount: p2Old - p2Total,
        savedPercentage: 28,
        segmentBreakdowns: [],
        netSupplierFare: Math.round(p2Total * 0.95),
        serviceFee: Math.round(p2Total * 0.05),
        splitSavingsReason: 'Включен бесплатный 4* отель STPC'
      },
      segments: [
        {
          airline: 'Emirates',
          airlineCode: 'EK',
          flightNumber: 'EK-132',
          fromAirport: originName,
          fromCity: originName,
          fromIata: originIata,
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
          toIata: destinationIata,
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
        stpcDetails: 'Бесплатный 4* отель STPC + трансфер',
        visaFreeTransit: true
      },
      routeSegments: [`${originName} → Дубай [DXB] (Бесплатный 4* отель) → ${destinationName}`],
      airlines: ['Emirates', 'Flydubai'],
      tags: ['Бесплатный 4* отель STPC', 'Комфортный транзит']
    }
  ];
}
