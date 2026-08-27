import { z } from 'zod';

export type Currency = 'RUB' | 'USD' | 'EUR' | 'VND';

export const SUPPORTED_CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR', 'VND'];

/**
 * Поддерживаемые авиакомпании с активной программой STPC (Stopover Paid by Carrier)
 */
export const STPC_AIRLINES = ['EK', 'TK', 'QR', 'GF'] as const;
export type STPCAirlineCode = (typeof STPC_AIRLINES)[number];

export type UserTier = 'standard' | 'club';

export interface FlightSegment {
  id?: string;
  airlineCode: string;
  airlineName?: string;
  flightNumber: string;
  departureAirport: string;
  departureTerminal?: string;
  departureTime: string; // ISO 8601
  arrivalAirport: string;
  arrivalTerminal?: string;
  arrivalTime: string;   // ISO 8601
  durationMinutes?: number;
  layoverDurationMinutes?: number;
}

export interface STPCProgramInfo {
  eligible: boolean;
  airlineCode: string;
  layoverDurationHours: number;
  hotelValueEstimate: number; // В целевой валюте
  currency: Currency;
  details: string;
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

export interface PricingOptions {
  isClubMember: boolean;
  targetCurrency: Currency;
}

export interface FareBreakdown {
  originalCurrency: Currency;
  targetCurrency: Currency;
  netFareOriginal: number;
  netFareConverted: number;
  fxBufferAmount: number; // 1.5% при конвертации
  fxRateUsed: number;
  serviceFeePerSegment: number; // 1500 RUB или 0 для Club
  segmentCount: number;
  totalServiceFee: number;
  finalPrice: number;
}

export interface PriceBreakdown {
  currency: Currency;
  netFare: number;
  fxBufferAmount: number;     // 1.5% FX буфер защиты от волатильности
  serviceFeePerSegment: number;
  totalServiceFee: number;    // 1 500 ₽ за сегмент (0 ₽ для Club)
  totalCustomerPrice: number; // Net + FX Buffer + Total Service Fee
}

export interface SplitTicketLegInput {
  legId?: string;
  netFare: number;
  currency: Currency;
  segments: FlightSegment[];
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

export interface ConnectionRiskAnalysis {
  isSelfTransfer: boolean;
  transferDurationMinutes: number;
  minimumConnectingTimeMinutes: number;
  isMCTCompliant: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH_RISK';
  warnings: string[];
}

export interface SplitTicketEconomyResult {
  targetCurrency: Currency;
  directBenchmarkPrice: number;
  splitRouteTotalPrice: number;
  legs: {
    fareBreakdown: FareBreakdown;
    segments: FlightSegment[];
  }[];
  monetarySavings: number;
  savingsPercentage: number;
  stpcInfo: STPCProgramInfo | null;
  totalEconomicSavings: number; // monetarySavings + stpcHotelValue
  isSplitAdvantageous: boolean;
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

// Zod-схема валидации входящего запроса к API
export const FlightSegmentSchema = z.object({
  id: z.string().optional(),
  airlineCode: z.string().min(2).max(3),
  airlineName: z.string().optional(),
  flightNumber: z.string().min(1),
  departureAirport: z.string().length(3),
  departureTerminal: z.string().optional(),
  arrivalAirport: z.string().length(3),
  arrivalTerminal: z.string().optional(),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  durationMinutes: z.number().optional(),
  layoverDurationMinutes: z.number().optional(),
});

export const SplitTicketLegInputSchema = z.object({
  legId: z.string().optional(),
  netFare: z.number().positive(),
  currency: z.enum(['RUB', 'USD', 'EUR', 'VND']),
  segments: z.array(FlightSegmentSchema).min(1),
});

export const PricingCalculateRequestSchema = z.object({
  directBenchmarkPrice: z.number().nonnegative(),
  directBenchmarkCurrency: z.enum(['RUB', 'USD', 'EUR', 'VND']),
  splitLegs: z.array(SplitTicketLegInputSchema).min(1),
  options: z.object({
    isClubMember: z.boolean().default(false),
    targetCurrency: z.enum(['RUB', 'USD', 'EUR', 'VND']).default('RUB'),
  }),
});

export type PricingCalculateRequest = z.infer<typeof PricingCalculateRequestSchema>;
