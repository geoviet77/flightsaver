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
  return `You are an AI Flight Search Assistant for FlightSaver.
Your job is to parse ANY natural language flight query in Russian or English into structured flight parameters.
Current reference date: ${currentDate} (Year 2026).

You must accurately determine the 3-letter IATA code for ANY city, region, or airport in the world:
Examples of global IATA codes:
- "южно-сахалинск" / "южносахалинск" -> origin: "UUS"
- "дананг" / "da nang" -> destination: "DAD"
- "нячанг" / "камрань" -> "CXR"
- "владивосток" -> "VVO"
- "хабаровск" -> "KHV"
- "иркутск" -> "IKT"
- "казань" -> "KZN"
- "екатеринбург" -> "SVX"
- "новосибирск" -> "OVB"
- "москва" -> "MOW" (or SVO, DME, VKO)
- "санкт-петербург" / "питер" -> "LED"
- "сочи" -> "AER"
- "токио" / "япония" -> "TYO"
- "осака" -> "OSA"
- "сеул" / "корея" -> "ICN"
- "бангкок" / "таиланд" -> "BKK"
- "пхукет" -> "HKT"
- "самуи" -> "USM"
- "бали" / "денпасар" / "индонезия" -> "DPS"
- "дубай" / "оаэ" -> "DXB"
- "доха" / "катар" -> "DOH"
- "стамбул" / "турция" -> "IST"
- "париж" / "франция" -> "PAR" (or CDG)
- "рим" / "италия" -> "ROM" (or FCO)
- "лондон" / "великобритания" -> "LON" (or LHR)
- "лос-анджелес" -> "LAX"
- "нью-йорк" -> "NYC" (or JFK)
- "мале" / "мальдивы" -> "MLE"
- Любой другой город мира -> его реальный 3-буквенный IATA код.

Rules for Dates:
- Parse dates relative to 2026 (or 2027 if next year).
- "12 сентября" -> "2026-09-12"
- "20 октября на 10 дней" -> departureDate: "2026-10-20", returnDate: "2026-10-30"
- "в октябре на 10 дней" -> departureDate: "2026-10-10", returnDate: "2026-10-20"
- "новогодние праздники" -> departureDate: "2026-12-28", returnDate: "2027-01-08"
- "майские праздники" -> departureDate: "2027-05-01", returnDate: "2027-05-10"
- "на 2 недели" -> departureDate: (explicit date or 7 days from now), returnDate: (departureDate + 14 days)

Passengers:
- Parse number of passengers (default: 1). "для двоих" -> 2, "семьей из 4 человек" -> 4.

Cabin Class:
- "business" if business/first class mentioned, otherwise "economy".

searchStpc:
- true if layover, long transit, hotel, or STPC program mentioned.

Return ONLY a strict JSON object with this structure:
{
  "origin": "UUS",
  "destination": "DAD",
  "departureDate": "2026-09-12",
  "returnDate": null,
  "passengers": 1,
  "cabinClass": "economy",
  "searchStpc": false,
  "message": "Подбираю билеты из Южно-Сахалинска (UUS) в Дананг (DAD) на 12 сентября 2026."
}`;
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

    // Вызываем Gemini 2.5 Flash онлайн для 100% динамического извлечения IATA кодов
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

            const message = typeof rawParsed.message === 'string' && rawParsed.message.trim()
              ? rawParsed.message.trim()
              : `Поиск билетов ${origin || ''} → ${destination || ''}${departureDate ? ` (${departureDate})` : ''}.`;

            if (origin && destination) {
              return NextResponse.json({
                success: true,
                data: {
                  origin,
                  destination,
                  departureDate: departureDate || getDefaultDate(),
                  returnDate,
                  passengers,
                  cabinClass,
                  searchStpc,
                  message,
                },
              });
            }
          }
        } catch (modelErr: any) {
          console.warn(`[Gemini SDK] Model ${modelName} call notice:`, modelErr?.message || modelErr);
        }
      }
    }

    // Универсальный эвристический парсер при недоступности API
    const fallbackData = universalFallbackParse(prompt);
    return NextResponse.json({
      success: true,
      data: fallbackData,
    });
  } catch (error: unknown) {
    console.error('[API /api/ai/parse] Error in parsing:', error);

    const safeData = universalFallbackParse(prompt || 'MOW BKK');
    return NextResponse.json({
      success: true,
      data: safeData,
    });
  }
}

function getDefaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function addDaysToDate(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

// Обширная всемирная карта IATA кодов
const OFFLINE_IATA_MAP: Record<string, string> = {
  'южно-сахалинск': 'UUS',
  'южносахалинск': 'UUS',
  'южносахалинска': 'UUS',
  'дананг': 'DAD',
  'дананга': 'DAD',
  'нячанг': 'CXR',
  'нячанга': 'CXR',
  'камрань': 'CXR',
  'владивосток': 'VVO',
  'владивостока': 'VVO',
  'хабаровск': 'KHV',
  'хабаровска': 'KHV',
  'иркутск': 'IKT',
  'иркутска': 'IKT',
  'казань': 'KZN',
  'казани': 'KZN',
  'екатеринбург': 'SVX',
  'екатеринбурга': 'SVX',
  'новосибирск': 'OVB',
  'новосибирска': 'OVB',
  'москва': 'MOW',
  'москвы': 'MOW',
  'москву': 'MOW',
  'питер': 'LED',
  'петербург': 'LED',
  'петербурга': 'LED',
  'санкт-петербург': 'LED',
  'сочи': 'AER',
  'токио': 'TYO',
  'япония': 'TYO',
  'японию': 'TYO',
  'японии': 'TYO',
  'осака': 'OSA',
  'сеул': 'ICN',
  'корея': 'ICN',
  'бангкок': 'BKK',
  'бангкока': 'BKK',
  'таиланд': 'BKK',
  'тайланд': 'BKK',
  'пхукет': 'HKT',
  'пхукета': 'HKT',
  'самуи': 'USM',
  'бали': 'DPS',
  'денпасар': 'DPS',
  'индонезия': 'DPS',
  'дубай': 'DXB',
  'дубая': 'DXB',
  'оаэ': 'DXB',
  'доха': 'DOH',
  'стамбул': 'IST',
  'стамбула': 'IST',
  'турция': 'IST',
  'турцию': 'IST',
  'анталья': 'AYT',
  'париж': 'PAR',
  'рим': 'ROM',
  'лондон': 'LON',
  'лос-анджелес': 'LAX',
  'нью-йорк': 'NYC',
  'мале': 'MLE',
  'мальдивы': 'MLE',
  'сейшелы': 'SEZ',
  'тбилиси': 'TBS',
  'ереван': 'EVN',
  'ташкент': 'TAS',
  'алматы': 'ALA',
  'минск': 'MSQ',
};

function universalFallbackParse(prompt: string): ParsedFlightParams {
  const lower = prompt.toLowerCase();

  let origin: string | null = null;
  let destination: string | null = null;

  // 1. Поиск пары городов
  const fromMatch = lower.match(/из\s+([а-яa-z\-]+)/i);
  if (fromMatch && fromMatch[1]) {
    const city = fromMatch[1].toLowerCase();
    origin = OFFLINE_IATA_MAP[city] || (city.length === 3 ? city.toUpperCase() : null);
  }

  const toMatch = lower.match(/(?:в|до|на)\s+([а-яa-z\-]+)/i);
  if (toMatch && toMatch[1]) {
    const city = toMatch[1].toLowerCase();
    if (!['эконом', 'бизнес', 'двоих', 'троих', 'недели', 'дней', 'сентября', 'октября', 'ноября', 'декабря', 'января', 'майские', 'новогодние', 'нг', 'новый'].includes(city)) {
      destination = OFFLINE_IATA_MAP[city] || (city.length === 3 ? city.toUpperCase() : null);
    }
  }

  // Если пара не определилась по предлогам, ищем по порядку их появления в тексте
  if (!origin || !destination) {
    const matchedCities: { iata: string; index: number }[] = [];
    for (const [cityName, iata] of Object.entries(OFFLINE_IATA_MAP)) {
      const idx = lower.indexOf(cityName);
      if (idx !== -1 && !matchedCities.some(c => c.iata === iata)) {
        matchedCities.push({ iata, index: idx });
      }
    }
    matchedCities.sort((a, b) => a.index - b.index);

    if (matchedCities.length >= 2) {
      if (!origin) origin = matchedCities[0].iata;
      if (!destination) destination = matchedCities[1].iata;
    } else if (matchedCities.length === 1) {
      if (!destination) destination = matchedCities[0].iata;
      if (!origin) origin = destination === 'MOW' ? 'TYO' : 'MOW';
    }
  }

  const finalOrigin = origin || 'MOW';
  const finalDestination = destination || (finalOrigin === 'MOW' ? 'BKK' : 'MOW');

  // 2. Обработка дат
  let departureDate: string | null = null;
  let returnDate: string | null = null;

  if (/новогод|новый год|на нг/i.test(lower)) {
    departureDate = '2026-12-28';
    returnDate = '2027-01-08';
  } else if (/майск|майские/i.test(lower)) {
    departureDate = '2027-05-01';
    returnDate = '2027-05-10';
  } else {
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
      departureDate = getDefaultDate();
    }

    // Проверка интервалов (на 10 дней, на 2 недели)
    const daysMatch = lower.match(/на\s+(\d+)\s+(?:дней|дня|день)/i);
    if (daysMatch && daysMatch[1] && departureDate) {
      const days = parseInt(daysMatch[1], 10);
      returnDate = addDaysToDate(departureDate, days);
    } else if (lower.includes('на 2 недели') && departureDate) {
      returnDate = addDaysToDate(departureDate, 14);
    } else if (lower.includes('на неделю') && departureDate) {
      returnDate = addDaysToDate(departureDate, 7);
    }
  }

  let passengers = 1;
  if (/двоих|2 пассажира|2 человека/i.test(lower)) passengers = 2;
  else if (/троих|3 пассажира|3 человека/i.test(lower)) passengers = 3;
  else if (/семьей|4 пассажира/i.test(lower)) passengers = 4;

  const cabinClass: CabinClass = /бизнес|business/i.test(lower) ? 'business' : 'economy';
  const searchStpc = /stpc|отел|стыковк|пересадк/i.test(lower);

  return {
    origin: finalOrigin,
    destination: finalDestination,
    departureDate,
    returnDate,
    passengers,
    cabinClass,
    searchStpc,
    message: returnDate
      ? `Поиск билетов ${finalOrigin} → ${finalDestination} (${departureDate} — ${returnDate}).`
      : `Поиск билетов ${finalOrigin} → ${finalDestination} (${departureDate}).`,
  };
}
