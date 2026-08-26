import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface ParseRequestBody {
  prompt?: string;
}

export type CabinClass = 'economy' | 'business';

export interface ParsedFlightParams {
  origin: string | null;
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengers: number;
  cabinClass: CabinClass;
  searchStpc: boolean;
  message: string;
}

export interface ParseSuccessResponse {
  success: true;
  data: ParsedFlightParams;
}

export interface ParseErrorResponse {
  success: false;
  error: string;
  details?: string;
}

function getSystemInstruction(currentDate: string): string {
  return `Ты — профессиональный AI-консьерж сервиса FlightSaver (поиск авиабилетов и стыковочных программ STPC с бесплатным отелем).
Текущая дата системы: ${currentDate} (год 2026).

Твоя задача — проанализировать запрос пользователя на естественном языке (русском или английском) и извлечь структурированные параметры перелета.

КРИТИЧЕСКИЕ ПРАВИЛА ИЗВЛЕЧЕНИЯ ПАРАМЕТРОВ:
1. origin: 3-буквенный IATA-код города/аэропорта отправления:
   - Москва -> MOW, Санкт-Петербург -> LED, Сочи -> AER, Екатеринбург -> SVX, Новосибирск -> OVB, Казань -> KZN, Минск -> MSQ, Алматы -> ALA, Ташкент -> TAS, Тбилиси -> TBS, Ереван -> EVN.
   - Если город отправления не указан явно, но запрос на русском языке — по умолчанию используй "MOW".
2. destination: 3-буквенный IATA-код города/страны прибытия (ОБЯЗАТЕЛЬНО должен отличаться от origin!):
   - Токио / Япония -> TYO
   - Осака -> OSA
   - Сеул / Южная Корея -> ICN
   - Бангкок / Таиланд -> BKK
   - Пхукет -> HKT
   - Самуи -> USM
   - Бали / Денпасар / Индонезия -> DPS
   - Дубай / ОАЭ / Эмираты -> DXB
   - Абу-Даби -> AUH
   - Доха / Катар -> DOH
   - Стамбул / Турция -> IST
   - Анталья -> AYT
   - Париж / Франция -> PAR (или CDG)
   - Рим / Италия -> ROM (или FCO)
   - Милан -> MIL
   - Лондон / Великобритания -> LON (или LHR)
   - Лос-Анджелес / США / Америка -> LAX
   - Нью-Йорк -> NYC (или JFK)
   - Мале / Мальдивы -> MLE
   - Сейшелы / Маэ -> SEZ
3. ОБРАБОТКА ДАТ И ПРАЗДНИКОВ:
   - "Новогодние праздники / Новый год / на новогодние / на НГ" -> departureDate: "2026-12-29", returnDate: "2027-01-08"
   - "Майские праздники" -> departureDate: "2027-05-01", returnDate: "2027-05-10"
   - "на 2 недели" -> departureDate: (указанная дата или +7 дней от текущей), returnDate: (departureDate + 14 дней)
   - "на 10 дней" -> departureDate: (указанная дата), returnDate: (departureDate + 10 дней)
   - Обычные даты -> "YYYY-MM-DD"
4. passengers: число пассажиров (number, целое число >= 1, по умолчанию 1). "для двоих / на 2 человека" -> 2.
5. cabinClass: класс обслуживания — строго "economy" или "business".
6. searchStpc: boolean (true, если пользователь упомянул пересадку, длительную стыковку, отель STPC или отдых в хабе).
7. message: краткий, дружелюбный и вежливый ответ консьержа на русском языке (1-2 предложения).

Ответ верни СТРОГО в формате JSON со следующей структурой:
{
  "origin": "MOW",
  "destination": "TYO",
  "departureDate": "2026-12-29",
  "returnDate": "2027-01-08",
  "passengers": 1,
  "cabinClass": "economy",
  "searchStpc": false,
  "message": "Подобрал билеты из Москвы в Токио на новогодние праздники (29 декабря 2026 — 8 января 2027)."
}`;
}

