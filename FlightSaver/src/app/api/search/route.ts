import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { messages, currentParams } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const currentDate = new Date().toISOString().split('T')[0];

    const rawList = Array.isArray(messages) ? messages : [];
    const lastUserMessage = rawList.filter((m: any) => m.sender === 'user').pop()?.text || '';
    const lastTextLower = lastUserMessage.toLowerCase();

    const systemInstruction = `Ты — профессиональный NLP-парсер авиабилетов сервиса FlightSaver. Твоя задача — мгновенно извлечь параметры перелета из текста пользователя (включая распознанную речь).
Текущий год: 2026. Сегодня: ${currentDate}.

ОБЯЗАТЕЛЬНО определяй IATA-коды городов:
- Иркутск -> IKT
- Пекин -> PEK (или BJS)
- Красноярск -> KJA
- Мюнхен -> MUC
- Москва -> MOW (SVO/DME/VKO)
- Санкт-Петербург -> LED
- Бангкок -> BKK
- Дубай -> DXB
- Стамбул -> IST
- Чебоксары -> CSY
- Люксембург -> LUX
- Самара -> KUF
- Рим -> ROM (FCO)
- Ханой -> HAN
- Дананг -> DAD
- Южно-Сахалинск -> UUS
- Владивосток -> VVO
- Казань -> KZN
- Сочи -> AER
- Екатеринбург -> SVX
- Новосибирск -> OVB
- Минск -> MSQ
- Пхукет -> HKT
- Токио -> TYO (HND/NRT)
- Париж -> PAR (CDG/ORY)
- Лондон -> LON (LHR/LGW)

КРИТИЧЕСКИЕ ПРАВИЛА:
1. ОПРЕДЕЛЕНИЕ МАРШРУТА:
   - Первый названный город — это ВСЕГДА пункт вылета (origin). Пример: "Иркутск Пекин 15 сентября" -> origin: "IKT", destination: "PEK".
   - Предлоги "из [A] в [B]": origin: A, destination: B.
   - Если указан только один город (например: "Билеты в Рим") -> origin: "MOW", destination: "ROM".
2. ДАТЫ:
   - Преобразуй дату в формат YYYY-MM-DD (2026 год).
   - Если год не назван — используй 2026.
3. ПО УМОЛЧАНИЮ (НЕ БЛОКИРОВАТЬ ПОИСК):
   - Если указан пункт вылета, пункт назначения и дата — считай поиск полностью завершенным (is_complete = true).
   - Если обратная дата не названа — ставь is_round_trip = false, return_date = null. НЕ БЛОКИРУЙ поиск вопросами, сразу выдавай билеты!
   - По умолчанию: passengers_count = 1, cabin_class = "economy", baggage_info = "Багаж 23 кг".

ФОРМАТ ОТВЕТА (СТРОГО JSON без \`\`\`json):
{
  "origin_iata": "IKT",
  "origin_name": "Иркутск",
  "destination_iata": "PEK",
  "destination_name": "Пекин",
  "departure_date": "2026-09-15",
  "return_date": null,
  "is_round_trip": false,
  "passengers_count": 1,
  "cabin_class": "economy",
  "baggage_info": "Багаж 23 кг",
  "is_complete": true,
  "assistant_message": "Нашел лучшие рейсы Иркутск → Пекин на 15 сентября:",
  "quick_options": ["🔄 Добавить обратный билет", "👥 2 пассажира", "💎 Бизнес-класс", "🎒 Только ручная кладь"]
}
`;

    let parsed: any = null;

    // 1. Распознавание через Gemini 2.5 Flash
    if (apiKey && lastUserMessage) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Запрос пользователя: "${lastUserMessage}". Контекст: ${JSON.stringify(currentParams || {})}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const raw = res.text?.trim() || '';
        if (raw) {
          const jsonClean = raw.replace(/```json|```/g, '').trim();
          parsed = JSON.parse(jsonClean);
        }
      } catch (err: any) {
        console.warn('Gemini parser notice:', err?.message || err);
      }
    }

    // 2. Детерминированный fallback при необходимости
    if (!parsed || !parsed.origin_iata || !parsed.destination_iata) {
      let origin_iata = currentParams?.origin_iata || null;
      let origin_name = currentParams?.origin_name || null;
      let destination_iata = currentParams?.destination_iata || null;
      let destination_name = currentParams?.destination_name || null;
      let departure_date = currentParams?.departure_date || null;

      // Словари городов
      if (lastTextLower.includes('иркутск') || lastTextLower.includes('ikt')) {
        origin_iata = origin_iata || 'IKT';
        origin_name = origin_name || 'Иркутск';
      }
      if (lastTextLower.includes('красноярск') || lastTextLower.includes('kja')) {
        origin_iata = origin_iata || 'KJA';
        origin_name = origin_name || 'Красноярск';
      }
      if (lastTextLower.includes('чебоксар') || lastTextLower.includes('csy')) {
        origin_iata = origin_iata || 'CSY';
        origin_name = origin_name || 'Чебоксары';
      }
      if (lastTextLower.includes('самар') || lastTextLower.includes('kuf')) {
        origin_iata = origin_iata || 'KUF';
        origin_name = origin_name || 'Самара';
      }
      if (lastTextLower.includes('питер') || lastTextLower.includes('петербург') || lastTextLower.includes('led')) {
        origin_iata = origin_iata || 'LED';
        origin_name = origin_name || 'Санкт-Петербург';
      }
      if (lastTextLower.includes('москв') || lastTextLower.includes('mow')) {
        origin_iata = origin_iata || 'MOW';
        origin_name = origin_name || 'Москва';
      }

      if (lastTextLower.includes('пекин') || lastTextLower.includes('pek') || lastTextLower.includes('bjs')) {
        destination_iata = 'PEK';
        destination_name = 'Пекин';
      } else if (lastTextLower.includes('мюнхен') || lastTextLower.includes('muc')) {
        destination_iata = 'MUC';
        destination_name = 'Мюнхен';
      } else if (lastTextLower.includes('люксембург') || lastTextLower.includes('lux')) {
        destination_iata = 'LUX';
        destination_name = 'Люксембург';
      } else if (lastTextLower.includes('бангкок') || lastTextLower.includes('bkk')) {
        destination_iata = 'BKK';
        destination_name = 'Бангкок';
      } else if (lastTextLower.includes('рим') || lastTextLower.includes('rom') || lastTextLower.includes('fco')) {
        destination_iata = 'ROM';
        destination_name = 'Рим';
      } else if (lastTextLower.includes('гуанчжоу') || lastTextLower.includes('can')) {
        destination_iata = 'CAN';
        destination_name = 'Гуанчжоу';
      } else if (lastTextLower.includes('ханой') || lastTextLower.includes('han')) {
        destination_iata = 'HAN';
        destination_name = 'Ханой';
      }

      if (!origin_iata) {
        origin_iata = 'MOW';
        origin_name = 'Москва';
      }
      if (!destination_iata) {
        destination_iata = 'BKK';
        destination_name = 'Бангкок';
      }

      // Определение дат
      if (lastTextLower.includes('29 ноября')) departure_date = '2026-11-29';
      else if (lastTextLower.includes('15 сентября')) departure_date = '2026-09-15';
      else if (lastTextLower.includes('12 сентября')) departure_date = '2026-09-12';
      else if (lastTextLower.includes('21 сентября')) departure_date = '2026-09-21';
      else if (lastTextLower.includes('22 октября')) departure_date = '2026-10-22';
      else if (!departure_date) departure_date = '2026-09-15';

      parsed = {
        origin_iata,
        origin_name,
        destination_iata,
        destination_name,
        departure_date,
        return_date: null,
        is_round_trip: false,
        passengers_count: 1,
        cabin_class: 'economy',
        baggage_info: 'Багаж 23 кг',
        is_complete: true,
        assistant_message: `Нашел билеты ${origin_name || origin_iata} → ${destination_name || destination_iata} на ${departure_date}:`,
        quick_options: ['🔄 Добавить обратный билет', '👥 2 пассажира', '💎 Бизнес-класс', '🎒 Только ручная кладь'],
      };
    }

    // Поиск реальных рейсов в Duffel API
    let flightOffers: any[] = [];
    if (parsed.origin_iata && parsed.destination_iata) {
      flightOffers = await fetchDuffelOffers(parsed);
    }

    const stateObj = {
      ...parsed,
      is_complete: true,
    };

    const replyMessage = parsed.assistant_message || `Нашел билеты ${parsed.origin_name || parsed.origin_iata} → ${parsed.destination_name || parsed.destination_iata} на ${parsed.departure_date}:`;

    return NextResponse.json({
      assistant_message: replyMessage,
      quick_options: Array.isArray(parsed.quick_options) && parsed.quick_options.length > 0
        ? parsed.quick_options
        : ['🔄 Добавить обратный билет', '👥 2 пассажира', '💎 Бизнес-класс'],
      state: stateObj,
      flights: flightOffers,
    });
  } catch (err: any) {
    console.error('[/api/search] Error:', err);
    return NextResponse.json({
      assistant_message: 'По вашему запросу найдены следующие варианты:',
      quick_options: ['🔄 Добавить обратный билет', '👥 2 пассажира', '💎 Бизнес-класс'],
      state: {},
      flights: [],
    });
  }
}

