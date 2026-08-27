import { StpcBenefit } from './stpc/types';
export * from './stpc/types';

export type Currency = 'RUB' | 'USD' | 'EUR' | 'THB' | 'AED';

export type Language = 'ru' | 'en';

export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';

export type TimePreference = 'morning' | 'day' | 'evening' | 'night';

export type MissingField = 'tripType' | 'passengers' | 'cabinClass' | 'luggage';

export interface ParsedSearchParams {
  query: string;
  originCity: string;
  originIata: string;
  originName?: string;
  destinationCity: string;
  destinationIata: string;
  destinationName?: string;
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
  aiSummary?: string;
  hasLuggage?: boolean;
  
  // Advanced semantic filters
  stpcHotelOnly: boolean;
  wantsStpcHotel?: boolean;
  visaFreeOnly: boolean;
  baggageIncluded: boolean;
  cabinClass: CabinClass;
  timePreference?: TimePreference;
  isGroupBooking?: boolean;
  isCorporateAccount?: boolean;
  isOneWay?: boolean;
  isRoundTrip?: boolean;
  missingFields?: MissingField[];
  quickReplies?: QuickReplyOption[];
  missingQuestions?: MissingQuestion[];
}

export interface MissingQuestion {
  field: 'passengers' | 'cabinClass' | 'luggage' | 'returnDate' | string;
  question: string;
  options: string[];
}

export interface QuickReplyOption {
  id: string;
  label: string;
  queryText: string;
  category?: 'tripType' | 'passengers' | 'cabinClass' | 'luggage' | 'corporate' | 'general';
  isCustomInputPrompt?: boolean;
  promptText?: string;
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

export type FlightSortOption = 'cheap' | 'fast' | 'best' | 'stpc';
export type FlightStopsFilter = 'all' | 'direct' | '1stop' | 'stpc';
export type FlightTimeFilter = 'all' | 'morning' | 'day' | 'evening';

export interface AccumulatedSearchParams {
  origin: string | null;
  originName: string | null;
  destination: string | null;
  destinationName: string | null;
  departureDate: string | null;
  returnDate: string | null;
  isOneWay: boolean | null;
  passengers: number | null;
  cabinClass: string | null;
  hasLuggage: boolean | null;
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
  totalDurationMinutes?: number;
  segments: FlightSegment[];
  transit: TransitInfo;
  pricing: PricingBreakdown;
  isBestValue: boolean;
  isFastest: boolean;
  isStpcEligible: boolean;
  stpc?: StpcBenefit | null;
  baggageIncluded: boolean;
  baggageDescription: string;
  isCorporate?: boolean;
  passengersCount?: number;
  cabinClass?: CabinClass;
  departureTimeOfDay?: 'morning' | 'day' | 'evening' | 'night';
  stopsCount?: number;
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

// Places & Airports Autocomplete
export interface PlaceSuggestion {
  id: string;
  name: string;
  iataCode: string;
  cityName: string;
  countryCode: string;
  type: string;
}

export interface AirportSuggestionsResponse {
  places: PlaceSuggestion[];
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  parsedParams?: ParsedSearchParams;
  flightsCount?: number;
  quickReplies?: QuickReplyOption[];
  missingQuestions?: MissingQuestion[];
}

export interface ConversationSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  messages: ChatMessage[];
  lastParams?: ParsedSearchParams;
}


