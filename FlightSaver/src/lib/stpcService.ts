import { StpcProgramInfo } from '../types/flight';
import { Flight, FlightSegment } from './types';
import { STPC_AIRLINE_RULES, AirlineStpcRule } from './stpc/rules';
import { evaluateStpc } from './stpc/engine';
import { LayoverInfo } from './stpc/types';

export { STPC_AIRLINE_RULES };
export type { AirlineStpcRule };

const USD_TO_RUB_RATE = 95;

const HUB_CITY_NAMES: Record<string, string> = {
  DXB: 'Дубай',
  IST: 'Стамбул',
  SAW: 'Стамбул',
  DOH: 'Доха',
  BAH: 'Манама (Бахрейн)',
  AUH: 'Абу-Даби',
  ADD: 'Аддис-Абеба',
  PEK: 'Пекин',
  PKX: 'Пекин',
  CAN: 'Гуанчжоу',
  PVG: 'Шанхай',
  SHA: 'Шанхай',
  JED: 'Джидда',
  RUH: 'Эр-Рияд',
  CSX: 'Чанша',
  CTU: 'Чэнду'
};

/**
 * Проверяет соответствие пересадки критериям программ STPC / Stopover
 */
export function checkStpcEligibility(
  flightOrSegment: any,
  connectionDurationMinutes?: number
): StpcProgramInfo {
  let airlineCode = '';
  let airlineName = '';
  let hubAirport = '';
  let hubCity = '';
  let durationMinutes = connectionDurationMinutes || 0;

  // 1. Если передан объект Flight со структурой segments
  if (flightOrSegment && Array.isArray(flightOrSegment.segments) && flightOrSegment.segments.length > 1) {
    const seg1: FlightSegment = flightOrSegment.segments[0];
    const seg2: FlightSegment = flightOrSegment.segments[1];

    airlineCode = seg1.airlineCode || seg2.airlineCode || '';
    airlineName = seg1.airline || seg2.airline || '';
    hubAirport = seg1.toIata || flightOrSegment.transit?.transitAirport || '';
    hubCity = seg1.toCity || flightOrSegment.transit?.transitCity || HUB_CITY_NAMES[hubAirport.toUpperCase()] || hubAirport;

    if (!durationMinutes) {
      if (seg1.arrivalTime && seg2.departureTime) {
        const [arrH, arrM] = seg1.arrivalTime.split(':').map(Number);
        const [depH, depM] = seg2.departureTime.split(':').map(Number);
        let diff = (depH * 60 + depM) - (arrH * 60 + arrM);
        if (diff < 0) diff += 24 * 60;
        durationMinutes = diff;
      } else if (flightOrSegment.totalDurationMinutes) {
        durationMinutes = Math.min(flightOrSegment.totalDurationMinutes, 600);
      } else {
        durationMinutes = 600;
      }
    }
  } else if (flightOrSegment && typeof flightOrSegment === 'object') {
    // 2. Если передан один сегмент или прямой объект параметров
    airlineCode = flightOrSegment.airlineCode || flightOrSegment.carrierCode || flightOrSegment.operatingCarrier || '';
    airlineName = flightOrSegment.airline || flightOrSegment.airlineName || '';
    hubAirport = flightOrSegment.toIata || flightOrSegment.hubAirport || flightOrSegment.airportCode || '';
    hubCity = flightOrSegment.toCity || flightOrSegment.hubCity || flightOrSegment.city || HUB_CITY_NAMES[hubAirport.toUpperCase()] || hubAirport;
    durationMinutes = connectionDurationMinutes || flightOrSegment.durationMinutes || flightOrSegment.layoverDurationMinutes || 0;
  }

  const layover: LayoverInfo = {
    airportCode: hubAirport,
    city: hubCity,
    arrivalTime: '',
    departureTime: '',
    durationMinutes,
    operatingCarrier: airlineCode,
    marketingCarrier: airlineCode
  };

  const stpcBenefit = evaluateStpc(layover);

  if (!stpcBenefit.eligible) {
    return {
      eligible: false,
      airlineCode,
      airlineName,
      hubAirport,
      hubCity,
      layoverDurationMinutes: durationMinutes,
      hotelIncluded: false,
      hotelStars: '4★',
      transferIncluded: false,
      mealsIncluded: false,
      programName: '',
      estimatedSavingsRub: 0,
      instructions: ''
    };
  }

  const hotelStarsFormatted: '4★' | '5★' | '3-4★' =
    stpcBenefit.hotelStars === 5 ? '5★' : stpcBenefit.hotelStars === 3 ? '3-4★' : '4★';

  const savingsRub = Math.round(stpcBenefit.estimatedSavingUsd * USD_TO_RUB_RATE);

  return {
    eligible: true,
    airlineCode: stpcBenefit.airlineIata || airlineCode,
    airlineName: stpcBenefit.airlineName || airlineName,
    hubAirport: stpcBenefit.hubAirport || hubAirport,
    hubCity: hubCity || HUB_CITY_NAMES[hubAirport.toUpperCase()] || hubAirport,
    layoverDurationMinutes: durationMinutes,
    hotelIncluded: stpcBenefit.inclusions.hotel,
    hotelStars: hotelStarsFormatted,
    transferIncluded: stpcBenefit.inclusions.transfer,
    mealsIncluded: stpcBenefit.inclusions.meals,
    programName: stpcBenefit.programName,
    estimatedSavingsRub: savingsRub,
    instructions: stpcBenefit.bookingInstructions ||
      `1. По прилету в аэропорт ${hubCity} (${hubAirport}) обратитесь к стойке Hotel Desk / Transfer Desk авиакомпании ${stpcBenefit.airlineName}.\n2. Предъявите посадочные талоны.\n3. Получите бесплатный ваучер на проживание, трансфер и талоны на питание.`
  };
}

/**
 * Рассчитывает оценочную денежную выгоду пассажира от программы STPC
 */
export function calculateStpcSavings(stpcInfo: StpcProgramInfo): number {
  if (!stpcInfo || !stpcInfo.eligible) return 0;
  return stpcInfo.estimatedSavingsRub || 8500;
}

/**
 * Полное серверное обогащение рейса метаданными и бейджами STPC
 */
export function enrichFlightWithStpc(flight: Flight): Flight {
  if (!flight || !flight.segments || flight.segments.length < 2) {
    return flight;
  }

  const stpcInfo = checkStpcEligibility(flight);

  if (!stpcInfo.eligible) {
    return flight;
  }

  const savingsRub = calculateStpcSavings(stpcInfo);

  const tags = Array.isArray(flight.tags) ? [...flight.tags] : [];
  const badgeLabel = `🏨 ${stpcInfo.programName} (${stpcInfo.hotelStars} +${savingsRub.toLocaleString('ru-RU')} ₽)`;
  if (!tags.some((t) => t.includes('STPC') || t.includes('Отель') || t.includes('Stopover'))) {
    tags.unshift(badgeLabel);
  }

  return {
    ...flight,
    isStpcEligible: true,
    stpcInfo,
    transit: {
      ...flight.transit,
      stpcHotelIncluded: true,
      stpcDetails: `${stpcInfo.programName}: Бесплатный отель ${stpcInfo.hotelStars} (экономия +${savingsRub.toLocaleString('ru-RU')} ₽)`,
      stpcInfo: stpcInfo as any
    },
    tags
  };
}