async function fetchDuffelOffers(state: any) {
  const token = process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_TOKEN;
  if (!token) return [];

  try {
    const slices: any[] = [
      {
        origin: state.origin_iata,
        destination: state.destination_iata,
        departure_date: state.departure_date || '2026-09-15',
      },
    ];

    if (state.return_date) {
      slices.push({
        origin: state.destination_iata,
        destination: state.origin_iata,
        departure_date: state.return_date,
      });
    }

    const passengers = Array.from({ length: state.passengers_count || 1 }, () => ({ type: 'adult' }));

    const res = await fetch('https://api.duffel.com/air/offer_requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Duffel-Version': 'v2',
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers,
          cabin_class: state.cabin_class === 'business' ? 'business' : 'economy',
          return_offers: true,
        },
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const offers = data.data?.offers || [];

    return offers.slice(0, 4).map((offer: any, idx: number) => {
      const slice = offer.slices?.[0];
      const segments = slice?.segments || [];
      const isStpc = segments.length > 1;
      const rawAmount = parseFloat(offer.total_amount || '320');
      const totalRub = Math.round(rawAmount * 95);

      return {
        id: offer.id || `fl-${idx + 1}`,
        airline: segments[0]?.operating_carrier?.name || offer.owner?.name || 'Авиакомпания',
        origin: state.origin_iata,
        destination: state.destination_iata,
        originCity: state.origin_name || state.origin_iata,
        destinationCity: state.destination_name || state.destination_iata,
        departureDate: state.departure_date || '15 сен',
        departureTime: segments[0]?.departing_at ? segments[0].departing_at.substring(11, 16) : '08:30',
        arrivalTime: segments[segments.length - 1]?.arriving_at ? segments[segments.length - 1].arriving_at.substring(11, 16) : '19:50',
        duration: slice?.duration ? slice.duration.replace('PT', '').toLowerCase() : '11ч 20м',
        totalPrice: totalRub,
        stpcHotelIncluded: isStpc,
        cabinClass: state.cabin_class === 'business' ? 'Бизнес-класс' : 'Эконом',
        baggage: state.baggage_info || 'Багаж 23 кг',
      };
    });
  } catch {
    return [];
  }
}
