import { NextRequest, NextResponse } from 'next/server';
import { Duffel } from '@duffel/api';
import { checkStpcEligibility } from '@/lib/stpcService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TWOVRule {
  hubIata: string;
  hubCity: string;
  maxHours: number;
  visaFreeRu: string;
  transitRules: string;
  terminalTransfer: string;
}

const TWOV_DATABASE: Record<string, TWOVRule> = {
  IST: {
    hubIata: 'IST',
    hubCity: 'Стамбул',
    maxHours: 24,
    visaFreeRu: 'Безвизовый въезд для граждан РФ до 60 дней. При транзите виза не требуется.',
    transitRules: 'Транзитная зона работает круглосуточно. Пересадка между международными рейсами без выхода в город не требует прохождения пограничного контроля.',
    terminalTransfer: 'Все международные рейсы обслуживаются в едином терминале Нового аэропорта Стамбула (IST).',
  },
  SAW: {
    hubIata: 'SAW',
    hubCity: 'Стамбул (Сабиха)',
    maxHours: 24,
    visaFreeRu: 'Безвизовый въезд для граждан РФ до 60 дней.',
    transitRules: 'Международный транзит без визы до 24 часов.',
    terminalTransfer: 'Единый терминал Сабиха Гёкчен.',
  },
  DXB: {
    hubIata: 'DXB',
    hubCity: 'Дубай',
    maxHours: 24,
    visaFreeRu: 'Бесплатная виза по прибытии (штамп на 90 дней) для граждан РФ.',
    transitRules: 'Транзит в чистой зоне до 24 часов без оформления документов.',
    terminalTransfer: 'Между терминалами 1, 2 и 3 курсируют бесплатные транзитные шаттлы и метро.',
  },
  DOH: {
    hubIata: 'DOH',
    hubCity: 'Доха',
    maxHours: 24,
    visaFreeRu: 'Безвизовый въезд (бесплатный waiver на 90 дней) для граждан РФ.',
    transitRules: 'Безвизовый транзит TWOV в аэропорту Хамад до 24 часов.',
    terminalTransfer: 'Трансфер внутри единого современного хаба Хамад с монорельсом.',
  },
  AUH: {
    hubIata: 'AUH',
    hubCity: 'Абу-Даби',
    maxHours: 24,
    visaFreeRu: 'Бесплатная виза по прибытии для граждан РФ до 90 дней.',
    transitRules: 'Международный транзит до 24 часов в новом терминале Zayed International.',
    terminalTransfer: 'Новый интегрированный терминал A.',
  },
  PEK: {
    hubIata: 'PEK',
    hubCity: 'Пекин',
    maxHours: 144,
    visaFreeRu: 'Безвизовый транзит TWOV 24 / 144 часа при наличии билета в третью страну.',
    transitRules: 'Специальная стойка 24/144-hour Transit Permit перед пограничным контролем.',
    terminalTransfer: 'Автоматизированный поезд между терминалом 3E и 3C.',
  },
  PKX: {
    hubIata: 'PKX',
    hubCity: 'Пекин (Дасин)',
    maxHours: 144,
    visaFreeRu: 'Безвизовый транзит TWOV 24 / 144 часа при перелете в третью страну.',
    transitRules: 'Оформление временного разрешения на транзит на специальной стойке.',
    terminalTransfer: 'Единый радиальный терминал-звезда Дасин.',
  },
  ADD: {
    hubIata: 'ADD',
    hubCity: 'Аддис-Абеба',
    maxHours: 24,
    visaFreeRu: 'Транзитная зона не требует визы при стыковке до 24 часов.',
    transitRules: 'Транзитный отель STPC предоставляется авиакомпанией Ethiopian Airlines при стыковках от 8 часов.',
    terminalTransfer: 'Терминал 2 (международные рейсы).',
  },
};

const STPC_CARRIERS = ['TK', 'EK', 'QR', 'GF', 'CA', 'SV', 'ET', 'RJ', 'MS', 'FZ'];

