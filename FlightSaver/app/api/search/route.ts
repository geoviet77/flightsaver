import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const apiKey = process.env.GEMINI_API_KEY || '';

    // Форматируем входящие сообщения для строгого чередования ролей (user / model)
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(m.parts) ? m.parts : [{ text: m.text || m.content || '' }]
    }));

    if (!apiKey) {
      return NextResponse.json({
        status: 'needs_clarification',
        message: 'Куда и в какие даты вы планируете отправиться?',
        searchState: {},
        flights: []
      }, { status: 500 });
    }

    const systemInstruction = `Ты — умный и живой ИИ-консьерж сервиса FlightSaver.
Текущий год: 2026. Сегодня: 25 августа 2026 года.

ТВОЯ ЗАДАЧА:
1. Анализируй весь контекст диалога и извлекай параметры перелета:
   - origin (город и 3-буквенный IATA код, например: Минск -> MSQ, Сургут -> SGC, Челябинск -> CEK, Самара -> KUF, Москва -> MOW).
   - destination (город и 3-буквенный IATA код, например: Нью-Мексико/Альбукерке -> ABQ, Сиэтл -> SEA, Монако/Ницца -> NCE, Люксембург -> LUX, Лос-Анджелес -> LAX, Рим -> FCO).
   - departureDate (YYYY-MM-DD).
   - returnDate (если указана).
   - tripType ('one_way' или 'round_trip').
   - passengers (число пассажиров, по умолчанию 1).
   - baggage ('cabin_only' или 'checked_baggage').

2. ПРАВИЛА ОБЩЕНИЯ:
   - Если параметров недостаточно (например, известны только города и дата):
     * status = "needs_clarification"
     * message = естественный, живой ответ на русском (БЕЗ технических терминов), например: "Принято: Минск → Нью-Мексико (Альбукерке) на 10 сентября 2026 года. Подскажите: вам нужен билет в одну сторону или туда-обратно, сколько человек летит и потребуется ли багаж?"
     * flights = []
   - Если ВСЕ 5 параметров понятны:
     * status = "ready"
     * message = короткий комментарий по найденным билетам
     * flights = массив из 2-3 реалистичных маршрутов с ценами, авиакомпаниями и отелями STPC при стыковках от 8 часов.

Верни результат СТРОГО в JSON следующей структуры:
{
  "status": "needs_clarification" | "ready",
  "message": "Человеческий ответ на русском языке",
  "searchState": {
    "originCity": "Город вылета или null",
    "originIata": "IATA код вылета или null",
    "destinationCity": "Город прилета или null",
    "destinationIata": "IATA код прилета или null",
    "departureDate": "YYYY-MM-DD или null",
    "returnDate": "YYYY-MM-DD или null",
    "tripType": "one_way" | "round_trip" | null,
    "passengers": number | null,
    "baggage": "cabin_only" | "checked_baggage" | null
  },
  "flights": [
    {
      "id": "fl_1",
      "routeTitle": "Маршрут",
      "departureDate": "YYYY-MM-DD",
      "duration": "13ч 45м",
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
        
        // systemInstruction передается в system_instruction, а contents содержит строго чередование user / model
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: formattedContents.length > 0 ? formattedContents : [{ role: 'user', parts: [{ text: 'Привет' }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (res.ok) {
          geminiData = await res.json();
          groundingMetadata = geminiData.candidates?.[0]?.groundingMetadata || null;
          break;
        } else {
          // Fallback без tools
          const fallbackRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: formattedContents.length > 0 ? formattedContents : [{ role: 'user', parts: [{ text: 'Привет' }] }],
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

    let parsed: any = null;
    if (geminiData) {
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }
      }
    }

    if (!parsed) {
      const lastUserMsg = formattedContents[formattedContents.length - 1]?.parts?.[0]?.text || '';
      parsed = {
        status: 'needs_clarification',
        message: 'Куда и в какие даты вы планируете отправиться?',
        searchState: {},
        flights: []
      };
    }

    const state = parsed.searchState || {};
    const status = parsed.status || 'needs_clarification';
    const finalFlights = status === 'ready' && Array.isArray(parsed.flights) && parsed.flights.length > 0
      ? enrichFlights(parsed.flights, state)
      : [];

    return NextResponse.json({
      status,
      message: parsed.message,
      replyText: parsed.message,
      text: parsed.message,
      searchState: state,
      parsedParams: state,
      parsed: {
        ...state,
        origin: state.originCity,
        originCity: state.originCity,
        originIata: state.originIata,
        destination: state.destinationCity,
        destinationCity: state.destinationCity,
        destinationIata: state.destinationIata,
        missingQuestions: []
      },
      flights: finalFlights,
      groundingMetadata
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({
      status: 'needs_clarification',
      message: 'Ошибка обработки: ' + (error?.message || 'повторите запрос'),
      replyText: 'Ошибка обработки: ' + (error?.message || 'повторите запрос'),
      searchState: {},
      flights: []
    }, { status: 500 });
  }
}

function enrichFlights(rawFlights: any[], params: any) {
  const originName = params.originCity || params.origin || 'Минск';
  const originIata = params.originIata || 'MSQ';
  const destinationName = params.destinationCity || params.destination || 'Сиэтл';
  const destinationIata = params.destinationIata || 'SEA';
  const depDate = params.departureDate || '2026-09-11';
  const retDate = params.returnDate || undefined;
  const pass = params.passengers || 1;
  const cabin = params.cabinClass || 'economy';
  const hasLuggage = params.baggage !== 'cabin_only';

  return rawFlights.map((rf, idx) => {
    const price = rf.price || (cabin === 'business' ? 145000 : 54000) * pass;
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
      stpcDetails: rf.stpcDetails || (isStpc ? 'Бесплатный 4* отель STPC при стыковке от 8ч' : ''),
      isBestValue: idx === 0,
      isFastest: idx === 0 && !isStpc,
      totalPrice: price,
      oldPrice: marketPrice,
      duration: rf.duration || (isStpc ? '18ч 20м' : '13ч 45м'),
      totalDuration: rf.duration || (isStpc ? '18ч 20м (Отель STPC)' : '13ч 45м'),
      totalDurationMinutes: isStpc ? 1100 : 825,
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
          flightNumber: isStpc ? 'EK-175' : 'TK-284',
          fromAirport: originName,
          fromCity: originName,
          fromIata: originIata,
          toAirport: isStpc ? 'Дубай' : 'Стамбул',
          toCity: isStpc ? 'Дубай' : 'Стамбул',
          toIata: isStpc ? 'DXB' : 'IST',
          departureTime: '11:20',
          arrivalTime: '16:40',
          duration: '5ч 20м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        },
        {
          airline: (rf.airlines && rf.airlines[rf.airlines.length - 1]) || (isStpc ? 'Qatar Airways' : 'Turkish Airlines'),
          airlineCode: isStpc ? 'QR' : 'TK',
          flightNumber: isStpc ? 'QR-082' : 'TK-068',
          fromAirport: isStpc ? 'Дубай' : 'Стамбул',
          fromCity: isStpc ? 'Дубай' : 'Стамбул',
          toAirport: destinationName,
          toCity: destinationName,
          toIata: destinationIata,
          departureTime: '20:10',
          arrivalTime: '14:30',
          duration: '11ч 20м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        }
      ],
      transit: {
        hasTransit: true,
        transitCity: isStpc ? 'Дубай' : 'Стамбул',
        transitAirport: isStpc ? 'DXB' : 'IST',
        transitDuration: isStpc ? '9ч 30м' : '3ч 30м',
        stpcHotelIncluded: isStpc,
        stpcDetails: isStpc ? 'Бесплатный 4* отель STPC + трансфер' : '',
        visaFreeTransit: true
      },
      routeSegments: [`${originName} → ${isStpc ? 'Дубай [DXB] (Отель STPC)' : 'Стамбул [IST]'} → ${destinationName}`],
      airlines: rf.airlines || (isStpc ? ['Emirates', 'Qatar Airways'] : ['Turkish Airlines']),
      tags: isStpc ? ['Бесплатный 4* отель STPC', 'Комфортный транзит'] : ['Оптимальный', 'Split-Ticketing']
    };
  });
}
