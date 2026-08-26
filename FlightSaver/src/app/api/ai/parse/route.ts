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

const SYSTEM_INSTRUCTION = `Ты — профессиональный AI-консьерж сервиса FlightSaver (поиск авиабилетов и стыковочных программ STPC с бесплатным отелем).

Твоя задача — проанализировать запрос пользователя на естественном языке (русском или английском) и извлечь структурированные параметры перелета.

Правила извлечения параметров:
1. origin: 3-буквенный IATA-код города/аэропорта вылета (например: Москва -> MOW, Санкт-Петербург -> LED, Сочи -> AER, Екатеринбург -> SVX, Новосибирск -> OVB, Казань -> KZN, Минск -> MSQ, Алматы -> ALA, Ташкент -> TAS, Пхукет -> HKT, Бангкок -> BKK, Дубай -> DXB, Тбилиси -> TBS). Если город вылета не указан, верни null.
2. destination: 3-буквенный IATA-код города/аэропорта назначения (например: Бангкок -> BKK, Пхукет -> HKT, Дубай -> DXB, Стамбул -> IST, Анталья -> AYT, Бали/Денпасар -> DPS, Париж -> CDG, Рим -> FCO, Токио -> NRT, Сеул -> ICN, Нью-Йорк -> JFK, Сиэтл -> SEA, Ницца -> NCE, Лондон -> LHR). Если город назначения не указан, верни null.
3. departureDate: дата вылета в формате "YYYY-MM-DD". Если указана относительная дата (например: "завтра", "через неделю", "15 сентября"), рассчитай дату относительно текущего 2026 года. Если дата не указана, верни null.
4. returnDate: дата возвращения в формате "YYYY-MM-DD". Если это билет в одну сторону или дата не указана, верни null.
5. passengers: число пассажиров (number, целое число >= 1). По умолчанию 1.
6. cabinClass: класс обслуживания — строго "economy" или "business". Если указан эконом, комфорт или не указано -> "economy". Если указан бизнес или первый класс -> "business".
7. searchStpc: булево значение (boolean). Установи true, если пользователь упомянул длительную стыковку, пересадку с отдыхом, отель от авиакомпании, программу STPC или бесплатную гостиницу при пересадке; иначе false.
8. message: краткий, дружелюбный и вежливый ответ консьержа на русском языке (1-2 предложения), подтверждающий найденные параметры.

Ответ верни СТРОГО в формате JSON со следующей структурой:
{
  "origin": "MOW",
  "destination": "BKK",
  "departureDate": "2026-09-15",
  "returnDate": null,
  "passengers": 1,
  "cabinClass": "economy",
  "searchStpc": false,
  "message": "Принято! Подбираю билеты из Москвы в Бангкок на 15 сентября в эконом-классе для 1 пассажира."
}`;