const CITY_IATA_MAP: Record<string, string> = {
  москва: 'MOW',
  москвы: 'MOW',
  москву: 'MOW',
  питер: 'LED',
  петербург: 'LED',
  петербурга: 'LED',
  сочи: 'AER',
  токио: 'TYO',
  япония: 'TYO',
  японию: 'TYO',
  японии: 'TYO',
  осака: 'OSA',
  сеул: 'ICN',
  корея: 'ICN',
  корею: 'ICN',
  бангкок: 'BKK',
  бангкока: 'BKK',
  таиланд: 'BKK',
  тайланд: 'BKK',
  пхукет: 'HKT',
  пхукета: 'HKT',
  самуи: 'USM',
  дубай: 'DXB',
  дубая: 'DXB',
  оаэ: 'DXB',
  эмираты: 'DXB',
  абудаби: 'AUH',
  доха: 'DOH',
  стамбул: 'IST',
  стамбула: 'IST',
  турция: 'IST',
  турцию: 'IST',
  анталья: 'AYT',
  анталью: 'AYT',
  париж: 'PAR',
  парижа: 'PAR',
  франция: 'PAR',
  францию: 'PAR',
  рим: 'ROM',
  рима: 'ROM',
  италия: 'ROM',
  италию: 'ROM',
  милан: 'MIL',
  лондон: 'LON',
  лондона: 'LON',
  англия: 'LON',
  бали: 'DPS',
  денпасар: 'DPS',
  индонезия: 'DPS',
  мальдивы: 'MLE',
  мале: 'MLE',
  сейшелы: 'SEZ',
  лос_анджелес: 'LAX',
  нью_йорк: 'NYC',
  тбилиси: 'TBS',
  грузия: 'TBS',
  ереван: 'EVN',
  армения: 'EVN',
  ташкент: 'TAS',
  узбекистан: 'TAS',
  алматы: 'ALA',
  казахстан: 'ALA',
  минск: 'MSQ',
  беларусь: 'MSQ',
};

function sanitizeFlightParams(raw: Partial<ParsedFlightParams>, promptText: string): ParsedFlightParams {
  let origin = (raw.origin && typeof raw.origin === 'string') ? raw.origin.trim().toUpperCase() : 'MOW';
  let destination = (raw.destination && typeof raw.destination === 'string') ? raw.destination.trim().toUpperCase() : null;
  const pLower = promptText.toLowerCase();

  // 1. Поиск destination по ключевым словам запроса, если не распознан или совпал с origin
  if (!destination || destination === origin) {
    if (/токио|tokyo|япони|japan|tyo|hnd|nrt/i.test(pLower)) destination = 'TYO';
    else if (/бангкок|bangkok|таиланд|тайланд|bkk/i.test(pLower)) destination = 'BKK';
    else if (/пхукет|phuket|hkt/i.test(pLower)) destination = 'HKT';
    else if (/бали|bali|денпасар|dps/i.test(pLower)) destination = 'DPS';
    else if (/дубай|dubai|оаэ|эмират|dxb/i.test(pLower)) destination = 'DXB';
    else if (/стамбул|istanbul|турци|ist/i.test(pLower)) destination = 'IST';
    else if (/лос-анджелес|los angeles|lax/i.test(pLower)) destination = 'LAX';
    else if (/нью-йорк|new york|nyc|jfk/i.test(pLower)) destination = 'NYC';
    else if (/париж|paris|франци|cdg|par/i.test(pLower)) destination = 'PAR';
    else if (/рим|rome|итали|fco|rom/i.test(pLower)) destination = 'ROM';
    else if (/мальдив|мале|male|mle/i.test(pLower)) destination = 'MLE';
    else if (/сейшел|mahe|sez/i.test(pLower)) destination = 'SEZ';
    else if (/сеул|seoul|коре|icn/i.test(pLower)) destination = 'ICN';
    else if (/анталья|antalya|ayt/i.test(pLower)) destination = 'AYT';
    else destination = 'TYO'; // Если в запросе был поиск с Дальнего Востока / Азии или общий
  }

  // 2. Гарантия: origin и destination никогда не равны
  if (origin === destination) {
    if (destination === 'MOW') {
      destination = 'TYO';
    } else {
      origin = 'MOW';
    }
  }

  // 3. Обработка дат и праздничных периодов
  let departureDate = raw.departureDate || null;
  let returnDate = raw.returnDate || null;

  if (/новогод|новый год|на нг/i.test(pLower)) {
    departureDate = '2026-12-29';
    returnDate = '2027-01-08';
  } else if (/майск|майские/i.test(pLower)) {
    departureDate = '2027-05-01';
    returnDate = '2027-05-10';
  }

  if (!departureDate) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    departureDate = d.toISOString().split('T')[0];
  }

  const rawPassengers = Number(raw.passengers);
  let passengers = Number.isFinite(rawPassengers) && rawPassengers >= 1 ? Math.floor(rawPassengers) : 1;
  if (/двоих|2 пассажира|2 человека|парой/i.test(pLower)) passengers = 2;
  else if (/троих|3 пассажира|3 человека/i.test(pLower)) passengers = 3;
  else if (/семьей|4 пассажира|4 человека/i.test(pLower)) passengers = 4;

  const cabinClass: CabinClass = raw.cabinClass === 'business' || /бизнес|business/i.test(pLower) ? 'business' : 'economy';
  const searchStpc = Boolean(raw.searchStpc) || /stpc|отел|стыковк|пересадк/i.test(pLower);

  const routeCities: Record<string, string> = {
    MOW: 'Москвы',
    LED: 'Санкт-Петербурга',
    AER: 'Сочи',
    TYO: 'Токио',
    BKK: 'Бангкок',
    HKT: 'Пхукет',
    DPS: 'Бали',
    DXB: 'Дубай',
    IST: 'Стамбул',
    LAX: 'Лос-Анджелес',
    NYC: 'Нью-Йорк',
    PAR: 'Париж',
    ROM: 'Рим',
  };

  const fromCityName = routeCities[origin] || origin;
  const toCityName = routeCities[destination] || destination;

  const defaultMsg = returnDate
    ? `Подобрал билеты из ${fromCityName} в ${toCityName} на даты ${departureDate} — ${returnDate}.`
    : `Подобрал билеты из ${fromCityName} в ${toCityName} на ${departureDate}.`;

  const message = raw.message && typeof raw.message === 'string' && raw.message.trim().length > 10 && !raw.message.includes('null')
    ? raw.message.trim()
    : defaultMsg;

  return {
    origin,
    destination,
    departureDate,
    returnDate,
    passengers,
    cabinClass,
    searchStpc,
    message,
  };
}

