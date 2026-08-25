import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Извлекаем текст запроса из любого компонента (поисковая строка, чат или прямой API)
    let userQuery = '';
    let history: any[] = [];

    if (body.query) {
      userQuery = body.query;
    } else if (body.text) {
      userQuery = body.text;
    } else if (body.message) {
      userQuery = body.message;
    } else if (Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      userQuery = last.text || last.content || last.parts?.[0]?.text || (typeof last === 'string' ? last : '');
      history = body.messages.slice(0, -1);
    } else if (typeof body === 'string') {
      userQuery = body;
    }

    if (!userQuery.trim()) {
      return NextResponse.json({
        status: 'needs_clarification',
        message: 'Куда и в какие даты вы планируете отправиться?',
        searchState: {},
        flights: []
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // 2. Системная инструкция для Gemini
    const systemPrompt = `Ты — умный, живой ИИ-консьерж сервиса FlightSaver.
Текущий год: 2026. Сегодня: 25 августа 2026 года.

ТВОЯ ЗАДАЧА:
1. Проанализируй запрос пользователя: "${userQuery}".
2. Распознай любые города и страны мира:
   - origin (город и 3-буквенный IATA код, например: Сочи -> AER, Минск -> MSQ, Сургут -> SGC, Челябинск -> CEK, Самара -> KUF, Москва -> MOW).
   - destination (город/район и ближайший крупный IATA код аэропорта, например: Манхэттен/Нью-Йорк -> JFK или EWR, Сиэтл -> SEA, Бали -> DPS, Монако -> NCE, Люксембург -> LUX, Рим -> FCO).
   - departureDate (в формате YYYY-MM-DD, например: 10 сентября -> 2026-09-10).
   - returnDate (если указана, в формате YYYY-MM-DD).
   - tripType ('one_way' или 'round_trip').
   - passengers (число, по умолчанию 1).
   - baggage ('cabin_only' или 'checked_baggage').

3. ПРАВИЛА ОБЩЕНИЯ:
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать шаблоны и писать технические названия переменных (tripType, route, baggage, dates, passengers).
   - Если параметров недостаточно (например, названы только города и дата):
     * status = "needs_clarification"
     * message = естественный, вежливый человеческий ответ: подтверди понятый маршрут и спроси про билет в одну сторону/обратно, количество пассажиров и багаж.
     * flights = []
   - Если ВСЕ 5 параметров понятны:
     * status = "ready"
     * message = краткое резюме найденных билетов со Split-Ticketing
     * flights = массив из 2-3 реалистичных маршрутов с ценами в рублях, авиакомпаниями и отелями STPC при стыковках от 8ч.

Верни ответ строго в формате JSON по следующей структуре:
{
  "status": "needs_clarification" | "ready",
  "message": "текст ответа на русском языке",
  "searchState": {
    "originCity": "город вылета",
    "originIata": "IATA код",
    "destinationCity": "город прилета",
    "destinationIata": "IATA код",
    "departureDate": "YYYY-MM-DD",
    "returnDate": "YYYY-MM-DD или null",
    "tripType": "one_way" | "round_trip",
    "passengers": 1,
    "baggage": "cabin_only" | "checked_baggage"
  },
  "flights": [
    {
      "id": "fl_1",
      "routeTitle": "Маршрут",
      "departureDate": "YYYY-MM-DD",
      "duration": "13ч 45м",
      "airlines": ["Turkish Airlines"],
      "price": 45000,
      "marketPrice": 62000,
      "savingsAmount": 17000,
      "hasStpcHotel": true,
      "stpcDetails": "Бесплатный 4★ отель STPC при стыковке от 8ч"
    }
  ]
}`;

    // 3. Прямой вызов Gemini 2.0 Flash REST API с fallback моделями
    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];

    let geminiData: any = null;

    for (const modelName of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const apiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        });

        if (apiRes.ok) {
          geminiData = await apiRes.json();
          break;
        }
      } catch (e) {}
    }

    if (!geminiData) {
      throw new Error('Gemini API request failed across all candidate endpoints');
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let result: any = {};
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    const state = result.searchState || {};
    const finalFlights = result.status === 'ready' && Array.isArray(result.flights)
      ? result.flights.map((f: any, idx: number) => ({
          ...f,
          id: f.id || `fl_${idx + 1}`,
          originCity: state.originCity,
          originIata: state.originIata,
          destinationCity: state.destinationCity,
          destinationIata: state.destinationIata,
          totalPrice: f.price,
          oldPrice: f.marketPrice,
          isStpcEligible: !!f.hasStpcHotel,
          pricing: {
            currency: 'RUB',
            totalPrice: f.price,
            marketPrice: f.marketPrice,
            savedAmount: f.savingsAmount || (f.marketPrice - f.price),
            savedPercentage: Math.round(((f.savingsAmount || 15000) / (f.marketPrice || 60000)) * 100),
            segmentBreakdowns: [],
            splitSavingsReason: f.hasStpcHotel ? 'Включен бесплатный 4* отель STPC' : 'Раздельная выписка сегментов (Split-Ticketing)'
          }
        }))
      : [];

    return NextResponse.json({
      status: result.status || 'needs_clarification',
      message: result.message || 'Куда и в какие даты вы планируете отправиться?',
      replyText: result.message || 'Куда и в какие даты вы планируете отправиться?',
      text: result.message || 'Куда и в какие даты вы планируете отправиться?',
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
      },
      flights: finalFlights
    });
  } catch (error: any) {
    console.error('Search Route Error:', error);
    return NextResponse.json({
      status: 'needs_clarification',
      message: 'Куда и в какие даты вы планируете отправиться?',
      searchState: {},
      flights: []
    }, { status: 500 });
  }
}
