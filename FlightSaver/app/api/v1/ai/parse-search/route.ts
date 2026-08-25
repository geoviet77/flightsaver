import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query || body.text || (Array.isArray(body.messages) ? body.messages[body.messages.length - 1]?.text : '') || '';

    if (!query.trim()) {
      return NextResponse.json({
        origin_iata: null,
        origin_city: null,
        destination_iata: null,
        destination_city: null,
        departure_date_range: null,
        duration_days: null,
        prefer_stpc_hotel: false,
        max_budget: null,
        explanation: 'Запрос пустой. Укажите направление и даты.'
      });
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    // 1. Попытка вызова Gemini 2.5 Flash / 2.0 Flash
    let parsed: any = null;

    if (apiKey) {
      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-3.6-flash',
        'gemini-flash-latest',
        'gemini-3.7-flash',
      ];

      const systemPrompt = `Ты — специализированный сервис AI Travel Assistant для парсинга поисковых запросов сервиса FlightSaver.
Текущий год: 2026. Сегодня: 25 августа 2026 года.

ЗАДАЧА:
Проанализируй текстовый запрос пользователя: "${query}".
Извлеки структурированные параметры:
1. origin_city (название города вылета на русском) и origin_iata (3-буквенный IATA код, например: Москва -> MOW, Сочи -> AER, Минск -> MSQ, Челябинск -> CEK).
2. destination_city (название города прилета) и destination_iata (3-буквенный IATA код, например: Бангкок -> BKK, Сиэтл -> SEA, Монако -> NCE, Бали -> DPS, Рим -> FCO).
3. departure_date_range (диапазон дат или конкретная дата, например "2026-09-01 - 2026-09-30" или "2026-09-15").
4. duration_days (длительность поездки в днях, например: "на 2 недели" -> 14, "на неделю" -> 7).
5. prefer_stpc_hotel (true, если пользователь упомянул бесплатный отель на пересадке, STPC, длительную стыковку для отдыха; иначе false).
6. max_budget (максимальный бюджет числом в рублях, если указан, иначе null).
7. explanation (краткое пояснение извлеченных параметров на русском).

Верни результат СТРОГО в валидном формате JSON:
{
  "origin_iata": "MOW",
  "origin_city": "Москва",
  "destination_iata": "BKK",
  "destination_city": "Бангкок",
  "departure_date_range": "2026-09-01 - 2026-09-30",
  "duration_days": 14,
  "prefer_stpc_hotel": true,
  "max_budget": null,
  "explanation": "Извлечен маршрут Москва → Бангкок на сентябрь на 2 недели с бесплатным отелем STPC"
}`;

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
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2
              }
            })
          });

          if (apiRes.ok) {
            const geminiData = await apiRes.json();
            const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const match = rawText.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : JSON.parse(rawText);
            break;
          }
        } catch (e) {}
      }
    }

    // 2. Интеллектуальный локальный NLP-парсер при отсутствии внешнего ответа
    if (!parsed) {
      parsed = fallbackParseSearch(query);
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Parse Search Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to parse search query'
    }, { status: 500 });
  }
}

function fallbackParseSearch(q: string) {
  const lower = q.toLowerCase();

  let originCity: string | null = null;
  let originIata: string | null = null;
  if (/москв|мск|mow|svo|dme|vko/.test(lower)) { originCity = 'Москва'; originIata = 'MOW'; }
  else if (/сочи|алер|aer/.test(lower)) { originCity = 'Сочи'; originIata = 'AER'; }
  else if (/минск|msq/.test(lower)) { originCity = 'Минск'; originIata = 'MSQ'; }
  else if (/питер|петербург|спб|led/.test(lower)) { originCity = 'Санкт-Петербург'; originIata = 'LED'; }
  else if (/челябинск|cek/.test(lower)) { originCity = 'Челябинск'; originIata = 'CEK'; }
  else if (/казан|kzn/.test(lower)) { originCity = 'Казань'; originIata = 'KZN'; }
  else if (/новосибирск|ovb/.test(lower)) { originCity = 'Новосибирск'; originIata = 'OVB'; }

  let destCity: string | null = null;
  let destIata: string | null = null;
  if (/бангкок|bkk|таиланд/.test(lower)) { destCity = 'Бангкок'; destIata = 'BKK'; }
  else if (/пхукет|hkt/.test(lower)) { destCity = 'Пхукет'; destIata = 'HKT'; }
  else if (/дубай|dxb|оаэ/.test(lower)) { destCity = 'Дубай'; destIata = 'DXB'; }
  else if (/париж|cdg|франци/.test(lower)) { destCity = 'Париж'; destIata = 'CDG'; }
  else if (/рим|fco|итали/.test(lower)) { destCity = 'Рим'; destIata = 'FCO'; }
  else if (/сиэтл|sea/.test(lower)) { destCity = 'Сиэтл'; destIata = 'SEA'; }
  else if (/монако|ницц|nce/.test(lower)) { destCity = 'Монако (Ницца)'; destIata = 'NCE'; }
  else if (/бали|денпасар|dps/.test(lower)) { destCity = 'Бали (Денпасар)'; destIata = 'DPS'; }
  else if (/стамбул|ist/.test(lower)) { destCity = 'Стамбул'; destIata = 'IST'; }

  let departureRange: string | null = null;
  if (/сентябр/.test(lower)) departureRange = '2026-09-01 - 2026-09-30';
  else if (/октябр/.test(lower)) departureRange = '2026-10-01 - 2026-10-31';
  else if (/ноябр/.test(lower)) departureRange = '2026-11-01 - 2026-11-30';
  else if (/декабр/.test(lower)) departureRange = '2026-12-01 - 2026-12-31';
  else if (/май|майск/.test(lower)) departureRange = '2026-05-01 - 2026-05-15';

  let durationDays: number | null = null;
  if (/2 недел|две недел|14 дн/.test(lower)) durationDays = 14;
  else if (/недел|7 дн/.test(lower)) durationDays = 7;
  else if (/3 недел|21 дн/.test(lower)) durationDays = 21;
  else if (/месяц/.test(lower)) durationDays = 30;

  const preferStpc = /отел|stpc|пересадк|стыковк|отдых/.test(lower);

  return {
    origin_iata: originIata,
    origin_city: originCity,
    destination_iata: destIata,
    destination_city: destCity,
    departure_date_range: departureRange,
    duration_days: durationDays,
    prefer_stpc_hotel: preferStpc,
    max_budget: null,
    explanation: originCity && destCity
      ? `Маршрут ${originCity} → ${destCity}${departureRange ? ` (${departureRange})` : ''}${durationDays ? `, на ${durationDays} дней` : ''}${preferStpc ? ' со включенным отелем STPC' : ''}.`
      : 'Уточните, пожалуйста, город вылета и назначения.'
  };
}
