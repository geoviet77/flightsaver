import { NextRequest, NextResponse } from 'next/server';
import { Duffel } from '@duffel/api';
import { enrichFlightOfferWithStpc } from '@/lib/stpc/engine';
import { PricingService } from '@/services/pricingService';
import { Currency as PricingCurrency, PricingOptions } from '@/types/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export interface FlightSearchRequestBody {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
  userTier?: 'standard' | 'club';
  isClubMember?: boolean;
  currency?: string;
  targetCurrency?: string;
}

export interface TimeRangeFilter {
  from: string;
  to: string;
}

export interface OfferRequestSlice {
  origin: string;
  destination: string;
  departure_date: string;
  arrival_time?: TimeRangeFilter | null;
  departure_time?: TimeRangeFilter | null;
}

export interface OfferRequestPassenger {
  type?: 'adult';
  age?: number;
}

export interface FlightSearchSuccessResponse {
  success: true;
  offerRequestId: string;
  offers: unknown[];
  totalOffers: number;
  data?: unknown;
}

export interface FlightSearchErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

function mapCabinClass(rawCabin?: string): CabinClass | undefined {
  if (!rawCabin) return undefined;
  const normalized = rawCabin.toLowerCase().trim();
  switch (normalized) {
    case 'first':
      return 'first';
    case 'business':
      return 'business';
    case 'premium_economy':
    case 'comfort':
    case 'premium':
      return 'premium_economy';
    case 'economy':
    default:
      return 'economy';
  }
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<FlightSearchSuccessResponse | FlightSearchErrorResponse>> {
  try {
    let body: FlightSearchRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Некорректный формат JSON в теле запроса.',
        },
        { status: 400 }
      );
    }

    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = 1,
      cabinClass,
      userTier,
      isClubMember,
      currency,
      targetCurrency,
    } = body;

    // Валидация обязательных параметров
    if (!origin || typeof origin !== 'string' || origin.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Поле origin (3-буквенный IATA код) обязательно для заполнения.',
        },
        { status: 400 }
      );
    }

    if (!destination || typeof destination !== 'string' || destination.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Поле destination (3-буквенный IATA код) обязательно для заполнения.',
        },
        { status: 400 }
      );
    }

    if (!departureDate || typeof departureDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Поле departureDate обязательно и должно быть в формате YYYY-MM-DD.',
        },
        { status: 400 }
      );
    }

    if (returnDate && (typeof returnDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(returnDate.trim()))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Поле returnDate должно быть в формате YYYY-MM-DD.',
        },
        { status: 400 }
      );
    }

    const token = (process.env.DUFFEL_API_TOKEN || process.env.DUFFEL_ACCESS_TOKEN || '').trim();
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Серверная конфигурация не завершена: отсутствует DUFFEL_API_TOKEN / DUFFEL_ACCESS_TOKEN.',
        },
        { status: 500 }
      );
    }

    // Инициализация Duffel API клиента
    const duffel = new Duffel({ token });

    const cleanOrigin = origin.trim().toUpperCase();
    const cleanDestination = destination.trim().toUpperCase();
    const cleanDepartureDate = departureDate.trim();

    // Формирование срезов перелета (slices)
    const slices: any[] = [
      {
        origin: cleanOrigin,
        destination: cleanDestination,
        departure_date: cleanDepartureDate,
      },
    ];

    if (returnDate && returnDate.trim()) {
      slices.push({
        origin: cleanDestination,
        destination: cleanOrigin,
        departure_date: returnDate.trim(),
      });
    }

    // Формирование списка пассажиров
    const passengerCount = Math.min(Math.max(1, Number(passengers) || 1), 9);
    const passengerList: any[] = Array.from(
      { length: passengerCount },
      () => ({ type: 'adult' })
    );

    const duffelCabin = mapCabinClass(cabinClass);

    // Запрос предложений авиабилетов через Duffel API
    const offerRequestResponse = await duffel.offerRequests.create({
      slices,
      passengers: passengerList,
      cabin_class: duffelCabin as any,
      return_offers: true,
    });

    const offerRequestData = offerRequestResponse.data;
    const rawOffers = offerRequestData.offers || [];

    // Опции ценообразования
    const isClub = Boolean(isClubMember || userTier === 'club');
    const rawCurr = (targetCurrency || currency || 'RUB').toUpperCase();
    const effectiveTargetCurrency: PricingCurrency = ['RUB', 'USD', 'EUR', 'VND'].includes(rawCurr)
      ? (rawCurr as PricingCurrency)
      : 'RUB';

    const pricingOptions: PricingOptions = {
      isClubMember: isClub,
      targetCurrency: effectiveTargetCurrency,
    };

    // Обогащение офферов ценообразованием и STPC
    const enrichedOffers = await Promise.all(
      rawOffers.map(async (offer: any) => {
        const stpcEnriched = enrichFlightOfferWithStpc(offer);
        const rawAmount = parseFloat(offer.total_amount || '0');
        const offerCurrency = (offer.total_currency || 'USD').toUpperCase() as PricingCurrency;
        const totalSegments = (offer.slices || []).reduce(
          (acc: number, sl: any) => acc + (sl.segments?.length || 1),
          0
        );

        const fareBreakdown = await PricingService.calculateFareBreakdown(
          rawAmount,
          ['RUB', 'USD', 'EUR', 'VND'].includes(offerCurrency) ? offerCurrency : 'USD',
          totalSegments,
          pricingOptions
        );

        return {
          ...stpcEnriched,
          pricingBreakdown: fareBreakdown,
          finalCustomerPrice: fareBreakdown.finalPrice,
          targetCurrency: effectiveTargetCurrency,
          serviceFeeTotal: fareBreakdown.totalServiceFee,
          fxBufferAmount: fareBreakdown.fxBufferAmount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      offerRequestId: offerRequestData.id,
      offers: enrichedOffers,
      totalOffers: enrichedOffers.length,
      data: offerRequestData,
    });
  } catch (error: any) {
    console.error('[API /api/flights/search] Ошибка при поиске рейсов Duffel:', error);
    const errorMessage =
      error?.errors?.[0]?.message ||
      error?.message ||
      'Внутренняя ошибка сервера при поиске авиабилетов через Duffel API';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error?.errors || error,
      },
      { status: error?.status || 500 }
    );
  }
}
