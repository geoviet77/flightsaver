import { LayoverInfo, StpcBenefit } from './types';
import { STPC_AIRLINE_RULES, AirlineStpcRule } from './rules';

export function evaluateStpc(layover: LayoverInfo): StpcBenefit {
  const matchingRule = STPC_AIRLINE_RULES.find((rule: AirlineStpcRule) => {
    const carrierMarketing = (layover.marketingCarrier || '').toUpperCase();
    const carrierOperating = (layover.operatingCarrier || '').toUpperCase();
    const ruleCarrier = rule.airlineCode.toUpperCase();

    const isCarrierMatch =
      ruleCarrier === carrierMarketing ||
      ruleCarrier === carrierOperating;

    const isHubMatch = rule.hubAirports.some(
      (hub) => hub.toUpperCase() === (layover.airportCode || '').toUpperCase()
    );

    const isDurationMatch =
      layover.durationMinutes >= rule.minLayoverMinutes &&
      layover.durationMinutes <= rule.maxLayoverMinutes;

    return isCarrierMatch && isHubMatch && isDurationMatch;
  });

  if (!matchingRule) {
    return {
      eligible: false,
      type: 'NONE',
      programName: '',
      airlineName: '',
      airlineIata: layover.operatingCarrier || layover.marketingCarrier || '',
      hubAirport: layover.airportCode,
      hotelStars: 0,
      nightsIncluded: 0,
      estimatedSavingUsd: 0,
      inclusions: { hotel: false, transfer: false, meals: false, visaSupport: false },
      conditions: [],
      bookingInstructions: ''
    };
  }

  return {
    eligible: true,
    type: matchingRule.programType,
    programName: matchingRule.programName,
    airlineName: matchingRule.airlineName,
    airlineIata: matchingRule.airlineCode,
    hubAirport: layover.airportCode,
    hotelStars: matchingRule.hotelStars,
    nightsIncluded: matchingRule.nightsIncluded,
    estimatedSavingUsd: matchingRule.estimatedSavingUsd,
    inclusions: matchingRule.inclusions,
    conditions: matchingRule.conditions,
    bookingInstructions: matchingRule.bookingInstructions
  };
}

/**
 * Обогащает объект рейса или оффера данными STPC (Server-Side Enricher)
 */
export function enrichFlightOfferWithStpc(flightOffer: any) {
  if (!flightOffer) return flightOffer;

  // 1. Если это оффер со структурой Duffel: slices[0].segments
  if (flightOffer.slices && Array.isArray(flightOffer.slices) && flightOffer.slices.length > 0) {
    const slice = flightOffer.slices[0];
    const segments = slice.segments || [];

    if (segments.length >= 2) {
      const firstSeg = segments[0];
      const secondSeg = segments[1];

      const arrivalTime = new Date(firstSeg.arriving_at || firstSeg.arrival?.at).getTime();
      const departureTime = new Date(secondSeg.departing_at || secondSeg.departure?.at).getTime();
      const durationMinutes = (!isNaN(arrivalTime) && !isNaN(departureTime))
        ? Math.round((departureTime - arrivalTime) / (1000 * 60))
        : 600;

      const layover: LayoverInfo = {
        airportCode: firstSeg.destination?.iata_code || firstSeg.arrival?.iataCode || '',
        airportName: firstSeg.destination?.name,
        city: firstSeg.destination?.city_name || firstSeg.destination?.iata_code || '',
        arrivalTime: firstSeg.arriving_at || firstSeg.arrival?.at || '',
        departureTime: secondSeg.departing_at || secondSeg.departure?.at || '',
        durationMinutes,
        operatingCarrier: secondSeg.operating_carrier?.iata_code || secondSeg.carrierCode || firstSeg.operating_carrier?.iata_code || firstSeg.carrierCode || '',
        marketingCarrier: firstSeg.marketing_carrier?.iata_code || firstSeg.carrierCode || ''
      };

      const stpcBenefit = evaluateStpc(layover);

      return {
        ...flightOffer,
        stpc: stpcBenefit.eligible ? stpcBenefit : null,
        isStpcEligible: stpcBenefit.eligible
      };
    }
  }

  // 2. Если это уже сформированный интерфейс Flight (segments: FlightSegment[])
  const segments = flightOffer.segments || flightOffer.itineraries?.[0]?.segments || [];
  if (segments.length < 2) {
    return { ...flightOffer, stpc: null };
  }

  const firstSeg = segments[0];
  const secondSeg = segments[1];

  let durationMinutes = 0;
  if (firstSeg.arrival?.at && secondSeg.departure?.at) {
    const arr = new Date(firstSeg.arrival.at).getTime();
    const dep = new Date(secondSeg.departure.at).getTime();
    durationMinutes = Math.round((dep - arr) / (1000 * 60));
  } else if (firstSeg.arrivalTime && secondSeg.departureTime) {
    const [arrH, arrM] = firstSeg.arrivalTime.split(':').map(Number);
    const [depH, depM] = secondSeg.departureTime.split(':').map(Number);
    let diff = (depH * 60 + depM) - (arrH * 60 + arrM);
    if (diff < 0) diff += 24 * 60;
    durationMinutes = diff;
  } else {
    durationMinutes = 600;
  }

  const layover: LayoverInfo = {
    airportCode: firstSeg.toIata || firstSeg.arrival?.iataCode || '',
    airportName: firstSeg.toAirport,
    city: firstSeg.toCity || firstSeg.arrival?.iataCode || '',
    arrivalTime: firstSeg.arrivalTime || firstSeg.arrival?.at || '',
    departureTime: secondSeg.departureTime || secondSeg.departure?.at || '',
    durationMinutes,
    operatingCarrier: secondSeg.airlineCode || secondSeg.carrierCode || firstSeg.airlineCode || firstSeg.carrierCode || '',
    marketingCarrier: firstSeg.airlineCode || firstSeg.carrierCode || ''
  };

  const stpcBenefit = evaluateStpc(layover);

  const enrichedTransit = flightOffer.transit ? {
    ...flightOffer.transit,
    stpcHotelIncluded: stpcBenefit.eligible,
    stpcDetails: stpcBenefit.eligible
      ? `${stpcBenefit.programName}: ${stpcBenefit.hotelStars}★ отель бесплатно (экономия ~$${stpcBenefit.estimatedSavingUsd})`
      : flightOffer.transit.stpcDetails
  } : undefined;

  let tags = Array.isArray(flightOffer.tags) ? [...flightOffer.tags] : [];
  if (stpcBenefit.eligible && !tags.some((t: string) => t.includes('STPC') || t.includes('Отель'))) {
    tags.unshift(`🎁 ${stpcBenefit.programName} (${stpcBenefit.hotelStars}★)`);
  }

  return {
    ...flightOffer,
    stpc: stpcBenefit.eligible ? stpcBenefit : null,
    isStpcEligible: stpcBenefit.eligible,
    transit: enrichedTransit || flightOffer.transit,
    tags
  };
}
