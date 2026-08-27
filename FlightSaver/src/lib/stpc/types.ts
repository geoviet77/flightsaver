export interface LayoverInfo {
  airportCode: string;
  airportName?: string;
  city: string;
  arrivalTime: string;
  departureTime: string;
  durationMinutes: number;
  operatingCarrier: string;
  marketingCarrier: string;
}

export interface StpcBenefit {
  eligible: boolean;
  type: 'STPC_FREE_HOTEL' | 'STOPOVER_PROGRAM' | 'DISCOUNTED_HOTEL' | 'NONE';
  programName: string;
  airlineName: string;
  airlineIata: string;
  hubAirport: string;
  hotelStars: number;
  nightsIncluded: number;
  estimatedSavingUsd: number;
  inclusions: {
    hotel: boolean;
    transfer: boolean;
    meals: boolean;
    visaSupport: boolean;
  };
  conditions: string[];
  bookingInstructions: string;
}
