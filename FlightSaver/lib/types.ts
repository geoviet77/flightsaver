export type Currency = 'RUB' | 'USD' | 'EUR' | 'THB' | 'AED';

export type Language = 'ru' | 'en';

export type CabinClass = 'Economy' | 'Premium Economy' | 'Business';

export type TimePreference = 'morning' | 'day' | 'evening' | 'night';

export interface ParsedSearchParams {
  query: string;
  originCity: string;
  originIata: string;
  destinationCity: string;
  destinationIata: string;
  departureMonth?: string;
  departureDate?: string;
  returnDate?: string;
  durationDays?: number;
  isWeekend?: boolean;
  isTomorrow?: boolean;
  passengersCount: number;
  adults: number;
  children: number;
  infants: number;
  passengerDescription: string;
  maxBudget?: number;
  currency: Currency;
  directOnly: boolean;
  isOriginDefaulted: boolean;
  needsClarification: boolean;
  clarificationMessage?: string;
  confidenceScore: number;
  
  // Advanced semantic filters
  stpcHotelOnly: boolean;
  visaFreeOnly: boolean;
  baggageIncluded: boolean;
  cabinClass: CabinClass;
  timePreference?: TimePreference;
}

export interface FlightSegment {
  airline: string;
  airlineCode: string;
  airlineLogoUrl?: string;
  flightNumber: string;
  fromAirport: string;
  fromCity: string;
  fromIata: string;
  toAirport: string;
  toCity: string;
  toIata: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  bookingProvider: string;
  cabinClass: CabinClass;
  aircraft?: string;
  baggage: string;
}

export interface TransitInfo {
  hasTransit: boolean;
  transitCity?: string;
  transitAirport?: string;
  transitDuration?: string;
  stpcHotelIncluded?: boolean;
  stpcDetails?: string;
  visaFreeTransit?: boolean;
  baggageRecheckRequired?: boolean;
}

export interface SegmentPriceDetail {
  segmentTitle: string;
  providerName: string;
  price: number;
  currency: Currency;
}

export interface PricingBreakdown {
  currency: Currency;
  totalPrice: number;
  marketPrice: number;
  savedAmount: number;
  savedPercentage: number;
  segmentBreakdowns: SegmentPriceDetail[];
  netSupplierFare: number;
  serviceFee: number;
  splitSavingsReason: string;
}

export interface Flight {
  id: string;
  originCity: string;
  destinationCity: string;
  originIata: string;
  destinationIata: string;
  departureDate: string;
  returnDate?: string;
  totalDuration: string;
  segments: FlightSegment[];
  transit: TransitInfo;
  pricing: PricingBreakdown;
  isBestValue: boolean;
  isFastest: boolean;
  isStpcEligible: boolean;
  baggageIncluded: boolean;
  baggageDescription: string;
  tags: string[];
}

export interface SearchResponse {
  parsed: ParsedSearchParams;
  flights: Flight[];
  totalFound: number;
  executionTimeMs: number;
}

// Agency Booking Data Interfaces
export interface PassengerDetails {
  id: string;
  type: 'adult' | 'child' | 'infant';
  gender: 'M' | 'F';
  firstName: string;
  lastName: string;
  birthDate: string;
  citizenship: string;
  passportNumber: string;
  passportExpiry: string;
}

export interface ContactDetails {
  email: string;
  phone: string;
  telegram?: string;
  receiveUpdatesOnTelegram: boolean;
}

export type PaymentMethod = 'sbp' | 'card' | 'mir_pay' | 'installment';

export interface BookingOrder {
  bookingId: string;
  pnr: string;
  createdAt: string;
  flight: Flight;
  passengers: PassengerDetails[];
  contact: ContactDetails;
  totalAmount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  status: 'confirmed' | 'pending_payment' | 'issued';
  splitTicketGuaranteeId: string;
}
