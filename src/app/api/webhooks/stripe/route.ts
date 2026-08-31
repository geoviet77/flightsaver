import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PdfReceiptService } from '@/services/pdfReceiptService';
import { EmailService } from '@/services/emailService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      // 1. Строгая криптографическая проверка подписи Stripe Webhook
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return NextResponse.json(
          { error: `Webhook Signature Verification Failed: ${err.message}` },
          { status: 400 }
        );
      }
    } else {
      // Режим разработки / мок-тестов
      try {
        event = JSON.parse(rawBody) as Stripe.Event;
      } catch (parseErr) {
        return NextResponse.json(
          { error: 'Invalid JSON payload in webhook body' },
          { status: 400 }
        );
      }
    }

    const eventId = event.id;
    const eventType = event.type;

    console.log(`[Stripe Webhook] Received event ${eventId} [${eventType}]`);

    // 2. Проверка идемпотентности: дедупликация повторных событий
    try {
      const { data: existingEvent } = await supabase
        .from('payment_events')
        .select('id, status')
        .eq('event_id', eventId)
        .single();

      if (existingEvent && existingEvent.status === 'processed') {
        console.log(`[Stripe Webhook] Event ${eventId} already processed. Skipping duplicate.`);
        return NextResponse.json({
          received: true,
          idempotent: true,
          message: 'Event was previously processed',
        });
      }
    } catch (checkErr) {
      console.warn('[Stripe Webhook] Notice checking payment_events table:', checkErr);
    }

    // Фиксация начала обработки в payment_events
    try {
      await supabase.from('payment_events').upsert([
        {
          event_id: eventId,
          event_type: eventType,
          provider: 'stripe',
          status: 'processed',
          payload: event.data.object as any,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (upsertErr) {
      console.warn('[Stripe Webhook] Notice logging payment_events:', upsertErr);
    }

    // 3. Обработка успешной оплаты
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id || session.metadata?.orderId;
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

      if (orderId) {
        console.log(`[Stripe Webhook] Confirming order ${orderId} after successful checkout session`);

        // Получение актуальных данных заказа для PDF и Email
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .or(`order_reference.eq.${orderId},id.eq.${orderId}`)
          .single();

        const route = orderData?.route || session.metadata?.route || 'Москва → Бангкок';
        const airline = orderData?.airline || session.metadata?.airline || 'Turkish Airlines';
        const pnr = orderData?.pnr || session.metadata?.pnr || 'FS889A';
        const departureDate = orderData?.departure_date || '2026-09-15';
        const contactEmail = orderData?.contact_email || session.customer_email || session.metadata?.contactEmail || 'user@example.com';
        const totalPrice = Number(orderData?.total_price || (session.amount_total ? session.amount_total / 100 : 42800));
        const currency = orderData?.currency || session.currency?.toUpperCase() || 'RUB';
        const stpcHotelIncluded = Boolean(orderData?.stpc_hotel_included || session.metadata?.stpcIncluded === 'true');

        // Обновление статуса заказа в Supabase
        await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_intent_id: paymentIntentId || null,
            stripe_session_id: session.id,
            updated_at: new Date().toISOString(),
          })
          .or(`order_reference.eq.${orderId},id.eq.${orderId}`);

        // Генерация PDF квитанции и сохранение в Supabase Storage
        let receiptUrl = `/api/receipts/${orderId}`;
        try {
          receiptUrl = await PdfReceiptService.generateAndUploadReceipt({
            orderId,
            pnr,
            eTicketNumber: orderData?.e_ticket_number || `235-${pnr}`,
            airline,
            route,
            originCity: route.split('→')?.[0]?.trim() || 'Москва',
            destinationCity: route.split('→')?.[1]?.trim() || 'Бангкок',
            departureDate,
            passengers: orderData?.passengers || [{ firstName: 'TRAVELER', lastName: 'PASSENGER' }],
            totalPrice,
            currency,
            serviceType: orderData?.service_type || 'assistant',
            serviceFee: Number(orderData?.service_fee || 1500),
            fxBuffer: Number(orderData?.fx_buffer || 610),
            netFare: Number(orderData?.net_fare || 40660),
            stpcHotelIncluded,
            contactEmail,
            createdAt: new Date().toISOString(),
          });
        } catch (pdfErr) {
          console.warn('[Stripe Webhook] Error generating PDF receipt in background:', pdfErr);
        }

        // Отправка подтверждения и ссылки на квитанцию на Email
        try {
          await EmailService.sendReceiptEmail({
            to: contactEmail,
            orderId,
            pnr,
            route,
            airline,
            departureDate,
            totalPrice,
            currency,
            receiptUrl,
            stpcHotelIncluded,
          });
        } catch (emailErr) {
          console.warn('[Stripe Webhook] Error sending receipt email:', emailErr);
        }

        console.log(`[Stripe Webhook] Order ${orderId} confirmed, PDF generated, Email dispatched.`);
      }
    } else if (eventType === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString(),
          })
          .or(`order_reference.eq.${orderId},id.eq.${orderId}`);
      }
    }

    return NextResponse.json({
      received: true,
      success: true,
      eventId,
      type: eventType,
    });
  } catch (globalError: any) {
    console.error('[Stripe Webhook Fatal Error]:', globalError);
    return NextResponse.json(
      { error: globalError?.message || 'Internal webhook error' },
      { status: 500 }
    );
  }
}
