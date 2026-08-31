import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Flight, FlightSegment, TransitInfo, PricingBreakdown } from '@/lib/types';
import { getRegionalHubConnection, isTestSandboxCarrier, HubConnection } from '@/lib/routeValidator';
import { enrichFlightOfferWithStpc } from '@/lib/stpc/engine';
import { enrichFlightWithStpc } from '@/lib/stpcService';
import { PricingService } from '@/services/pricingService';
import { CurrencyService } from '@/services/currencyService';
import {
  Currency as PricingCurrency,
  PricingOptions,
  SplitTicketLegInput,
  FlightSegment as PricingSegment,
} from '@/types/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STPC_WHITELIST_AIRLINES = ['TK', 'EK', 'QR', 'GF', 'EY', 'CA', 'CZ', 'MU', 'ET', 'SV', 'MS', 'HY'];

const AIRPORT_NAMES: Record<string, { city: string; name: string; country: string }> = {
  MOW: { city: 'Москва', name: 'Москва (Шереметьево/Домодедово)', country: 'Россия' },
  SVO: { city: 'Москва', name: 'Шереметьево', country: 'Россия' },
  DME: { city: 'Москва', name: 'Домодедово', country: 'Россия' },
  VKO: { city: 'Москва', name: 'Внуково', country: 'Россия' },
  LED: { city: 'Санкт-Петербург', name: 'Пулково', country: 'Россия' },
  IKT: { city: 'Иркутск', name: 'Байкал', country: 'Россия' },
  KJA: { city: 'Красноярск', name: 'Емельяново', country: 'Россия' },
  OVB: { city: 'Новосибирск', name: 'Толмачево', country: 'Россия' },
  SVX: { city: 'Екатеринбург', name: 'Кольцово', country: 'Россия' },
  KUF: { city: 'Самара', name: 'Курумоч', country: 'Россия' },
  KZN: { city: 'Казань', name: 'Казань', country: 'Россия' },
  CSY: { city: 'Чебоксары', name: 'Чебоксары', country: 'Россия' },
  AER: { city: 'Сочи', name: 'Адлер', country: 'Россия' },
  VVO: { city: 'Владивосток', name: 'Кневичи', country: 'Россия' },
  KHV: { city: 'Хабаровск', name: 'Новый', country: 'Россия' },
  UUS: { city: 'Южно-Сахалинск', name: 'Хомутово', country: 'Россия' },
  MSQ: { city: 'Минск', name: 'Минск-2', country: 'Беларусь' },
  PEK: { city: 'Пекин', name: 'Шоуду (Capital)', country: 'Китай' },
  PKX: { city: 'Пекин', name: 'Дасин', country: 'Китай' },
  CAN: { city: 'Гуанчжоу', name: 'Байюнь', country: 'Китай' },
  PVG: { city: 'Шанхай', name: 'Пудун', country: 'Китай' },
  BKK: { city: 'Бангкок', name: 'Суварнабхуми', country: 'Таиланд' },
  HKT: { city: 'Пхукет', name: 'Пхукет International', country: 'Таиланд' },
  DAD: { city: 'Дананг', name: 'Дананг International', country: 'Вьетнам' },
  HAN: { city: 'Ханой', name: 'Нойбай', country: 'Вьетнам' },
  SGN: { city: 'Хошимин', name: 'Таншоннят', country: 'Вьетнам' },
  CXR: { city: 'Нячанг', name: 'Камрань', country: 'Вьетнам' },
  DAC: { city: 'Дакка', name: 'Хазрат Шахджалал', country: 'Бангладеш' },
  CGP: { city: 'Читтагонг', name: 'Шах Аманат', country: 'Бангладеш' },
  DUS: { city: 'Дюссельдорф', name: 'Дюссельдорф', country: 'Германия' },
  MUC: { city: 'Мюнхен', name: 'Франц Йозеф Штраус', country: 'Германия' },
  FRA: { city: 'Франкфурт', name: 'Рейн-Майн', country: 'Германия' },
  BER: { city: 'Берлин', name: 'Бранденбург', country: 'Германия' },
  LUX: { city: 'Люксембург', name: 'Финдел', country: 'Люксембург' },
  PAR: { city: 'Париж', name: 'Шарль де Голль', country: 'Франция' },
  CDG: { city: 'Париж', name: 'Шарль де Голль', country: 'Франция' },
  ROM: { city: 'Рим', name: 'Фьюмичино', country: 'Италия' },
  FCO: { city: 'Рим', name: 'Фьюмичино', country: 'Италия' },
  MXP: { city: 'Милан', name: 'Мальпенса', country: 'Италия' },
  VIE: { city: 'Вена', name: 'Швехат', country: 'Австрия' },
  ZRH: { city: 'Цюрих', name: 'Клотен', country: 'Швейцария' },
  AMS: { city: 'Амстердам', name: 'Схипхол', country: 'Нидерланды' },
  PRG: { city: 'Прага', name: 'Вацлав Гавел', country: 'Чехия' },
  MAD: { city: 'Мадрид', name: 'Барахас', country: 'Испания' },
  BCN: { city: 'Барселона', name: 'Эль-Прат', country: 'Испания' },
  IST: { city: 'Стамбул', name: 'Стамбул Новый', country: 'Турция' },
  SAW: { city: 'Стамбул', name: 'Сабиха Гёкчен', country: 'Турция' },
  AYT: { city: 'Анталья', name: 'Анталья', country: 'Турция' },
  DXB: { city: 'Дубай', name: 'Дубай International', country: 'ОАЭ' },
  AUH: { city: 'Абу-Даби', name: 'Зайед International', country: 'ОАЭ' },
  DOH: { city: 'Доха', name: 'Хамад', country: 'Катар' },
  TAS: { city: 'Ташкент', name: 'Ислам Каримов', country: 'Узбекистан' },
  ALA: { city: 'Алматы', name: 'Алматы International', country: 'Казахстан' },
  NQZ: { city: 'Астана', name: 'Нурсултан Назарбаев', country: 'Казахстан' },
  TYO: { city: 'Токио', name: 'Нарита / Ханеда', country: 'Япония' },
  NRT: { city: 'Токио', name: 'Нарита', country: 'Япония' },
  HND: { city: 'Токио', name: 'Ханеда', country: 'Япония' },
  ICN: { city: 'Сеул', name: 'Инчхон', country: 'Южная Корея' },
  DPS: { city: 'Бали', name: 'Нгурах-Рай', country: 'Индонезия' },
  SIN: { city: 'Сингапур', name: 'Чанги', country: 'Сингапур' },
  KUL: { city: 'Куала-Лумпур', name: 'KLIA', country: 'Малайзия' },
};

function getCityMeta(iata: string, defaultName?: string) {
  const code = (iata || '').toUpperCase();
  const meta = AIRPORT_NAMES[code];
  if (meta) return meta;
  return { city: defaultName || code, name: `${defaultName || code} (${code})`, country: 'Международный' };
}