const CITY_IATA_MAP: Record<string, string> = {
  москва: 'MOW',
  москвы: 'MOW',
  москву: 'MOW',
  питер: 'LED',
  петербург: 'LED',
  петербурга: 'LED',
  сочи: 'AER',
  бангкок: 'BKK',
  бангкока: 'BKK',
  пхукет: 'HKT',
  пхукета: 'HKT',
  дубай: 'DXB',
  дубая: 'DXB',
  стамбул: 'IST',
  стамбула: 'IST',
  париж: 'CDG',
  парижа: 'CDG',
  рим: 'FCO',
  рима: 'FCO',
  бали: 'DPS',
  денпасар: 'DPS',
  тбилиси: 'TBS',
  лондон: 'LHR',
  лондона: 'LHR',
  ереван: 'EVN',
  еревана: 'EVN',
  ташкент: 'TAS',
  алматы: 'ALA',
  минск: 'MSQ',
  анталья: 'AYT',
  анталью: 'AYT',
};

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
    if (city !== 'эконом' && city !== 'бизнес' && city !== 'двоих' && city !== 'недели' && city !== 'сентября') {
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

  // Detect dates e.g. "15 сентября"
  let departureDate: string | null = null;
  const dateMatch = lower.match(/(\d{1,2})\s+(янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const months: Record<string, string> = {
      янв: '01', фев: '02', мар: '03', апр: '04', май: '05', июн: '06',
      июл: '07', авг: '08', сен: '09', окт: '10', ноя: '11', дек: '12'
    };
    const month = months[dateMatch[2].toLowerCase().slice(0, 3)] || '09';
    departureDate = `2026-${month}-${day < 10 ? '0' : ''}${day}`;
  } else {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    departureDate = now.toISOString().split('T')[0];
  }

  // Detect passengers
  let passengers = 1;
  if (lower.includes('двоих') || lower.includes('2 пассажира') || lower.includes('2 человека')) {
    passengers = 2;
  } else if (lower.includes('троих') || lower.includes('3 пассажира')) {
    passengers = 3;
  } else if (lower.includes('семьей') || lower.includes('4 пассажира')) {
    passengers = 4;
  }

  const cabinClass: CabinClass = lower.includes('бизнес') || lower.includes('business') ? 'business' : 'economy';
  const searchStpc = lower.includes('stpc') || lower.includes('отел') || lower.includes('стыковк') || lower.includes('пересадк');

  return {
    origin: origin || 'MOW',
    destination: destination || 'BKK',
    departureDate,
    returnDate: lower.includes('на 2 недели') && departureDate ? calculateReturnDate(departureDate, 14) : null,
    passengers,
    cabinClass,
    searchStpc,
    message: `Принято! Подбираем перелет ${origin || 'MOW'} → ${destination || 'BKK'}${departureDate ? ` на ${departureDate}` : ''}.`,
  };
}

function calculateReturnDate(depDate: string, days: number): string {
  try {
    const d = new Date(depDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
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

    // Если ключ задан — вызываем Gemini 2.5 Flash с fallback на Gemini 1.5 Flash
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.1,
            },
          });

          const responseText = response.text?.trim() || '';
          if (responseText) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const rawParsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

            const origin = typeof rawParsed.origin === 'string' && rawParsed.origin.trim()
              ? rawParsed.origin.trim().toUpperCase()
              : null;

            const destination = typeof rawParsed.destination === 'string' && rawParsed.destination.trim()
              ? rawParsed.destination.trim().toUpperCase()
              : null;

            const departureDate = typeof rawParsed.departureDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawParsed.departureDate.trim())
              ? rawParsed.departureDate.trim()
              : null;

            const returnDate = typeof rawParsed.returnDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawParsed.returnDate.trim())
              ? rawParsed.returnDate.trim()
              : null;

            const rawPassengers = Number(rawParsed.passengers);
            const passengers = Number.isFinite(rawPassengers) && rawPassengers >= 1
              ? Math.floor(rawPassengers)
              : 1;

            const cabinClass: CabinClass = rawParsed.cabinClass === 'business' ? 'business' : 'economy';
            const searchStpc = Boolean(rawParsed.searchStpc);

            const defaultMessage = origin && destination
              ? `Маршрут ${origin} → ${destination}${departureDate ? `, вылет ${departureDate}` : ''} успешно распознан.`
              : 'Запрос принят. Подбираю билеты.';

            const message = typeof rawParsed.message === 'string' && rawParsed.message.trim()
              ? rawParsed.message.trim()
              : defaultMessage;

            return NextResponse.json({
              success: true,
              data: {
                origin,
                destination,
                departureDate,
                returnDate,
                passengers,
                cabinClass,
                searchStpc,
                message,
              },
            });
          }
        } catch (modelErr: any) {
          console.warn(`[Gemini SDK] Model ${modelName} call notice:`, modelErr?.message || modelErr);
          // try next model in loop
        }
      }
    }

    // Fallback: умный эвристический парсер гарантирует мгновенный ответ без сбоев
    const fallbackData = fallbackHeuristicParse(prompt);
    return NextResponse.json({
      success: true,
      data: fallbackData,
    });
  } catch (error: unknown) {
    console.error('[API /api/ai/parse] Error in parsing:', error);

    // Даже в случае исключения возвращаем fallback, чтобы пользователь не сталкивался с сырыми ошибками
    const safeData = fallbackHeuristicParse(prompt || 'В Бангкок из Москвы');
    return NextResponse.json({
      success: true,
      data: safeData,
    });
  }
}
