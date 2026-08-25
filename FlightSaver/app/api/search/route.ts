import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Извлекаем текст запроса из любого входящего формата
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
      return NextResponse.json({
        status: 'needs_clarification',
        message: 'Ключ GEMINI_API_KEY не найден в переменных окружения Vercel.',
        searchState: {},
        flights: []
      });
    }

    // 2. Системный промпт
    const prompt = `Ты — живой, опытный ИИ-консьерж сервиса FlightSaver.
Текущий год: 2026. Сегодня: 25 августа 2026 года.

ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "${userQuery}".

ТВОЯ ЗАДАЧА:
1. Распознай любые города и страны мира:
   - origin (город и 3-буквенный IATA код, например: Южно-Сахалинск -> UUS, Москва -> MOW, Сочи -> AER, Минск -> MSQ, Челябинск -> CEK).
   - destination (город и 3-буквенный IATA код, например: Дананг -> DAD, Мельбурн -> MEL, Токио -> NRT, Сиэтл -> SEA, Монако -> NCE, Люксембург -> LUX).
   - departureDate (YYYY-MM-DD, например: 20 сентября -> 2026-09-20).
   - returnDate (если указана, иначе null).
   - tripType ('one_way' или 'round_trip').
   - passengers (число, по умолчанию 1).
   - baggage ('cabin_only' или 'checked_baggage').

2. ПРАВИЛА:
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать технические названия переменных (tripType, baggage, route, dates, passengers) и шаблоны.
   - Если параметров недостаточно (например, названы только города и дата вылета):
     * status = "needs_clarification"
     * message = естественный, живой ответ на русском: подтверди понятый маршрут и вежливо спроси про обратный билет, количество пассажиров и багаж.
     * flights = []
   - Если ВСЕ 5 параметров понятны:
     * status = "ready"
     * message = краткое резюме найденных билетов со Split-Ticketing
     * flights = массив из 2-3 реалистичных маршрутов с ценами в рублях, авиакомпаниями и отелями STPC при стыковках от 8ч.

Верни ответ ТОЛЬКО в формате JSON:
{
  "status": "needs_clarification" | "ready",
  "message": "текст ответа пользователю",
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
      "airlines": ["Авиакомпания 1", "Авиакомпания 2"],
      "price": 54000,
      "marketPrice": 78000,
      "savingsAmount": 24000,
      "hasStpcHotel": true,
      "stpcDetails": "Бесплатный 4★ отель STPC при стыковке"
    }
  ]
}`;

    // 3. Вызов Gemini REST API без конфликтующих заголовков
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
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.4
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
      throw new Error('Google API Error: unable to connect to Gemini endpoints');
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 4. Безопасное извлечение чистого JSON (защита от markdown-блоков ```json)
    let parsedResult: any;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(rawText);
      }
    } catch (parseErr) {
      parsedResult = {
        status: 'needs_clarification',
        message: rawText.replace(/```json|```/g, '').trim() || 'Уточните, пожалуйста, детали перелета.',
        searchState: {},
        flights: []
      };
    }

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error('Search Route Error:', error);
    return NextResponse.json({
      status: 'needs_clarification',
      message: 'Ошибка сервиса: ' + (error?.message || 'Повторите попытку'),
      searchState: {},
      flights: []
    });
  }
}
