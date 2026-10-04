import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { PricingService } from '@/services/pricingService';
import { Currency } from '@/types/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PassengerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().optional(),
  passportNumber: z.string().optional(),
  passport: z.string().optional(),
  citizenship: z.string().default('RU'),
  gender: z.enum(['M', 'F']).default('M'),
});

const CreateSessionRequestSchema = z.object({
  flightId: z.string().default('fl-001'),
  route: z.string().default('Москва → Бангкок'),
  airline: z.string().default('Turkish Airlines'),
  departureDate: z.string().default(new Date().toISOString().split('T')[0]),
  returnDate: z.string().optional(),
  netFare: z.number().positive(),
  currency: z.enum(['RUB', 'USD', 'EUR', 'VND']).default('RUB'),
  serviceType: z.enum(['assistant', 'club']).default('assistant'),
  isClubMember: z.boolean().default(false),
  passengers: z.array(PassengerSchema).min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().default('+7 (999) 000-00-00'),
  stpcIncluded: z.boolean().default(false),
  stpcHotelName: z.string().optional(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
  originalPrice: z.number().optional(),
  savingsAmount: z.number().optional(),
});

function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function getStripeAmount(amount: number, currency: Currency): number {
  // Stripe zero-decimal currencies
  if (currency === 'VND') {
    return Math.round(amount);
  }
  // Standard currencies (cents, kopecks, etc.)
  return Math.round(amount * 100);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const validation = CreateSessionRequestSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ошибка валидации параметров запроса',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      flightId,
      route,
      airline,
      departureDate,
      returnDate,
      netFare,
      currency,
      serviceType,
      isClubMember,
      passengers,
      contactEmail,
      contactPhone,
      stpcIncluded,
      stpcHotelName,
      successUrl,
      cancelUrl,
      originalPrice,
      savingsAmount,
    } = validation.data;

    const effectiveIsClub = isClubMember || serviceType === 'club';

    // 1. Расчет стоимости по бизнес-правилам FlightSaver:
    // Net Fare + 1.5% FX Buffer + Service Fee (1 500 ₽ для ассистента, 0 ₽ для Club)
    const breakdown = await PricingService.calculateFareBreakdown(
      netFare,
      currency,
      1, // 1 плечо/сегмент
      {
        isClubMember: effectiveIsClub,
        targetCurrency: currency,
      }
    );

    const calculatedServiceFee = breakdown.totalServiceFee;
    const calculatedFxBuffer = breakdown.fxBufferAmount;
    const calculatedTotalPrice = breakdown.finalPrice;

    // 2. Идентификаторы заказа и PNR
    const orderId = `ORD-${generateCode(6)}`;
    const pnr = generateCode(6);
    const eTicketNumber = `235-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const createdAt = new Date().toISOString();

    const origin = request.nextUrl.origin || 'http://localhost:3000';
    const finalSuccessUrl =
      successUrl ||
      `${origin}/dashboard/orders?success=true&session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;
    const finalCancelUrl =
      cancelUrl ||
      `${origin}/booking/${flightId}?canceled=true&order_id=${orderId}`;

    // 3. Сохранение предварительного заказа со статусом 'pending' в Supabase
    try {
      const supabaseAdmin = createAdminClient();
      let userId: string | null = null;

      // Попытка привязать к текущему пользователю, если есть сессия
      try {
        const supabaseUser = await createClient();
        const { data: { user } } = await supabaseUser.auth.getUser();
        if (user) userId = user.id;
      } catch {
        // Анонимный гость
      }

      await supabaseAdmin.from('orders').insert([
        {
          id: orderId.startsWith('ORD-') ? undefined : orderId, // UUID генерируется Supabase, order_reference сохраняет наш код
          order_reference: orderId,
          user_id: userId,
          flight_id: flightId,
          route,
          airline,
          departure_date: departureDate,
          return_date: returnDate,
          total_price: calculatedTotalPrice,
          original_price: originalPrice || Math.round(calculatedTotalPrice * 1.25),
          savings_amount: savingsAmount || 0,
          currency,
          service_type: serviceType,
          service_fee: calculatedServiceFee,
          fx_buffer: calculatedFxBuffer,
          net_fare: netFare,
          stpc_hotel_included: stpcIncluded,
          stpc_hotel_name: stpcIncluded ? stpcHotelName : null,
          status: 'pending',
          payment_method: 'card',
          contact_email: contactEmail,
          contact_phone: contactPhone,
          passengers,
          e_ticket_number: eTicketNumber,
          pnr,
        },
      ]);
    } catch (dbErr) {
      console.warn('[Checkout API] Warning saving initial order in Supabase:', dbErr);
    }

    // 4. Создание сессии Stripe Checkout
    if (isStripeConfigured()) {
      const lineItems: any[] = [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Авиабилет: ${route} (${airline})`,
              description: `Пассажиры: ${passengers.map((p) => `${p.firstName} ${p.lastName}`).join(', ')} • STPC Отель: ${stpcIncluded ? 'Включен 4★' : 'Не включен'}`,
            },
            unit_amount: getStripeAmount(breakdown.netFareConverted + calculatedFxBuffer, currency),
          },
          quantity: 1,
        },
      ];

      if (calculatedServiceFee > 0) {
        lineItems.push({
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Сервисный сбор: Консьерж FlightSaver 24/7',
              description: 'Персональное сопровождение, подтверждение ваучера STPC и онлайн-регистрация.',
            },
            unit_amount: getStripeAmount(calculatedServiceFee, currency),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        customer_email: contactEmail,
        client_reference_id: orderId,
        metadata: {
          orderId,
          flightId,
          route,
          airline,
          pnr,
          contactEmail,
          contactPhone,
          serviceType,
          stpcIncluded: String(Boolean(stpcIncluded)),
          passengersCount: String(passengers.length),
        },
      });

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        orderId,
        pnr,
        totalPrice: calculatedTotalPrice,
        serviceFee: calculatedServiceFee,
        currency,
      });
    } else {
      // Fallback-режим для тестов и локального запуска без боевых ключей Stripe
      return NextResponse.json({
        success: true,
        sessionId: `cs_test_mock_${orderId}`,
        checkoutUrl: `${finalSuccessUrl.replace('{CHECKOUT_SESSION_ID}', `cs_test_mock_${orderId}`)}`,
        orderId,
        pnr,
        totalPrice: calculatedTotalPrice,
        serviceFee: calculatedServiceFee,
        currency,
        isMock: true,
        message: 'Сессия создана в тестовом режиме (Stripe Test Key)',
      });
    }
  } catch (error: any) {
    console.error('[Checkout Create Session API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Ошибка создания сессии оплаты Stripe',
      },
      { status: 500 }
    );
  }
}
