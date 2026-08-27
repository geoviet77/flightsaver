export type Currency = 'RUB' | 'USD' | 'EUR';
export type UserTier = 'standard' | 'club';

export interface FlightSegment {
  id: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  departureAirport: string;
  departureTerminal?: string;
  departureTime: string; // ISO 8601
  arrivalAirport: string;
  arrivalTerminal?: string;
  arrivalTime: string;   // ISO 8601
  durationMinutes: number;
}

export interface TicketLeg {
  id: string;
  pnrType: 'single_pnr' | 'split_pnr';
  airlineCode: string;
  segments: FlightSegment[];
  netFare: {
    amount: number;
    currency: Currency;
  };
  baggageIncluded: boolean;
  cabinClass: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface STPCEconomicBenefit {
  isEligible: boolean;
  hubAirport: string;
  layoverDurationMinutes: number;
  hotelEstimatedValue: {
    amount: number;
    currency: Currency;
  };
  includesTransfer: boolean;
  includesMeals: boolean;
}

export interface PriceBreakdown {
  currency: Currency;
  netFare: number;
  fxBufferAmount: number;     // 1.5% FX буфер защиты от волатильности
  serviceFeePerSegment: number;
  totalServiceFee: number;    // 1 500 ₽ за сегмент (0 ₽ для Club)
  totalCustomerPrice: number; // Net + FX Buffer + Total Service Fee
}

export interface ConnectionRiskAnalysis {
  isSelfTransfer: boolean;
  transferDurationMinutes: number;
  minimumConnectingTimeMinutes: number;
  isMCTCompliant: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH_RISK';
  warnings: string[];
}

export interface SplitTicketComparison {
  standardDirectOption: {
    totalPrice: number;
    currency: Currency;
    pnrCount: number;
  };
  splitTicketOption: {
    legs: Array<{
      legId: string;
      breakdown: PriceBreakdown;
    }>;
    totalPrice: number;
    currency: Currency;
    pnrCount: number;
  };
  savings: {
    fareDifference: number;         // Чистая экономия на билетах
    stpcHotelBenefitValue: number;  // Денежный эквивалент отеля STPC
    totalEconomicBenefit: number;   // Суммарная выгода клиента
    savingsPercentage: number;
  };
  connectionRisk: ConnectionRiskAnalysis;
}

export interface PricingCalculationRequest {
  userTier: UserTier;
  targetCurrency: Currency;
  standardItinerary?: {
    totalNetFare: number;
    currency: Currency;
    segmentsCount: number;
  };
  splitLegs: Array<{
    legId: string;
    netFare: number;
    fareCurrency: Currency;
    segments: FlightSegment[];
  }>;
  stpcBenefit?: STPCEconomicBenefit;
}
