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
  needsRoundTrip?: boolean;
  message: string;
  suggestedClarifications?: string[];
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

CRITICAL RULES FOR ORIGIN & DESTINATION:
1. When two cities/places are mentioned:
   - The first mentioned city is ALWAYS the ORIGIN (point of departure).
     Example: "Питер Гуанчжоу 12 сентября" -> origin: "LED", destination: "CAN".
     Example: "Москва Токио" -> origin: "MOW", destination: "TYO".
     Example: "Владивосток Нячанг" -> origin: "VVO", destination: "CXR".
     Example: "Казань Стамбул" -> origin: "KZN", destination: "IST".
   - If prepositions are used:
     Example: "из Казани в Стамбул" -> origin: "KZN", destination: "IST".
     Example: "в Дананг из Южно-Сахалинска" -> origin: "UUS", destination: "DAD".
   - If only one city is mentioned (e.g. "Билеты в Токио"), assume origin: "MOW" (or default departure) and destination: "TYO".

2. Accurate World IATA Code resolution:
   - "питер" / "петербург" / "санкт-петербург" / "спб" -> "LED"
   - "москва" -> "MOW" (SVO, DME, VKO)
   - "сочи" / "адлер" -> "AER"
   - "гуанчжоу" / "guangzhou" -> "CAN"
   - "пекин" / "beijing" -> "PEK"
   - "шанхай" / "shanghai" -> "SHA" (PVG)
   - "гонконг" / "hong kong" -> "HKG"
   - "южно-сахалинск" / "южносахалинск" -> "UUS"
   - "дананг" / "da nang" -> "DAD"
   - "нячанг" / "камрань" -> "CXR"
   - "владивосток" -> "VVO"
   - "хабаровск" -> "KHV"
   - "иркутск" -> "IKT"
   - "казань" -> "KZN"
   - "екатеринбург" -> "SVX"
   - "новосибирск" -> "OVB"
   - "токио" / "япония" -> "TYO"
   - "осака" -> "OSA"
   - "сеул" / "корея" -> "ICN"
   - "бангкок" / "таиланд" -> "BKK"
   - "пхукет" -> "HKT"
   - "бали" / "денпасар" -> "DPS"
   - "дубай" / "оаэ" -> "DXB"
   - "доха" / "катар" -> "DOH"
   - "стамбул" / "турция" -> "IST"
   - "париж" -> "PAR" (CDG)
   - "рим" -> "ROM" (FCO)
   - "лондон" -> "LON" (LHR)
   - "лос-анджелес" -> "LAX"
   - "нью-йорк" -> "NYC" (JFK)
   - "мале" / "мальдивы" -> "MLE"
   - ANY other city in the world -> its exact 3-letter IATA code.

3. Dates & Round-Trip Rules:
   - Relative to Year 2026 (or 2027 if next year).
   - "12 сентября" -> departureDate: "2026-09-12", returnDate: null
   - "туда-обратно" / "обратно через 10 дней" / "на 2 недели" -> compute returnDate.
   - "новогодние праздники" -> departureDate: "2026-12-28", returnDate: "2027-01-08"
   - "майские праздники" -> departureDate: "2027-05-01", returnDate: "2027-05-10"

4. Passengers & Class:
   - Default: 1 passenger, "economy" class.
   - "для двоих" -> 2, "бизнес" -> "business".

Return ONLY a strict JSON object:
{
  "origin": "LED",
  "destination": "CAN",
  "departureDate": "2026-09-12",
  "returnDate": null,
  "passengers": 1,
  "cabinClass": "economy",
  "searchStpc": false,
  "needsRoundTrip": false,
  "message": "Маршрут Санкт-Петербург (LED) → Гуанчжоу (CAN) на 12 сентября 2026 года."
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

    // Вызываем Gemini 2.5 Flash онлайн
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
            const needsRoundTrip = Boolean(rawParsed.needsRoundTrip || returnDate);

            const message = typeof rawParsed.message === 'string' && rawParsed.message.trim()
              ? rawParsed.message.trim()
              : `Поиск билетов ${origin || ''} → ${destination || ''}${departureDate ? ` (${departureDate})` : ''}.`;

            if (origin && destination && origin !== destination) {
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
                  needsRoundTrip,
                  message,
                  suggestedClarifications: !returnDate ? ['Добавить обратный билет', 'Выбрать багаж 23 кг'] : undefined,
                },
              });
            }
          }
        } catch (modelErr: any) {
          console.warn(`[Gemini SDK] Model ${modelName} call notice:`, modelErr?.message || modelErr);
        }
      }
    }

    // Универсальный эвристический парсер с точным определением порядка слов
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

const OFFLINE_IATA_MAP: Record<string, string> = {
  'питер': 'LED',
  'петербург': 'LED',
  'петербурга': 'LED',
  'санкт-петербург': 'LED',
  'спб': 'LED',
  'гуанчжоу': 'CAN',
  'пекин': 'PEK',
  'шанхай': 'SHA',
  'гонконг': 'HKG',
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
  'сочи': 'AER',
  'токио': 'TYO',
  'япония': 'TYO',
  'японию': 'TYO',
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

  // 1. Поиск по предлогам «из [A] в [B]» или «в [B] из [A]»
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

  // 2. Если пара городов не определилась по предлогам — извлекаем в порядке их появления в тексте:
  // ПЕРВЫЙ город = ORIGIN, ВТОРОЙ город = DESTINATION
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
  const finalDestination = destination || (finalOrigin === 'MOW' ? 'CAN' : 'MOW');

  // 3. Обработка дат и праздников
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

    const daysMatch = lower.match(/на\s+(\d+)\s+(?:дней|дня|день)/i);
    if (daysMatch && daysMatch[1] && departureDate) {
      const days = parseInt(daysMatch[1], 10);
      returnDate = addDaysToDate(departureDate, days);
    } else if (lower.includes('на 2 недели') && departureDate) {
      returnDate = addDaysToDate(departureDate, 14);
    } else if (lower.includes('на неделю') && departureDate) {
      returnDate = addDaysToDate(departureDate, 7);
    } else if (/туда-обратно|туда и обратно|обратно/i.test(lower) && !returnDate && departureDate) {
      returnDate = (departureDate.includes('12-28') || departureDate.includes('12-29'))
        ? '2027-01-08'
        : addDaysToDate(departureDate, 7);
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
    needsRoundTrip: Boolean(returnDate),
    message: returnDate
      ? `Маршрут ${finalOrigin} → ${finalDestination} (${departureDate} — ${returnDate}).`
      : `Маршрут ${finalOrigin} → ${finalDestination} (${departureDate}).`,
    suggestedClarifications: !returnDate ? ['Добавить обратный билет', 'Выбрать багаж 23 кг'] : undefined,
  };
}
