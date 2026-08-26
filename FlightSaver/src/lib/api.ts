/**
 * API Client helper for FlightSaver
 * Handles communication with internal server routes (/api/ai/parse, /api/flights/search)
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface GeminiParsedParams {
  origin: string | null;
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengers: number;
  cabinClass: 'economy' | 'business';
  searchStpc: boolean;
  message: string;
}

export interface ParseApiResponse {
  success: boolean;
  data: GeminiParsedParams;
  error?: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
}

export interface DuffelSliceSegment {
  id: string;
  origin: {
    id?: string;
    iata_code: string;
    name: string;
    city_name?: string;
    terminal?: string;
  };
  destination: {
    id?: string;
    iata_code: string;
    name: string;
    city_name?: string;
    terminal?: string;
  };
  departing_at: string;
  arriving_at: string;
  duration?: string;
  operating_carrier?: {
    iata_code?: string;
    name?: string;
    logo_symbol_url?: string;
  };
  marketing_carrier?: {
    iata_code?: string;
    name?: string;
    logo_symbol_url?: string;
  };
  operating_carrier_flight_number?: string;
  marketing_carrier_flight_number?: string;
  aircraft?: {
    name?: string;
    iata_code?: string;
  };
  passengers?: Array<{
    cabin_class_marketing_name?: string;
    cabin_class?: string;
    baggage?: Array<{
      type: string;
      quantity: number;
    }>;
  }>;
}

export interface DuffelOfferSlice {
  id?: string;
  origin: {
    iata_code: string;
    name: string;
    city_name?: string;
  };
  destination: {
    iata_code: string;
    name: string;
    city_name?: string;
  };
  duration?: string;
  departure_date?: string;
  segments: DuffelSliceSegment[];
}

export interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  tax_amount?: string;
  base_amount?: string;
  owner: {
    id?: string;
    iata_code: string;
    name: string;
    logo_symbol_url?: string;
    logo_lockup_url?: string;
  };
  slices: DuffelOfferSlice[];
  conditions?: {
    change_before_departure?: {
      allowed: boolean;
      penalty_amount?: string;
      penalty_currency?: string;
    };
    refund_before_departure?: {
      allowed: boolean;
      penalty_amount?: string;
      penalty_currency?: string;
    };
  };
  passenger_identity_documents_required?: boolean;
}

export interface FlightSearchResponse {
  success: boolean;
  offerRequestId: string;
  offers: DuffelOffer[];
  totalOffers: number;
  data?: unknown;
  error?: string;
}

/**
 * Отправляет запрос на серверный роут AI-парсинга /api/ai/parse
 * Использует Google Gemini 2.0 Flash для извлечения параметров перелета
 */
export async function parseWithGemini(prompt: string): Promise<GeminiParsedParams> {
  const res = await fetch('/api/ai/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  const json: ParseApiResponse = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Ошибка распознавания запроса (${res.status})`);
  }

  return json.data;
}

/**
 * Отправляет запрос поиска авиабилетов на серверный роут /api/flights/search
 * Интегрирован с Duffel API
 */
export async function searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
  const res = await fetch('/api/flights/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      passengers: params.passengers || 1,
      cabinClass: params.cabinClass || 'economy',
    }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Ошибка поиска билетов (${res.status})`);
  }

  return json as FlightSearchResponse;
}

// Обратная совместимость для вспомогательных эндпоинтов
export interface AiParseSearchParams {
  query: string;
}

export interface AiParsedTravelResponse {
  origin_iata: string | null;
  origin_city: string | null;
  destination_iata: string | null;
  destination_city: string | null;
  departure_date_range: string | null;
  duration_days: number | null;
  prefer_stpc_hotel: boolean;
  max_budget: number | null;
  explanation?: string;
}

export async function parseSearchWithAi(query: string): Promise<AiParsedTravelResponse> {
  const res = await fetch('/api/v1/ai/parse-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Failed to parse travel query: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Получает детальную информацию о рейсе по ID предложения (Duffel Offer ID или кэш)
 */
export async function getFlightById(id: string): Promise<any> {
  const res = await fetch(`/api/flights/${encodeURIComponent(id)}`);
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Ошибка загрузки данных рейса (${res.status})`);
  }

  return json.flight;
}
