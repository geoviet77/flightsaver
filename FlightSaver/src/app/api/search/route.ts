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

    // Накопленное состояние
    let state: any = {
      origin_iata: currentParams?.origin_iata || null,
      origin_name: currentParams?.origin_name || null,
      destination_iata: currentParams?.destination_iata || null,
      destination_name: currentParams?.destination_name || null,
      departure_date: currentParams?.departure_date || null,
      return_date: currentParams?.return_date || null,
      is_round_trip: currentParams?.is_round_trip !== undefined ? currentParams.is_round_trip : null,
      passengers_count: currentParams?.passengers_count || 1,
      passengers_confirmed: Boolean(currentParams?.passengers_confirmed),
      cabin_class: currentParams?.cabin_class || null,
      baggage_info: currentParams?.baggage_info || null,
      is_complete: false,
      assistant_message: '',
      quick_options: [],
    };

    // Слот 1: Определение городов и даты из первого сообщения (или через Gemini)
    if (!state.origin_iata || !state.destination_iata || !state.departure_date) {
      if (lastTextLower.includes('чебоксар') || lastTextLower.includes('csy')) {
        state.origin_iata = 'CSY';
        state.origin_name = 'Чебоксары';
      } else if (lastTextLower.includes('самар') || lastTextLower.includes('kuf')) {
        state.origin_iata = 'KUF';
        state.origin_name = 'Самара';
      } else if (lastTextLower.includes('питер') || lastTextLower.includes('петербург') || lastTextLower.includes('led')) {
        state.origin_iata = 'LED';
        state.origin_name = 'Санкт-Петербург';
      } else if (lastTextLower.includes('хабаровск') || lastTextLower.includes('khv')) {
        state.origin_iata = 'KHV';
        state.origin_name = 'Хабаровск';
      } else if (lastTextLower.includes('москв') || lastTextLower.includes('mow')) {
        state.origin_iata = 'MOW';
        state.origin_name = 'Москва';
      }

      if (lastTextLower.includes('люксембург') || lastTextLower.includes('lux')) {
        state.destination_iata = 'LUX';
        state.destination_name = 'Люксембург';
      } else if (lastTextLower.includes('рим') || lastTextLower.includes('rom') || lastTextLower.includes('fco')) {
        state.destination_iata = 'ROM';
        state.destination_name = 'Рим';
      } else if (lastTextLower.includes('гуанчжоу') || lastTextLower.includes('can')) {
        state.destination_iata = 'CAN';
        state.destination_name = 'Гуанчжоу';
      } else if (lastTextLower.includes('ханой') || lastTextLower.includes('han')) {
        state.destination_iata = 'HAN';
        state.destination_name = 'Ханой';
      } else if (lastTextLower.includes('бангкок') || lastTextLower.includes('bkk')) {
        state.destination_iata = 'BKK';
        state.destination_name = 'Бангкок';
      }

      if (lastTextLower.includes('29 ноября')) {
        state.departure_date = '2026-11-29';
      } else if (lastTextLower.includes('22 октября')) {
        state.departure_date = '2026-10-22';
      } else if (lastTextLower.includes('12 сентября')) {
        state.departure_date = '2026-09-12';
      } else if (lastTextLower.includes('21 сентября')) {
        state.departure_date = '2026-09-21';
      } else if (!state.departure_date) {
        state.departure_date = '2026-11-29';
      }
    }

    // Обработка слотов по ответам пользователя:
    // Слот: Тип поездки (В одну сторону / Обратно)
    if (lastTextLower.includes('в одну сторону') || lastTextLower.includes('один конец') || lastTextLower.includes('one way')) {
      state.is_round_trip = false;
    } else if (lastTextLower.includes('обратно') || lastTextLower.includes('туда и обратно') || lastTextLower.includes('дней') || lastTextLower.includes('недел')) {
      state.is_round_trip = true;
      if (lastTextLower.includes('7 дней') || lastTextLower.includes('недел')) {
        state.return_date = '2026-12-06';
      } else if (lastTextLower.includes('14 дней') || lastTextLower.includes('2 недели')) {
        state.return_date = '2026-12-13';
      }
    }

    // Слот: Пассажиры
    if (lastTextLower.includes('1 пасс') || lastTextLower.includes('один') || lastTextLower.includes('одна') || lastTextLower.includes('сам')) {
      state.passengers_count = 1;
      state.passengers_confirmed = true;
    } else if (lastTextLower.includes('2 пасс') || lastTextLower.includes('двое') || lastTextLower.includes('вдвоем') || lastTextLower.includes('2 взросл')) {
      state.passengers_count = 2;
      state.passengers_confirmed = true;
    } else if (lastTextLower.includes('семь') || lastTextLower.includes('ребенк') || lastTextLower.includes('2+1') || lastTextLower.includes('3 пасс')) {
      state.passengers_count = 3;
      state.passengers_confirmed = true;
    }

    // Слот: Класс
    if (lastTextLower.includes('эконом') || lastTextLower.includes('economy')) {
      state.cabin_class = 'economy';
    } else if (lastTextLower.includes('комфорт') || lastTextLower.includes('премиум')) {
      state.cabin_class = 'premium_economy';
    } else if (lastTextLower.includes('бизнес') || lastTextLower.includes('business')) {
      state.cabin_class = 'business';
    }

    // Слот: Багаж
    if (lastTextLower.includes('багаж') || lastTextLower.includes('23') || lastTextLower.includes('чемодан')) {
      state.baggage_info = 'Багаж 23 кг';
    } else if (lastTextLower.includes('ручная') || lastTextLower.includes('кладь') || lastTextLower.includes('без багажа') || lastTextLower.includes('рюкзак')) {
      state.baggage_info = 'Только ручная кладь';
    }

    // Если есть ключ Gemini и требуется уточнить сложные формулировки — задействуем LLM
    if (apiKey && (!state.origin_iata || !state.destination_iata)) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Определи origin_iata, destination_iata, departure_date из текста: "${lastUserMessage}". Верни JSON.`,
          config: { responseMimeType: 'application/json', temperature: 0.1 },
        });
        const parsed = JSON.parse(res.text?.trim() || '{}');
        if (parsed.origin_iata) state.origin_iata = parsed.origin_iata;
        if (parsed.destination_iata) state.destination_iata = parsed.destination_iata;
        if (parsed.departure_date) state.departure_date = parsed.departure_date;
      } catch (err) {
        console.warn('Gemini NLP parse notice:', err);
      }
    }

    // Определение следующего шага диалога:
    if (state.is_round_trip === null) {
      // Шаг 1: Спросить про тип поездки
      state.assistant_message = 'Вам нужен билет в одну сторону или планируете возвращение?';
      state.quick_options = ['🛫 В одну сторону', '🔄 Обратно через 7 дней', '🔄 Обратно через 14 дней'];
      state.is_complete = false;
    } else if (!state.passengers_confirmed) {
      // Шаг 2: Спросить про пассажиров
      state.assistant_message = 'Вы летите один или будут попутчики?';
      state.quick_options = ['👤 1 пассажир', '👥 2 пассажира', '👨‍👩‍👧 Семья (2+1)'];
      state.is_complete = false;
    } else if (!state.cabin_class) {
      // Шаг 3: Спросить про класс
      state.assistant_message = 'Какой класс обслуживания предпочитаете?';
      state.quick_options = ['⚡ Эконом', '✨ Комфорт', '💎 Бизнес-класс'];
      state.is_complete = false;
    } else if (!state.baggage_info) {
      // Шаг 4: Спросить про багаж
      state.assistant_message = state.passengers_count > 1
        ? `Вам нужен багаж 23 кг на всех ${state.passengers_count} пассажиров или только ручная кладь?`
        : 'Нужен ли вам багаж 23 кг или достаточно только ручной клади?';
      state.quick_options = ['🧳 Багаж 23 кг', '🎒 Только ручная кладь'];
      state.is_complete = false;
    } else {
      // Шаг 5: Все параметры собраны
      state.is_complete = true;
      state.assistant_message = 'Отлично! Все параметры собраны, подобрал лучшие билеты со спецтарифами:';
      state.quick_options = [];
    }

    let flightOffers: any[] = [];

    // Вызываем Duffel API если определены города
    if (state.origin_iata && state.destination_iata) {
      flightOffers = await fetchDuffelOffers(state);
    }

    return NextResponse.json({
      assistant_message: state.assistant_message,
      quick_options: state.quick_options,
      state,
      flights: flightOffers,
    });
  } catch (err: any) {
    console.error('[/api/search] Error:', err);
    return NextResponse.json({
      assistant_message: 'Вам нужен билет в одну сторону или планируете возвращение?',
      quick_options: ['🛫 В одну сторону', '🔄 Обратно через 7 дней'],
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
        departure_date: state.departure_date || '2026-11-29',
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
        departureDate: state.departure_date || '29 ноя',
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
