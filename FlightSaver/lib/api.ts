/**
 * API Client helper for FlightSaver
 * Automatically resolves endpoint using NEXT_PUBLIC_API_URL environment variable without hardcoded addresses
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
