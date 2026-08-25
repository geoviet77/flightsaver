import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const query = body.query || body.message || (messages.length > 0 ? messages[messages.length - 1]?.content || messages[messages.length - 1]?.text || messages[messages.length - 1]?.parts?.[0]?.text : '');
    const currentParams = body.searchState || body.currentParams || body.accumulatedSearchParams || {};
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json({
        status: 'needs_clarification',
        message: 'Куда и в какие даты вы планируете отправиться?',
        replyText: 'Куда и в какие даты вы планируете отправиться?',
        searchState: {},
        parsed: null,
        flights: []
      }, { status: 500 });
    }

    const systemInstruction = `Ты — умный и живой ИИ-консьерж сервиса FlightSaver.
Твоя цель — помочь любому человеку найти и составить выгодный авиамаршрут.
Текущий год: 2026. Сегодняшняя дата: 25 августа 2026 года.

ПРАВИЛА ИЗВЛЕЧЕНИЯ ДАННЫХ:
Анализируй весь контекст диалога и извлекай 5 обязательных параметров перелета:
1. origin & destination: любые города/страны мира. Всегда определяй их 3-буквенные IATA-коды. Если у города нет аэропорта, выбери ближайший крупный международный аэропорт (например, Монако -> NCE).
2. departureDate & returnDate: переводи любые фразы ("через месяц", "на майские", "15 октября", "11 сентября") в формат YYYY-MM-DD.
3. tripType: 'one_way' (в одну сторону) или 'round_trip' (туда и обратно).
4. passengers: число пассажиров (по умолчанию 1).
5. baggage: 'cabin_only' (только ручная кладь) или 'checked_baggage' (с багажом 23 кг).

ЛОГИКА ПОВЕДЕНИЯ:
- Если данных недостаточно для точного бронирования:
  Установи status = "needs_clarification".
  В поле message напиши дружелюбный, живой ответ на чистом русском языке: подтверди, что уже понял, и спроси недостающие детали.
  КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать шаблоны и технические названия переменных (никаких "tripType", "route", "dates", "passengers", "baggage").
  Массив flights оставь пустым ([]).

- Если ВСЕ 5 параметров понятны:
  Установи status = "ready".
  В поле message дай короткое пояснение подобранных вариантов.
  В массив flights сгенерируй 2-3 реалистичных маршрута (укажи актуальные авиакомпании, длительность, цены в рублях, экономию Split-Ticketing до 40% и отметь бесплатный отель STPC при стыковках от 8 часов).

Контекст searchState: ${JSON.stringify(currentParams || {})}
Сообщение пользователя: "${query}"

Верни СТРОГО валидный JSON следующей структуры:
{
  "status": "needs_clarification" | "ready",
  "message": "Дружелюбный человеческий ответ на русском языке",
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

    const contentsPayload = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      ...messages.map((m: any) => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
        parts: Array.isArray(m.parts) ? m.parts : [{ text: m.text || m.content || '' }]
      }))
    ];

    for (const modelName of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contentsPayload,
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
              contents: contentsPayload,
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

    let parsedData: any = null;
    if (geminiData) {
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        try {
          parsedData = JSON.parse(rawText);
        } catch (e) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
        }
      }
    }

    if (!parsedData) {
      const prev = currentParams || {};
      const orig = prev.originCity || prev.origin;
      const dest = prev.destinationCity || prev.destination;
      const dep = prev.departureDate;
      const isReady = !!(orig && dest && dep && prev.passengers && prev.baggage && prev.tripType);

      parsedData = {
        status: isReady ? 'ready' : 'needs_clarification',
        message: isReady
          ? `Подобрал отличные маршруты ${orig} → ${dest} на ${dep} с выгодными стыковками и отелями STPC.`
          : (orig && dest
              ? `Принято: ${orig} → ${dest}${dep ? ` на ${dep}` : ''}. Уточните, пожалуйста: вам нужен билет в одну сторону или туда-обратно, сколько человек летит и потребуется ли багаж?`
              : 'Куда и в какие даты вы планируете отправиться?'),
        searchState: {
          originCity: orig || null,
          originIata: prev.originIata || prev.origin || null,
          destinationCity: dest || null,
          destinationIata: prev.destinationIata || prev.destination || null,
          departureDate: dep || null,
          returnDate: prev.returnDate || null,
          tripType: prev.tripType || null,
          passengers: prev.passengers || null,
          baggage: prev.baggage || null
        },
        flights: []
      };
    }

    const state = parsedData.searchState || {};
    const origCity = state.originCity || state.origin;
    const destCity = state.destinationCity || state.destination;
    const isAllFive = !!(origCity && destCity && state.departureDate && state.passengers && state.baggage && state.tripType);
    const status = parsedData.status || (isAllFive ? 'ready' : 'needs_clarification');
    const msgText = parsedData.message || parsedData.reply || 'Информация обновлена.';

    const finalFlights = status === 'ready'
      ? enrichFlights(parsedData.flights, state)
      : [];

    return NextResponse.json({
      status,
      message: msgText,
      replyText: msgText,
      text: msgText,
      searchState: state,
      parsedParams: {
        ...state,
        origin: origCity,
        destination: destCity,
      },
      parsed: {
        ...state,
        origin: origCity,
        originCity: origCity,
        originIata: state.originIata,
        destination: destCity,
        destinationCity: destCity,
        destinationIata: state.destinationIata,
        missingQuestions: []
      },
      flights: finalFlights,
      groundingMetadata
    });
  } catch (error: any) {
    console.error('Gemini Error:', error);
    return NextResponse.json({
      status: 'needs_clarification',
      message: 'Куда и в какие даты вы планируете отправиться?',
      replyText: 'Куда и в какие даты вы планируете отправиться?',
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

  if (Array.isArray(rawFlights) && rawFlights.length > 0) {
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
        stpcDetails: rf.stpcDetails || (isStpc ? 'Бесплатный 4* отель STPC + трансфер' : ''),
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

  const base = cabin === 'business' ? 145000 : 54000;
  const bagPrice = !hasLuggage ? 0 : 7000;
  const p1Total = (base + bagPrice) * pass;
  const p1Old = Math.round(p1Total * 1.35);
  const p2Total = (base + bagPrice + 5500) * pass;
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
      duration: '13ч 45м',
      totalDuration: '13ч 45м',
      totalDurationMinutes: 825,
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
          flightNumber: 'TK-284',
          fromAirport: originName,
          fromCity: originName,
          fromIata: originIata,
          toAirport: 'Стамбул',
          toCity: 'Стамбул',
          toIata: 'IST',
          departureTime: '11:20',
          arrivalTime: '14:45',
          duration: '3ч 25м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        },
        {
          airline: 'Turkish Airlines',
          airlineCode: 'TK',
          flightNumber: 'TK-068',
          fromAirport: 'Стамбул',
          fromCity: 'Стамбул',
          fromIata: 'IST',
          toAirport: destinationName,
          toCity: destinationName,
          toIata: destinationIata,
          departureTime: '18:15',
          arrivalTime: '21:35',
          duration: '10ч 20м',
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
      duration: '18ч 20м (Отель STPC)',
      totalDuration: '18ч 20м (Отель STPC)',
      totalDurationMinutes: 1100,
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
          flightNumber: 'EK-175',
          fromAirport: originName,
          fromCity: originName,
          fromIata: originIata,
          toAirport: 'Дубай',
          toCity: 'Дубай',
          toIata: 'DXB',
          departureTime: '12:10',
          arrivalTime: '18:30',
          duration: '6ч 20м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        },
        {
          airline: 'Qatar Airways',
          airlineCode: 'QR',
          flightNumber: 'QR-082',
          fromAirport: 'Дубай',
          fromCity: 'Дубай',
          fromIata: 'DXB',
          toAirport: destinationName,
          toCity: destinationName,
          toIata: destinationIata,
          departureTime: '04:45',
          arrivalTime: '11:05',
          duration: '12ч 20м',
          bookingProvider: 'Direct NDC',
          cabinClass: cabin,
          baggage: hasLuggage ? '23 кг' : '0 кг'
        }
      ],
      transit: {
        hasTransit: true,
        transitCity: 'Дубай',
        transitAirport: 'DXB',
        transitDuration: '10ч 15м',
        stpcHotelIncluded: true,
        stpcDetails: 'Бесплатный 4* отель STPC + трансфер',
        visaFreeTransit: true
      },
      routeSegments: [`${originName} → Дубай [DXB] (Бесплатный 4* отель) → ${destinationName}`],
      airlines: ['Emirates', 'Qatar Airways'],
      tags: ['Бесплатный 4* отель STPC', 'Комфортный транзит']
    }
  ];
}
