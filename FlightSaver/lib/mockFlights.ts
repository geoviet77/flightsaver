import { Flight, ParsedSearchParams } from './types';

export function generateMockFlights(params: ParsedSearchParams): Flight[] {
  const origin = params.originCity || 'Москва';
  const dest = params.destinationCity || 'Бангкок';
  const originIata = params.originIata || 'MOW';
  const destIata = params.destinationIata || 'BKK';
  const month = params.departureMonth || 'Ноябрь 2026';
  const passMultiplier = params.passengersCount || 1;
  const classMultiplier = params.cabinClass === 'Business' ? 2.8 : params.cabinClass === 'Premium Economy' ? 1.5 : 1;

  // Flight 1: Supreme Split-Ticket with Qatar Airways + VietJet Air
  const flight1BasePrice = Math.round(46800 * passMultiplier * classMultiplier);
  const flight1MarketPrice = Math.round(78900 * passMultiplier * classMultiplier);
  const flight1Saved = flight1MarketPrice - flight1BasePrice;

  // Flight 2: Emirates + Free STPC Transit Hotel
  const flight2BasePrice = Math.round(52400 * passMultiplier * classMultiplier);
  const flight2MarketPrice = Math.round(86000 * passMultiplier * classMultiplier);
  const flight2Saved = flight2MarketPrice - flight2BasePrice;

  // Flight 3: Gulf Air / Oman Air Fast Transit
  const flight3BasePrice = Math.round(41200 * passMultiplier * classMultiplier);
  const flight3MarketPrice = Math.round(69000 * passMultiplier * classMultiplier);
  const flight3Saved = flight3MarketPrice - flight3BasePrice;

  // Flight 4: Direct Flight
  const flight4BasePrice = Math.round(64000 * passMultiplier * classMultiplier);
  const flight4MarketPrice = Math.round(92000 * passMultiplier * classMultiplier);
  const flight4Saved = flight4MarketPrice - flight4BasePrice;

  const mockList: Flight[] = [
    {
      id: `fl-split-${originIata}-${destIata}-01`,
      originCity: origin,
      destinationCity: dest,
      originIata: originIata,
      destinationIata: destIata,
      departureDate: params.departureDate || `14 ${month}`,
      returnDate: params.durationDays ? `28 ${month}` : undefined,
      totalDuration: '13ч 40м',
      isBestValue: true,
      isFastest: false,
      isStpcEligible: false,
      baggageIncluded: true,
      baggageDescription: 'Багаж 25 кг + ручная кладь 8 кг на всех сегментах',
      tags: ['🔥 Топ выгода', 'Раздельная выписка (-41%)', 'Багаж 25 кг включен', 'Прямой оптовый тариф'],
      transit: {
        hasTransit: true,
        transitCity: 'Доха',
        transitAirport: 'DOH',
        transitDuration: '2ч 45м',
        stpcHotelIncluded: false,
        visaFreeTransit: true,
        baggageRecheckRequired: false,
      },
      pricing: {
        currency: params.currency,
        totalPrice: flight1BasePrice,
        marketPrice: flight1MarketPrice,
        savedAmount: flight1Saved,
        savedPercentage: 41,
        netSupplierFare: flight1BasePrice - 1800 * passMultiplier,
        serviceFee: 1800 * passMultiplier,
        splitSavingsReason: 'Скомбинированы прямые агентские тарифы Qatar Airways (SVO-DOH) и VietJet Air (DOH-BKK) без комиссии агрегаторов.',
        segmentBreakdowns: [
          {
            segmentTitle: `${origin} (${originIata}) → Доха (DOH)`,
            providerName: 'Qatar Airways NDC Direct',
            price: Math.round(flight1BasePrice * 0.58),
            currency: params.currency
          },
          {
            segmentTitle: `Доха (DOH) → ${dest} (${destIata})`,
            providerName: 'VietJet Air Wholesale',
            price: Math.round(flight1BasePrice * 0.38),
            currency: params.currency
          },
          {
            segmentTitle: 'Сервисный сбор & Smart-стыковка',
            providerName: 'FlightSaver Platform',
            price: 1800 * passMultiplier,
            currency: params.currency
          }
        ]
      },
      segments: [
        {
          airline: 'Qatar Airways',
          airlineCode: 'QR',
          flightNumber: 'QR 338',
          fromCity: origin,
          fromAirport: `${origin} (Шереметьево)`,
          fromIata: originIata,
          toCity: 'Доха',
          toAirport: 'Доха (Хамад)',
          toIata: 'DOH',
          departureTime: '17:20',
          arrivalTime: '22:15',
          duration: '4ч 55м',
          bookingProvider: 'Qatar NDC API',
          cabinClass: params.cabinClass,
          aircraft: 'Boeing 787-8',
          baggage: '25 кг'
        },
        {
          airline: 'VietJet Air',
          airlineCode: 'VJ',
          flightNumber: 'VJ 892',
          fromCity: 'Доха',
          fromAirport: 'Доха (Хамад)',
          fromIata: 'DOH',
          toCity: dest,
          toAirport: `${dest} (Суварнабхуми)`,
          toIata: destIata,
          departureTime: '01:00',
          arrivalTime: '11:00',
          duration: '6ч 00м',
          bookingProvider: 'VietJet Global',
          cabinClass: params.cabinClass,
          aircraft: 'Airbus A321neo',
          baggage: '25 кг'
        }
      ]
    },
    {
      id: `fl-stpc-${originIata}-${destIata}-02`,
      originCity: origin,
      destinationCity: dest,
      originIata: originIata,
      destinationIata: destIata,
      departureDate: params.departureDate || `15 ${month}`,
      returnDate: params.durationDays ? `29 ${month}` : undefined,
      totalDuration: '19ч 15м (с отдыхом в отеле)',
      isBestValue: false,
      isFastest: false,
      isStpcEligible: true,
      baggageIncluded: true,
      baggageDescription: 'Багаж 30 кг (2 места) + ручная кладь 10 кг',
      tags: ['🏨 Бесплатный отель STPC', 'Emirates Split', 'Безвизовый транзит', 'Экономия 39%'],
      transit: {
        hasTransit: true,
        transitCity: 'Дубай',
        transitAirport: 'DXB',
        transitDuration: '9ч 20м (ночной отдых)',
        stpcHotelIncluded: true,
        stpcDetails: 'Включен бесплатный 4★ отель Copthorne Dubai + трансфер и питание от Emirates Connect',
        visaFreeTransit: true,
        baggageRecheckRequired: false,
      },
      pricing: {
        currency: params.currency,
        totalPrice: flight2BasePrice,
        marketPrice: flight2MarketPrice,
        savedAmount: flight2Saved,
        savedPercentage: 39,
        netSupplierFare: flight2BasePrice - 2000 * passMultiplier,
        serviceFee: 2000 * passMultiplier,
        splitSavingsReason: 'Спец-тариф Emirates с официальной программой бесплатного отеля при стыковке от 8 до 24 часов.',
        segmentBreakdowns: [
          {
            segmentTitle: `${origin} (${originIata}) → Дубай (DXB)`,
            providerName: 'Emirates Direct Net',
            price: Math.round(flight2BasePrice * 0.55),
            currency: params.currency
          },
          {
            segmentTitle: 'Отель STPC 4★ в Дубае + Трансфер',
            providerName: 'Emirates Transit Connect',
            price: 0,
            currency: params.currency
          },
          {
            segmentTitle: `Дубай (DXB) → ${dest} (${destIata})`,
            providerName: 'FlyDubai / Emirates Codeshare',
            price: Math.round(flight2BasePrice * 0.41),
            currency: params.currency
          },
          {
            segmentTitle: 'Оформление ваучера STPC',
            providerName: 'FlightSaver',
            price: 2000 * passMultiplier,
            currency: params.currency
          }
        ]
      },
      segments: [
        {
          airline: 'Emirates',
          airlineCode: 'EK',
          flightNumber: 'EK 134',
          fromCity: origin,
          fromAirport: `${origin} (Домодедово)`,
          fromIata: originIata,
          toCity: 'Дубай',
          toAirport: 'Дубай (DXB Intl)',
          toIata: 'DXB',
          departureTime: '17:05',
          arrivalTime: '23:15',
          duration: '5ч 10м',
          bookingProvider: 'Emirates NDC',
          cabinClass: params.cabinClass,
          aircraft: 'Boeing 777-300ER',
          baggage: '30 кг'
        },
        {
          airline: 'FlyDubai',
          airlineCode: 'FZ',
          flightNumber: 'FZ 1572',
          fromCity: 'Дубай',
          fromAirport: 'Дубай (DXB Intl)',
          fromIata: 'DXB',
          toCity: dest,
          toAirport: `${dest} (Суварнабхуми)`,
          toIata: destIata,
          departureTime: '08:35',
          arrivalTime: '18:20',
          duration: '5ч 45м',
          bookingProvider: 'FlyDubai Direct',
          cabinClass: params.cabinClass,
          aircraft: 'Boeing 737 MAX 8',
          baggage: '30 кг'
        }
      ]
    },
    {
      id: `fl-fast-${originIata}-${destIata}-03`,
      originCity: origin,
      destinationCity: dest,
      originIata: originIata,
      destinationIata: destIata,
      departureDate: params.departureDate || `16 ${month}`,
      returnDate: params.durationDays ? `30 ${month}` : undefined,
      totalDuration: '11ч 30м',
      isBestValue: false,
      isFastest: true,
      isStpcEligible: false,
      baggageIncluded: true,
      baggageDescription: 'Багаж 20 кг + ручная кладь 7 кг',
      tags: ['⚡ Самый быстрый', 'Короткая пересадка 1ч 35м', 'Безвизовый транзит', 'Экономия 40%'],
      transit: {
        hasTransit: true,
        transitCity: 'Маскат',
        transitAirport: 'MCT',
        transitDuration: '1ч 35м',
        stpcHotelIncluded: false,
        visaFreeTransit: true,
        baggageRecheckRequired: false,
      },
      pricing: {
        currency: params.currency,
        totalPrice: flight3BasePrice,
        marketPrice: flight3MarketPrice,
        savedAmount: flight3Saved,
        savedPercentage: 40,
        netSupplierFare: flight3BasePrice - 1500 * passMultiplier,
        serviceFee: 1500 * passMultiplier,
        splitSavingsReason: 'Оптовые блоки мест Oman Air без посреднической наценки метапоисковиков.',
        segmentBreakdowns: [
          {
            segmentTitle: `${origin} (${originIata}) → Маскат (MCT)`,
            providerName: 'Oman Air Wholesale',
            price: Math.round(flight3BasePrice * 0.52),
            currency: params.currency
          },
          {
            segmentTitle: `Маскат (MCT) → ${dest} (${destIata})`,
            providerName: 'Oman Air Wholesale',
            price: Math.round(flight3BasePrice * 0.44),
            currency: params.currency
          },
          {
            segmentTitle: 'Сервисный сбор',
            providerName: 'FlightSaver',
            price: 1500 * passMultiplier,
            currency: params.currency
          }
        ]
      },
      segments: [
        {
          airline: 'Oman Air',
          airlineCode: 'WY',
          flightNumber: 'WY 184',
          fromCity: origin,
          fromAirport: `${origin} (Шереметьево)`,
          fromIata: originIata,
          toCity: 'Маскат',
          toAirport: 'Маскат (MCT)',
          toIata: 'MCT',
          departureTime: '23:20',
          arrivalTime: '05:45',
          duration: '5ч 25м',
          bookingProvider: 'Oman Air GDS',
          cabinClass: params.cabinClass,
          aircraft: 'Boeing 737 MAX 9',
          baggage: '20 кг'
        },
        {
          airline: 'Oman Air',
          airlineCode: 'WY',
          flightNumber: 'WY 815',
          fromCity: 'Маскат',
          fromAirport: 'Маскат (MCT)',
          fromIata: 'MCT',
          toCity: dest,
          toAirport: `${dest} (Суварнабхуми)`,
          toIata: destIata,
          departureTime: '07:20',
          arrivalTime: '16:50',
          duration: '5ч 30м',
          bookingProvider: 'Oman Air GDS',
          cabinClass: params.cabinClass,
          aircraft: 'Boeing 787-9',
          baggage: '20 кг'
        }
      ]
    },
    {
      id: `fl-direct-${originIata}-${destIata}-04`,
      originCity: origin,
      destinationCity: dest,
      originIata: originIata,
      destinationIata: destIata,
      departureDate: params.departureDate || `17 ${month}`,
      returnDate: params.durationDays ? `31 ${month}` : undefined,
      totalDuration: '9ч 10м (Прямой)',
      isBestValue: false,
      isFastest: false,
      isStpcEligible: false,
      baggageIncluded: true,
      baggageDescription: 'Багаж 23 кг + ручная кладь 10 кг',
      tags: ['✈️ Прямой рейс', 'Без пересадок', 'Багаж 23 кг', 'Экономия 30%'],
      transit: {
        hasTransit: false,
      },
      pricing: {
        currency: params.currency,
        totalPrice: flight4BasePrice,
        marketPrice: flight4MarketPrice,
        savedAmount: flight4Saved,
        savedPercentage: 30,
        netSupplierFare: flight4BasePrice - 2200 * passMultiplier,
        serviceFee: 2200 * passMultiplier,
        splitSavingsReason: 'Прямой контракт с авиаперевозчиком с гарантией минимального тарифа.',
        segmentBreakdowns: [
          {
            segmentTitle: `${origin} (${originIata}) → ${dest} (${destIata})`,
            providerName: 'Aeroflot / Partner Direct',
            price: flight4BasePrice - 2200 * passMultiplier,
            currency: params.currency
          },
          {
            segmentTitle: 'Сервисный сбор',
            providerName: 'FlightSaver',
            price: 2200 * passMultiplier,
            currency: params.currency
          }
        ]
      },
      segments: [
        {
          airline: 'Aeroflot',
          airlineCode: 'SU',
          flightNumber: 'SU 270',
          fromCity: origin,
          fromAirport: `${origin} (Шереметьево)`,
          fromIata: originIata,
          toCity: dest,
          toAirport: `${dest} (Суварнабхуми)`,
          toIata: destIata,
          departureTime: '21:30',
          arrivalTime: '10:40',
          duration: '9ч 10м',
          bookingProvider: 'Direct API',
          cabinClass: params.cabinClass,
          aircraft: 'Airbus A350-900',
          baggage: '23 кг'
        }
      ]
    }
  ];

  let filtered = [...mockList];

  // STPC only filter
  if (params.stpcHotelOnly) {
    filtered = filtered.filter(f => f.transit.stpcHotelIncluded);
  }

  // Visa free transit filter
  if (params.visaFreeOnly) {
    filtered = filtered.filter(f => !f.transit.hasTransit || f.transit.visaFreeTransit);
  }

  // Direct only
  if (params.directOnly) {
    filtered = filtered.filter(f => !f.transit.hasTransit);
  }

  // Budget filter
  if (params.maxBudget) {
    const budgetFiltered = filtered.filter(f => f.pricing.totalPrice <= params.maxBudget!);
    if (budgetFiltered.length > 0) return budgetFiltered;
  }

  return filtered.length > 0 ? filtered : mockList;
}