function fallbackHeuristicParse(prompt: string): ParsedFlightParams {
  const lower = prompt.toLowerCase();

  let origin: string | null = null;
  let destination: string | null = null;

  // Search origin with "из ..."
  const fromMatch = lower.match(/из\s+([а-яa-z\-]+)/i);
  if (fromMatch && fromMatch[1]) {
    const city = fromMatch[1].toLowerCase();
    origin = CITY_IATA_MAP[city] || (city.length === 3 ? city.toUpperCase() : null);
  }

  // Search destination with "в ..." or "до ..."
  const toMatch = lower.match(/(?:в|до|на)\s+([а-яa-z\-]+)/i);
  if (toMatch && toMatch[1]) {
    const city = toMatch[1].toLowerCase();
    if (city !== 'эконом' && city !== 'бизнес' && city !== 'двоих' && city !== 'недели' && city !== 'сентября' && city !== 'нг' && city !== 'новый') {
      destination = CITY_IATA_MAP[city] || (city.length === 3 ? city.toUpperCase() : null);
    }
  }

  if (!destination) {
    for (const [cityName, iata] of Object.entries(CITY_IATA_MAP)) {
      if (lower.includes(cityName) && origin !== iata) {
        destination = iata;
        break;
      }
    }
  }

  if (!origin && destination && destination !== 'MOW') {
    origin = 'MOW';
  }

  return sanitizeFlightParams({ origin, destination }, prompt);
}

export async function POST(req: NextRequest): Promise<NextResponse<ParseSuccessResponse | ParseErrorResponse>> {
  let prompt = '';

  try {
    const body: ParseRequestBody = await req.json();
    prompt = (body.prompt || '').trim();

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Поле prompt обязательно для заполнения и должно быть непустой строкой.',
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const currentDate = new Date().toISOString().split('T')[0];

    // Если ключ задан — вызываем Gemini 2.5 Flash с системным промптом, знающим текущую дату
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      const systemInstruction = getSystemInstruction(currentDate);

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              systemInstruction,
              temperature: 0.1,
            },
          });

          const responseText = response.text?.trim() || '';
          if (responseText) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const rawParsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

            const sanitized = sanitizeFlightParams(rawParsed, prompt);

            return NextResponse.json({
              success: true,
              data: sanitized,
            });
          }
        } catch (modelErr: any) {
          console.warn(`[Gemini SDK] Model ${modelName} call notice:`, modelErr?.message || modelErr);
          // try next model in loop
        }
      }
    }

    // Fallback: умный эвристический парсер с гарантированной санитизацией
    const fallbackData = fallbackHeuristicParse(prompt);
    return NextResponse.json({
      success: true,
      data: fallbackData,
    });
  } catch (error: unknown) {
    console.error('[API /api/ai/parse] Error in parsing:', error);

    const safeData = fallbackHeuristicParse(prompt || 'В Бангкок из Москвы');
    return NextResponse.json({
      success: true,
      data: safeData,
    });
  }
}
