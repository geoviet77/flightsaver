import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateETicket(): string {
  const prefix = '235-';
  let num = '';
  for (let i = 0; i < 10; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return prefix + num;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      flightId = 'fl-001',
      route = 'Москва → Бангкок',
      airline = 'Turkish Airlines',
      departureDate = '2026-09-15',
      returnDate,
      totalPrice = 42800,
      originalPrice = 58900,
      savingsAmount = 16100,
      currency = 'RUB',
      stpcIncluded = true,
      stpcHotelName = 'Партнерский 4★ / 5★ отель авиакомпании',
      passengers = [],
      contactEmail = 'user@example.com',
      contactPhone = '+7 (999) 000-00-00',
      paymentMethod = 'sbp',
      serviceType = 'assistant', // 'assistant' | 'club'
      serviceFee = 1500,
      fxBuffer = 0,
      netFare = 40660,
    } = body;

    const orderId = `ORD-${generateRandomCode(6)}`;
    const orderReference = orderId;
    const pnr = generateRandomCode(6);
    const eTicketNumber = generateETicket();
    const createdAt = new Date().toISOString();

    const orderData = {
      id: orderId,
      orderReference,
      pnr,
      eTicketNumber,
      flightId,
      route,
      airline,
      departureDate,
      returnDate,
      totalPrice: Number(totalPrice),
      originalPrice: Number(originalPrice || totalPrice * 1.25),
      savingsAmount: Number(savingsAmount || 0),
      currency,
      stpcHotelIncluded: Boolean(stpcIncluded),
      stpcHotelName: stpcIncluded ? stpcHotelName : undefined,
      status: 'pending' as const,
      serviceType,
      serviceFee: Number(serviceFee),
      fxBuffer: Number(fxBuffer),
      netFare: Number(netFare),
      passengers: Array.isArray(passengers) && passengers.length > 0 ? passengers : [
        {
          firstName: 'IVAN',
          lastName: 'IVANOV',
          passport: '75 1234567',
          citizenship: 'RU',
          birthDate: '1990-01-01',
          gender: 'M',
        },
      ],
      contactEmail,
      contactPhone,
      paymentMethod,
      createdAt,
    };

    // Сохранение в базу данных Supabase PostgreSQL
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('orders').insert([
          {
            user_id: user.id,
            flight_id: flightId,
            route,
            airline,
            departure_date: departureDate ? new Date(departureDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            total_price: Number(totalPrice),
            original_price: Number(originalPrice),
            savings_amount: Number(savingsAmount),
            stpc_hotel_included: Boolean(stpcIncluded),
            status: 'pending',
            passengers: orderData.passengers,
            e_ticket_number: pnr,
          },
        ]);
      }
    } catch (supabaseError) {
      console.warn('[Orders API] Supabase write notice (anonymous or offline):', supabaseError);
    }

    return NextResponse.json({
      success: true,
      orderId,
      status: 'pending',
      order: orderData,
      message: 'Заказ успешно создан и ожидает обработки',
    });
  } catch (error: any) {
    console.error('[Orders Create API] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Не удалось создать заказ' },
      { status: 500 }
    );
  }
}
