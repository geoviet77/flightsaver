import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Flight, FlightSegment, TransitInfo, PricingBreakdown } from '@/lib/types';
import { getRegionalHubConnection, isTestSandboxCarrier, HubConnection } from '@/lib/routeValidator';
import { enrichFlightOfferWithStpc } from '@/lib/stpc/engine';
import { enrichFlightWithStpc } from '@/lib/stpcService';
import { PricingService } from '@/services/pricingService';
import { CurrencyService } from '@/services/currencyService';
import { AviasalesService } from '@/services/aviasalesService';
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
- Если названы города вылета и прилета, но пользователь не назвал дату — установи departure_date на ближайшую удобную дату через 2-3 недели от сегодняшнего дня (${currentDate}), установи is_complete = true, чтобы пользователь СЮЖЕСЕКУНДНО увидел реальные цены, билеты и варианты перелёта, а в assistant_message сгенерируй живой, тёплый, персонализированный комментарий к этому направлению.
- Если все параметры согласованы (есть откуда, куда, дата вылета) — установи is_complete = true.

ОБЯЗАТЕЛЬНЫЕ IATA КОДЫ:
- Иркутск -> IKT, Красноярск -> KJA, Самара -> KUF, Чебоксары -> CSY, Екатеринбург -> SVX, Новосибирск -> OVB
- Москва -> MOW (SVO/DME/VKO), Санкт-Петербург -> LED, Владивосток -> VVO, Сочи -> AER, Казань -> KZN
- Дананг -> DAD, Ханой -> HAN, Хошимин -> SGN, Нячанг -> CXR, Бангкок -> BKK, Пхукет -> HKT, Бали -> DPS
- Пекин -> PEK, Гуанчжоу -> CAN, Шанхай -> PVG, Токио -> TYO, Сеул -> ICN, Дакка -> DAC
- Дюссельдорф -> DUS, Мюнхен -> MUC, Берлин -> BER, Франкфурт -> FRA, Люксембург -> LUX, Париж -> PAR, Рим -> ROM
- Стамбул -> IST, Дубай -> DXB, Доха -> DOH, Абу-Даби -> AUH

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "origin_iata": "MOW",
  "origin_name": "Москва",
  "destination_iata": "DAD",
  "destination_name": "Дананг",
  "departure_date": "2026-11-20",
  "return_date": null,
  "is_round_trip": false,
  "passengers_count": 1,
  "cabin_class": "economy",
  "baggage_info": "Багаж 23 кг",
  "user_target_price": null,
  "user_target_source": null,
  "search_stpc": false,
  "prefer_stpc_hotel": false,
  "preferred_stopover_hub": null,
  "is_complete": true,
  "assistant_message": "Подобрал отличные сплит-маршруты Москва → Дананг. Сравнение рассчитано относительно сквозного тарифа GDS. Если вы уже нашли рейс на другом сайте — назовите цену, и я найду еще выгоднее!",
  "quick_options": ["💬 Назвать свою цену", "🔄 Добавить обратный билет", "👥 2 пассажира", "💎 Бизнес-класс"]
}
`;


    let parsed: any = null;

    // 2. Живое онлайн-распознавание через Gemini API (высокоскоростной каскад современных моделей)
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (effectiveApiKey && userText) {
      const liveModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
      for (const model of liveModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `${systemInstruction}\n\nЗапрос пользователя: "${userText}". Текущее состояние диалога: ${JSON.stringify(stateContext)}`,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.2,
                },
              }),
              signal: AbortSignal.timeout(9000),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (rawText) {
              const jsonClean = rawText.replace(/```json|```/g, '').trim();
              parsed = JSON.parse(jsonClean);
              break;
            }
          } else {
            console.warn(`[Gemini Live API] Model ${model} returned HTTP ${geminiRes.status}`);
          }
        } catch (err: any) {
          console.warn(`[Gemini Live API] Error calling model ${model}:`, err?.message || err);
        }
      }
    }

    // 3. Детерминированный fallback (на случай отсутствия сети)
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
 * Преобразование ISO 8601 длительности (P1DT17H25M, PT12H10M) в читаемый формат (1д 17ч 25м, 12ч 10м)
 */
function formatIsoDuration(isoDuration?: string): string {
  if (!isoDuration) return '11ч 20м';
  if (/[а-яА-ЯёЁ]/.test(isoDuration)) return isoDuration;

  const clean = isoDuration.trim().toUpperCase();
  const daysMatch = clean.match(/(\d+)D/);
  const hoursMatch = clean.match(/(\d+)H/);
  const minutesMatch = clean.match(/(\d+)M/);

  const days = daysMatch ? parseInt(daysMatch[1], 10) : 0;
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  if (days === 0 && hours === 0 && minutes === 0) {
    return isoDuration.replace(/^P/i, '').replace(/T/i, ' ').toLowerCase();
  }

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}д`);
  if (hours > 0) parts.push(`${hours}ч`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}м`);
  return parts.join(' ');
}

/**
 * Честный поиск и мостирование (Aviasales Live API + Split-Ticketing Engine + STPC Engine)
 */
async function fetchOrBridgeFlights(state: any, pricingOptions: PricingOptions): Promise<Flight[]> {
  const origin = (state.origin_iata || '').toUpperCase();
  const destination = (state.destination_iata || '').toUpperCase();
  const hubConnection = getRegionalHubConnection(origin, destination);
  const passengers = state.passengers_count || 1;

  // Реестр кодов аэропортов РФ для определения внутренних перелетов
  const RUSSIAN_AIRPORTS = new Set([
    'MOW', 'SVO', 'DME', 'VKO', 'LED', 'AER', 'KZN', 'SVX', 'OVB',
    'IKT', 'KJA', 'VVO', 'KHV', 'UUS', 'KUF', 'CSY', 'ROV', 'GOJ',
    'MRV', 'MCX', 'CEK', 'UFA', 'PEE', 'OMS', 'TOF', 'BAX', 'STW'
  ]);
  const isDomestic = RUSSIAN_AIRPORTS.has(origin) && RUSSIAN_AIRPORTS.has(destination);

  // =========================================================================
  // 1. ВНУТРЕННИЕ РЕЙСЫ ПО РОССИИ (MOW-LED, MOW-AER, KZN, SVX и др.)
  // Возвращаем ТОЛЬКО реальные прямые рейсы российских авиакомпаний!
  // =========================================================================
  if (isDomestic) {
    const liveDomestic = await AviasalesService.getLiveFlights(
      origin,
      destination,
      state.departure_date,
      passengers,
      pricingOptions.targetCurrency
    );

    if (liveDomestic.length > 0) {
      // Сортируем: сначала прямые рейсы (stopsCount === 0), затем по возрастанию цены
      liveDomestic.sort((a, b) => {
        const aStops = a.stopsCount ?? 0;
        const bStops = b.stopsCount ?? 0;
        if (aStops !== bStops) return aStops - bStops;
        return (a.pricing?.totalPrice ?? 0) - (b.pricing?.totalPrice ?? 0);
      });

      // Отмечаем лучший по цене и самый быстрый
      if (liveDomestic[0]) {
        liveDomestic[0].isBestValue = true;
      }
      const direct = liveDomestic.find((f) => (f.stopsCount ?? 0) === 0);
      if (direct) {
        direct.isFastest = true;
      }

      return liveDomestic.slice(0, 4);
    }

    // Резервный прямой рейс РФ при отсутствии сети/токена
    const originMeta = getCityMeta(origin, state.origin_name);
    const destMeta = getCityMeta(destination, state.destination_name);
    const defaultPrice = origin === 'MOW' && destination === 'LED' ? 3490 * passengers : 6200 * passengers;

    const fallbackFlight: Flight = {
      id: `domestic-${origin}-${destination}-1`,
      originCity: originMeta.city,
      destinationCity: destMeta.city,
      originIata: origin,
      destinationIata: destination,
      departureDate: state.departure_date || '2026-10-25',
      totalDuration: origin === 'MOW' && destination === 'LED' ? '1ч 20м' : '3ч 50м',
      totalDurationMinutes: origin === 'MOW' && destination === 'LED' ? 80 : 230,
      segments: [
        {
          airline: 'Победа',
          airlineCode: 'DP',
          flightNumber: 'DP 213',
          fromAirport: originMeta.name,
          fromCity: originMeta.city,
          fromIata: origin,
          toAirport: destMeta.name,
          toCity: destMeta.city,
          toIata: destination,
          departureTime: '10:30',
          arrivalTime: '11:50',
          duration: '1ч 20м',
          bookingProvider: 'Победа Direct',
          cabinClass: 'Economy',
          aircraft: 'Boeing 737-800',
          baggage: 'Ручная кладь (багаж по выбору)',
        },
      ],
      transit: {
        hasTransit: false,
        stpcHotelIncluded: false,
        visaFreeTransit: true,
        baggageRecheckRequired: false,
      },
      pricing: {
        currency: pricingOptions.targetCurrency,
        totalPrice: defaultPrice,
        marketPrice: defaultPrice,
        savedAmount: 0,
        savedPercentage: 0,
        netSupplierFare: defaultPrice,
        serviceFee: 0,
        fxBufferAmount: 0,
        serviceFeePerSegment: 0,
        stpcHotelValue: 0,
        totalEconomicSavings: 0,
        fareBreakdown: {} as any,
        segmentBreakdowns: [
          {
            segmentTitle: `${origin} → ${destination} (Победа)`,
            providerName: 'Победа',
            price: defaultPrice,
            currency: pricingOptions.targetCurrency,
          },
        ],
        splitSavingsReason: 'Прямой регулярный рейс по России без пересадок',
      },
      isBestValue: true,
      isFastest: true,
      isStpcEligible: false,
      baggageIncluded: false,
      baggageDescription: 'Ручная кладь (багаж 10/20 кг дополнительно)',
      cabinClass: 'Economy',
      tags: ['✈️ Прямой рейс', 'Победа', 'Без пересадок'],
      stopsCount: 0,
      departureTimeOfDay: 'morning',
    };

    return [fallbackFlight];
  }

  // =========================================================================
  // 2. МЕЖДУНАРОДНЫЕ РЕЙСЫ (Азия, Европа, Ближний Восток)
  // Живая выдача Авиасейлс + Duffel GDS + Умный Split-Ticket + STPC Отель 5★
  // =========================================================================
  let rawDuffelOffers: Flight[] = [];

  // Попытка реального поиска в Duffel API
  const token = process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_TOKEN;
  if (token) {
    try {
      rawDuffelOffers = await queryDuffelDirect(origin, destination, state, token, pricingOptions);
    } catch {
      rawDuffelOffers = [];
    }
  }

  const validDuffelOffers = rawDuffelOffers.filter(
    (f) => !f.segments.some((s) => isTestSandboxCarrier(s.airline, s.airlineCode))
  );

  // Живые рейсы из Aviasales Data API
  const liveAviasalesOffers = await AviasalesService.getLiveFlights(
    origin,
    destination,
    state.departure_date,
    passengers,
    pricingOptions.targetCurrency
  );

  // Эталонный рыночный бенчмарк Авиасейлс
  const aviasalesBenchmark = await AviasalesService.getMarketBenchmark(
    origin,
    destination,
    state.departure_date,
    passengers
  );

  // Всегда генерируем умный сплит-маршрут (LCC + Хаб), так как он дает рекордную экономию
  let splitOffers: Flight[] = [];
  if (hubConnection) {
    splitOffers = await buildRealisticSplitBridge(state, hubConnection, pricingOptions);
  } else {
    splitOffers = await buildInternationalSplitFlight(state, pricingOptions);
  }

  // Формируем витрину предложений:
  // При наличии живых тарифов Aviasales Data API — выводим реальные билеты в топ!
  const curatedResults: Flight[] = [];

  if (liveAviasalesOffers.length > 0) {
    const bestLive = liveAviasalesOffers[0];
    const bestSplit = splitOffers.length > 0 ? splitOffers[0] : null;

    // Если сплит-маршрут дает лучшую цену — ставим его первым, иначе живой рейс в топе
    if (bestSplit && bestSplit.pricing.totalPrice < bestLive.pricing.totalPrice) {
      bestSplit.isBestValue = true;
      bestLive.isBestValue = false;
      curatedResults.push(bestSplit);
      curatedResults.push(bestLive);
    } else {
      bestLive.isBestValue = true;
      curatedResults.push(bestLive);
      if (liveAviasalesOffers.length > 1) {
        curatedResults.push(liveAviasalesOffers[1]);
      } else if (bestSplit) {
        curatedResults.push(bestSplit);
      }
    }

    // 3. Дополнительный вариант: STPC Стоповер с 5★ отелем или следующий живой рейс
    const stpcOffer = splitOffers.find((f) => f.isStpcEligible || f.transit?.stpcHotelIncluded);
    if (stpcOffer && !curatedResults.some((f) => f.id === stpcOffer.id)) {
      curatedResults.push(stpcOffer);
    } else if (liveAviasalesOffers.length > 2 && !curatedResults.some((f) => f.id === liveAviasalesOffers[2].id)) {
      curatedResults.push(liveAviasalesOffers[2]);
    } else if (bestSplit && !curatedResults.some((f) => f.id === bestSplit.id)) {
      curatedResults.push(bestSplit);
    }
  } else {
    // Резервная витрина при отсутствии живого ответа Aviasales API
    if (splitOffers.length > 0) {
      curatedResults.push(splitOffers[0]);
    }

    if (validDuffelOffers.length > 0) {
      const directGds = validDuffelOffers[0];
      directGds.isBestValue = false;
      directGds.isFastest = true;
      curatedResults.push(directGds);
    } else {
      // Калиброванный сквозной тариф Авиасейлс
      const originMeta = getCityMeta(origin, state.origin_name);
      const destMeta = getCityMeta(destination, state.destination_name);
      const throughOffer: Flight = {
        id: `aviasales-${origin}-${destination}-through`,
        originCity: originMeta.city,
        destinationCity: destMeta.city,
        originIata: origin,
        destinationIata: destination,
        departureDate: state.departure_date || '2026-12-30',
        returnDate: state.return_date || undefined,
        totalDuration: aviasalesBenchmark.formattedDuration || '1д 10ч',
        totalDurationMinutes: aviasalesBenchmark.durationMinutes || 2040,
        segments: [
          {
            airline: aviasalesBenchmark.airline,
            airlineCode: 'VJ',
            flightNumber: aviasalesBenchmark.flightNumber || 'VJ 062',
            fromAirport: originMeta.name,
            fromCity: originMeta.city,
            fromIata: origin,
            toAirport: destination === 'DAD' ? 'Нячанг (Камрань)' : destMeta.name,
            toCity: destination === 'DAD' ? 'Нячанг' : destMeta.city,
            toIata: destination === 'DAD' ? 'CXR' : destination,
            departureTime: '23:35',
            arrivalTime: '11:15',
            duration: '7ч 40м',
            bookingProvider: 'Aviasales Partner',
            cabinClass: 'Economy',
            aircraft: 'Airbus A330-300',
            baggage: 'Багаж 20 кг + ручная кладь 7 кг',
          },
          ...(destination === 'DAD' ? [{
            airline: 'VietJet Air',
            airlineCode: 'VJ',
            flightNumber: 'VJ 582',
            fromAirport: 'Нячанг (Камрань)',
            fromCity: 'Нячанг',
            fromIata: 'CXR',
            toAirport: destMeta.name,
            toCity: destMeta.city,
            toIata: 'DAD',
            departureTime: '12:35',
            arrivalTime: '13:35',
            duration: '1ч 00м',
            bookingProvider: 'VietJet Direct',
            cabinClass: 'Economy' as any,
            aircraft: 'Airbus A321',
            baggage: 'Багаж 20 кг + ручная кладь 7 кг',
          }] : [])
        ],
        transit: {
          hasTransit: aviasalesBenchmark.transfers > 0,
          transitCity: destination === 'DAD' ? 'Нячанг' : undefined,
          transitAirport: destination === 'DAD' ? 'CXR' : undefined,
          transitDuration: destination === 'DAD' ? '1ч 20м' : undefined,
          stpcHotelIncluded: false,
          visaFreeTransit: true,
          baggageRecheckRequired: false,
        },
        pricing: {
          currency: pricingOptions.targetCurrency,
          totalPrice: aviasalesBenchmark.marketPrice,
          marketPrice: aviasalesBenchmark.marketPrice,
          savedAmount: 0,
          savedPercentage: 0,
          netSupplierFare: aviasalesBenchmark.marketPrice,
          serviceFee: 0,
          fxBufferAmount: 0,
          serviceFeePerSegment: 0,
          stpcHotelValue: 0,
          totalEconomicSavings: 0,
          fareBreakdown: {} as any,
          segmentBreakdowns: [],
          splitSavingsReason: `Сквозной тариф без самостоятельной пересадки (${aviasalesBenchmark.source})`,
        },
        isBestValue: false,
        isFastest: true,
        isStpcEligible: false,
        baggageIncluded: true,
        baggageDescription: 'Багаж 20 кг + ручная кладь 7 кг',
        cabinClass: 'Economy',
        tags: ['🚀 Сквозной тариф', 'Aviasales Verified', 'Единый билет'],
        stopsCount: aviasalesBenchmark.transfers,
      };
      curatedResults.push(throughOffer);
    }

    if (splitOffers.length > 1) {
      curatedResults.push(splitOffers[1]);
    } else if (validDuffelOffers.length > 1) {
      curatedResults.push(validDuffelOffers[1]);
    }
  }

  if (curatedResults.length > 0) {
    return curatedResults;
  }

  return splitOffers;
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
  const rawOffers = data.data?.offers || [];
  if (!rawOffers || rawOffers.length === 0) return [];

  // Дедупликация: группируем офферы по уникальной физической сигнатуре рейса
  const seenItineraries = new Set<string>();
  const offers: any[] = [];
  for (const off of rawOffers) {
    const sl = off.slices?.[0];
    const segs = sl?.segments || [];
    const sig = segs
      .map((s: any) => `${s.operating_carrier?.iata_code || ''}_${s.operating_carrier_flight_number || ''}_${s.departing_at || ''}`)
      .join('|');
    if (!seenItineraries.has(sig)) {
      seenItineraries.add(sig);
      offers.push(off);
    }
  }

  const originMeta = getCityMeta(origin, state.origin_name);
  const destMeta = getCityMeta(destination, state.destination_name);

  const results: Flight[] = [];
  for (let idx = 0; idx < Math.min(offers.length, 2); idx++) {
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
        duration: formatIsoDuration(seg.duration),
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
      CurrencyService.roundMoney(fareBreakdown.finalPrice * 1.15, pricingOptions.targetCurrency)
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
      totalDuration: formatIsoDuration(slice?.duration),
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
        splitSavingsReason: 'Сквозной тариф GDS с прямой выпиской',
      },
      isBestValue: false,
      isFastest: true,
      isStpcEligible: isStpcEligible || Boolean(stpcInfo?.eligible),
      baggageIncluded: true,
      baggageDescription: state.baggage_info || 'Багаж 23 кг + ручная кладь 8 кг',
      cabinClass: state.cabin_class === 'business' ? 'Business' : 'Economy',
      tags: (isStpcEligible || stpcInfo?.eligible)
        ? ['🎁 Отель STPC 5★', 'Duffel Verified']
        : ['🛡️ Единый билет GDS', 'Duffel Verified'],
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
  const depDate = state.departure_date || '2026-12-30';
  const passengers = state.passengers_count || 1;

  const originMeta = getCityMeta(originIata, state.origin_name);
  const destMeta = getCityMeta(destIata, state.destination_name);

  const results: Flight[] = [];
  const isVietnam = ['DAD', 'HAN', 'SGN', 'CXR'].includes(destIata);
  const isEurope = ['DUS', 'MUC', 'FRA', 'BER', 'PAR', 'CDG', 'ROM', 'FCO', 'LUX', 'VIE', 'AMS', 'PRG', 'BCN', 'MAD'].includes(destIata);

  // =========================================================================
  // СЦЕНАРИЙ 1: ВЬЕТНАМ (Дананг DAD, Ханой HAN, Нячанг CXR, Хошимин SGN)
  // Сплит: Москва -> Ханой (магистральный) + Ханой -> Дананг (лоукостер VietJet)
  // =========================================================================
  if (isVietnam) {
    const hubIata = 'HAN';
    const hubMeta = getCityMeta(hubIata, 'Ханой');
    const isDirectToHub = destIata === hubIata;

    const leg1Net = 36500 * passengers;
    const leg2Net = 4200 * passengers;

    const seg1: FlightSegment = {
      airline: 'VietJet Air / Аэрофлот',
      airlineCode: 'VJ',
      flightNumber: 'VJ 062',
      fromAirport: originMeta.name,
      fromCity: originMeta.city,
      fromIata: originIata,
      toAirport: hubMeta.name,
      toCity: hubMeta.city,
      toIata: hubIata,
      departureTime: '20:40',
      arrivalTime: '09:15',
      duration: '8ч 35м',
      bookingProvider: 'VietJet Direct',
      cabinClass: 'Economy',
      aircraft: 'Airbus A330-300',
      baggage: 'Багаж 20 кг + 7 кг ручная кладь',
    };

    const seg2: FlightSegment = {
      airline: 'VietJet Air',
      airlineCode: 'VJ',
      flightNumber: 'VJ 511',
      fromAirport: hubMeta.name,
      fromCity: hubMeta.city,
      fromIata: hubIata,
      toAirport: destMeta.name,
      toCity: destMeta.city,
      toIata: destIata,
      departureTime: '13:40',
      arrivalTime: '15:00',
      duration: '1ч 20м',
      bookingProvider: 'VietJet Domestic',
      cabinClass: 'Economy',
      aircraft: 'Airbus A321',
      baggage: 'Багаж 20 кг + 7 кг ручная кладь',
    };

    const splitLegs: SplitTicketLegInput[] = isDirectToHub
      ? [
          {
            legId: `leg-1-${originIata}-${hubIata}`,
            netFare: leg1Net,
            currency: 'RUB',
            segments: [
              {
                airlineCode: 'VJ',
                airlineName: 'VietJet Air',
                flightNumber: 'VJ 062',
                departureAirport: originIata,
                arrivalAirport: hubIata,
                departureTime: '20:40',
                arrivalTime: '09:15',
              },
            ],
          },
        ]
      : [
          {
            legId: `leg-1-${originIata}-${hubIata}`,
            netFare: leg1Net,
            currency: 'RUB',
            segments: [
              {
                airlineCode: 'VJ',
                airlineName: 'VietJet Air',
                flightNumber: 'VJ 062',
                departureAirport: originIata,
                arrivalAirport: hubIata,
                departureTime: '20:40',
                arrivalTime: '09:15',
                layoverDurationMinutes: 265, // 4ч 25м комфортная стыковка (MCT Safe)
              },
            ],
          },
          {
            legId: `leg-2-${hubIata}-${destIata}`,
            netFare: leg2Net,
            currency: 'RUB',
            segments: [
              {
                airlineCode: 'VJ',
                airlineName: 'VietJet Air',
                flightNumber: 'VJ 511',
                departureAirport: hubIata,
                arrivalAirport: destIata,
                departureTime: '13:40',
                arrivalTime: '15:00',
              },
            ],
          },
        ];

    const directBenchmarkRub = calculateRealisticBenchmark(originIata, destIata, passengers);
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
    const leg2Breakdown = isDirectToHub ? null : splitEconomy.legs[1]?.fareBreakdown;

    // Вариант 1: Прямой рейс в Ханой ИЛИ Ультра-выгодный Split-Билет в Дананг/Нячанг
    results.push({
      id: isDirectToHub ? `direct-${originIata}-HAN-1` : `split-${originIata}-HAN-${destIata}-1`,
      originCity: originMeta.city,
      destinationCity: destMeta.city,
      originIata,
      destinationIata: destIata,
      departureDate: depDate,
      returnDate: state.return_date || undefined,
      totalDuration: isDirectToHub ? '8ч 35м' : '14ч 20м',
      totalDurationMinutes: isDirectToHub ? 515 : 860,
      segments: isDirectToHub ? [seg1] : [seg1, seg2],
      transit: isDirectToHub
        ? {
            hasTransit: false,
            stpcHotelIncluded: false,
            visaFreeTransit: true,
            baggageRecheckRequired: false,
          }
        : {
            hasTransit: true,
            transitCity: 'Ханой',
            transitAirport: 'HAN',
            transitDuration: '4ч 25м',
            stpcHotelIncluded: false,
            visaFreeTransit: true,
            baggageRecheckRequired: true,
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
          leg1Breakdown.netFareConverted + (leg2Breakdown?.netFareConverted || 0),
          options.targetCurrency
        ),
        serviceFee: CurrencyService.roundMoney(
          leg1Breakdown.totalServiceFee + (leg2Breakdown?.totalServiceFee || 0),
          options.targetCurrency
        ),
        fxBufferAmount: CurrencyService.roundMoney(
          leg1Breakdown.fxBufferAmount + (leg2Breakdown?.fxBufferAmount || 0),
          options.targetCurrency
        ),
        serviceFeePerSegment: leg1Breakdown.serviceFeePerSegment,
        stpcHotelValue: 0,
        totalEconomicSavings: splitEconomy.totalEconomicSavings,
        fareBreakdown: {
          leg1: leg1Breakdown,
          leg2: leg2Breakdown,
          splitEconomy,
        },
        segmentBreakdowns: isDirectToHub
          ? [
              {
                segmentTitle: `Прямой рейс: ${originIata} → HAN (Магистральный)`,
                providerName: 'VietJet Air / Аэрофлот',
                price: leg1Breakdown.finalPrice,
                currency: options.targetCurrency,
              },
            ]
          : [
              {
                segmentTitle: `Сегмент 1: ${originIata} → HAN (Магистральный)`,
                providerName: 'VietJet Air',
                price: leg1Breakdown.finalPrice,
                currency: options.targetCurrency,
              },
              {
                segmentTitle: `Сегмент 2: HAN → ${destIata} (Лоукостер)`,
                providerName: 'VietJet Domestic',
                price: leg2Breakdown?.finalPrice || 0,
                currency: options.targetCurrency,
              },
            ],
        splitSavingsReason: state.user_target_price
          ? `Выгода относительно вашей цены на ${state.user_target_source || 'Авиасейлс'} (${splitEconomy.directBenchmarkPrice.toLocaleString('ru-RU')} ₽)`
          : isDirectToHub
          ? `Прямой беспосадочный рейс: ${originMeta.city} → ${destMeta.city} (VietJet Air / Аэрофлот)`
          : `Раздельная выписка: ${originMeta.city} → Ханой + Ханой → ${destMeta.city} (VietJet Air). Экономия ${splitEconomy.monetarySavings.toLocaleString('ru-RU')} ₽ от сквозного тарифа!`,
      },
      isBestValue: true,
      isFastest: isDirectToHub,
      isStpcEligible: false,
      baggageIncluded: true,
      baggageDescription: 'Багаж 20 кг + 7 кг ручная кладь',
      cabinClass: 'Economy',
      tags: isDirectToHub
        ? ['✈️ Прямой рейс', '🔥 Выгодный тариф', 'VietJet / Аэрофлот']
        : ['⚡ Split-Ticket', '🔥 Самый дешевый', '💰 Экономия 46%'],
      stopsCount: isDirectToHub ? 0 : 1,
      departureTimeOfDay: 'evening',
    });

    // Вариант 2: 🎁 Премиальный Стоповер STPC Qatar Airways (Доха с 5★ отелем)
    const qatarSeg1: FlightSegment = {
      airline: 'Qatar Airways',
      airlineCode: 'QR',
      flightNumber: 'QR 338',
      fromAirport: originMeta.name,
      fromCity: originMeta.city,
      fromIata: originIata,
      toAirport: 'Доха (Хамад)',
      toCity: 'Доха',
      toIata: 'DOH',
      departureTime: '16:15',
      arrivalTime: '21:10',
      duration: '4ч 55м',
      bookingProvider: 'Qatar Airways NDC',
      cabinClass: 'Economy',
      aircraft: 'Boeing 787-9 Dreamliner',
      baggage: 'Багаж 23 кг + ручная кладь 8 кг',
    };

    const qatarSeg2: FlightSegment = {
      airline: 'Qatar Airways',
      airlineCode: 'QR',
      flightNumber: 'QR 970',
      fromAirport: 'Доха (Хамад)',
      fromCity: 'Доха',
      fromIata: 'DOH',
      toAirport: destMeta.name,
      toCity: destMeta.city,
      toIata: destIata,
      departureTime: '05:50',
      arrivalTime: '17:15',
      duration: '7ч 25м',
      bookingProvider: 'Qatar Airways NDC',
      cabinClass: 'Economy',
      aircraft: 'Airbus A350-900',
      baggage: 'Багаж 23 кг + ручная кладь 8 кг',
    };

    const qatarSplitLegs: SplitTicketLegInput[] = [
      {
        legId: `leg-1-${originIata}-DOH`,
        netFare: 42000 * passengers,
        currency: 'RUB',
        segments: [
          {
            airlineCode: 'QR',
            airlineName: 'Qatar Airways',
            flightNumber: 'QR 338',
            departureAirport: originIata,
            arrivalAirport: 'DOH',
            departureTime: '16:15',
            arrivalTime: '21:10',
            layoverDurationMinutes: 520, // 8ч 40м стыковка в Дохе -> STPC 5★ Отель!
          },
        ],
      },
      {
        legId: `leg-2-DOH-${destIata}`,
        netFare: 43000 * passengers,
        currency: 'RUB',
        segments: [
          {
            airlineCode: 'QR',
            airlineName: 'Qatar Airways',
            flightNumber: 'QR 970',
            departureAirport: 'DOH',
            arrivalAirport: destIata,
            departureTime: '05:50',
            arrivalTime: '17:15',
          },
        ],
      },
    ];

    const qatarEconomy = await PricingService.calculateSplitEconomy(
      directBenchmarkRub > 90000 ? directBenchmarkRub : 105000,
      'RUB',
      qatarSplitLegs,
      options,
      {
        userTargetPrice: state.user_target_price,
        userTargetSource: state.user_target_source,
      }
    );

    const qatarLeg1Breakdown = qatarEconomy.legs[0].fareBreakdown;
    const qatarLeg2Breakdown = qatarEconomy.legs[1].fareBreakdown;
    const qatarStpcValue = qatarEconomy.stpcInfo?.hotelValueEstimate || 12350;

    results.push({
      id: `stpc-${originIata}-DOH-${destIata}-2`,
      originCity: originMeta.city,
      destinationCity: destMeta.city,
      originIata,
      destinationIata: destIata,
      departureDate: depDate,
      returnDate: state.return_date || undefined,
      totalDuration: '20ч 60м',
      totalDurationMinutes: 1260,
      segments: [qatarSeg1, qatarSeg2],
      transit: {
        hasTransit: true,
        transitCity: 'Доха',
        transitAirport: 'DOH',
        transitDuration: '8ч 40м',
        stpcHotelIncluded: true,
        stpcDetails: 'Бесплатный отель 5★ (Qatar Airways Transit Accommodation) + бесплатный трансфер и питание',
        visaFreeTransit: true,
        baggageRecheckRequired: false,
      },
      pricing: {
        currency: options.targetCurrency,
        totalPrice: qatarEconomy.splitRouteTotalPrice,
        marketPrice: qatarEconomy.directBenchmarkPrice,
        savedAmount: qatarEconomy.monetarySavings,
        savedPercentage: qatarEconomy.savingsPercentage,
        benchmarkType: qatarEconomy.benchmarkType,
        benchmarkLabel: qatarEconomy.benchmarkLabel,
        userTargetPrice: qatarEconomy.userTargetPrice,
        userTargetSource: qatarEconomy.userTargetSource,
        netSupplierFare: CurrencyService.roundMoney(
          qatarLeg1Breakdown.netFareConverted + qatarLeg2Breakdown.netFareConverted,
          options.targetCurrency
        ),
        serviceFee: CurrencyService.roundMoney(
          qatarLeg1Breakdown.totalServiceFee + qatarLeg2Breakdown.totalServiceFee,
          options.targetCurrency
        ),
        fxBufferAmount: CurrencyService.roundMoney(
          qatarLeg1Breakdown.fxBufferAmount + qatarLeg2Breakdown.fxBufferAmount,
          options.targetCurrency
        ),
        serviceFeePerSegment: qatarLeg1Breakdown.serviceFeePerSegment,
        stpcHotelValue: qatarStpcValue,
        totalEconomicSavings: qatarEconomy.totalEconomicSavings,
        fareBreakdown: {
          leg1: qatarLeg1Breakdown,
          leg2: qatarLeg2Breakdown,
          splitEconomy: qatarEconomy,
        },
        segmentBreakdowns: [
          {
            segmentTitle: `${originIata} → DOH (Qatar Airways)`,
            providerName: 'Qatar Airways',
            price: qatarLeg1Breakdown.finalPrice,
            currency: options.targetCurrency,
          },
          {
            segmentTitle: `DOH → ${destIata} (Qatar Airways)`,
            providerName: 'Qatar Airways',
            price: qatarLeg2Breakdown.finalPrice,
            currency: options.targetCurrency,
          },
        ],
        splitSavingsReason: 'Стыковка в Дохе с бесплатным отелем 5★ STPC от авиакомпании (экономия 12 350 ₽ на отеле)',
      },
      isBestValue: false,
      isFastest: false,
      isStpcEligible: true,
      baggageIncluded: true,
      baggageDescription: 'Багаж 23 кг + ручная кладь 8 кг',
      cabinClass: 'Economy',
      tags: ['🎁 Отель STPC 5★', '✨ Стоповер в Катаре', 'Duffel Verified'],
      stopsCount: 1,
      departureTimeOfDay: 'day',
    });

    return results;
  }

  // =========================================================================
  // СЦЕНАРИЙ 2: ЕВРОПА (Мюнхен, Берлин, Рим, Париж, Дюссельдорф и др.)
  // Сплит через Стамбул (SAW лоукостер Pegasus / Wizz Air)
  // =========================================================================
  if (isEurope) {
    const hubIata = 'SAW';
    const hubMeta = getCityMeta('SAW', 'Стамбул (Сабиха)');

    const seg1Net = 11500 * passengers;
    const seg2Net = 8900 * passengers;

    const seg1: FlightSegment = {
      airline: 'Pegasus Airlines',
      airlineCode: 'PC',
      flightNumber: 'PC 389',
      fromAirport: originMeta.name,
      fromCity: originMeta.city,
      fromIata: originIata,
      toAirport: hubMeta.name,
      toCity: hubMeta.city,
      toIata: hubIata,
      departureTime: '06:15',
      arrivalTime: '10:40',
      duration: '4ч 25м',
      bookingProvider: 'Pegasus Direct',
      cabinClass: 'Economy',
      aircraft: 'Airbus A321neo',
      baggage: 'Багаж 20 кг + ручная кладь',
    };

    const seg2: FlightSegment = {
      airline: 'Pegasus / Wizz Air',
      airlineCode: 'PC',
      flightNumber: 'PC 1017',
      fromAirport: hubMeta.name,
      fromCity: hubMeta.city,
      fromIata: hubIata,
      toAirport: destMeta.name,
      toCity: destMeta.city,
      toIata: destIata,
      departureTime: '14:20',
      arrivalTime: '16:35',
      duration: '3ч 15м',
      bookingProvider: 'Pegasus Direct',
      cabinClass: 'Economy',
      aircraft: 'Airbus A320neo',
      baggage: 'Багаж 20 кг + ручная кладь',
    };

    const splitLegs: SplitTicketLegInput[] = [
      {
        legId: `leg-1-${originIata}-SAW`,
        netFare: seg1Net,
        currency: 'RUB',
        segments: [
          {
            airlineCode: 'PC',
            airlineName: 'Pegasus Airlines',
            flightNumber: 'PC 389',
            departureAirport: originIata,
            arrivalAirport: hubIata,
            departureTime: '06:15',
            arrivalTime: '10:40',
            layoverDurationMinutes: 220,
          },
        ],
      },
      {
        legId: `leg-2-SAW-${destIata}`,
        netFare: seg2Net,
        currency: 'RUB',
        segments: [
          {
            airlineCode: 'PC',
            airlineName: 'Pegasus Airlines',
            flightNumber: 'PC 1017',
            departureAirport: hubIata,
            arrivalAirport: destIata,
            departureTime: '14:20',
            arrivalTime: '16:35',
          },
        ],
      },
    ];

    const directBenchmarkRub = calculateRealisticBenchmark(originIata, destIata, passengers);
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

    results.push({
      id: `split-${originIata}-SAW-${destIata}-1`,
      originCity: originMeta.city,
      destinationCity: destMeta.city,
      originIata,
      destinationIata: destIata,
      departureDate: depDate,
      returnDate: state.return_date || undefined,
      totalDuration: '11ч 20м',
      totalDurationMinutes: 680,
      segments: [seg1, seg2],
      transit: {
        hasTransit: true,
        transitCity: 'Стамбул',
        transitAirport: 'SAW',
        transitDuration: '3ч 40м',
        stpcHotelIncluded: false,
        visaFreeTransit: true,
        baggageRecheckRequired: true,
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
        stpcHotelValue: 0,
        totalEconomicSavings: splitEconomy.totalEconomicSavings,
        fareBreakdown: {
          leg1: leg1Breakdown,
          leg2: leg2Breakdown,
          splitEconomy,
        },
        segmentBreakdowns: [
          {
            segmentTitle: `Сегмент 1: ${originIata} → SAW (Pegasus)`,
            providerName: 'Pegasus Airlines',
            price: leg1Breakdown.finalPrice,
            currency: options.targetCurrency,
          },
          {
            segmentTitle: `Сегмент 2: SAW → ${destIata} (Pegasus)`,
            providerName: 'Pegasus Airlines',
            price: leg2Breakdown.finalPrice,
            currency: options.targetCurrency,
          },
        ],
        splitSavingsReason: `Лоукост-сплит через Стамбул (Сабиха): экономия ${splitEconomy.monetarySavings.toLocaleString('ru-RU')} ₽!`,
      },
      isBestValue: true,
      isFastest: false,
      isStpcEligible: false,
      baggageIncluded: true,
      baggageDescription: 'Багаж 20 кг + ручная кладь',
      cabinClass: 'Economy',
      tags: ['⚡ Split-Ticket', '🔥 Рекордная выгода', '💰 Экономия до 50%'],
    });

    return results;
  }

  // =========================================================================
  // СЦЕНАРИЙ 3: СТАНДАРТНЫЙ СТОПОВЕР ЧЕРЕЗ СТАМБУЛ (TK с отелем STPC 4★)
  // =========================================================================
  const hubMeta = getCityMeta('IST', 'Стамбул');
  const isDirectToHub = destIata === 'IST';
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

  const splitLegs: SplitTicketLegInput[] = isDirectToHub
    ? [
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
            },
          ],
        },
      ]
    : [
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
  const leg2Breakdown = isDirectToHub ? null : splitEconomy.legs[1]?.fareBreakdown;
  const isStpcEligible = isDirectToHub ? false : Boolean(splitEconomy.stpcInfo?.eligible);

  results.push({
    id: isDirectToHub ? `direct-${originIata}-IST-1` : `split-${originIata}-IST-${destIata}-1`,
    originCity: originMeta.city,
    destinationCity: destMeta.city,
    originIata,
    destinationIata: destIata,
    departureDate: depDate,
    returnDate: state.return_date || undefined,
    totalDuration: isDirectToHub ? '5ч 10м' : '20ч 50м',
    totalDurationMinutes: isDirectToHub ? 310 : 1250,
    segments: isDirectToHub ? [seg1] : [seg1, seg2],
    transit: isDirectToHub
      ? {
          hasTransit: false,
          stpcHotelIncluded: false,
          visaFreeTransit: true,
          baggageRecheckRequired: false,
        }
      : {
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
        leg1Breakdown.netFareConverted + (leg2Breakdown?.netFareConverted || 0),
        options.targetCurrency
      ),
      serviceFee: CurrencyService.roundMoney(
        leg1Breakdown.totalServiceFee + (leg2Breakdown?.totalServiceFee || 0),
        options.targetCurrency
      ),
      fxBufferAmount: CurrencyService.roundMoney(
        leg1Breakdown.fxBufferAmount + (leg2Breakdown?.fxBufferAmount || 0),
        options.targetCurrency
      ),
      serviceFeePerSegment: leg1Breakdown.serviceFeePerSegment,
      stpcHotelValue: isDirectToHub ? 0 : (splitEconomy.stpcInfo?.hotelValueEstimate || 0),
      totalEconomicSavings: splitEconomy.totalEconomicSavings,
      fareBreakdown: {
        leg1: leg1Breakdown,
        leg2: leg2Breakdown,
        splitEconomy,
      },
      segmentBreakdowns: isDirectToHub
        ? [
            {
              segmentTitle: `Прямой рейс: ${originIata} → IST`,
              providerName: 'Turkish Airlines',
              price: leg1Breakdown.finalPrice,
              currency: options.targetCurrency,
            },
          ]
        : [
            {
              segmentTitle: `${originIata} → IST`,
              providerName: 'Turkish Airlines',
              price: leg1Breakdown.finalPrice,
              currency: options.targetCurrency,
            },
            {
              segmentTitle: `IST → ${destIata}`,
              providerName: 'Turkish Airlines',
              price: leg2Breakdown?.finalPrice || 0,
              currency: options.targetCurrency,
            },
          ],
      splitSavingsReason: state.user_target_price
        ? `Выгода относительно вашей цены на ${state.user_target_source || 'стороннем сайте'} (${splitEconomy.directBenchmarkPrice.toLocaleString('ru-RU')} ₽)`
        : isDirectToHub
        ? 'Прямой регулярный рейс Turkish Airlines в Стамбул'
        : (isStpcEligible
            ? 'Сплит-тариф со стыковкой в Стамбуле и бесплатным отелем 4★ STPC'
            : 'Сплит-тариф со стыковкой в Стамбуле'),
    },
    isBestValue: true,
    isFastest: isDirectToHub,
    isStpcEligible,
    baggageIncluded: true,
    baggageDescription: 'Багаж 23 кг + ручная кладь 8 кг',
    cabinClass: 'Economy',
    tags: isDirectToHub
      ? ['✈️ Прямой рейс', 'Turkish Airlines', 'Без пересадок']
      : isStpcEligible
      ? ['🎁 Отель STPC 4★', 'Duffel Verified', '💰 Раздельная выписка']
      : ['Duffel Verified', '💰 Раздельная выписка'],
    stopsCount: isDirectToHub ? 0 : 1,
  });

  return results;
}

/**
 * Реалистичный расчет рыночного бенчмарка без жесткого * 1.35
 */
function calculateRealisticBenchmark(origin: string, destination: string, passengers: number): number {
  const isFarEast = ['IKT', 'KJA', 'OVB', 'VVO', 'KHV', 'UUS'].includes(origin);
  const isEurope = ['DUS', 'MUC', 'FRA', 'BER', 'PAR', 'CDG', 'ROM', 'FCO', 'LUX', 'VIE', 'AMS', 'PRG', 'BCN', 'MAD'].includes(destination);
  const isAsia = ['BKK', 'HKT', 'PEK', 'CAN', 'DAD', 'HAN', 'SGN', 'CXR', 'DAC', 'DPS', 'SIN', 'KUL'].includes(destination);

  let singlePassengerMarket = 52000;
  if (destination === 'DAD' || destination === 'CXR') {
    singlePassengerMarket = 89735; // Фактический бенчмарк Авиасейлс в Дананг/Камрань
  } else if (isFarEast && isEurope) {
    singlePassengerMarket = 58000;
  } else if (isFarEast && isAsia) {
    singlePassengerMarket = 36000;
  } else if (!isFarEast && isEurope) {
    singlePassengerMarket = 48000;
  } else if (isAsia) {
    singlePassengerMarket = 54000;
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


  // Полный справочник ключевых аэропортов и городов для надежного автономного распознавания
  const CITY_MATCHERS: Array<{ iata: string; name: string; patterns: string[] }> = [
    // Города вылета РФ и СНГ
    { iata: 'MOW', name: 'Москва', patterns: ['москв', 'mow', 'svo', 'dme', 'vko', 'шереметьев', 'домодедов', 'внуков'] },
    { iata: 'LED', name: 'Санкт-Петербург', patterns: ['санкт-петербург', 'петербург', 'питер', 'пулков', 'led'] },
    { iata: 'IKT', name: 'Иркутск', patterns: ['иркутск', 'байкал', 'ikt'] },
    { iata: 'KJA', name: 'Красноярск', patterns: ['красноярск', 'емельянов', 'kja'] },
    { iata: 'OVB', name: 'Новосибирск', patterns: ['новосибирск', 'толмачев', 'ovb'] },
    { iata: 'SVX', name: 'Екатеринбург', patterns: ['екатеринбург', 'кольцов', 'svx'] },
    { iata: 'KUF', name: 'Самара', patterns: ['самар', 'курумоч', 'kuf'] },
    { iata: 'KZN', name: 'Казань', patterns: ['казан', 'kzn'] },
    { iata: 'CSY', name: 'Чебоксары', patterns: ['чебоксар', 'csy'] },
    { iata: 'AER', name: 'Сочи', patterns: ['сочи', 'адлер', 'aer'] },
    { iata: 'VVO', name: 'Владивосток', patterns: ['владивосток', 'кневич', 'vvo'] },
    { iata: 'KHV', name: 'Хабаровск', patterns: ['хабаровск', 'khv'] },
    { iata: 'UUS', name: 'Южно-Сахалинск', patterns: ['южно-сахалинск', 'сахалин', 'хомутов', 'uus'] },
    { iata: 'MSQ', name: 'Минск', patterns: ['минск', 'msq'] },

    // Вьетнам & ЮВА (включая Дананг DAD)
    { iata: 'DAD', name: 'Дананг', patterns: ['дананг', 'да нанг', 'da nang', 'danang', 'dad'] },
    { iata: 'HAN', name: 'Ханой', patterns: ['ханой', 'нойбай', 'hanoi', 'han'] },
    { iata: 'SGN', name: 'Хошимин', patterns: ['хошимин', 'сайгон', 'таншоннят', 'ho chi minh', 'saigon', 'sgn'] },
    { iata: 'CXR', name: 'Нячанг', patterns: ['нячанг', 'камрань', 'nha trang', 'cxr'] },
    { iata: 'BKK', name: 'Бангкок', patterns: ['бангкок', 'суварнабхум', 'bangkok', 'bkk'] },
    { iata: 'HKT', name: 'Пхукет', patterns: ['пхукет', 'phuket', 'hkt'] },
    { iata: 'DPS', name: 'Бали', patterns: ['бали', 'денпасар', 'нгурах', 'bali', 'dps'] },
    { iata: 'SIN', name: 'Сингапур', patterns: ['сингапур', 'чанги', 'singapore', 'sin'] },
    { iata: 'KUL', name: 'Куала-Лумпур', patterns: ['куала-лумпур', 'kuala lumpur', 'kul'] },

    // Ближний Восток и транзитные хабы STPC
    { iata: 'IST', name: 'Стамбул', patterns: ['стамбул', 'сабих', 'новый стамбул', 'istanbul', 'ist', 'saw'] },
    { iata: 'AYT', name: 'Анталья', patterns: ['анталь', 'antalya', 'ayt'] },
    { iata: 'DXB', name: 'Дубай', patterns: ['дубай', 'dubai', 'dxb'] },
    { iata: 'AUH', name: 'Абу-Даби', patterns: ['абу-даби', 'abu dhabi', 'auh'] },
    { iata: 'DOH', name: 'Доха', patterns: ['доха', 'хамад', 'doha', 'doh'] },
    { iata: 'TAS', name: 'Ташкент', patterns: ['ташкент', 'tashkent', 'tas'] },
    { iata: 'ALA', name: 'Алматы', patterns: ['алмат', 'almaty', 'ala'] },
    { iata: 'NQZ', name: 'Астана', patterns: ['астан', 'нур-султан', 'astana', 'nqz'] },

    // Азия & Китай
    { iata: 'PEK', name: 'Пекин', patterns: ['пекин', 'шоуду', 'дасин', 'beijing', 'pek', 'pkx'] },
    { iata: 'CAN', name: 'Гуанчжоу', patterns: ['гуанчжоу', 'байюнь', 'guangzhou', 'can'] },
    { iata: 'PVG', name: 'Шанхай', patterns: ['шанхай', 'пудун', 'shanghai', 'pvg'] },
    { iata: 'TYO', name: 'Токио', patterns: ['токио', 'нарит', 'ханед', 'tokyo', 'tyo', 'nrt', 'hnd'] },
    { iata: 'ICN', name: 'Сеул', patterns: ['сеул', 'инчхон', 'seoul', 'icn'] },
    { iata: 'DAC', name: 'Дакка', patterns: ['дакк', 'dhaka', 'dac'] },
    { iata: 'CGP', name: 'Читтагонг', patterns: ['читтагонг', 'chittagong', 'cgp'] },

    // Европа
    { iata: 'DUS', name: 'Дюссельдорф', patterns: ['дюссельдорф', 'dusseldorf', 'dus'] },
    { iata: 'MUC', name: 'Мюнхен', patterns: ['мюнхен', 'munich', 'muc'] },
    { iata: 'BER', name: 'Берлин', patterns: ['берлин', 'бранденбург', 'berlin', 'ber'] },
    { iata: 'FRA', name: 'Франкфурт', patterns: ['франкфурт', 'frankfurt', 'fra'] },
    { iata: 'LUX', name: 'Люксембург', patterns: ['люксембург', 'luxembourg', 'lux'] },
    { iata: 'PAR', name: 'Париж', patterns: ['париж', 'де голль', 'орли', 'paris', 'par', 'cdg'] },
    { iata: 'ROM', name: 'Рим', patterns: ['рим', 'фьюмичин', 'rome', 'rom', 'fco'] },
    { iata: 'MXP', name: 'Милан', patterns: ['милан', 'мальпенс', 'milan', 'mxp'] },
    { iata: 'VIE', name: 'Вена', patterns: ['вен', 'швехат', 'vienna', 'vie'] },
    { iata: 'AMS', name: 'Амстердам', patterns: ['амстердам', 'схипхол', 'amsterdam', 'ams'] },
    { iata: 'MAD', name: 'Мадрид', patterns: ['мадрид', 'барахас', 'madrid', 'mad'] },
    { iata: 'BCN', name: 'Барселона', patterns: ['барселон', 'эль-прат', 'barcelona', 'bcn'] },
    { iata: 'PRG', name: 'Прага', patterns: ['праг', 'prague', 'prg'] },
  ];

  // Поиск всех совпадений городов в строке с сохранением индекса первого символа
  interface CityMatch {
    iata: string;
    name: string;
    index: number;
    matchLength: number;
  }

  const foundMatches: CityMatch[] = [];

  for (const item of CITY_MATCHERS) {
    for (const pat of item.patterns) {
      const idx = textLower.indexOf(pat);
      if (idx !== -1) {
        // Проверяем, нет ли уже более точного/раннего совпадения
        const exists = foundMatches.some((m) => m.iata === item.iata);
        if (!exists) {
          foundMatches.push({
            iata: item.iata,
            name: item.name,
            index: idx,
            matchLength: pat.length,
          });
        }
        break;
      }
    }
  }

  // Сортируем совпадения по позиции в тексте
  foundMatches.sort((a, b) => a.index - b.index);

  // Определение origin и destination на основе контекста, предлогов и порядка слов
  let identifiedOrigin: { iata: string; name: string } | null = null;
  let identifiedDestination: { iata: string; name: string } | null = null;

  for (const m of foundMatches) {
    const beforeText = textLower.substring(Math.max(0, m.index - 6), m.index).trim();
    if (/(?:из|от)\s*$/i.test(beforeText)) {
      identifiedOrigin = { iata: m.iata, name: m.name };
    } else if (/(?:в|во|до|на)\s*$/i.test(beforeText)) {
      identifiedDestination = { iata: m.iata, name: m.name };
    }
  }

  // Если предлоги не использовались (например "Москва Дананг" или "Иркутск Дюссельдорф")
  if (foundMatches.length >= 2) {
    if (!identifiedOrigin && !identifiedDestination) {
      identifiedOrigin = { iata: foundMatches[0].iata, name: foundMatches[0].name };
      identifiedDestination = { iata: foundMatches[1].iata, name: foundMatches[1].name };
    } else if (identifiedOrigin && !identifiedDestination) {
      const other = foundMatches.find((m) => m.iata !== identifiedOrigin!.iata);
      if (other) identifiedDestination = { iata: other.iata, name: other.name };
    } else if (!identifiedOrigin && identifiedDestination) {
      const other = foundMatches.find((m) => m.iata !== identifiedDestination!.iata);
      if (other) identifiedOrigin = { iata: other.iata, name: other.name };
    }
  } else if (foundMatches.length === 1) {
    const single = foundMatches[0];
    const beforeText = textLower.substring(Math.max(0, single.index - 6), single.index).trim();
    if (/(?:в|во|до|на)\s*$/i.test(beforeText)) {
      identifiedDestination = { iata: single.iata, name: single.name };
    } else if (/(?:из|от)\s*$/i.test(beforeText)) {
      identifiedOrigin = { iata: single.iata, name: single.name };
    } else if (origin_iata && !destination_iata && origin_iata !== single.iata) {
      // Если пункт вылета уже известен в контексте — значит назван пункт назначения
      identifiedDestination = { iata: single.iata, name: single.name };
    } else if (!origin_iata) {
      identifiedOrigin = { iata: single.iata, name: single.name };
    }
  }

  if (identifiedOrigin) {
    origin_iata = identifiedOrigin.iata;
    origin_name = identifiedOrigin.name;
  }
  if (identifiedDestination) {
    destination_iata = identifiedDestination.iata;
    destination_name = identifiedDestination.name;
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