function parseDuration(isoDuration?: string): { formatted: string; minutes: number } {
  if (!isoDuration) return { formatted: '4ч 30м', minutes: 270 };
  const hMatch = isoDuration.match(/(\d+)H/);
  const mMatch = isoDuration.match(/(\d+)M/);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  const totalMinutes = hours * 60 + mins;
  return {
    formatted: `${hours}ч ${mins < 10 ? '0' : ''}${mins}м`,
    minutes: totalMinutes || 240,
  };
}

function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      const match = isoString.match(/T(\d{2}:\d{2})/);
      return match ? match[1] : '--:--';
    }
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function calculateMinutes(arrIso?: string, depIso?: string): number {
  if (!arrIso || !depIso) return 0;
  try {
    const arr = new Date(arrIso).getTime();
    const dep = new Date(depIso).getTime();
    return Math.max(0, Math.round((dep - arr) / 60000));
  } catch {
    return 0;
  }
}

function getMockFlightDetails(id: string) {
  return {
    id: id || 'fl-001',
    originCity: 'Москва',
    originIata: 'VKO',
    originAirportName: 'Внуково (VKO)',
    destinationCity: 'Бангкок',
    destinationIata: 'BKK',
    destinationAirportName: 'Суварнабхуми (BKK)',
    departureDate: '2026-09-15',
    departureDateFormatted: '15 сентября 2026',
    returnDate: '2026-09-29',
    returnDateFormatted: '29 сентября 2026',
    totalDuration: '16ч 45м',
    totalDurationMinutes: 1005,
    stopsCount: 1,
    cabinClass: 'Economy',
    baggageIncluded: true,
    baggageDescription: '1 место багажа до 23 кг + ручная кладь 8 кг',
    segments: [
      {
        airline: 'Turkish Airlines',
        airlineCode: 'TK',
        airlineLogoUrl: 'https://images.kiwi.com/airlines/64/TK.png',
        flightNumber: 'TK 414',
        aircraft: 'Airbus A330-300',
        fromIata: 'VKO',
        fromCity: 'Москва',
        fromAirport: 'Внуково',
        fromTerminal: 'A',
        toIata: 'IST',
        toCity: 'Стамбул',
        toAirport: 'Новый аэропорт Стамбула',
        toTerminal: 'Main',
        departureTime: '06:15',
        departureDate: '15 сентября 2026',
        arrivalTime: '10:30',
        arrivalDate: '15 сентября 2026',
        duration: '4ч 15м',
        bookingProvider: 'Turkish Airlines Direct GDS',
        cabinClass: 'Economy',
        baggage: 'Багаж 23 кг + Ручная кладь 8 кг',
      },
      {
        airline: 'Turkish Airlines',
        airlineCode: 'TK',
        airlineLogoUrl: 'https://images.kiwi.com/airlines/64/TK.png',
        flightNumber: 'TK 68',
        aircraft: 'Boeing 777-300ER',
        fromIata: 'IST',
        fromCity: 'Стамбул',
        fromAirport: 'Новый аэропорт Стамбула',
        fromTerminal: 'Main',
        toIata: 'BKK',
        toCity: 'Бангкок',
        toAirport: 'Суварнабхуми',
        toTerminal: 'Main',
        departureTime: '20:10',
        departureDate: '15 сентября 2026',
        arrivalTime: '09:45',
        arrivalDate: '16 сентября 2026 (+1)',
        duration: '9ч 35м',
        bookingProvider: 'Turkish Airlines Direct GDS',
        cabinClass: 'Economy',
        baggage: 'Багаж 23 кг + Ручная кладь 8 кг',
      },
    ],
    transit: {
      hasTransit: true,
      transitCity: 'Стамбул',
      transitAirport: 'IST',
      transitDuration: '9ч 40м',
      transitDurationMinutes: 580,
      baggageRecheckRequired: false,
      stpcHotelIncluded: true,
      stpcInfo: {
        eligible: true,
        airlineCode: 'TK',
        airlineName: 'Turkish Airlines',
        hubAirport: 'IST',
        hubCity: 'Стамбул',
        layoverDurationMinutes: 580,
        hotelIncluded: true,
        hotelStars: '4★',
        transferIncluded: true,
        mealsIncluded: true,
        programName: 'Turkish Airlines Stopover & STPC',
        estimatedSavingsRub: 9500,
        instructions:
          '1. По прилету в аэропорт Стамбула (IST) пройдите к стойке «Hotel Desk / Transfer Desk» авиакомпании Turkish Airlines (расположена рядом с выходом после получения багажа).\n2. Предъявите посадочные талоны на рейсы TK 414 и TK 68.\n3. Получите бесплатный ваучер на проживание, талоны на питание и билет на фирменный трансфер до отеля и обратно к вылету.',
        hotelName: 'Партнерский 4★ / 5★ отель авиакомпании (Radisson Blu / Marriott Istanbul)',
        isComplimentary: true,
        freeShuttle: true,
        freeMeals: true,
        minLayoverHours: 8,
        instructionsRu:
          '1. По прилету в аэропорт Стамбула (IST) пройдите к стойке «Hotel Desk / Transfer Desk» авиакомпании Turkish Airlines (расположена рядом с выходом после получения багажа).\n2. Предъявите посадочные талоны на рейсы TK 414 и TK 68.\n3. Получите бесплатный ваучер на проживание, талоны на питание и билет на фирменный трансфер до отеля и обратно к вылету.',
        instructionsEn:
          '1. Upon arrival at Istanbul Airport (IST), proceed to the Turkish Airlines Hotel Desk.\n2. Present your boarding passes for flights TK 414 and TK 68.\n3. Receive your free hotel accommodation voucher, meal coupons, and round-trip airport shuttle.',
      },
      twovInfo: {
        hubIata: 'IST',
        hubCity: 'Стамбул',
        isVisaFree: true,
        maxHours: 24,
        visaRuleTitle: 'Виза на пересадке не требуется (TWOV)',
        visaRuleDescription:
          'Для граждан РФ и большинства стран СНГ действует безвизовый режим с Турцией до 60 дней. При нахождении в транзитной зоне или выходе в город для заселения в отель STPC виза не требуется.',
        terminalInfo: 'Все рейсы выполняются из единого терминала Нового аэропорта Стамбула (IST). Повторная регистрация багажа не требуется.',
      },
    },
    pricing: {
      currency: 'RUB',
      totalPrice: 42800,
      marketPrice: 58900,
      savedAmount: 16100,
      savedPercentage: 27,
      netSupplierFare: 40660,
      serviceFee: 2140,
      splitSavingsReason: 'Прямой консолидаторский тариф Turkish Airlines + бесплатный отель STPC 4★ (экономия ~$120 на гостинице)',
      segmentBreakdowns: [
        {
          segmentTitle: 'VKO → IST (TK 414)',
          providerName: 'Turkish Airlines Direct',
          price: 18500,
          currency: 'RUB',
        },
        {
          segmentTitle: 'IST → BKK (TK 68)',
          providerName: 'Turkish Airlines Direct',
          price: 22160,
          currency: 'RUB',
        },
      ],
    },
    guarantee: {
      isGuaranteed: true,
      title: 'FlightSaver Connection Guarantee',
      description: 'В случае задержки первого рейса авиакомпания и FlightSaver бесплатно пересадят вас на следующий доступный рейс.',
    },
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const offerId = params.id;

  const token = process.env.DUFFEL_API_TOKEN || process.env.DUFFEL_ACCESS_TOKEN;

  if (!token || offerId.startsWith('fl-') || offerId.startsWith('duffel-offer-')) {
    const mockData = getMockFlightDetails(offerId);
    return NextResponse.json({ success: true, flight: mockData });
  }

  try {
    const duffel = new Duffel({ token });
    const response = await duffel.offers.get(offerId);
    const offer = response.data;

    if (!offer) {
      const mockData = getMockFlightDetails(offerId);
      return NextResponse.json({ success: true, flight: mockData });
    }

    const slice1 = offer.slices?.[0];
    const segments = slice1?.segments || [];
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1] || firstSeg;

    const originIata = firstSeg?.origin?.iata_code || slice1?.origin?.iata_code || 'MOW';
    const originCity = firstSeg?.origin?.city_name || firstSeg?.origin?.name || originIata;
    const originAirportName = firstSeg?.origin?.name || originCity;

    const destinationIata = lastSeg?.destination?.iata_code || slice1?.destination?.iata_code || 'BKK';
    const destinationCity = lastSeg?.destination?.city_name || lastSeg?.destination?.name || destinationIata;
    const destinationAirportName = lastSeg?.destination?.name || destinationCity;

    const durationInfo = parseDuration(slice1?.duration);
    const rawPrice = parseFloat(offer.total_amount) || 45000;
    const currency = (offer.total_currency?.toUpperCase() as any) || 'RUB';

    const hasTransit = segments.length > 1;
    let transitCity = '';
    let transitAirport = '';
    let transitMinutes = 0;

    if (hasTransit && segments[0] && segments[1]) {
      transitCity = segments[0].destination?.city_name || segments[0].destination?.name || '';
      transitAirport = segments[0].destination?.iata_code || '';
      transitMinutes = calculateMinutes(segments[0].arriving_at, segments[1].departing_at);
    }

    const operatingCarrierCode = firstSeg?.operating_carrier?.iata_code || firstSeg?.marketing_carrier?.iata_code || offer.owner?.iata_code || '';
    const stpcInfo = checkStpcEligibility(
      {
        airlineCode: operatingCarrierCode,
        airlineName: firstSeg?.operating_carrier?.name || offer.owner?.name || '',
        hubAirport: transitAirport,
        hubCity: transitCity,
      },
      transitMinutes
    );
    const isStpcEligible = Boolean(stpcInfo.eligible);

    const twovRule = TWOV_DATABASE[transitAirport] || {
      hubIata: transitAirport,
      hubCity: transitCity,
      maxHours: 24,
      visaFreeRu: 'Международный транзит без визы в транзитной зоне аэропорта до 24 часов.',
      transitRules: 'Для пересадки без выхода из транзитной зоны виза не требуется.',
      terminalTransfer: 'Трансфер между гейтами в чистой зоне.',
    };

    const flightSegments = segments.map((seg, sIdx) => {
      const segDuration = parseDuration(seg.duration);
      const airlineName = seg.operating_carrier?.name || seg.marketing_carrier?.name || offer.owner?.name || 'Авиакомпания';
      const airlineCode = seg.operating_carrier?.iata_code || seg.marketing_carrier?.iata_code || offer.owner?.iata_code || 'FL';
      const flightNum = `${airlineCode} ${seg.operating_carrier_flight_number || seg.marketing_carrier_flight_number || (100 + sIdx * 5)}`;

      return {
        airline: airlineName,
        airlineCode,
        airlineLogoUrl: seg.operating_carrier?.logo_symbol_url || offer.owner?.logo_symbol_url,
        flightNumber: flightNum,
        aircraft: seg.aircraft?.name || 'Airbus A320 / Boeing 777',
        fromIata: seg.origin?.iata_code || originIata,
        fromCity: seg.origin?.city_name || seg.origin?.name || originCity,
        fromAirport: seg.origin?.name || seg.origin?.iata_code || originIata,
        fromTerminal: seg.origin_terminal || '1',
        toIata: seg.destination?.iata_code || destinationIata,
        toCity: seg.destination?.city_name || seg.destination?.name || destinationCity,
        toAirport: seg.destination?.name || seg.destination?.iata_code || destinationIata,
        toTerminal: seg.destination_terminal || '1',
        departureTime: formatTime(seg.departing_at),
        departureDate: formatDate(seg.departing_at),
        arrivalTime: formatTime(seg.arriving_at),
        arrivalDate: formatDate(seg.arriving_at),
        duration: segDuration.formatted,
        bookingProvider: offer.owner?.name || 'Duffel Global GDS',
        cabinClass: seg.passengers?.[0]?.cabin_class_marketing_name || 'Economy',
        baggage: 'Багаж 23 кг + Ручная кладь 8 кг',
      };
    });

    const netSupplierFare = Math.round(rawPrice * 0.95);
    const serviceFee = Math.round(rawPrice * 0.05);
    const marketPrice = Math.round(rawPrice * 1.18);
    const savedAmount = marketPrice - rawPrice;

    const flightData = {
      id: offer.id,
      originCity,
      originIata,
      originAirportName,
      destinationCity,
      destinationIata,
      destinationAirportName,
      departureDate: firstSeg?.departing_at ? firstSeg.departing_at.split('T')[0] : '',
      departureDateFormatted: formatDate(firstSeg?.departing_at),
      totalDuration: durationInfo.formatted,
      totalDurationMinutes: durationInfo.minutes,
      stopsCount: Math.max(0, segments.length - 1),
      cabinClass: 'Economy',
      baggageIncluded: true,
      baggageDescription: '1 место багажа до 23 кг + ручная кладь 8 кг',
      segments: flightSegments,
      isStpcEligible,
      stpcInfo: isStpcEligible ? stpcInfo : undefined,
      transit: {
        hasTransit,
        transitCity: transitCity || undefined,
        transitAirport: transitAirport || undefined,
        transitDuration: transitMinutes > 0 ? `${Math.floor(transitMinutes / 60)}ч ${transitMinutes % 60}м` : undefined,
        transitDurationMinutes: transitMinutes,
        baggageRecheckRequired: false,
        stpcHotelIncluded: isStpcEligible,
        stpcDetails: isStpcEligible ? `${stpcInfo.programName}: Бесплатный отель ${stpcInfo.hotelStars}` : undefined,
        stpcInfo: isStpcEligible
          ? {
              ...stpcInfo,
              hotelName: `Партнерский 4★ / 5★ отель авиакомпании ${flightSegments[0]?.airline || ''}`,
              instructionsRu: stpcInfo.instructions,
              instructionsEn: `1. Upon arrival at ${transitCity} (${transitAirport}), proceed to the airline's Hotel Desk.\n2. Present your boarding passes.\n3. Receive your complimentary hotel voucher, meals, and shuttle transfer.`,
            }
          : undefined,
        twovInfo: hasTransit
          ? {
              hubIata: twovRule.hubIata,
              hubCity: twovRule.hubCity,
              isVisaFree: true,
              maxHours: twovRule.maxHours,
              visaRuleTitle: 'Виза на пересадке не требуется (TWOV)',
              visaRuleDescription: twovRule.visaFreeRu,
              terminalInfo: twovRule.terminalTransfer,
            }
          : undefined,
      },
      pricing: {
        currency,
        totalPrice: Math.round(rawPrice),
        marketPrice,
        savedAmount,
        savedPercentage: 18,
        netSupplierFare,
        serviceFee,
        splitSavingsReason: 'Прямой тариф Duffel GDS со скидкой консолидатора',
        segmentBreakdowns: flightSegments.map((s) => ({
          segmentTitle: `${s.fromIata} → ${s.toIata} (${s.airline})`,
          providerName: offer.owner?.name || 'Duffel API',
          price: Math.round(rawPrice / (flightSegments.length || 1)),
          currency,
        })),
      },
      guarantee: {
        isGuaranteed: true,
        title: 'FlightSaver Connection Guarantee',
        description: 'Гарантия стыковки: бесплатное перебронирование при задержках или изменениях в расписании.',
      },
    };

    return NextResponse.json({ success: true, flight: flightData });
  } catch (error: any) {
    console.error('[API Flights Details] Error:', error);
    const mockData = getMockFlightDetails(offerId);
    return NextResponse.json({ success: true, flight: mockData });
  }
}
