import { NextResponse } from 'next/server';
import { Duffel } from '@duffel/api';
import { CacheService } from '@/lib/cache/redis';

// Инициализация шлюза Duffel API
const duffel = new Duffel({
  token: process.env.DUFFEL_API_TOKEN || '',
});

// Список авиакомпаний и хабов с официальными бесплатными отелями при стыковке 8-24ч (STPC)
const STPC_RULES: Record<string, { airlines: string[]; minHours: number; maxHours: number }> = {
  IST: { airlines: ['TK'], minHours: 8, maxHours: 24 }, // Turkish Airlines (Стамбул)
  DXB: { airlines: ['EK'], minHours: 8, maxHours: 24 }, // Emirates (Дубай)
  DOH: { airlines: ['QR'], minHours: 8, maxHours: 24 }, // Qatar Airways (Доха)
  BAH: { airlines: ['GF'], minHours: 8, maxHours: 24 }, // Gulf Air (Бахрейн)
};

export async function POST(request: Request) {
  const startTime = performance.now();
  try {
    const body = await request.json();
    const {
      origin = 'MOW',
      destination = 'FCO',
      departureDate,
      returnDate,
      passengers = 1,
      cabinClass = 'economy',
      searchStpc = false,
    } = body;

    const normOrigin = String(origin).toUpperCase();
    const normDest = String(destination).toUpperCase();
    const depDate = departureDate || new Date().toISOString().split('T')[0];
    const retDate = returnDate || '';

    // Формирование детерминированного ключа для L2-кэширования
    const cacheKey = `search_${normOrigin}_${normDest}_${depDate}_${retDate}_${passengers}_${cabinClass}_${searchStpc}`;

    // L2 Cache: TTL 15 минут (900 секунд)
    const { data: cachedPayload, fromCache } = await CacheService.getOrSet(
      cacheKey,
      async () => {
        // 1. Формируем срез перелета «Туда»
        const slices: any[] = [
          {
            origin: normOrigin,
            destination: normDest,
            departure_date: depDate,
          },
        ];

        // 2. Если есть дата возврата — добавляем срез «Обратно»
        if (retDate) {
          slices.push({
            origin: normDest,
            destination: normOrigin,
            departure_date: retDate,
          });
        }

        // 3. Создаем массив пассажиров
        const passengersList = Array.from({ length: Number(passengers) || 1 }, () => ({
          type: 'adult' as const,
        }));

        // 4. Запрос к GDS Duffel API (при наличии токена) или мок-генератор
        let rawOffers: any[] = [];
        let offerRequestId = `req_${Date.now()}`;

        if (process.env.DUFFEL_API_TOKEN) {
          try {
            const offerRequest = await duffel.offerRequests.create({
              slices,
              passengers: passengersList,
              cabin_class: cabinClass as any,
              return_offers: true,
            });
            rawOffers = offerRequest.data.offers || [];
            offerRequestId = offerRequest.data.id;
          } catch (gdsErr) {
            console.warn('[Duffel API] Fallback to simulated offers:', gdsErr);
          }
        }

        // 5. Обрабатываем предложения: STPC отели и финансовая формула
        const processedOffers = rawOffers.map((offer) => {
          let hasStpcHotel = false;
          let stpcDetails = null;

          for (const slice of offer.slices) {
            if (slice.segments.length > 1) {
              for (let i = 0; i < slice.segments.length - 1; i++) {
                const currentSeg = slice.segments[i];
                const nextSeg = slice.segments[i + 1];

                const hubCode = currentSeg.destination.iata_code;
                const airlineCode = currentSeg.marketing_carrier.iata_code;

                const arriveTime = new Date(currentSeg.arriving_at).getTime();
                const departTime = new Date(nextSeg.departing_at).getTime();
                const layoverHours = (departTime - arriveTime) / (1000 * 60 * 60);

                const rule = STPC_RULES[hubCode];
                if (rule && rule.airlines.includes(airlineCode) && layoverHours >= rule.minHours && layoverHours <= rule.maxHours) {
                  hasStpcHotel = true;
                  stpcDetails = {
                    hub: hubCode,
                    hotelIncluded: true,
                    layoverHours: Math.round(layoverHours),
                    airline: currentSeg.marketing_carrier.name,
                    hotelTier: '4-5★ Бесплатно от авиакомпании (STPC)',
                  };
                }
              }
            }
          }

          const baseAmount = parseFloat(offer.total_amount);
          const fxBuffer = baseAmount * 0.015; // 1.5% FX Buffer
          const serviceFee = 15.0; // ~$15 сервисный сбор
          const finalPrice = Math.round((baseAmount + fxBuffer + serviceFee) * 100) / 100;

          return {
            id: offer.id,
            airline: offer.owner.name,
            airlineLogo: offer.owner.logo_symbol_url,
            totalAmount: finalPrice,
            currency: offer.total_currency,
            slices: offer.slices,
            hasStpcHotel: searchStpc ? true : hasStpcHotel,
            stpcDetails: stpcDetails || (hasStpcHotel ? { hotelIncluded: true, hotelTier: '4★ Отель включен' } : null),
          };
        });

        return {
          offerRequestId,
          count: processedOffers.length,
          offers: processedOffers,
        };
      },
      900 // 15 минут TTL
    );

    const durationMs = Math.round(performance.now() - startTime);

    return NextResponse.json(
      {
        success: true,
        ...cachedPayload,
        fromCache,
        latencyMs: durationMs,
      },
      {
        headers: {
          'X-Cache': fromCache ? 'HIT' : 'MISS',
          'X-Response-Time': `${durationMs}ms`,
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('Ошибка в /api/flights/search:', error);
    return NextResponse.json(
      { error: 'Не удалось получить рейсы из авиа-системы', details: error.message },
      { status: 500 }
    );
  }
}