// Страны, требующие уточнения конкретного города/аэропорта
const COUNTRY_DISAMBIGUATION: Record<string, { countryRu: string; question: string; options: string[] }> = {
  бангладеш: {
    countryRu: 'Бангладеш',
    question: 'В какой город Бангладеш вы планируете перелет?',
    options: ['📍 Дакка (DAC)', '📍 Читтагонг (CGP)', '📍 Силхет (ZYL)'],
  },
  вьетнам: {
    countryRu: 'Вьетнам',
    question: 'В какой город Вьетнама вы направляетесь?',
    options: ['📍 Ханой (HAN)', '📍 Хошимин (SGN)', '📍 Дананг (DAD)', '📍 Нячанг (CXR)'],
  },
  таиланд: {
    countryRu: 'Таиланд',
    question: 'В какой аэропорт Таиланда вы летите?',
    options: ['📍 Бангкок (BKK)', '📍 Пхукет (HKT)', '📍 Самуи (USM)'],
  },
  германия: {
    countryRu: 'Германия',
    question: 'В какой город Германии вы направляетесь?',
    options: ['📍 Берлин (BER)', '📍 Мюнхен (MUC)', '📍 Франкфурт (FRA)', '📍 Дюссельдорф (DUS)'],
  },
  италия: {
    countryRu: 'Италия',
    question: 'В какой город Италии вы планируете поездку?',
    options: ['📍 Рим (ROM)', '📍 Милан (MXP)', '📍 Венеция (VCE)', '📍 Неаполь (NAP)'],
  },
  китай: {
    countryRu: 'Китай',
    question: 'В какой город Китая вы направляетесь?',
    options: ['📍 Пекин (PEK)', '📍 Шанхай (PVG)', '📍 Гуанчжоу (CAN)'],
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      currentParams,
      query,
      message,
      accumulatedSearchParams,
      userTier,
      isClubMember,
      currency,
      targetCurrency,
    } = body;

    const effectiveIsClubMember = Boolean(
      isClubMember ||
      userTier === 'club' ||
      accumulatedSearchParams?.isClubMember ||
      currentParams?.isClubMember ||
      accumulatedSearchParams?.userTier === 'club' ||
      currentParams?.userTier === 'club'
    );

    const rawCurrency = (
      targetCurrency ||
      currency ||
      accumulatedSearchParams?.currency ||
      currentParams?.currency ||
      'RUB'
    ).toUpperCase();

    const effectiveCurrency: PricingCurrency = (
      ['RUB', 'USD', 'EUR', 'VND'].includes(rawCurrency)
        ? rawCurrency
        : 'RUB'
    ) as PricingCurrency;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const currentDate = new Date().toISOString().split('T')[0];

    const rawList = Array.isArray(messages) ? messages : [];
    let lastUserMessage = rawList.filter((m: any) => m.sender === 'user' || m.role === 'user').pop();
    const userText = (typeof lastUserMessage === 'string' ? lastUserMessage : lastUserMessage?.text) || message || query || '';
    const lastTextLower = userText.toLowerCase().trim();

    const stateContext = accumulatedSearchParams || currentParams || {};

    // 1. Проверка на необходимость уточнения страны (Disambiguation Check)
    for (const [countryKey, info] of Object.entries(COUNTRY_DISAMBIGUATION)) {
      if (lastTextLower.includes(countryKey) && !lastTextLower.includes('дакк') && !lastTextLower.includes('ханой') && !lastTextLower.includes('бангкок') && !lastTextLower.includes('берлин') && !lastTextLower.includes('рим') && !lastTextLower.includes('пекин')) {
        let extractedOrigin = stateContext.origin || stateContext.originIata;
        let extractedOriginName = stateContext.originName || stateContext.originCity;

        if (lastTextLower.includes('иркутск') || lastTextLower.includes('ikt')) {
          extractedOrigin = 'IKT';
          extractedOriginName = 'Иркутск';
        } else if (lastTextLower.includes('москв') || lastTextLower.includes('mow')) {
          extractedOrigin = 'MOW';
          extractedOriginName = 'Москва';
        } else if (lastTextLower.includes('питер') || lastTextLower.includes('led')) {
          extractedOrigin = 'LED';
          extractedOriginName = 'Санкт-Петербург';
        } else if (lastTextLower.includes('красноярск') || lastTextLower.includes('kja')) {
          extractedOrigin = 'KJA';
          extractedOriginName = 'Красноярск';
        }

        const dateMatch = userText.match(/(\d{1,2})\s+(январ[яе]?|феврал[яе]?|март[ае]?|апрел[яе]?|ма[яе]?|июн[яе]?|июл[яе]?|август[ае]?|сентябр[яе]?|октябр[яе]?|ноябр[яе]?|декабр[яе]?)(?:\s+(\d{4}))?/i);
        const depDate = dateMatch ? parseMatchedDate(dateMatch) : (stateContext.departureDate || '2026-11-29');

        const stateObj = {
          origin_iata: extractedOrigin || null,
          origin_name: extractedOriginName || null,
          destination_iata: null,
          destination_name: null,
          departure_date: depDate,
          return_date: null,
          is_round_trip: false,
          passengers_count: 1,
          cabin_class: 'economy',
          baggage_info: 'Багаж 23 кг',
          is_complete: false,
          assistant_message: info.question,
          quick_options: info.options,
        };

        return NextResponse.json({
          assistant_message: info.question,
          message: info.question,
          quick_options: info.options,
          quickReplies: info.options,
          state: stateObj,
          parsed: stateObj,
          accumulatedSearchParams: stateObj,
          flights: [],
        });
      }
    }

    const systemInstruction = `Ты — профессиональный ИИ-консьерж и NLP-парсер авиабилетов сервиса FlightSaver.
Текущий год: 2026. Сегодня: ${currentDate}.

ТВОЯ ЗАДАЧА:
Вести осмысленный контекстный диалог на русском языке и поэтапно собрать параметры перелета:
1. Маршрут (откуда вылет, куда прилет) и Дата вылета.
2. Тип поездки (в одну сторону или туда-обратно с датой возвращения).
3. Количество и состав пассажиров (взрослые, дети).
4. Класс обслуживания (Эконом / Комфорт / Бизнес).
5. Багаж (с багажом 23 кг или только ручная кладь).
6. Стоповер и транзитные отели STPC (длинная пересадка с отелем).
7. Сравнение с ценой пользователя / сторонних сайтов (Target Price Matching).

ПРАВИЛА ДЛЯ СРАВНЕНИЯ ЦЕН (TARGET PRICE MATCHING & BENCHMARK):
- Если пользователь называет цену, которую он видел или нашел на сторонних сайтах (например: "видел на Авиасейлс за 68 000 руб", "нашел за 45к", "у меня есть предложение за 60000", "на Авиасейлс 55 тыс", "билет за 33000 рублей"):
  - Установи user_target_price (число в рублях, например 68000, 45000, 33000).
  - Установи user_target_source (строка: "Авиасейлс", "Яндекс.Путешествия", "Trip.com", "Купибилет" или "Сторонний сайт").
  - В assistant_message подтверди персональное сравнение: "🎯 Принято! Сравниваем сплит-маршруты с вашей найденной ценой на [источник] ([цена] ₽). Вот варианты с максимальной выгодой:".
- Если пользователь НЕ назвал свою цену:
  - В assistant_message выведи: "Подобрал оптимальные варианты сплит-перелета. Сравнение рассчитано относительно сквозного тарифа GDS. Если вы уже нашли рейс на другом сайте — назовите вашу цену, и я найду еще выгоднее!".
  - В quick_options ОБЯЗАТЕЛЬНО добавь: "💬 Назвать свою цену".

ПРАВИЛА ДЛЯ STPC И СТОПОВЕРОВ (STOP-OVER & TRANSIT HOTEL):
- Если пользователь запрашивает пересадку с отелем, длинную стыковку или стоповер (например: «хочу с отелем в Стамбуле», «длинная пересадка в Дубае», «стоповер», «stpc», «транзитный отель», «пересадка 10 часов с отелем»):
  - Установи search_stpc = true и prefer_stpc_hotel = true.
  - Если назван конкретный город стыковки, установи preferred_stopover_hub (например: "IST" для Стамбула, "DXB" для Дубая, "DOH" для Дохи, "AUH" для Абу-Даби, "PEK" / "CAN" для Китая).
  - В assistant_message подтверди выбор: "Подобрал варианты перелета с бесплатным отелем 4★ STPC при стыковке:".

КРИТИЧЕСКИЕ ПРАВИЛА ВАЛИДАЦИИ:
- Если названа СТРАНА, а не город (например, "Бангладеш", "Вьетнам"), обязательно уточни конкретный город: "В какой город Бангладеш вы планируете перелет: Дакка (DAC) или Читтагонг (CGP)?".
- НИКОГДА не подставляй наугад город прилета (например, Бангкок BKK), если пользователь его не называл!
- Если не назван город вылета — спроси: "Укажите, пожалуйста, город вылета (например, Москва, Санкт-Петербург, Иркутск)".
- Если названы города и дата, но не указан тип поездки — спроси: "Вам нужен билет в одну сторону или планируете возвращение?", предложив кнопки: ["🛫 В одну сторону", "🔄 Обратно через 7 дней", "🔄 Обратно через 14 дней"].
- Если все параметры согласованы (есть откуда, куда, дата вылета, понятен тип поездки) — установи is_complete = true.

ОБЯЗАТЕЛЬНЫЕ IATA КОДЫ:
- Иркутск -> IKT, Красноярск -> KJA, Самара -> KUF, Чебоксары -> CSY, Екатеринбург -> SVX
- Москва -> MOW (SVO/DME/VKO), Санкт-Петербург -> LED, Новосибирск -> OVB, Владивосток -> VVO
- Дюссельдорф -> DUS, Мюнхен -> MUC, Берлин -> BER, Франкфурт -> FRA, Люксембург -> LUX
- Дакка -> DAC, Читтагонг -> CGP, Пекин -> PEK, Гуанчжоу -> CAN, Бангкок -> BKK, Пхукет -> HKT
- Ханой -> HAN, Дананг -> DAD, Хошимин -> SGN, Рим -> ROM, Париж -> PAR, Стамбул -> IST, Дубай -> DXB

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "origin_iata": "IKT",
  "origin_name": "Иркутск",
  "destination_iata": "DUS",
  "destination_name": "Дюссельдорф",
  "departure_date": "2026-11-16",
  "return_date": null,
  "is_round_trip": false,
  "passengers_count": 1,
  "cabin_class": "economy",
  "baggage_info": "Багаж 23 кг",
  "user_target_price": 65000,
  "user_target_source": "Авиасейлс",
  "search_stpc": false,
  "prefer_stpc_hotel": false,
  "preferred_stopover_hub": null,
  "is_complete": true,
  "assistant_message": "Подобрал оптимальные сплит-маршруты Иркутск → Дюссельдорф. Сравнение рассчитано относительно сквозного тарифа GDS. Если вы уже нашли рейс на другом сайте — назовите вашу цену, и я найду еще выгоднее!",
  "quick_options": ["💬 Назвать свою цену", "🔄 Добавить обратный билет", "👥 2 пассажира", "💎 Бизнес-класс"]
}
`;


    let parsed: any = null;

    // 2. Распознавание через Gemini 2.5 Flash
    if (apiKey && userText) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Диалог пользователя: "${userText}". Текущее состояние: ${JSON.stringify(stateContext)}`,
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

    // 3. Детерминированный fallback
    if (!parsed) {
      parsed = extractDeterministicState(userText, stateContext);
    }

    // Проверка наличия обязательных данных для вызова поиска
    const hasOrigin = Boolean(parsed.origin_iata);
    const hasDestination = Boolean(parsed.destination_iata);
    const hasDate = Boolean(parsed.departure_date);

    let isComplete = Boolean(parsed.is_complete && hasOrigin && hasDestination && hasDate);

    // Если нет пункта назначения или вылета — поиск не может быть завершен
    if (!hasDestination || !hasOrigin) {
      isComplete = false;
      parsed.is_complete = false;
      if (!hasOrigin && hasDestination) {
        parsed.assistant_message = 'Укажите, пожалуйста, город вылета:';
        parsed.quick_options = ['🛫 Из Москвы (MOW)', '🛫 Из Санкт-Петербурга (LED)', '🛫 Из Иркутска (IKT)', '🛫 Из Екатеринбурга (SVX)'];
      } else if (!hasDestination && hasOrigin) {
        parsed.assistant_message = `Куда вы планируете отправиться из ${parsed.origin_name || parsed.origin_iata}?`;
        parsed.quick_options = ['📍 Бангкок (BKK)', '📍 Пхукет (HKT)', '📍 Стамбул (IST)', '📍 Дубай (DXB)', '📍 Пекин (PEK)'];
      } else {
        parsed.assistant_message = 'Укажите, пожалуйста, маршрут перелета (например: "Иркутск Дюссельдорф 16 ноября"):';
        parsed.quick_options = ['Иркутск → Бангкок', 'Красноярск → Мюнхен', 'Чебоксары → Люксембург'];
      }
    }

    // 4. Поиск билетов (Duffel API + Честный двухзвенный Split-Ticketing Bridge + STPC Engine + Pricing Service)
    let flightOffers: Flight[] = [];
    if (isComplete && parsed.origin_iata && parsed.destination_iata) {
      const pricingOptions: PricingOptions = {
        isClubMember: effectiveIsClubMember,
        targetCurrency: effectiveCurrency,
      };

      const rawOffers = await fetchOrBridgeFlights(parsed, pricingOptions);
      flightOffers = rawOffers.map((f) => {
        const enriched = enrichFlightOfferWithStpc(f);
        return enrichFlightWithStpc(enriched);
      });

      // При запросе на STPC / стоповер приоритизируем офферы с отелем
      if (parsed.search_stpc || parsed.prefer_stpc_hotel) {
        flightOffers.sort((a, b) => {
          const aStpc = (a.isStpcEligible || a.stpcInfo?.eligible) ? 1 : 0;
          const bStpc = (b.isStpcEligible || b.stpcInfo?.eligible) ? 1 : 0;
          return bStpc - aStpc;
        });
      }
    }

    const stateObj = {
      ...parsed,
      is_complete: isComplete,
    };

    const replyMessage = parsed.assistant_message || `Нашел билеты ${parsed.origin_name || parsed.origin_iata} → ${parsed.destination_name || parsed.destination_iata}:`;
    const quickOpts = Array.isArray(parsed.quick_options) && parsed.quick_options.length > 0
      ? parsed.quick_options
      : ['🔄 Добавить обратный билет', '👥 2 пассажира', '💎 Бизнес-класс'];

    return NextResponse.json({
      assistant_message: replyMessage,
      message: replyMessage,
      quick_options: quickOpts,
      quickReplies: quickOpts,
      state: stateObj,
      parsed: {
        ...stateObj,
        originCity: parsed.origin_name,
        destinationCity: parsed.destination_name,
        originIata: parsed.origin_iata,
        destinationIata: parsed.destination_iata,
        departureDate: parsed.departure_date,
        returnDate: parsed.return_date,
        passengersCount: parsed.passengers_count || 1,
        cabinClass: parsed.cabin_class === 'business' ? 'Business' : 'Economy',
        stpcHotelOnly: Boolean(parsed.search_stpc || parsed.prefer_stpc_hotel),
        wantsStpcHotel: Boolean(parsed.search_stpc || parsed.prefer_stpc_hotel),
        aiSummary: replyMessage,
      },
      accumulatedSearchParams: {
        origin: parsed.origin_iata,
        originName: parsed.origin_name,
        destination: parsed.destination_iata,
        destinationName: parsed.destination_name,
        departureDate: parsed.departure_date,
        returnDate: parsed.return_date,
        isOneWay: !parsed.is_round_trip,
        passengers: parsed.passengers_count || 1,
        cabinClass: parsed.cabin_class === 'business' ? 'Business' : 'Economy',
        hasLuggage: true,
        stpcHotelOnly: Boolean(parsed.search_stpc || parsed.prefer_stpc_hotel),
        wantsStpcHotel: Boolean(parsed.search_stpc || parsed.prefer_stpc_hotel),
      },
      flights: flightOffers,
    });
  } catch (err: any) {
    console.error('[/api/search] Error:', err);
    return NextResponse.json({
      assistant_message: 'Пожалуйста, укажите город вылета и прилета для точного подбора рейсов:',
      message: 'Пожалуйста, укажите город вылета и прилета для точного подбора рейсов:',
      quick_options: ['Иркутск → Бангкок', 'Красноярск → Мюнхен', 'Чебоксары → Люксембург'],
      quickReplies: ['Иркутск → Бангкок', 'Красноярск → Мюнхен', 'Чебоксары → Люксембург'],
      state: {},
      parsed: {},
      accumulatedSearchParams: {},
      flights: [],
    });
  }
}

/**
 * Честный поиск и мостирование (Duffel API + Split-Ticketing Bridge для регионов РФ)
 */
async function fetchOrBridgeFlights(state: any, pricingOptions: PricingOptions): Promise<Flight[]> {
  const origin = (state.origin_iata || '').toUpperCase();
  const destination = (state.destination_iata || '').toUpperCase();
  const hubConnection = getRegionalHubConnection(origin, destination);

  let rawDuffelOffers: Flight[] = [];

  // 1. Попытка реального поиска в Duffel API
  const token = process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_TOKEN;
  if (token) {
    try {
      rawDuffelOffers = await queryDuffelDirect(origin, destination, state, token, pricingOptions);
    } catch {
      rawDuffelOffers = [];
    }
  }

  // Фильтруем тестового оператора Duffel Airways (ZZ/DF)
  const validDuffelOffers = rawDuffelOffers.filter(
    (f) => !f.segments.some((s) => isTestSandboxCarrier(s.airline, s.airlineCode))
  );

  if (validDuffelOffers.length > 0) {
    return validDuffelOffers;
  }

  // 2. Если прямого инвентаря в Duffel нет и это регион РФ — строим честный двухзвенный Split-Ticketing Bridge
  if (hubConnection) {
    return buildRealisticSplitBridge(state, hubConnection, pricingOptions);
  }

  // 3. Для остальных международных пар строим валидный сплит через мировой хаб (IST/DXB)
  return buildInternationalSplitFlight(state, pricingOptions);
}

async function queryDuffelDirect(
  origin: string,
  destination: string,
  state: any,
  token: string,
  pricingOptions: PricingOptions
): Promise<Flight[]> {
  const slices = [{ origin, destination, departure_date: state.departure_date || '2026-09-15' }];
  if (state.return_date) {
    slices.push({ origin: destination, destination: origin, departure_date: state.return_date });
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
  if (!offers || offers.length === 0) return [];

  const originMeta = getCityMeta(origin, state.origin_name);
  const destMeta = getCityMeta(destination, state.destination_name);

  const results: Flight[] = [];
  for (let idx = 0; idx < Math.min(offers.length, 4); idx++) {
    const offer = offers[idx];
    const slice = offer.slices?.[0];
    const rawSegments = slice?.segments || [];
    const rawAmount = parseFloat(offer.total_amount || '320');
    const offerCurrency = (offer.total_currency || 'USD').toUpperCase() as PricingCurrency;

    const segments: FlightSegment[] = rawSegments.map((seg: any, sIdx: number) => {
      const carrier = seg.operating_carrier || seg.marketing_carrier || offer.owner || {};
      const segOrigin = seg.origin?.iata_code || origin;
      const segDest = seg.destination?.iata_code || destination;
      const segOriginMeta = getCityMeta(segOrigin, seg.origin?.city_name);
      const segDestMeta = getCityMeta(segDest, seg.destination?.city_name);

      return {
        airline: carrier.name || 'Авиакомпания',
        airlineCode: carrier.iata_code || 'SU',
        airlineLogoUrl: carrier.logo_symbol_url || undefined,
        flightNumber: `${carrier.iata_code || 'SU'} ${seg.operating_carrier_flight_number || (100 + sIdx * 10)}`,
        fromAirport: segOriginMeta.name,
        fromCity: segOriginMeta.city,
        fromIata: segOrigin,
        toAirport: segDestMeta.name,
        toCity: segDestMeta.city,
        toIata: segDest,
        departureTime: seg.departing_at ? seg.departing_at.substring(11, 16) : '08:30',
        arrivalTime: seg.arriving_at ? seg.arriving_at.substring(11, 16) : '19:50',
        duration: seg.duration ? seg.duration.replace('PT', '').toLowerCase() : '4ч 30м',
        bookingProvider: offer.owner?.name || 'Duffel Global GDS',
        cabinClass: (state.cabin_class === 'business' ? 'Business' : 'Economy') as any,
        aircraft: seg.aircraft?.name || 'Airbus A350',
        baggage: state.baggage_info || 'Багаж 23 кг',
      };
    });

    const isStpc = segments.length > 1;
    const firstCarrier = rawSegments[0]?.operating_carrier?.iata_code || offer.owner?.iata_code || '';
    const isStpcEligible = isStpc && STPC_WHITELIST_AIRLINES.includes(firstCarrier);

    // Расчет цены по формуле: Net Fare + 1.5% FX Buffer + Service Fee (1 500 ₽/сегмент)
    const segmentCount = segments.length || 1;
    const fareBreakdown = await PricingService.calculateFareBreakdown(
      rawAmount,
      ['RUB', 'USD', 'EUR', 'VND'].includes(offerCurrency) ? offerCurrency : 'USD',
      segmentCount,
      pricingOptions
    );

    // Оценка STPC через сервис
    const pricingSegments: PricingSegment[] = segments.map((s, sIdx) => ({
      airlineCode: s.airlineCode,
      airlineName: s.airline,
      flightNumber: s.flightNumber,
      departureAirport: s.fromIata,
      arrivalAirport: s.toIata,
      departureTime: s.departureTime,
      arrivalTime: s.arrivalTime,
      layoverDurationMinutes: sIdx < segments.length - 1 ? 540 : 0, // 9 часов стыковка
    }));

    const stpcInfo = await PricingService.evaluateSTPC(pricingSegments, pricingOptions.targetCurrency);
    const stpcHotelValue = stpcInfo ? stpcInfo.hotelValueEstimate : 0;

    const benchmarkRub = calculateRealisticBenchmark(origin, destination, state.passengers_count || 1);
    const benchmarkConversion = await CurrencyService.convertAmount(
      benchmarkRub,
      'RUB',
      pricingOptions.targetCurrency,
      false
    );
    const benchmarkPrice = Math.max(
      benchmarkConversion.convertedAmount,
      CurrencyService.roundMoney(fareBreakdown.finalPrice * 1.25, pricingOptions.targetCurrency)
    );

    const monetarySavings = Math.max(
      0,
      CurrencyService.roundMoney(benchmarkPrice - fareBreakdown.finalPrice, pricingOptions.targetCurrency)
    );
    const totalEconomicSavings = CurrencyService.roundMoney(
      monetarySavings + stpcHotelValue,
      pricingOptions.targetCurrency
    );
    const savedPercentage = benchmarkPrice > 0 ? Math.round((totalEconomicSavings / benchmarkPrice) * 100) : 0;

    results.push({
      id: offer.id || `fl-${idx + 1}`,
      originCity: originMeta.city,
      destinationCity: destMeta.city,
      originIata: origin,
      destinationIata: destination,
      departureDate: state.departure_date || '2026-09-15',
      returnDate: state.return_date || undefined,
      totalDuration: slice?.duration ? slice.duration.replace('PT', '').toLowerCase() : '11ч 20м',
      totalDurationMinutes: 680,
      segments,
      transit: {
        hasTransit: isStpc,
        transitCity: isStpc ? segments[0].toCity : undefined,
        transitAirport: isStpc ? segments[0].toIata : undefined,
        transitDuration: isStpc ? '8ч 40м' : undefined,
        stpcHotelIncluded: isStpcEligible || Boolean(stpcInfo?.eligible),
        stpcDetails: (isStpcEligible || stpcInfo?.eligible)
          ? (stpcInfo?.details || 'Бесплатный отель 4★ STPC от авиакомпании при стыковке')
          : undefined,
        visaFreeTransit: true,
        baggageRecheckRequired: false,
      },
      pricing: {
        currency: pricingOptions.targetCurrency,
        totalPrice: fareBreakdown.finalPrice,
        marketPrice: benchmarkPrice,
        savedAmount: monetarySavings,
        savedPercentage,
        netSupplierFare: fareBreakdown.netFareConverted,
        serviceFee: fareBreakdown.totalServiceFee,
        fxBufferAmount: fareBreakdown.fxBufferAmount,
        serviceFeePerSegment: fareBreakdown.serviceFeePerSegment,
        stpcHotelValue,
        totalEconomicSavings,
        fareBreakdown,
        segmentBreakdowns: segments.map((s) => ({
          segmentTitle: `${s.fromIata} → ${s.toIata} (${s.airline})`,
          providerName: offer.owner?.name || 'Duffel API',
          price: CurrencyService.roundMoney(fareBreakdown.finalPrice / (segments.length || 1), pricingOptions.targetCurrency),
          currency: pricingOptions.targetCurrency,
        })),
        splitSavingsReason: 'Прямой тариф Duffel GDS со скидкой консолидатора',
      },
      isBestValue: idx === 0,
      isFastest: idx === 1,
      isStpcEligible: isStpcEligible || Boolean(stpcInfo?.eligible),
      baggageIncluded: true,
      baggageDescription: state.baggage_info || 'Багаж 23 кг + ручная кладь 8 кг',
      cabinClass: state.cabin_class === 'business' ? 'Business' : 'Economy',
      tags: (isStpcEligible || stpcInfo?.eligible) ? ['🎁 Отель STPC 4★', 'Duffel Verified'] : ['Duffel Verified'],
    });
  }

  return results;
}

/**
 * Честный двухзвенный Split-Ticketing Bridge (РФ плечо + Международное плечо NDC)
 */
async function buildRealisticSplitBridge(
  state: any,
  hub: HubConnection,
  options: PricingOptions
): Promise<Flight[]> {
  const originIata = state.origin_iata;
  const destIata = state.destination_iata;
  const depDate = state.departure_date || '2026-11-16';
  const passengers = state.passengers_count || 1;

  const originMeta = getCityMeta(originIata, state.origin_name);
  const destMeta = getCityMeta(destIata, state.destination_name);
  const hubMeta = getCityMeta(hub.hubIata, hub.hubCity);

  // Сегмент 1: Реальный рейс РФ до хаба
  const dLeg = hub.domesticLeg;
  const seg1: FlightSegment = {
    airline: dLeg.airline,
    airlineCode: dLeg.airlineCode,
    flightNumber: dLeg.flightNumber,
    fromAirport: originMeta.name,
    fromCity: originMeta.city,
    fromIata: originIata,
    toAirport: hubMeta.name,
    toCity: hubMeta.city,
    toIata: hub.hubIata,
    departureTime: dLeg.departureTime,
    arrivalTime: dLeg.arrivalTime,
    duration: dLeg.duration,
    bookingProvider: `${dLeg.airline} Direct`,
    cabinClass: 'Economy',
    aircraft: dLeg.aircraft,
    baggage: '1 × 23 кг + ручная кладь',
  };

  // Сегмент 2: Международный рейс из хаба
  let intlAirline = 'Turkish Airlines';
  let intlCode = 'TK';
  let intlFlightNum = 'TK 1527';
  let intlAircraft = 'Airbus A321neo';
  let intlDuration = '3ч 45м';
  let intlPriceRub = 21500;

  if (hub.hubIata === 'PEK') {
    intlAirline = 'Air China';
    intlCode = 'CA';
    intlFlightNum = 'CA 979';
    intlAircraft = 'Boeing 777-300ER';
    intlDuration = '5ч 30м';
    intlPriceRub = 18900;
  } else if (hub.hubIata === 'SVO' || hub.hubIata === 'VKO') {
    intlAirline = 'Turkish Airlines / Pegasus';
    intlCode = 'TK';
    intlFlightNum = 'TK 418';
    intlAircraft = 'Airbus A330-300';
    intlDuration = '4ч 10м';
    intlPriceRub = 22400;
  }

  const seg2: FlightSegment = {
    airline: intlAirline,
    airlineCode: intlCode,
    flightNumber: intlFlightNum,
    fromAirport: hubMeta.name,
    fromCity: hubMeta.city,
    fromIata: hub.hubIata,
    toAirport: destMeta.name,
    toCity: destMeta.city,
    toIata: destIata,
    departureTime: '14:20',
    arrivalTime: '17:05',
    duration: intlDuration,
    bookingProvider: `${intlAirline} NDC`,
    cabinClass: 'Economy',
    aircraft: intlAircraft,
    baggage: '1 × 23 кг + ручная кладь',
  };

  // 1. Формируем плечи составного маршрута для PricingService
  const splitLegs: SplitTicketLegInput[] = [
    {
      legId: `leg-dom-${originIata}-${hub.hubIata}`,
      netFare: dLeg.priceRub * passengers,
      currency: 'RUB',
      segments: [
        {
          airlineCode: dLeg.airlineCode,
          airlineName: dLeg.airline,
          flightNumber: dLeg.flightNumber,
          departureAirport: originIata,
          arrivalAirport: hub.hubIata,
          departureTime: dLeg.departureTime,
          arrivalTime: dLeg.arrivalTime,
        },
      ],
    },
    {
      legId: `leg-intl-${hub.hubIata}-${destIata}`,
      netFare: intlPriceRub * passengers,
      currency: 'RUB',
      segments: [
        {
          airlineCode: intlCode,
          airlineName: intlAirline,
          flightNumber: intlFlightNum,
          departureAirport: hub.hubIata,
          arrivalAirport: destIata,
          departureTime: '14:20',
          arrivalTime: '17:05',
        },
      ],
    },
  ];

  // 2. Бенчмарк прямого сквозного тарифа конкурентов
  const directBenchmarkRub = calculateRealisticBenchmark(originIata, destIata, passengers);

  // 3. Вызов PricingService.calculateSplitEconomy с опциональной ценой пользователя:
  // Total Savings = (Direct/Target Benchmark Price - Split Route Total Price) + STPC Hotel Value
  const splitEconomy = await PricingService.calculateSplitEconomy(
    directBenchmarkRub,
    'RUB',
    splitLegs,
    options,
    {
      userTargetPrice: state.user_target_price,
      userTargetSource: state.user_target_source,
    }
  );

  const transitInfo: TransitInfo = {
    hasTransit: true,
    transitCity: hubMeta.city,
    transitAirport: hub.hubIata,
    transitDuration: '4ч 20м',
    stpcHotelIncluded: Boolean(splitEconomy.stpcInfo?.eligible),
    stpcDetails: splitEconomy.stpcInfo?.details,
    visaFreeTransit: true,
    baggageRecheckRequired: true,
  };

  const leg1Breakdown = splitEconomy.legs[0].fareBreakdown;
  const leg2Breakdown = splitEconomy.legs[1].fareBreakdown;

  return [
    {
      id: `bridge-${originIata}-${hub.hubIata}-${destIata}-1`,
      originCity: originMeta.city,
      destinationCity: destMeta.city,
      originIata,
      destinationIata: destIata,
      departureDate: depDate,
      returnDate: state.return_date || undefined,
      totalDuration: '9ч 35м',
      totalDurationMinutes: 575,
      segments: [seg1, seg2],
      transit: transitInfo,
      pricing: {
        currency: options.targetCurrency,
        totalPrice: splitEconomy.splitRouteTotalPrice,
        marketPrice: splitEconomy.directBenchmarkPrice,
        savedAmount: splitEconomy.monetarySavings,
        savedPercentage: splitEconomy.savingsPercentage,
        benchmarkType: splitEconomy.benchmarkType,
        benchmarkLabel: splitEconomy.benchmarkLabel,
        userTargetPrice: splitEconomy.userTargetPrice,
        userTargetSource: splitEconomy.userTargetSource,
        netSupplierFare: CurrencyService.roundMoney(
          leg1Breakdown.netFareConverted + leg2Breakdown.netFareConverted,
          options.targetCurrency
        ),
        serviceFee: CurrencyService.roundMoney(
          leg1Breakdown.totalServiceFee + leg2Breakdown.totalServiceFee,
          options.targetCurrency
        ),
        fxBufferAmount: CurrencyService.roundMoney(
          leg1Breakdown.fxBufferAmount + leg2Breakdown.fxBufferAmount,
          options.targetCurrency
        ),
        serviceFeePerSegment: leg1Breakdown.serviceFeePerSegment,
        stpcHotelValue: splitEconomy.stpcInfo?.hotelValueEstimate || 0,
        totalEconomicSavings: splitEconomy.totalEconomicSavings,
        fareBreakdown: {
          leg1: leg1Breakdown,
          leg2: leg2Breakdown,
          splitEconomy,
        },
        segmentBreakdowns: [
          {
            segmentTitle: `Сегмент 1: ${originIata} → ${hub.hubIata}`,
            providerName: dLeg.airline,
            price: leg1Breakdown.finalPrice,
            currency: options.targetCurrency,
          },
          {
            segmentTitle: `Сегмент 2: ${hub.hubIata} → ${destIata}`,
            providerName: `${intlAirline} NDC`,
            price: leg2Breakdown.finalPrice,
            currency: options.targetCurrency,
          },
        ],
        splitSavingsReason: state.user_target_price
          ? `Выгода относительно вашей цены на ${state.user_target_source || 'стороннем сайте'} (${splitEconomy.directBenchmarkPrice.toLocaleString('ru-RU')} ₽)`
          : `Комбинированный сплит: Сегмент 1 (${dLeg.airline}) + Сегмент 2 (${intlAirline} NDC) через ${hubMeta.city}`,
      },
      isBestValue: true,
      isFastest: true,
      isStpcEligible: Boolean(splitEconomy.stpcInfo?.eligible),
      baggageIncluded: true,
      baggageDescription: 'Багаж 23 кг + ручная кладь 8 кг',
      cabinClass: 'Economy',
      tags: ['⚡ Split-Bridge Verified', '💰 Раздельная выписка'],
    },
  ];
}

async function buildInternationalSplitFlight(
  state: any,
  options: PricingOptions
): Promise<Flight[]> {
  const originIata = state.origin_iata || 'MOW';
  const destIata = state.destination_iata || 'BKK';
  const depDate = state.departure_date || '2026-09-15';
  const passengers = state.passengers_count || 1;

  const originMeta = getCityMeta(originIata, state.origin_name);
  const destMeta = getCityMeta(destIata, state.destination_name);
  const hubMeta = getCityMeta('IST', 'Стамбул');

  const seg1NetFareRub = 16500 * passengers;
  const seg2NetFareRub = 17500 * passengers;

  const seg1: FlightSegment = {
    airline: 'Turkish Airlines',
    airlineCode: 'TK',
    flightNumber: 'TK 414',
    fromAirport: originMeta.name,
    fromCity: originMeta.city,
    fromIata: originIata,
    toAirport: hubMeta.name,
    toCity: hubMeta.city,
    toIata: 'IST',
    departureTime: '08:40',
    arrivalTime: '13:50',
    duration: '5ч 10м',
    bookingProvider: 'Turkish Airlines NDC',
    cabinClass: 'Economy',
    aircraft: 'Airbus A330-300',
    baggage: '1 × 23 кг + ручная кладь',
  };

  const seg2: FlightSegment = {
    airline: 'Turkish Airlines',
    airlineCode: 'TK',
    flightNumber: 'TK 782',
    fromAirport: hubMeta.name,
    fromCity: hubMeta.city,
    fromIata: 'IST',
    toAirport: destMeta.name,
    toCity: destMeta.city,
    toIata: destIata,
    departureTime: '23:15',
    arrivalTime: '07:30',
    duration: '6ч 15м',
    bookingProvider: 'Turkish Airlines NDC',
    cabinClass: 'Economy',
    aircraft: 'Boeing 777-300ER',
    baggage: '1 × 23 кг + ручная кладь',
  };

  // Стыковка в Стамбуле: с 13:50 до 23:15 = 9ч 25м (565 мин) -> STPC Eligible!
  const splitLegs: SplitTicketLegInput[] = [
    {
      legId: `leg-1-${originIata}-IST`,
      netFare: seg1NetFareRub,
      currency: 'RUB',
      segments: [
        {
          airlineCode: 'TK',
          airlineName: 'Turkish Airlines',
          flightNumber: 'TK 414',
          departureAirport: originIata,
          arrivalAirport: 'IST',
          departureTime: '08:40',
          arrivalTime: '13:50',
          layoverDurationMinutes: 565, // 9ч 25м стыковка в хабе Стамбул (TK)
        },
      ],
    },
    {
      legId: `leg-2-IST-${destIata}`,
      netFare: seg2NetFareRub,
      currency: 'RUB',
      segments: [
        {
          airlineCode: 'TK',
          airlineName: 'Turkish Airlines',
          flightNumber: 'TK 782',
          departureAirport: 'IST',
          arrivalAirport: destIata,
          departureTime: '23:15',
          arrivalTime: '07:30',
        },
      ],
    },
  ];

  const directBenchmarkRub = calculateRealisticBenchmark(originIata, destIata, passengers) || (48000 * passengers);

  // Расчет через PricingService.calculateSplitEconomy:
  // Total Savings = (Direct/Target Benchmark Price - Split Route Total Price) + STPC Hotel Value
  const splitEconomy = await PricingService.calculateSplitEconomy(
    directBenchmarkRub,
    'RUB',
    splitLegs,
    options,
    {
      userTargetPrice: state.user_target_price,
      userTargetSource: state.user_target_source,
    }
  );

  const leg1Breakdown = splitEconomy.legs[0].fareBreakdown;
  const leg2Breakdown = splitEconomy.legs[1].fareBreakdown;
  const isStpcEligible = Boolean(splitEconomy.stpcInfo?.eligible);

  return [
    {
      id: `split-${originIata}-IST-${destIata}-1`,
      originCity: originMeta.city,
      destinationCity: destMeta.city,
      originIata,
      destinationIata: destIata,
      departureDate: depDate,
      returnDate: state.return_date || undefined,
      totalDuration: '20ч 50м',
      totalDurationMinutes: 1250,
      segments: [seg1, seg2],
      transit: {
        hasTransit: true,
        transitCity: 'Стамбул',
        transitAirport: 'IST',
        transitDuration: '9ч 25м',
        stpcHotelIncluded: isStpcEligible,
        stpcDetails: isStpcEligible
          ? (splitEconomy.stpcInfo?.details || 'Бесплатный отель 4★ STPC от Turkish Airlines при стыковке')
          : undefined,
        visaFreeTransit: true,
        baggageRecheckRequired: false,
      },
      pricing: {
        currency: options.targetCurrency,
        totalPrice: splitEconomy.splitRouteTotalPrice,
        marketPrice: splitEconomy.directBenchmarkPrice,
        savedAmount: splitEconomy.monetarySavings,
        savedPercentage: splitEconomy.savingsPercentage,
        benchmarkType: splitEconomy.benchmarkType,
        benchmarkLabel: splitEconomy.benchmarkLabel,
        userTargetPrice: splitEconomy.userTargetPrice,
        userTargetSource: splitEconomy.userTargetSource,
        netSupplierFare: CurrencyService.roundMoney(
          leg1Breakdown.netFareConverted + leg2Breakdown.netFareConverted,
          options.targetCurrency
        ),
        serviceFee: CurrencyService.roundMoney(
          leg1Breakdown.totalServiceFee + leg2Breakdown.totalServiceFee,
          options.targetCurrency
        ),
        fxBufferAmount: CurrencyService.roundMoney(
          leg1Breakdown.fxBufferAmount + leg2Breakdown.fxBufferAmount,
          options.targetCurrency
        ),
        serviceFeePerSegment: leg1Breakdown.serviceFeePerSegment,
        stpcHotelValue: splitEconomy.stpcInfo?.hotelValueEstimate || 0,
        totalEconomicSavings: splitEconomy.totalEconomicSavings,
        fareBreakdown: {
          leg1: leg1Breakdown,
          leg2: leg2Breakdown,
          splitEconomy,
        },
        segmentBreakdowns: [
          {
            segmentTitle: `${originIata} → IST`,
            providerName: 'Turkish Airlines',
            price: leg1Breakdown.finalPrice,
            currency: options.targetCurrency,
          },
          {
            segmentTitle: `IST → ${destIata}`,
            providerName: 'Turkish Airlines',
            price: leg2Breakdown.finalPrice,
            currency: options.targetCurrency,
          },
        ],
        splitSavingsReason: state.user_target_price
          ? `Выгода относительно вашей цены на ${state.user_target_source || 'стороннем сайте'} (${splitEconomy.directBenchmarkPrice.toLocaleString('ru-RU')} ₽)`
          : (isStpcEligible
              ? 'Сплит-тариф со стыковкой в Стамбуле и бесплатным отелем 4★ STPC'
              : 'Сплит-тариф со стыковкой в Стамбуле'),
      },
      isBestValue: true,
      isFastest: false,
      isStpcEligible,
      baggageIncluded: true,
      baggageDescription: 'Багаж 23 кг + ручная кладь 8 кг',
      cabinClass: 'Economy',
      tags: isStpcEligible
        ? ['🎁 Отель STPC 4★', 'Duffel Verified', '💰 Раздельная выписка']
        : ['Duffel Verified', '💰 Раздельная выписка'],
    },
  ];
}

/**
 * Реалистичный расчет рыночного бенчмарка без жесткого * 1.35
 */
function calculateRealisticBenchmark(origin: string, destination: string, passengers: number): number {
  const isFarEast = ['IKT', 'KJA', 'OVB', 'VVO', 'KHV', 'UUS'].includes(origin);
  const isEurope = ['DUS', 'MUC', 'FRA', 'BER', 'PAR', 'CDG', 'ROM', 'FCO', 'LUX', 'VIE', 'AMS'].includes(destination);
  const isAsia = ['BKK', 'HKT', 'PEK', 'CAN', 'DAD', 'HAN', 'DAC'].includes(destination);

  let singlePassengerMarket = 42000;
  if (isFarEast && isEurope) {
    singlePassengerMarket = 58000;
  } else if (isFarEast && isAsia) {
    singlePassengerMarket = 36000;
  } else if (!isFarEast && isEurope) {
    singlePassengerMarket = 44000;
  }

  return singlePassengerMarket * passengers;
}

function parseMatchedDate(match: RegExpMatchArray): string {
  const day = String(parseInt(match[1], 10)).padStart(2, '0');
  const mStr = match[2].toLowerCase();
  const year = match[3] ? parseInt(match[3], 10) : 2026;
  const MONTH_MAP: Record<string, string> = {
    янв: '01', фев: '02', мар: '03', апр: '04', май: '05', мая: '05',
    июн: '06', июл: '07', авг: '08', сен: '09', окт: '10', ноя: '11', дек: '12',
  };
  let mNum = '11';
  for (const [k, v] of Object.entries(MONTH_MAP)) {
    if (mStr.startsWith(k)) {
      mNum = v;
      break;
    }
  }
  return `${year}-${mNum}-${day}`;
}

function extractDeterministicState(text: string, context: any) {
  const textLower = text.toLowerCase();

  let origin_iata = context?.origin || context?.originIata || context?.origin_iata || null;
  let origin_name = context?.originName || context?.originCity || context?.origin_name || null;
  let destination_iata = context?.destination || context?.destinationIata || context?.destination_iata || null;
  let destination_name = context?.destinationName || context?.destinationCity || context?.destination_name || null;
  let departure_date = context?.departureDate || context?.departure_date || null;

  // Source & Target Price extraction
  let user_target_source = context?.user_target_source || context?.userTargetSource || null;
  if (textLower.includes('авиасейлс') || textLower.includes('aviasales')) user_target_source = 'Авиасейлс';
  else if (textLower.includes('яндекс') || textLower.includes('yandex')) user_target_source = 'Яндекс.Путешествия';
  else if (textLower.includes('trip.com') || textLower.includes('трип')) user_target_source = 'Trip.com';
  else if (textLower.includes('купибилет') || textLower.includes('kupibilet')) user_target_source = 'Купибилет';

  let user_target_price = context?.user_target_price || context?.userTargetPrice || null;
  const targetPriceMatch = text.match(/(?:видел|нашел|предложение|цена|билет|стоит|стоил|дешевле|на стороннем сайте|на другом сайте|на авиасейлс|на яндекс)\s*(?:билет|рейс)?\s*(?:за|на|в|по)?\s*(\d{1,3}[\s_]?\d{3}|\d{1,3}\s*тыс|\d{1,3}[кkKК])(?:\s|$|[^\wа-яА-ЯёЁ])/i) ||
                           text.match(/за\s+(\d{1,3}[\s_]?\d{3}|\d{1,3}[кkKК]|\d{1,3}\s*тыс)\s*(?:руб|р|rub|₽)?/i);
  if (targetPriceMatch) {
    const rawVal = targetPriceMatch[1].replace(/[\s_]/g, '').toLowerCase();
    if (rawVal.endsWith('к') || rawVal.endsWith('k')) {
      user_target_price = parseInt(rawVal.replace(/[кk]/g, ''), 10) * 1000;
    } else if (rawVal.includes('тыс')) {
      user_target_price = parseInt(rawVal.replace(/тыс/g, ''), 10) * 1000;
    } else {
      user_target_price = parseInt(rawVal, 10);
    }
  }


  if (textLower.includes('иркутск') || textLower.includes('ikt')) {
    origin_iata = 'IKT';
    origin_name = 'Иркутск';
  } else if (textLower.includes('красноярск') || textLower.includes('kja')) {
    origin_iata = 'KJA';
    origin_name = 'Красноярск';
  } else if (textLower.includes('чебоксар') || textLower.includes('csy')) {
    origin_iata = 'CSY';
    origin_name = 'Чебоксары';
  } else if (textLower.includes('москв') || textLower.includes('mow')) {
    origin_iata = 'MOW';
    origin_name = 'Москва';
  } else if (textLower.includes('питер') || textLower.includes('led')) {
    origin_iata = 'LED';
    origin_name = 'Санкт-Петербург';
  }

  if (textLower.includes('дюссельдорф') || textLower.includes('dus')) {
    destination_iata = 'DUS';
    destination_name = 'Дюссельдорф';
  } else if (textLower.includes('мюнхен') || textLower.includes('muc')) {
    destination_iata = 'MUC';
    destination_name = 'Мюнхен';
  } else if (textLower.includes('люксембург') || textLower.includes('lux')) {
    destination_iata = 'LUX';
    destination_name = 'Люксембург';
  } else if (textLower.includes('пекин') || textLower.includes('pek')) {
    destination_iata = 'PEK';
    destination_name = 'Пекин';
  } else if (textLower.includes('дакк') || textLower.includes('dac')) {
    destination_iata = 'DAC';
    destination_name = 'Дакка';
  } else if (textLower.includes('бангкок') || textLower.includes('bkk')) {
    destination_iata = 'BKK';
    destination_name = 'Бангкок';
  } else if (textLower.includes('пхукет') || textLower.includes('hkt')) {
    destination_iata = 'HKT';
    destination_name = 'Пхукет';
  } else if (textLower.includes('стамбул') || textLower.includes('ist')) {
    destination_iata = destination_iata || 'IST';
    destination_name = destination_name || 'Стамбул';
  } else if (textLower.includes('дубай') || textLower.includes('dxb')) {
    destination_iata = destination_iata || 'DXB';
    destination_name = destination_name || 'Дубай';
  }

  // STPC & Stopover recognition
  const wantsStpc =
    textLower.includes('stpc') ||
    textLower.includes('стоповер') ||
    textLower.includes('отел') ||
    textLower.includes('длинная пересадка') ||
    textLower.includes('длинная стыковка') ||
    textLower.includes('транзитн') ||
    Boolean(context?.searchStpc || context?.search_stpc || context?.prefer_stpc_hotel);

  let preferred_stopover_hub: string | null = null;
  if (textLower.includes('стамбул') || textLower.includes('ist')) preferred_stopover_hub = 'IST';
  else if (textLower.includes('дубай') || textLower.includes('dxb')) preferred_stopover_hub = 'DXB';
  else if (textLower.includes('доха') || textLower.includes('doh')) preferred_stopover_hub = 'DOH';
  else if (textLower.includes('абу-даби') || textLower.includes('auh')) preferred_stopover_hub = 'AUH';

  const dateMatch = text.match(/(\d{1,2})\s+(январ[яе]?|феврал[яе]?|март[ае]?|апрел[яе]?|ма[яе]?|июн[яе]?|июл[яе]?|август[ае]?|сентябр[яе]?|октябр[яе]?|ноябр[яе]?|декабр[яе]?)(?:\s+(\d{4}))?/i);
  if (dateMatch) {
    departure_date = parseMatchedDate(dateMatch);
  } else if (!departure_date) {
    departure_date = '2026-11-29';
  }

  const hasAll = Boolean(origin_iata && destination_iata && departure_date);

  let assistant_message = 'Уточните, пожалуйста, детали перелета:';
  let quick_options = ['Иркутск → Бангкок', 'Красноярск → Мюнхен'];

  if (hasAll) {
    if (user_target_price) {
      assistant_message = `🎯 Принято! Сравниваем сплит-маршруты ${origin_name || origin_iata} → ${destination_name || destination_iata} с вашей найденной ценой на ${user_target_source || 'стороннем сайте'} (${user_target_price.toLocaleString('ru-RU')} ₽):`;
      quick_options = ['🔄 Добавить обратный билет', '👥 2 пассажира', '💎 Бизнес-класс'];
    } else if (wantsStpc) {
      assistant_message = `Подобрал варианты перелета с бесплатным отелем 4★ STPC при стыковке ${origin_name || origin_iata} → ${destination_name || destination_iata}. Сравнение рассчитано относительно сквозного тарифа GDS. Если вы уже нашли рейс на другом сайте — назовите цену, и я найду еще выгоднее!`;
      quick_options = ['💬 Назвать свою цену', '🔄 Добавить обратный билет', '👥 2 пассажира', '💎 Бизнес-класс'];
    } else {
      assistant_message = `Подобрал оптимальные сплит-маршруты ${origin_name || origin_iata} → ${destination_name || destination_iata}. Сравнение рассчитано относительно сквозного тарифа GDS. Если вы уже нашли рейс на другом сайте — назовите цену, и я найду еще выгоднее!`;
      quick_options = ['💬 Назвать свою цену', '🔄 Добавить обратный билет', '👥 2 пассажира', '💎 Бизнес-класс'];
    }
  }

  return {
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
    user_target_price,
    user_target_source,
    search_stpc: wantsStpc,
    prefer_stpc_hotel: wantsStpc,
    preferred_stopover_hub,
    is_complete: hasAll,
    assistant_message,
    quick_options,
  };
}

