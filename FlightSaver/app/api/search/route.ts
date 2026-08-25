import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Извлекаем текст запроса из любого формата
    let userQuery = '';
    if (body.query) {
      userQuery = body.query;
    } else if (body.text) {
      userQuery = body.text;
    } else if (body.message) {
      userQuery = body.message;
    } else if (Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      userQuery = last.text || last.parts?.[0]?.text || last.content || (typeof last === 'string' ? last : '');
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

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing in environment variables');
    }

    // 2. Системный промпт для Gemini
    const systemPrompt = `Ты — живой и внимательный ИИ-консьерж сервиса FlightSaver.
Текущий год: 2026. Сегодня: 25 августа 2026 года.

ТВОЯ ЗАДАЧА:
1. Проанализируй запрос пользователя: "${userQuery}".
2. Распознай любые города и страны мира:
   - origin (город и 3-буквенный IATA код, например: Москва -> MOW/SVO/DME, Сочи -> AER, Минск -> MSQ, Челябинск -> CEK, Самара -> KUF).
   - destination (город и 3-буквенный IATA код, например: Мельбурн -> MEL, Сиэтл -> SEA, Нью-Йорк -> JFK, Токио -> NRT/HND, Монако -> NCE, Люксембург -> LUX).
   - departureDate (YYYY-MM-DD, например: 20 октября -> 2026-10-20).
   - returnDate (если указана).
   - tripType ('one_way' или 'round_trip').
   - passengers (число пассажиров, по умолчанию 1).
   - baggage ('cabin_only' или 'checked_baggage').

3. ПРАВИЛА ОБЩЕНИЯ:
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать технические названия переменных (tripType, baggage, route, dates, passengers) и шаблоны.
   - Если параметров недостаточно (например, названы только города и дата вылета):
     * status = "needs_clarification"
     * message = естественный, живой ответ на русском: подтверди понятый маршрут и вежливо спроси про обратный билет, количество пассажиров и багаж.
     * flights = []
   - Если ВСЕ 5 параметров понятны:
     * status = "ready"
     * message = краткое резюме найденных билетов со Split-Ticketing
     * flights = массив из 2-3 реалистичных маршрутов с ценами в рублях, авиакомпаниями и отелями STPC при стыковках от 8ч.

Верни ответ строго в формате JSON:
{
  "status": "needs_clarification" | "ready",
  "message": "текст ответа",
  "searchState": {
    "originCity": "город",
    "originIata": "IATA",
    "destinationCity": "город",
    "destinationIata": "IATA",
    "departureDate": "YYYY-MM-DD",
    "returnDate": "YYYY-MM-DD или null",
    "tripType": "one_way" | "round_trip",
    "passengers": 1,
    "baggage": "cabin_only" | "checked_baggage"
  },
  "flights": [
    {
      "id": "1",
      "routeTitle": "Маршрут",
      "departureDate": "YYYY-MM-DD",
      "duration": "Время в пути",
      "airlines": ["Turkish Airlines"],
      "price": 65000,
      "marketPrice": 92000,
      "savingsAmount": 27000,
      "hasStpcHotel": true,
      "stpcDetails": "Бесплатный 4★ отель STPC при стыковке"
    }
  ]
}`;

    // 3. Вызов Gemini с передачей ключа AQ. в заголовках и fallback моделями
    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];

    let geminiData: any = null;

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const apiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`
          },
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
        } else {
          // Попытка без query param, только заголовки
          const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          const headerRes = await fetch(directUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          });
          if (headerRes.ok) {
            geminiData = await headerRes.json();
            break;
          }
        }
      } catch (e) {}
    }

    if (!geminiData) {
      throw new Error('Gemini API error: unable to generate content');
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let result: any = {};
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Search Route Error:', error);
    return NextResponse.json({
      status: 'needs_clarification',
      message: 'Ошибка сервиса: ' + (error?.message || 'Повторите попытку'),
      searchState: {},
      flights: []
    }, { status: 500 });
  }
}
